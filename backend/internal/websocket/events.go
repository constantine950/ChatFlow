package websocket

// Event types — must match the PRD event contract exactly.
// Client → Server
const (
	EventMessageSend      = "message.send"
	EventTypingStart      = "typing.start"
	EventTypingStop       = "typing.stop"
	EventPresenceHeartbeat = "presence.heartbeat"
	EventChannelJoin      = "channel.join"
	EventChannelLeave     = "channel.leave"
)

// Server → Client
const (
	EventMessageNew     = "message.new"
	EventMessageUpdated = "message.updated"
	EventMessageDeleted = "message.deleted"
	EventTypingIndicator = "typing.indicator"
	EventPresenceUpdate = "presence.update"
	EventReactionUpdate = "reaction.update"
	EventError          = "error"
)

// Envelope
// Every WebSocket message — in both directions — is wrapped in
// this envelope so the hub knows how to route it.

type Event struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// Client → Server payloads

type MessageSendPayload struct {
	ChannelID       string `json:"channel_id"`
	Content         string `json:"content"`
	ParentMessageID string `json:"parent_message_id,omitempty"`
}

type TypingPayload struct {
	ChannelID string `json:"channel_id"`
}

type ChannelPayload struct {
	ChannelID string `json:"channel_id"`
}

// Server → Client payloads

type MessageNewPayload struct {
	ID              string  `json:"id"`
	ChannelID       string  `json:"channel_id"`
	UserID          string  `json:"user_id"`
	DisplayName     string  `json:"display_name"`
	Content         string  `json:"content"`
	ParentMessageID *string `json:"parent_message_id,omitempty"`
	CreatedAt       string  `json:"created_at"`
}

type TypingIndicatorPayload struct {
	ChannelID   string `json:"channel_id"`
	UserID      string `json:"user_id"`
	DisplayName string `json:"display_name"`
}

type PresenceUpdatePayload struct {
	UserID string `json:"user_id"`
	Status string `json:"status"` // "online" | "offline"
}

type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}