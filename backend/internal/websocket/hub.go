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
}

func NewHub(producer *kafka.Producer, presenceSvc *presence.Service) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client, 64),
		unregister: make(chan *Client, 64),
		producer:   producer,
		presence:   presenceSvc,
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

			// Mark offline in all workspace presence sets the client was in
			if client.WorkspaceID != "" {
				ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
				if err := h.presence.SetOffline(ctx, client.WorkspaceID, client.UserID); err != nil {
					log.Printf("presence: failed to set offline: %v", err)
				}
				cancel()

				// Broadcast offline status to workspace
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

		// Workspace ID passed as query param for presence tracking
		// e.g. ws://localhost:8080/ws?token=xxx&workspace_id=yyy
		workspaceID := conn.Query("workspace_id")

		client := newClient(h, conn, claims.UserID, claims.DisplayName, workspaceID)
		h.register <- client

		// Fire initial heartbeat so user appears online immediately
		if workspaceID != "" {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			if err := h.presence.Heartbeat(ctx, workspaceID, claims.UserID); err != nil {
				log.Printf("presence: initial heartbeat failed: %v", err)
			}
			cancel()

			// Broadcast online status
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
		// Update Redis sorted set score = now()
		if c.WorkspaceID != "" {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			if err := h.presence.Heartbeat(ctx, c.WorkspaceID, c.UserID); err != nil {
				log.Printf("presence: heartbeat failed for user=%s: %v", c.UserID, err)
			}
		}

	case EventTypingStart, EventTypingStop:
		payload, ok := parsePayload[TypingPayload](event.Payload)
		if !ok {
			c.sendError("invalid_payload", "typing event requires channel_id")
			return
		}
		// Redis pub/sub wired on Day 10 — direct broadcast for now
		h.BroadcastToChannel(payload.ChannelID, Event{
			Type: EventTypingIndicator,
			Payload: TypingIndicatorPayload{
				ChannelID:   payload.ChannelID,
				UserID:      c.UserID,
				DisplayName: c.DisplayName,
			},
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