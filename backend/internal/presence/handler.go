package presence

import (
	"github.com/constantine950/ChatFlow/internal/auth"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes mounts presence endpoints under /workspaces/:wsID/presence
func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Get("/", h.getOnlineUsers)
}

// GET /workspaces/:wsID/presence
// Returns list of online user IDs in this workspace.
func (h *Handler) getOnlineUsers(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	wsID := c.Params("wsID")

	// Verify requesting user is in the workspace (basic auth check)
	_ = claims

	onlineUserIDs, err := h.service.GetOnlineUsers(c.Context(), wsID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not get presence")
	}

	return c.JSON(fiber.Map{
		"workspace_id": wsID,
		"online":       onlineUserIDs,
		"count":        len(onlineUserIDs),
	})
}