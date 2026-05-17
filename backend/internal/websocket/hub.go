package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/constantine950/ChatFlow/internal/auth"
	"github.com/constantine950/ChatFlow/internal/kafka"
	"github.com/constantine950/ChatFlow/internal/presence"
	fiberws "github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

// Hub maintains the set of active clients and routes events between them.
type Hub struct {
	mu       sync.RWMutex
	clients  map[*Client]bool

	register   chan *Client
	unregister chan *Client

	producer *kafka.Producer
	presence *presence.Service
	typing   *presence.TypingService

	// Track auto-expire cancel funcs per user+channel
	// so a new typing.start cancels the previous 3s timer
	typingCancels   map[string]context.CancelFunc
	typingCancelsMu sync.Mutex
}

func NewHub(producer *kafka.Producer, presenceSvc *presence.Service, typingSvc *presence.TypingService) *Hub {
	return &Hub{
		clients:       make(map[*Client]bool),
		register:      make(chan *Client, 64),
		unregister:    make(chan *Client, 64),
		producer:      producer,
		presence:      presenceSvc,
		typing:        typingSvc,
		typingCancels: make(map[string]context.CancelFunc),
	}
}

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

			if client.WorkspaceID != "" {
				ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
				if err := h.presence.SetOffline(ctx, client.WorkspaceID, client.UserID); err != nil {
					log.Printf("presence: failed to set offline: %v", err)
				}
				cancel()

				h.BroadcastToChannel(client.WorkspaceID, Event{
					Type: EventPresenceUpdate,
					Payload: PresenceUpdatePayload{
						UserID: client.UserID,
						Status: "offline",
					},
				})
			}
		}
	}
}

// StartTypingSubscriber starts the Redis pub/sub loop that forwards typing
// events to local WebSocket clients. Call once in a goroutine at startup.
func (h *Hub) StartTypingSubscriber(ctx context.Context) {
	h.typing.Subscribe(ctx, func(event presence.TypingEvent) {
		wsEvent := Event{
			Type: EventTypingIndicator,
			Payload: TypingIndicatorPayload{
				ChannelID:   event.ChannelID,
				UserID:      event.UserID,
				DisplayName: event.DisplayName,
			},
		}
		// Only broadcast "start" — "stop" clears the indicator on the client
		if event.Type == "stop" {
			wsEvent.Type = EventTypingStop
		}
		h.BroadcastToChannel(event.ChannelID, wsEvent)
	})
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
func (h *Hub) Handler(authService *auth.Service) func(*fiberws.Conn) {
	return func(conn *fiberws.Conn) {
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

		workspaceID := conn.Query("workspace_id")
		client := newClient(h, conn, claims.UserID, claims.DisplayName, workspaceID)
		h.register <- client

		if workspaceID != "" {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			if err := h.presence.Heartbeat(ctx, workspaceID, claims.UserID); err != nil {
				log.Printf("presence: initial heartbeat failed: %v", err)
			}
			cancel()

			h.BroadcastToChannel(workspaceID, Event{
				Type: EventPresenceUpdate,
				Payload: PresenceUpdatePayload{
					UserID: claims.UserID,
					Status: "online",
				},
			})
		}

		go client.WritePump()
		client.ReadPump()
	}
}

// handleEvent routes inbound client events.
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
		if c.WorkspaceID != "" {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			if err := h.presence.Heartbeat(ctx, c.WorkspaceID, c.UserID); err != nil {
				log.Printf("presence: heartbeat failed: %v", err)
			}
		}

	case EventTypingStart:
		payload, ok := parsePayload[TypingPayload](event.Payload)
		if !ok {
			c.sendError("invalid_payload", "typing.start requires channel_id")
			return
		}

		// Cancel previous auto-expire timer for this user+channel
		timerKey := c.UserID + ":" + payload.ChannelID
		h.typingCancelsMu.Lock()
		if cancel, exists := h.typingCancels[timerKey]; exists {
			cancel()
		}
		expireCtx, expireCancel := context.WithCancel(context.Background())
		h.typingCancels[timerKey] = expireCancel
		h.typingCancelsMu.Unlock()

		// Publish typing.start via Redis pub/sub
		typingEvent := presence.TypingEvent{
			ChannelID:   payload.ChannelID,
			UserID:      c.UserID,
			DisplayName: c.DisplayName,
			Type:        "start",
		}
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if err := h.typing.Publish(ctx, typingEvent); err != nil {
			log.Printf("typing: publish failed: %v", err)
		}

		// Auto-expire after 3s of inactivity
		go h.typing.AutoExpire(expireCtx, typingEvent)

	case EventTypingStop:
		payload, ok := parsePayload[TypingPayload](event.Payload)
		if !ok {
			return
		}

		// Cancel the auto-expire timer
		timerKey := c.UserID + ":" + payload.ChannelID
		h.typingCancelsMu.Lock()
		if cancel, exists := h.typingCancels[timerKey]; exists {
			cancel()
			delete(h.typingCancels, timerKey)
		}
		h.typingCancelsMu.Unlock()

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = h.typing.Publish(ctx, presence.TypingEvent{
			ChannelID:   payload.ChannelID,
			UserID:      c.UserID,
			DisplayName: c.DisplayName,
			Type:        "stop",
		})

	case EventMessageSend:
		payload, ok := parsePayload[MessageSendPayload](event.Payload)
		if !ok {
			c.sendError("invalid_payload", "message.send requires channel_id and content")
			return
		}
		if payload.Content == "" {
			c.sendError("validation_error", "content cannot be empty")
			return
		}
		if payload.ChannelID == "" {
			c.sendError("validation_error", "channel_id is required")
			return
		}

		msg := kafka.ChatMessage{
			ID:              uuid.New().String(),
			ChannelID:       payload.ChannelID,
			UserID:          c.UserID,
			DisplayName:     c.DisplayName,
			Content:         payload.Content,
			ParentMessageID: payload.ParentMessageID,
			SentAt:          time.Now().UTC().Format(time.RFC3339),
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := h.producer.Publish(ctx, msg); err != nil {
			log.Printf("ws: failed to produce message: %v", err)
			c.sendError("server_error", "failed to send message, please retry")
		}

	default:
		c.sendError("unknown_event", fmt.Sprintf("unknown event type: %s", event.Type))
	}
}

func (h *Hub) count() int {
	return len(h.clients)
}

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