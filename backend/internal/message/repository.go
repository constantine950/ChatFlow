package message

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Models

type Message struct {
	ID              string     `db:"id"`
	ChannelID       string     `db:"channel_id"`
	UserID          string     `db:"user_id"`
	DisplayName     string     `db:"display_name"`
	ParentMessageID *string    `db:"parent_message_id"`
	Content         string     `db:"content"`
	EditedAt        *time.Time `db:"edited_at"`
	DeletedAt       *time.Time `db:"deleted_at"`
	CreatedAt       time.Time  `db:"created_at"`
	ReplyCount      int        `db:"reply_count"`
}

type InsertParams struct {
	ID              string
	ChannelID       string
	UserID          string
	ParentMessageID *string
	Content         string
}

var ErrNotFound = errors.New("message not found")

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Insert(ctx context.Context, p InsertParams) (*Message, error) {
	query := `
		INSERT INTO messages (id, channel_id, user_id, parent_message_id, content)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, channel_id, user_id, parent_message_id, content,
		          edited_at, deleted_at, created_at, 0 AS reply_count
	`
	msg := &Message{}
	err := r.db.QueryRow(ctx, query,
		p.ID, p.ChannelID, p.UserID, p.ParentMessageID, p.Content,
	).Scan(
		&msg.ID, &msg.ChannelID, &msg.UserID, &msg.ParentMessageID,
		&msg.Content, &msg.EditedAt, &msg.DeletedAt, &msg.CreatedAt,
		&msg.ReplyCount,
	)
	if err != nil {
		return nil, err
	}
	return msg, nil
}

func (r *Repository) List(ctx context.Context, channelID, beforeID string, limit int) ([]*Message, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	replyCountSub := `(
		SELECT COUNT(*)::int FROM messages r
		WHERE r.parent_message_id = m.id AND r.deleted_at IS NULL
	) AS reply_count`

	var (
		rows pgx.Rows
		err  error
	)

	if beforeID == "" {
		rows, err = r.db.Query(ctx, `
			SELECT m.id, m.channel_id, m.user_id, u.display_name,
			       m.parent_message_id, m.content, m.edited_at, m.deleted_at, m.created_at,
			       `+replyCountSub+`
			FROM messages m JOIN users u ON u.id = m.user_id
			WHERE m.channel_id = $1 AND m.deleted_at IS NULL AND m.parent_message_id IS NULL
			ORDER BY m.created_at DESC LIMIT $2
		`, channelID, limit)
	} else {
		rows, err = r.db.Query(ctx, `
			SELECT m.id, m.channel_id, m.user_id, u.display_name,
			       m.parent_message_id, m.content, m.edited_at, m.deleted_at, m.created_at,
			       `+replyCountSub+`
			FROM messages m JOIN users u ON u.id = m.user_id
			WHERE m.channel_id = $1 AND m.deleted_at IS NULL AND m.parent_message_id IS NULL
			  AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)
			ORDER BY m.created_at DESC LIMIT $3
		`, channelID, beforeID, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*Message
	for rows.Next() {
		msg := &Message{}
		if err := rows.Scan(
			&msg.ID, &msg.ChannelID, &msg.UserID, &msg.DisplayName,
			&msg.ParentMessageID, &msg.Content, &msg.EditedAt, &msg.DeletedAt,
			&msg.CreatedAt, &msg.ReplyCount,
		); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}
	return messages, nil
}

func (r *Repository) GetThread(ctx context.Context, parentID string) ([]*Message, error) {
	rows, err := r.db.Query(ctx, `
		SELECT m.id, m.channel_id, m.user_id, u.display_name,
		       m.parent_message_id, m.content, m.edited_at, m.deleted_at, m.created_at,
		       0 AS reply_count
		FROM messages m JOIN users u ON u.id = m.user_id
		WHERE m.parent_message_id = $1 AND m.deleted_at IS NULL
		ORDER BY m.created_at ASC
	`, parentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*Message
	for rows.Next() {
		msg := &Message{}
		if err := rows.Scan(
			&msg.ID, &msg.ChannelID, &msg.UserID, &msg.DisplayName,
			&msg.ParentMessageID, &msg.Content, &msg.EditedAt, &msg.DeletedAt,
			&msg.CreatedAt, &msg.ReplyCount,
		); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}
	return messages, nil
}

// MarkRead updates last_read_at for a user in a channel.
func (r *Repository) MarkRead(ctx context.Context, channelID, userID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE channel_members
		SET last_read_at = now()
		WHERE channel_id = $1 AND user_id = $2
	`, channelID, userID)
	return err
}

// UnreadCount returns the number of messages after last_read_at.
func (r *Repository) UnreadCount(ctx context.Context, channelID, userID string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)::int
		FROM messages m
		WHERE m.channel_id = $1
		  AND m.deleted_at IS NULL
		  AND m.parent_message_id IS NULL
		  AND m.created_at > COALESCE(
		        (SELECT last_read_at FROM channel_members
		         WHERE channel_id = $1 AND user_id = $2),
		        '1970-01-01'::timestamptz
		      )
	`, channelID, userID).Scan(&count)
	return count, err
}

// UnreadCounts returns unread counts for all channels a user is in.
func (r *Repository) UnreadCounts(ctx context.Context, userID string) (map[string]int, error) {
	rows, err := r.db.Query(ctx, `
		SELECT cm.channel_id, COUNT(m.id)::int AS unread
		FROM channel_members cm
		LEFT JOIN messages m ON m.channel_id = cm.channel_id
		  AND m.deleted_at IS NULL
		  AND m.parent_message_id IS NULL
		  AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01'::timestamptz)
		WHERE cm.user_id = $1
		GROUP BY cm.channel_id
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var channelID string
		var count int
		if err := rows.Scan(&channelID, &count); err != nil {
			return nil, err
		}
		counts[channelID] = count
	}
	return counts, nil
}

func (r *Repository) SoftDelete(ctx context.Context, id, userID string) error {
	result, err := r.db.Exec(ctx, `
		UPDATE messages SET deleted_at = now()
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`, id, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) Update(ctx context.Context, id, userID, content string) (*Message, error) {
	msg := &Message{}
	err := r.db.QueryRow(ctx, `
		UPDATE messages SET content = $1, edited_at = now()
		WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
		RETURNING id, channel_id, user_id, parent_message_id, content,
		          edited_at, deleted_at, created_at, 0 AS reply_count
	`, content, id, userID).Scan(
		&msg.ID, &msg.ChannelID, &msg.UserID, &msg.ParentMessageID,
		&msg.Content, &msg.EditedAt, &msg.DeletedAt, &msg.CreatedAt,
		&msg.ReplyCount,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return msg, nil
}