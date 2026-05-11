package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/websocket/v2"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 4096 // bytes
)

// Client represents a single connected WebSocket session.
// One browser tab = one Client.
type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte // buffered channel of outbound messages
	mu       sync.Mutex

	// Identity
	UserID      string
	DisplayName string

	// Subscriptions — channels this client is listening to
	channels map[string]bool
}

func newClient(hub *Hub, conn *websocket.Conn, userID, displayName string) *Client {
	return &Client{
		hub:         hub,
		conn:        conn,
		send:        make(chan []byte, 256),
		UserID:      userID,
		DisplayName: displayName,
		channels:    make(map[string]bool),
	}
}

// SubscribeTo adds a channel to this client's subscription set.
func (c *Client) SubscribeTo(channelID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.channels[channelID] = true
}

// UnsubscribeFrom removes a channel subscription.
func (c *Client) UnsubscribeFrom(channelID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.channels, channelID)
}

// IsSubscribed checks if this client is listening to a channel.
func (c *Client) IsSubscribed(channelID string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.channels[channelID]
}

// ReadPump pumps messages from the WebSocket connection to the hub.
// Run in its own goroutine per client.
func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			// Client disconnected — normal close, don't log as error
			break
		}

		var event Event
		if err := json.Unmarshal(msg, &event); err != nil {
			c.sendError("invalid_json", "message must be valid JSON")
			continue
		}

		c.hub.handleEvent(c, event)
	}
}

// WritePump pumps messages from the send channel to the WebSocket connection.
// Run in its own goroutine per client.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// sendError is a helper to push an error event back to this client only.
func (c *Client) sendError(code, message string) {
	event := Event{
		Type: EventError,
		Payload: ErrorPayload{Code: code, Message: message},
	}
	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("ws: failed to marshal error event: %v", err)
		return
	}
	select {
	case c.send <- data:
	default:
		// Client's buffer is full — drop the message
	}
}