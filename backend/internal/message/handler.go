package message

import (
	"errors"
	"strconv"

	"github.com/constantine950/ChatFlow/internal/auth"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes mounts message endpoints.
//
//	channelRouter  → /channels/:id         (list messages)
//	messageRouter  → /messages             (thread, edit, delete)
func (h *Handler) RegisterRoutes(channelRouter fiber.Router, messageRouter fiber.Router) {
	channelRouter.Get("/:id/messages", h.list)

	messageRouter.Get("/:id/thread",  h.getThread)
	messageRouter.Patch("/:id",       h.edit)
	messageRouter.Delete("/:id",      h.delete)
}

// GET /channels/:id/messages?before=<cursor>&limit=50
func (h *Handler) list(c *fiber.Ctx) error {
	channelID := c.Params("id")
	beforeID  := c.Query("before", "")
	limit, _  := strconv.Atoi(c.Query("limit", "50"))

	resp, err := h.service.List(c.Context(), channelID, beforeID, limit)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not fetch messages")
	}

	return c.JSON(resp)
}

// GET /messages/:id/thread
func (h *Handler) getThread(c *fiber.Ctx) error {
	replies, err := h.service.GetThread(c.Context(), c.Params("id"))
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not fetch thread")
	}

	return c.JSON(fiber.Map{
		"parent_id": c.Params("id"),
		"data":      replies,
		"count":     len(replies),
	})
}

// PATCH /messages/:id
func (h *Handler) edit(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)

	var req EditRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	msg, err := h.service.Edit(c.Context(), c.Params("id"), claims.UserID, req.Content)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "message not found")
		}
		if errors.Is(err, ErrEmpty) {
			return fiber.NewError(fiber.StatusBadRequest, "content cannot be empty")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "could not edit message")
	}

	return c.JSON(msg)
}

// DELETE /messages/:id
func (h *Handler) delete(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)

	if err := h.service.Delete(c.Context(), c.Params("id"), claims.UserID); err != nil {
		if errors.Is(err, ErrNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "message not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "could not delete message")
	}

	return c.SendStatus(fiber.StatusNoContent)
}