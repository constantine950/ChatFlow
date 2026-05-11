package websocket

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/constantine950/ChatFlow/internal/auth"
	fiberws "github.com/gofiber/websocket/v2"
)

// Hub maintains the set of active clients and routes events between them.
// There is one Hub for the entire server — it's safe for concurrent use.
type Hub struct {
	mu      sync.RWMutex
	clients map[*Client]bool // all connected clients

	// Channels for client lifecycle management
	register   chan *Client
	unregister chan *Client
}

// NewHub creates a Hub. Call Run() in a goroutine after creating it.
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client, 64),
		unregister: make(chan *Client, 64),
	}
}

// Run starts the hub's event loop. Must be called in its own goroutine.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("ws: client connected  user=%s total=%d", client.UserID, h.count())

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("ws: client disconnected user=%s total=%d", client.UserID, h.count())
		}
	}
}

// BroadcastToChannel sends an event to every client subscribed to channelID.
func (h *Hub) BroadcastToChannel(channelID string, event Event) {
	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("ws: failed to marshal broadcast event: %v", err)
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		if client.IsSubscribed(channelID) {
			select {
			case client.send <- data:
			default:
				// Client's buffer full — will be cleaned up by WritePump
			}
		}
	}
}

// SendToUser sends an event to all connections for a specific user.
func (h *Hub) SendToUser(userID string, event Event) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		if client.UserID == userID {
			select {
			case client.send <- data:
			default:
			}
		}
	}
}

// Handler returns the Fiber WebSocket upgrade handler.
// Mount it at GET /ws with auth middleware applied before it.
func (h *Hub) Handler(authService *auth.Service) func(*fiberws.Conn) {
	return func(conn *fiberws.Conn) {
		// Extract claims from the query param token
		// (browsers can't set Authorization headers on WS connections)
		tokenStr := conn.Query("token")
		if tokenStr == "" {
			conn.Close()
			return
		}

		claims, err := authService.ValidateAccessToken(tokenStr)
		if err != nil {
			conn.Close()
			return
		}

		client := newClient(h, conn, claims.UserID, claims.DisplayName)
		h.register <- client

		// Run write pump in background, read pump blocks this goroutine
		go client.WritePump()
		client.ReadPump()
	}
}

// handleEvent routes an inbound client event to the right action.
func (h *Hub) handleEvent(c *Client, event Event) {
	switch event.Type {

	case EventChannelJoin:
		payload, ok := parsePayload[ChannelPayload](event.Payload)
		if !ok {
			c.sendError("invalid_payload", "channel.join requires channel_id")
			return
		}
		c.SubscribeTo(payload.ChannelID)
		log.Printf("ws: user=%s joined channel=%s", c.UserID, payload.ChannelID)

	case EventChannelLeave:
		payload, ok := parsePayload[ChannelPayload](event.Payload)
		if !ok {
			c.sendError("invalid_payload", "channel.leave requires channel_id")
			return
		}
		c.UnsubscribeFrom(payload.ChannelID)

	case EventPresenceHeartbeat:
		// Will be wired to Redis presence on Day 9
		// For now just acknowledge it silently
		log.Printf("ws: heartbeat from user=%s", c.UserID)

	case EventTypingStart, EventTypingStop:
		payload, ok := parsePayload[TypingPayload](event.Payload)
		if !ok {
			c.sendError("invalid_payload", "typing event requires channel_id")
			return
		}
		// Broadcast typing indicator to other subscribers
		// (Redis pub/sub wired on Day 10 — for now direct broadcast)
		h.BroadcastToChannel(payload.ChannelID, Event{
			Type: EventTypingIndicator,
			Payload: TypingIndicatorPayload{
				ChannelID:   payload.ChannelID,
				UserID:      c.UserID,
				DisplayName: c.DisplayName,
			},
		})

	case EventMessageSend:
		// Will be routed through Kafka on Day 8.
		// For now: direct broadcast so Day 6 demo works.
		payload, ok := parsePayload[MessageSendPayload](event.Payload)
		if !ok {
			c.sendError("invalid_payload", "message.send requires channel_id and content")
			return
		}
		if payload.Content == "" {
			c.sendError("validation_error", "content cannot be empty")
			return
		}

		h.BroadcastToChannel(payload.ChannelID, Event{
			Type: EventMessageNew,
			Payload: MessageNewPayload{
				ChannelID:   payload.ChannelID,
				UserID:      c.UserID,
				DisplayName: c.DisplayName,
				Content:     payload.Content,
			},
		})

	default:
		c.sendError("unknown_event", "unknown event type: "+event.Type)
	}
}

// count returns the number of connected clients (for logging).
func (h *Hub) count() int {
	return len(h.clients)
}

// parsePayload re-marshals the generic interface{} payload into a typed struct.
func parsePayload[T any](raw interface{}) (T, bool) {
	var result T
	data, err := json.Marshal(raw)
	if err != nil {
		return result, false
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return result, false
	}
	return result, true
}