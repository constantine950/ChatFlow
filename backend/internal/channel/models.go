package channel

import "time"

// Database models

type Channel struct {
	ID          string    `db:"id"`
	WorkspaceID string    `db:"workspace_id"`
	Name        string    `db:"name"`
	Topic       *string   `db:"topic"`
	IsPrivate   bool      `db:"is_private"`
	IsDM        bool      `db:"is_dm"`
	CreatedBy   string    `db:"created_by"`
	CreatedAt   time.Time `db:"created_at"`
}

type Member struct {
	ChannelID   string     `db:"channel_id"`
	UserID      string     `db:"user_id"`
	DisplayName string     `db:"display_name"`
	AvatarURL   *string    `db:"avatar_url"`
	LastReadAt  *time.Time `db:"last_read_at"`
	JoinedAt    time.Time  `db:"joined_at"`
}

// Request bodies

type CreateRequest struct {
	Name      string `json:"name"`
	Topic     string `json:"topic"`
	IsPrivate bool   `json:"is_private"`
}

// Response bodies

type Response struct {
	ID          string    `json:"id"`
	WorkspaceID string    `json:"workspace_id"`
	Name        string    `json:"name"`
	Topic       *string   `json:"topic"`
	IsPrivate   bool      `json:"is_private"`
	IsDM        bool      `json:"is_dm"`
	CreatedBy   string    `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
}

type MemberResponse struct {
	UserID      string     `json:"user_id"`
	DisplayName string     `json:"display_name"`
	AvatarURL   *string    `json:"avatar_url"`
	LastReadAt  *time.Time `json:"last_read_at"`
	JoinedAt    time.Time  `json:"joined_at"`
}