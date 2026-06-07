package workspace

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

var slugRegex = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

const memberCacheTTL = 5 * time.Minute

type Service struct {
	repo  *Repository
	redis *redis.Client
}

func NewService(repo *Repository, redis *redis.Client) *Service {
	return &Service{repo: repo, redis: redis}
}

func (s *Service) Create(ctx context.Context, req CreateRequest, ownerID string) (*Response, error) {
	if err := validateCreate(req); err != nil {
		return nil, err
	}
	req.Slug = strings.ToLower(strings.TrimSpace(req.Slug))
	ws, err := s.repo.Create(ctx, req.Name, req.Slug, ownerID)
	if err != nil {
		return nil, err
	}
	if err := s.repo.AddMember(ctx, ws.ID, ownerID, "OWNER"); err != nil {
		return nil, err
	}
	return toResponse(ws), nil
}

func (s *Service) Get(ctx context.Context, workspaceID, userID string) (*Response, error) {
	ok, err := s.repo.IsMember(ctx, workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrNotMember
	}
	ws, err := s.repo.FindByID(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	return toResponse(ws), nil
}

func (s *Service) List(ctx context.Context, userID string) ([]*Response, error) {
	workspaces, err := s.repo.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	resp := make([]*Response, len(workspaces))
	for i, ws := range workspaces {
		resp[i] = toResponse(ws)
	}
	return resp, nil
}

func (s *Service) Join(ctx context.Context, workspaceID, userID string) error {
	if _, err := s.repo.FindByID(ctx, workspaceID); err != nil {
		return err
	}
	if err := s.repo.AddMember(ctx, workspaceID, userID, "MEMBER"); err != nil {
		return err
	}
	// Invalidate member cache
	s.redis.Del(ctx, memberCacheKey(workspaceID))
	return nil
}

func (s *Service) Leave(ctx context.Context, workspaceID, userID string) error {
	if err := s.repo.RemoveMember(ctx, workspaceID, userID); err != nil {
		return err
	}
	s.redis.Del(ctx, memberCacheKey(workspaceID))
	return nil
}

// ListMembers returns members with Redis caching.
func (s *Service) ListMembers(ctx context.Context, workspaceID, userID string) ([]*MemberResponse, error) {
	ok, err := s.repo.IsMember(ctx, workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrNotMember
	}

	cacheKey := memberCacheKey(workspaceID)

	// Try cache first
	if cached, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
		var members []*MemberResponse
		if json.Unmarshal([]byte(cached), &members) == nil {
			return members, nil
		}
	}

	// Cache miss — query DB
	members, err := s.repo.ListMembers(ctx, workspaceID)
	if err != nil {
		return nil, err
	}

	resp := make([]*MemberResponse, len(members))
	for i, m := range members {
		resp[i] = &MemberResponse{
			UserID:      m.UserID,
			DisplayName: m.DisplayName,
			AvatarURL:   m.AvatarURL,
			Role:        m.Role,
			JoinedAt:    m.JoinedAt,
		}
	}

	// Store in cache
	if data, err := json.Marshal(resp); err == nil {
		s.redis.Set(ctx, cacheKey, data, memberCacheTTL)
	}

	return resp, nil
}

func memberCacheKey(workspaceID string) string {
	return fmt.Sprintf("members:%s", workspaceID)
}

func validateCreate(req CreateRequest) error {
	if strings.TrimSpace(req.Name) == "" {
		return errors.New("name is required")
	}
	if req.Slug == "" {
		return errors.New("slug is required")
	}
	if !slugRegex.MatchString(strings.ToLower(req.Slug)) {
		return errors.New("slug must be lowercase letters, numbers, and hyphens only")
	}
	return nil
}

func toResponse(ws *Workspace) *Response {
	return &Response{
		ID:        ws.ID,
		Name:      ws.Name,
		Slug:      ws.Slug,
		OwnerID:   ws.OwnerID,
		CreatedAt: ws.CreatedAt,
	}
}