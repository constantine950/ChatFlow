package workspace

import "time"

// Database models

type Workspace struct {
	ID        string    `db:"id"`
	Name      string    `db:"name"`
	Slug      string    `db:"slug"`
	OwnerID   string    `db:"owner_id"`
	CreatedAt time.Time `db:"created_at"`
}

type Member struct {
	WorkspaceID string    `db:"workspace_id"`
	UserID      string    `db:"user_id"`
	DisplayName string    `db:"display_name"`
	AvatarURL   *string   `db:"avatar_url"`
	Role        string    `db:"role"`
	JoinedAt    time.Time `db:"joined_at"`
}

// Request bodies

type CreateRequest struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type UpdateRoleRequest struct {
	Role string `json:"role"`
}

// Response bodies

type Response struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	OwnerID   string    `json:"owner_id"`
	CreatedAt time.Time `json:"created_at"`
}

type MemberResponse struct {
	UserID      string    `json:"user_id"`
	DisplayName string    `json:"display_name"`
	AvatarURL   *string   `json:"avatar_url"`
	Role        string    `json:"role"`
	JoinedAt    time.Time `json:"joined_at"`
}