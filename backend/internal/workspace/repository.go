package workspace

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound     = errors.New("workspace not found")
	ErrSlugTaken    = errors.New("slug already in use")
	ErrNotMember    = errors.New("user is not a member of this workspace")
	ErrAlreadyMember = errors.New("user is already a member")
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, name, slug, ownerID string) (*Workspace, error) {
	query := `
		INSERT INTO workspaces (name, slug, owner_id)
		VALUES ($1, $2, $3)
		RETURNING id, name, slug, owner_id, created_at
	`
	ws := &Workspace{}
	err := r.db.QueryRow(ctx, query, name, slug, ownerID).Scan(
		&ws.ID, &ws.Name, &ws.Slug, &ws.OwnerID, &ws.CreatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrSlugTaken
		}
		return nil, err
	}
	return ws, nil
}

// AddMember inserts a workspace_members row.
func (r *Repository) AddMember(ctx context.Context, workspaceID, userID, role string) error {
	query := `
		INSERT INTO workspace_members (workspace_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING
	`
	_, err := r.db.Exec(ctx, query, workspaceID, userID, role)
	return err
}

// FindByID returns a workspace by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*Workspace, error) {
	query := `
		SELECT id, name, slug, owner_id, created_at
		FROM workspaces WHERE id = $1
	`
	ws := &Workspace{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&ws.ID, &ws.Name, &ws.Slug, &ws.OwnerID, &ws.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return ws, nil
}

// FindBySlug returns a workspace by slug.
func (r *Repository) FindBySlug(ctx context.Context, slug string) (*Workspace, error) {
	query := `
		SELECT id, name, slug, owner_id, created_at
		FROM workspaces WHERE slug = $1
	`
	ws := &Workspace{}
	err := r.db.QueryRow(ctx, query, slug).Scan(
		&ws.ID, &ws.Name, &ws.Slug, &ws.OwnerID, &ws.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return ws, nil
}

// ListByUser returns all workspaces a user belongs to.
func (r *Repository) ListByUser(ctx context.Context, userID string) ([]*Workspace, error) {
	query := `
		SELECT w.id, w.name, w.slug, w.owner_id, w.created_at
		FROM workspaces w
		JOIN workspace_members wm ON wm.workspace_id = w.id
		WHERE wm.user_id = $1
		ORDER BY w.created_at ASC
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workspaces []*Workspace
	for rows.Next() {
		ws := &Workspace{}
		if err := rows.Scan(&ws.ID, &ws.Name, &ws.Slug, &ws.OwnerID, &ws.CreatedAt); err != nil {
			return nil, err
		}
		workspaces = append(workspaces, ws)
	}
	return workspaces, nil
}

// ListMembers returns all members of a workspace with user info.
func (r *Repository) ListMembers(ctx context.Context, workspaceID string) ([]*Member, error) {
	query := `
		SELECT wm.workspace_id, wm.user_id, u.display_name, u.avatar_url, wm.role, wm.joined_at
		FROM workspace_members wm
		JOIN users u ON u.id = wm.user_id
		WHERE wm.workspace_id = $1
		ORDER BY wm.joined_at ASC
	`
	rows, err := r.db.Query(ctx, query, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*Member
	for rows.Next() {
		m := &Member{}
		if err := rows.Scan(
			&m.WorkspaceID, &m.UserID, &m.DisplayName,
			&m.AvatarURL, &m.Role, &m.JoinedAt,
		); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, nil
}

// IsMember checks if a user belongs to a workspace.
func (r *Repository) IsMember(ctx context.Context, workspaceID, userID string) (bool, error) {
	query := `
		SELECT 1 FROM workspace_members
		WHERE workspace_id = $1 AND user_id = $2
	`
	var one int
	err := r.db.QueryRow(ctx, query, workspaceID, userID).Scan(&one)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// RemoveMember deletes a workspace_members row.
func (r *Repository) RemoveMember(ctx context.Context, workspaceID, userID string) error {
	query := `
		DELETE FROM workspace_members
		WHERE workspace_id = $1 AND user_id = $2
	`
	_, err := r.db.Exec(ctx, query, workspaceID, userID)
	return err
}

func isUniqueViolation(err error) bool {
	return err != nil && containsSubstring(err.Error(), "23505")
}

func containsSubstring(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}