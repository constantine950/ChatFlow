package message

import (
	"github.com/constantine950/ChatFlow/internal/auth"
	"github.com/gofiber/fiber/v2"
)

type ReactionsHandler struct {
	service    *ReactionsService
	broadcastFn func(channelID string, messageID string, summaries []*ReactionSummary)
}

// NewReactionsHandler creates the handler.
// broadcastFn is injected from main.go so the handler can trigger
// a WS broadcast without importing the websocket package.
func NewReactionsHandler(
	service *ReactionsService,
	broadcastFn func(channelID string, messageID string, summaries []*ReactionSummary),
) *ReactionsHandler {
	return &ReactionsHandler{service: service, broadcastFn: broadcastFn}
}

// RegisterRoutes mounts reaction endpoints under /messages
func (h *ReactionsHandler) RegisterRoutes(router fiber.Router) {
	router.Post("/:id/reactions",          h.toggle)
	router.Get("/:id/reactions",           h.list)
}

// POST /messages/:id/reactions
// Body: { "emoji": "👍" }
func (h *ReactionsHandler) toggle(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	messageID := c.Params("id")

	var body struct {
		Emoji     string `json:"emoji"`
		ChannelID string `json:"channel_id"` // needed for WS broadcast
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if body.Emoji == "" {
		return fiber.NewError(fiber.StatusBadRequest, "emoji is required")
	}

	summaries, err := h.service.Toggle(c.Context(), messageID, claims.UserID, body.Emoji)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not toggle reaction")
	}

	// Broadcast updated reaction counts to channel subscribers
	if body.ChannelID != "" && h.broadcastFn != nil {
		h.broadcastFn(body.ChannelID, messageID, summaries)
	}

	return c.JSON(fiber.Map{
		"message_id": messageID,
		"reactions":  summaries,
	})
}

// GET /messages/:id/reactions
func (h *ReactionsHandler) list(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	messageID := c.Params("id")

	summaries, err := h.service.GetSummaries(c.Context(), messageID, claims.UserID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not get reactions")
	}

	return c.JSON(fiber.Map{
		"message_id": messageID,
		"reactions":  summaries,
	})
}