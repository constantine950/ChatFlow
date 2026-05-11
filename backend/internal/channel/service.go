package channel

import (
	"context"
	"errors"
	"strings"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, workspaceID string, req CreateRequest, userID string) (*Response, error) {
	if err := validateCreate(req); err != nil {
		return nil, err
	}

	req.Name = strings.ToLower(strings.TrimSpace(req.Name))

	var topic *string
	if req.Topic != "" {
		t := strings.TrimSpace(req.Topic)
		topic = &t
	}

	ch, err := s.repo.Create(ctx, workspaceID, req.Name, topic, req.IsPrivate, userID)
	if err != nil {
		return nil, err
	}

	// Add creator as first member
	if err := s.repo.AddMember(ctx, ch.ID, userID); err != nil {
		return nil, err
	}

	return toResponse(ch), nil
}

func (s *Service) Get(ctx context.Context, channelID, userID string) (*Response, error) {
	ch, err := s.repo.FindByID(ctx, channelID)
	if err != nil {
		return nil, err
	}

	// Private channel — must be a member to view
	if ch.IsPrivate {
		ok, err := s.repo.IsMember(ctx, channelID, userID)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, ErrAccessDenied
		}
	}

	return toResponse(ch), nil
}

func (s *Service) List(ctx context.Context, workspaceID, userID string) ([]*Response, error) {
	channels, err := s.repo.ListByWorkspace(ctx, workspaceID, userID)
	if err != nil {
		return nil, err
	}

	resp := make([]*Response, len(channels))
	for i, ch := range channels {
		resp[i] = toResponse(ch)
	}
	return resp, nil
}

func (s *Service) Join(ctx context.Context, channelID, userID string) error {
	ch, err := s.repo.FindByID(ctx, channelID)
	if err != nil {
		return err
	}
	if ch.IsPrivate {
		return ErrAccessDenied
	}
	return s.repo.AddMember(ctx, channelID, userID)
}

func (s *Service) Leave(ctx context.Context, channelID, userID string) error {
	return s.repo.RemoveMember(ctx, channelID, userID)
}

func (s *Service) Delete(ctx context.Context, channelID, userID string) error {
	ch, err := s.repo.FindByID(ctx, channelID)
	if err != nil {
		return err
	}
	// Only the creator can delete
	if ch.CreatedBy != userID {
		return ErrAccessDenied
	}
	return s.repo.Delete(ctx, channelID)
}

func (s *Service) ListMembers(ctx context.Context, channelID, userID string) ([]*MemberResponse, error) {
	ok, err := s.repo.IsMember(ctx, channelID, userID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrNotMember
	}

	members, err := s.repo.ListMembers(ctx, channelID)
	if err != nil {
		return nil, err
	}

	resp := make([]*MemberResponse, len(members))
	for i, m := range members {
		resp[i] = &MemberResponse{
			UserID:      m.UserID,
			DisplayName: m.DisplayName,
			AvatarURL:   m.AvatarURL,
			LastReadAt:  m.LastReadAt,
			JoinedAt:    m.JoinedAt,
		}
	}
	return resp, nil
}

// Helpers

func validateCreate(req CreateRequest) error {
	if strings.TrimSpace(req.Name) == "" {
		return errors.New("name is required")
	}
	return nil
}

func toResponse(ch *Channel) *Response {
	return &Response{
		ID:          ch.ID,
		WorkspaceID: ch.WorkspaceID,
		Name:        ch.Name,
		Topic:       ch.Topic,
		IsPrivate:   ch.IsPrivate,
		IsDM:        ch.IsDM,
		CreatedBy:   ch.CreatedBy,
		CreatedAt:   ch.CreatedAt,
	}
}