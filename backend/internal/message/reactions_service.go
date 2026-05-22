package message

import "context"

type ReactionsService struct {
	repo *ReactionsRepository
}

func NewReactionsService(repo *ReactionsRepository) *ReactionsService {
	return &ReactionsService{repo: repo}
}

// Toggle adds or removes a reaction and returns the updated summaries.
func (s *ReactionsService) Toggle(ctx context.Context, messageID, userID, emoji string) ([]*ReactionSummary, error) {
	if _, err := s.repo.Toggle(ctx, messageID, userID, emoji); err != nil {
		return nil, err
	}
	return s.repo.GetSummaries(ctx, messageID, userID)
}

// GetSummaries returns all reaction counts for a message.
func (s *ReactionsService) GetSummaries(ctx context.Context, messageID, userID string) ([]*ReactionSummary, error) {
	return s.repo.GetSummaries(ctx, messageID, userID)
}