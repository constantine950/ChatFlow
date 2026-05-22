package message

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Reaction represents a single emoji reaction row.
type Reaction struct {
	ID        string `db:"id"`
	MessageID string `db:"message_id"`
	UserID    string `db:"user_id"`
	Emoji     string `db:"emoji"`
}

// ReactionSummary is the aggregated view returned to clients.
type ReactionSummary struct {
	Emoji   string   `json:"emoji"`
	Count   int      `json:"count"`
	UserIDs []string `json:"user_ids"` // who reacted
	Mine    bool     `json:"mine"`     // did the requesting user react?
}

type ReactionsRepository struct {
	db *pgxpool.Pool
}

func NewReactionsRepository(db *pgxpool.Pool) *ReactionsRepository {
	return &ReactionsRepository{db: db}
}

// Toggle adds the reaction if it doesn't exist, removes it if it does.
// Returns true if the reaction was added, false if removed.
func (r *ReactionsRepository) Toggle(ctx context.Context, messageID, userID, emoji string) (bool, error) {
	// Try to delete first
	result, err := r.db.Exec(ctx, `
		DELETE FROM message_reactions
		WHERE message_id = $1 AND user_id = $2 AND emoji = $3
	`, messageID, userID, emoji)
	if err != nil {
		return false, err
	}

	if result.RowsAffected() > 0 {
		// Was deleted — reaction removed
		return false, nil
	}

	// Didn't exist — insert it
	_, err = r.db.Exec(ctx, `
		INSERT INTO message_reactions (message_id, user_id, emoji)
		VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING
	`, messageID, userID, emoji)
	if err != nil {
		return false, err
	}

	return true, nil
}

// GetSummaries returns aggregated reaction counts for a message.
func (r *ReactionsRepository) GetSummaries(ctx context.Context, messageID, requestingUserID string) ([]*ReactionSummary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			emoji,
			COUNT(*)::int             AS count,
			ARRAY_AGG(user_id::text)  AS user_ids,
			BOOL_OR(user_id = $2)     AS mine
		FROM message_reactions
		WHERE message_id = $1
		GROUP BY emoji
		ORDER BY MIN(created_at)
	`, messageID, requestingUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var summaries []*ReactionSummary
	for rows.Next() {
		s := &ReactionSummary{}
		if err := rows.Scan(&s.Emoji, &s.Count, &s.UserIDs, &s.Mine); err != nil {
			return nil, err
		}
		summaries = append(summaries, s)
	}
	return summaries, nil
}