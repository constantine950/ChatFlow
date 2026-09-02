package message

import (
	"errors"
	"strconv"

	"github.com/constantine950/ChatFlow/internal/auth"
	"github.com/gofiber/fiber/v2"
)

// BroadcastFn is called after edit/delete to notify channel subscribers.
type BroadcastFn func(eventType string, channelID string, payload interface{})

type Handler struct {
	service     *Service
	broadcastFn BroadcastFn
}

func NewHandler(service *Service, broadcastFn ...BroadcastFn) *Handler {
	h := &Handler{service: service}
	if len(broadcastFn) > 0 {
		h.broadcastFn = broadcastFn[0]
	}
	return h
}

func (h *Handler) RegisterRoutes(channelRouter fiber.Router, messageRouter fiber.Router) {
	channelRouter.Get("/:id/messages", h.list)
	channelRouter.Post("/:id/read",    h.markRead)
	channelRouter.Get("/:id/unread",   h.unreadCount)

	messageRouter.Get("/:id/thread", h.getThread)
	messageRouter.Patch("/:id",      h.edit)
	messageRouter.Delete("/:id",     h.delete)
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

// POST /channels/:id/read
func (h *Handler) markRead(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	if err := h.service.repo.MarkRead(c.Context(), c.Params("id"), claims.UserID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not mark as read")
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// GET /channels/:id/unread
func (h *Handler) unreadCount(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	count, err := h.service.repo.UnreadCount(c.Context(), c.Params("id"), claims.UserID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not get unread count")
	}
	return c.JSON(fiber.Map{"channel_id": c.Params("id"), "unread": count})
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

	// Broadcast to channel subscribers
	if h.broadcastFn != nil {
		h.broadcastFn("message.updated", msg.ChannelID, fiber.Map{
			"id":        msg.ID,
			"channel_id": msg.ChannelID,
			"content":   msg.Content,
			"edited_at": msg.EditedAt,
		})
	}

	return c.JSON(msg)
}

// DELETE /messages/:id
func (h *Handler) delete(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)

	// Fetch channel ID before deleting so we can broadcast
	// We need the message to know its channel
	messageID := c.Params("id")

	if err := h.service.Delete(c.Context(), messageID, claims.UserID); err != nil {
		if errors.Is(err, ErrNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "message not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "could not delete message")
	}

	// Broadcast delete — we pass the channel_id via query param from the client
	// since we soft-deleted and can't fetch it anymore easily
	if h.broadcastFn != nil {
		channelID := c.Query("channel_id", "")
		if channelID != "" {
			h.broadcastFn("message.deleted", channelID, fiber.Map{
				"id":         messageID,
				"channel_id": channelID,
			})
		}
	}

	return c.SendStatus(fiber.StatusNoContent)
}