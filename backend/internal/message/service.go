package message

import (
	"context"
	"errors"
)

var (
	ErrEmpty        = errors.New("content cannot be empty")
	ErrAccessDenied = errors.New("you can only edit or delete your own messages")
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// List returns a page of messages for a channel.
func (s *Service) List(ctx context.Context, channelID, beforeID string, limit int) (*ListResponse, error) {
	// Fetch one extra to determine if there are more pages
	msgs, err := s.repo.List(ctx, channelID, beforeID, limit+1)
	if err != nil {
		return nil, err
	}

	hasMore := len(msgs) > limit
	if hasMore {
		msgs = msgs[:limit]
	}

	var nextCursor *string
	if hasMore && len(msgs) > 0 {
		id := msgs[len(msgs)-1].ID
		nextCursor = &id
	}

	resp := make([]*Response, len(msgs))
	for i, m := range msgs {
		resp[i] = toResponse(m)
	}

	return &ListResponse{
		Data:       resp,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

// GetThread returns all replies to a parent message.
func (s *Service) GetThread(ctx context.Context, parentID string) ([]*Response, error) {
	msgs, err := s.repo.GetThread(ctx, parentID)
	if err != nil {
		return nil, err
	}

	resp := make([]*Response, len(msgs))
	for i, m := range msgs {
		resp[i] = toResponse(m)
	}
	return resp, nil
}

// Edit updates message content — only the author can edit.
func (s *Service) Edit(ctx context.Context, messageID, userID, content string) (*Response, error) {
	if content == "" {
		return nil, ErrEmpty
	}

	msg, err := s.repo.Update(ctx, messageID, userID, content)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return toResponse(msg), nil
}

// Delete soft-deletes a message — only the author can delete.
func (s *Service) Delete(ctx context.Context, messageID, userID string) error {
	return s.repo.SoftDelete(ctx, messageID, userID)
}

//  Helper

func toResponse(m *Message) *Response {
	return &Response{
		ID:              m.ID,
		ChannelID:       m.ChannelID,
		UserID:          m.UserID,
		DisplayName:     m.DisplayName,
		ParentMessageID: m.ParentMessageID,
		Content:         m.Content,
		EditedAt:        m.EditedAt,
		CreatedAt:       m.CreatedAt,
		ReplyCount:      0, // populated by repo on Day 13 if needed
	}
}