package channel

import (
	"errors"
	"time"

	"github.com/constantine950/ChatFlow/internal/auth"
	"github.com/gofiber/fiber/v2"
)

// BroadcastFn is called after a channel is created to notify all workspace members.
type BroadcastFn func(workspaceID string, channelID string, name string, topic string, isPrivate bool, createdBy string, createdAt time.Time)

type Handler struct {
	service     *Service
	broadcastFn BroadcastFn
}

func NewHandler(service *Service, broadcastFn BroadcastFn) *Handler {
	return &Handler{service: service, broadcastFn: broadcastFn}
}

func (h *Handler) RegisterRoutes(workspaceRouter fiber.Router, channelRouter fiber.Router) {
	workspaceRouter.Post("/",  h.create)
	workspaceRouter.Get("/",   h.list)

	channelRouter.Get("/:id",            h.get)
	channelRouter.Delete("/:id",         h.delete)
	channelRouter.Post("/:id/members",   h.join)
	channelRouter.Delete("/:id/members", h.leave)
	channelRouter.Get("/:id/members",    h.listMembers)
}

// POST /workspaces/:wsID/channels
func (h *Handler) create(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	wsID := c.Params("wsID")

	var req CreateRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	resp, err := h.service.Create(c.Context(), wsID, req, claims.UserID)
	if err != nil {
		if errors.Is(err, ErrNameTaken) {
			return fiber.NewError(fiber.StatusConflict, "channel name already in use")
		}
		if err.Error() == "name is required" {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		return fiber.NewError(fiber.StatusInternalServerError, "could not create channel")
	}

	// Broadcast to all workspace members via WebSocket
	if h.broadcastFn != nil {
		topic := ""
		if resp.Topic != nil {
			topic = *resp.Topic
		}
		h.broadcastFn(wsID, resp.ID, resp.Name, topic, resp.IsPrivate, resp.CreatedBy, resp.CreatedAt)
	}

	return c.Status(fiber.StatusCreated).JSON(resp)
}

// GET /workspaces/:wsID/channels
func (h *Handler) list(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	channels, err := h.service.List(c.Context(), c.Params("wsID"), claims.UserID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not list channels")
	}
	return c.JSON(fiber.Map{"data": channels})
}

// GET /channels/:id
func (h *Handler) get(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	ch, err := h.service.Get(c.Context(), c.Params("id"), claims.UserID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "channel not found")
		}
		if errors.Is(err, ErrAccessDenied) {
			return fiber.NewError(fiber.StatusForbidden, "access denied")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "could not get channel")
	}
	return c.JSON(ch)
}

// DELETE /channels/:id
func (h *Handler) delete(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	if err := h.service.Delete(c.Context(), c.Params("id"), claims.UserID); err != nil {
		if errors.Is(err, ErrNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "channel not found")
		}
		if errors.Is(err, ErrAccessDenied) {
			return fiber.NewError(fiber.StatusForbidden, "only the channel creator can delete it")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "could not delete channel")
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// POST /channels/:id/members
func (h *Handler) join(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	if err := h.service.Join(c.Context(), c.Params("id"), claims.UserID); err != nil {
		if errors.Is(err, ErrNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "channel not found")
		}
		if errors.Is(err, ErrAccessDenied) {
			return fiber.NewError(fiber.StatusForbidden, "cannot join a private channel directly")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "could not join channel")
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// DELETE /channels/:id/members
func (h *Handler) leave(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	if err := h.service.Leave(c.Context(), c.Params("id"), claims.UserID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not leave channel")
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// GET /channels/:id/members
func (h *Handler) listMembers(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	members, err := h.service.ListMembers(c.Context(), c.Params("id"), claims.UserID)
	if err != nil {
		if errors.Is(err, ErrNotMember) {
			return fiber.NewError(fiber.StatusForbidden, "you are not a member of this channel")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "could not list members")
	}
	return c.JSON(fiber.Map{"data": members})
}