package search

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

// RegisterRoutes mounts search under /workspaces/:wsID/search
func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Get("/", h.search)
}

// GET /workspaces/:wsID/search?q=kafka
func (h *Handler) search(c *fiber.Ctx) error {
	_ = auth.GetClaims(c) // auth already verified by middleware

	wsID  := c.Params("wsID")
	query := c.Query("q", "")

	if query == "" {
		return fiber.NewError(fiber.StatusBadRequest, "q is required")
	}
	if len(query) < 2 {
		return fiber.NewError(fiber.StatusBadRequest, "q must be at least 2 characters")
	}

	results, err := h.service.Search(c.Context(), wsID, query)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "search failed")
	}

	return c.JSON(fiber.Map{
		"query":   query,
		"count":   len(results),
		"results": results,
	})
}