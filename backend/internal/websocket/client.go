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
	maxMessageSize = 4096
)

// Client represents a single connected WebSocket session.
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	mu   sync.Mutex

	// Identity
	UserID      string
	DisplayName string
	WorkspaceID string // for presence tracking

	// Channel subscriptions
	channels map[string]bool
}

func newClient(hub *Hub, conn *websocket.Conn, userID, displayName, workspaceID string) *Client {
	return &Client{
		hub:         hub,
		conn:        conn,
		send:        make(chan []byte, 256),
		UserID:      userID,
		DisplayName: displayName,
		WorkspaceID: workspaceID,
		channels:    make(map[string]bool),
	}
}

func (c *Client) SubscribeTo(channelID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.channels[channelID] = true
}

func (c *Client) UnsubscribeFrom(channelID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.channels, channelID)
}

func (c *Client) IsSubscribed(channelID string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.channels[channelID]
}

// ReadPump pumps messages from the WebSocket to the hub.
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

// WritePump pumps messages from the send channel to the WebSocket.
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

func (c *Client) sendError(code, message string) {
	event := Event{
		Type:    EventError,
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
	}
}