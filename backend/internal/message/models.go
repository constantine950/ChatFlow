package message

import "time"

// Response is the JSON shape returned to clients for a single message.
type Response struct {
	ID              string      `json:"id"`
	ChannelID       string      `json:"channel_id"`
	UserID          string      `json:"user_id"`
	DisplayName     string      `json:"display_name"`
	ParentMessageID *string     `json:"parent_message_id,omitempty"`
	Content         string      `json:"content"`
	EditedAt        *time.Time  `json:"edited_at,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
	ReplyCount      int         `json:"reply_count"`
}

// ListResponse wraps a page of messages with cursor info.
type ListResponse struct {
	Data       []*Response `json:"data"`
	NextCursor *string     `json:"next_cursor"` // nil = no more pages
	HasMore    bool        `json:"has_more"`
}

// EditRequest is the body for PATCH /messages/:id
type EditRequest struct {
	Content string `json:"content"`
}