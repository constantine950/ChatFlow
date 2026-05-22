package search

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Result is a single search hit returned to the client.
type Result struct {
	MessageID   string    `json:"message_id"`
	ChannelID   string    `json:"channel_id"`
	ChannelName string    `json:"channel_name"`
	UserID      string    `json:"user_id"`
	DisplayName string    `json:"display_name"`
	Snippet     string    `json:"snippet"`     // ts_headline — match highlighted
	Rank        float32   `json:"rank"`        // ts_rank — relevance score
	CreatedAt   time.Time `json:"created_at"`
}

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

// Search runs a full-text query scoped to a workspace.
// Results are ranked by relevance (ts_rank) and limited to 25.
func (s *Service) Search(ctx context.Context, workspaceID, query string) ([]*Result, error) {
	if query == "" {
		return []*Result{}, nil
	}

	// plainto_tsquery converts plain text to a tsquery safely
	// (no need for the user to know tsquery syntax)
	sql := `
		SELECT
			m.id,
			m.channel_id,
			c.name                                          AS channel_name,
			m.user_id,
			u.display_name,
			ts_headline(
				'english',
				m.content,
				plainto_tsquery('english', $2),
				'MaxWords=15, MinWords=5, ShortWord=3,
				 HighlightAll=false, MaxFragments=1,
				 StartSel=<mark>, StopSel=</mark>'
			)                                               AS snippet,
			ts_rank(m.search_vector, plainto_tsquery('english', $2)) AS rank,
			m.created_at
		FROM messages m
		JOIN channels  c ON c.id = m.channel_id
		JOIN users     u ON u.id = m.user_id
		WHERE c.workspace_id = $1
		  AND m.deleted_at IS NULL
		  AND m.search_vector @@ plainto_tsquery('english', $2)
		ORDER BY rank DESC, m.created_at DESC
		LIMIT 25
	`

	rows, err := s.db.Query(ctx, sql, workspaceID, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*Result
	for rows.Next() {
		r := &Result{}
		if err := rows.Scan(
			&r.MessageID,
			&r.ChannelID,
			&r.ChannelName,
			&r.UserID,
			&r.DisplayName,
			&r.Snippet,
			&r.Rank,
			&r.CreatedAt,
		); err != nil {
			return nil, err
		}
		results = append(results, r)
	}

	if results == nil {
		results = []*Result{}
	}

	return results, nil
}