package workspace

import (
	"context"
	"errors"
	"regexp"
	"strings"
)

var slugRegex = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Create makes a new workspace and adds the creator as OWNER.
func (s *Service) Create(ctx context.Context, req CreateRequest, ownerID string) (*Response, error) {
	if err := validateCreate(req); err != nil {
		return nil, err
	}

	// Normalise slug — lowercase, trim spaces
	req.Slug = strings.ToLower(strings.TrimSpace(req.Slug))

	ws, err := s.repo.Create(ctx, req.Name, req.Slug, ownerID)
	if err != nil {
		return nil, err
	}

	// Add creator as OWNER member
	if err := s.repo.AddMember(ctx, ws.ID, ownerID, "OWNER"); err != nil {
		return nil, err
	}

	return toResponse(ws), nil
}

// Get returns a workspace — only if the requesting user is a member.
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

// List returns all workspaces the user belongs to.
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

// Join adds a user to a workspace as MEMBER.
func (s *Service) Join(ctx context.Context, workspaceID, userID string) error {
	// Verify workspace exists
	if _, err := s.repo.FindByID(ctx, workspaceID); err != nil {
		return err
	}
	return s.repo.AddMember(ctx, workspaceID, userID, "MEMBER")
}

// Leave removes a user from a workspace.
func (s *Service) Leave(ctx context.Context, workspaceID, userID string) error {
	return s.repo.RemoveMember(ctx, workspaceID, userID)
}

// ListMembers returns all members — only for existing members.
func (s *Service) ListMembers(ctx context.Context, workspaceID, userID string) ([]*MemberResponse, error) {
	ok, err := s.repo.IsMember(ctx, workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrNotMember
	}

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
	return resp, nil
}

// ── Helpers ───────────────────────────────────────────────────

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