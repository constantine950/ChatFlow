package channel

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound      = errors.New("channel not found")
	ErrNameTaken     = errors.New("channel name already in use")
	ErrNotMember     = errors.New("user is not a member of this channel")
	ErrAccessDenied  = errors.New("access denied")
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, workspaceID, name string, topic *string, isPrivate bool, createdBy string) (*Channel, error) {
	query := `
		INSERT INTO channels (workspace_id, name, topic, is_private, is_dm, created_by)
		VALUES ($1, $2, $3, $4, false, $5)
		RETURNING id, workspace_id, name, topic, is_private, is_dm, created_by, created_at
	`
	ch := &Channel{}
	err := r.db.QueryRow(ctx, query, workspaceID, name, topic, isPrivate, createdBy).Scan(
		&ch.ID, &ch.WorkspaceID, &ch.Name, &ch.Topic,
		&ch.IsPrivate, &ch.IsDM, &ch.CreatedBy, &ch.CreatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrNameTaken
		}
		return nil, err
	}
	return ch, nil
}

func (r *Repository) FindByID(ctx context.Context, id string) (*Channel, error) {
	query := `
		SELECT id, workspace_id, name, topic, is_private, is_dm, created_by, created_at
		FROM channels WHERE id = $1
	`
	ch := &Channel{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&ch.ID, &ch.WorkspaceID, &ch.Name, &ch.Topic,
		&ch.IsPrivate, &ch.IsDM, &ch.CreatedBy, &ch.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return ch, nil
}

func (r *Repository) ListByWorkspace(ctx context.Context, workspaceID, userID string) ([]*Channel, error) {
	// Return public channels + private channels the user belongs to
	query := `
		SELECT c.id, c.workspace_id, c.name, c.topic, c.is_private, c.is_dm, c.created_by, c.created_at
		FROM channels c
		WHERE c.workspace_id = $1
		  AND c.is_dm = false
		  AND (
		    c.is_private = false
		    OR EXISTS (
		      SELECT 1 FROM channel_members cm
		      WHERE cm.channel_id = c.id AND cm.user_id = $2
		    )
		  )
		ORDER BY c.created_at ASC
	`
	rows, err := r.db.Query(ctx, query, workspaceID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []*Channel
	for rows.Next() {
		ch := &Channel{}
		if err := rows.Scan(
			&ch.ID, &ch.WorkspaceID, &ch.Name, &ch.Topic,
			&ch.IsPrivate, &ch.IsDM, &ch.CreatedBy, &ch.CreatedAt,
		); err != nil {
			return nil, err
		}
		channels = append(channels, ch)
	}
	return channels, nil
}

func (r *Repository) AddMember(ctx context.Context, channelID, userID string) error {
	query := `
		INSERT INTO channel_members (channel_id, user_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`
	_, err := r.db.Exec(ctx, query, channelID, userID)
	return err
}

func (r *Repository) RemoveMember(ctx context.Context, channelID, userID string) error {
	query := `DELETE FROM channel_members WHERE channel_id = $1 AND user_id = $2`
	_, err := r.db.Exec(ctx, query, channelID, userID)
	return err
}

func (r *Repository) IsMember(ctx context.Context, channelID, userID string) (bool, error) {
	query := `SELECT 1 FROM channel_members WHERE channel_id = $1 AND user_id = $2`
	var one int
	err := r.db.QueryRow(ctx, query, channelID, userID).Scan(&one)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (r *Repository) ListMembers(ctx context.Context, channelID string) ([]*Member, error) {
	query := `
		SELECT cm.channel_id, cm.user_id, u.display_name, u.avatar_url, cm.last_read_at, cm.joined_at
		FROM channel_members cm
		JOIN users u ON u.id = cm.user_id
		WHERE cm.channel_id = $1
		ORDER BY cm.joined_at ASC
	`
	rows, err := r.db.Query(ctx, query, channelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*Member
	for rows.Next() {
		m := &Member{}
		if err := rows.Scan(
			&m.ChannelID, &m.UserID, &m.DisplayName,
			&m.AvatarURL, &m.LastReadAt, &m.JoinedAt,
		); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM channels WHERE id = $1`, id)
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