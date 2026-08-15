package workspace

import (
	"errors"

	"github.com/constantine950/ChatFlow/internal/auth"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Post("/",                       h.create)
	router.Get("/",                        h.list)
	router.Get("/:id",                     h.get)
	router.Post("/:id/members",            h.join)
	router.Delete("/:id/members/:userID",  h.removeMember)
	router.Get("/:id/members",             h.listMembers)
}

// POST /workspaces
func (h *Handler) create(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	var req CreateRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	resp, err := h.service.Create(c.Context(), req, claims.UserID)
	if err != nil {
		if errors.Is(err, ErrSlugTaken) {
			return fiber.NewError(fiber.StatusConflict, "slug already in use")
		}
		if isValidationError(err) {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		return fiber.NewError(fiber.StatusInternalServerError, "could not create workspace")
	}
	return c.Status(fiber.StatusCreated).JSON(resp)
}

// GET /workspaces
func (h *Handler) list(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	workspaces, err := h.service.List(c.Context(), claims.UserID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not list workspaces")
	}
	return c.JSON(fiber.Map{"data": workspaces})
}

// GET /workspaces/:id
func (h *Handler) get(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	ws, err := h.service.Get(c.Context(), c.Params("id"), claims.UserID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "workspace not found")
		}
		if errors.Is(err, ErrNotMember) {
			return fiber.NewError(fiber.StatusForbidden, "you are not a member of this workspace")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "could not get workspace")
	}
	return c.JSON(ws)
}

// POST /workspaces/:id/members
func (h *Handler) join(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	if err := h.service.Join(c.Context(), c.Params("id"), claims.UserID); err != nil {
		if errors.Is(err, ErrNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "workspace not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "could not join workspace")
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// DELETE /workspaces/:id/members/:userID
func (h *Handler) removeMember(c *fiber.Ctx) error {
	if err := h.service.Leave(c.Context(), c.Params("id"), c.Params("userID")); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not remove member")
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// GET /workspaces/:id/members
func (h *Handler) listMembers(c *fiber.Ctx) error {
	claims := auth.GetClaims(c)
	members, err := h.service.ListMembers(c.Context(), c.Params("id"), claims.UserID)
	if err != nil {
		if errors.Is(err, ErrNotMember) {
			return fiber.NewError(fiber.StatusForbidden, "you are not a member of this workspace")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "could not list members")
	}
	return c.JSON(fiber.Map{"data": members})
}

func isValidationError(err error) bool {
	msg := err.Error()
	return msg == "name is required" ||
		msg == "slug is required" ||
		msg == "slug must be lowercase letters, numbers, and hyphens only"
}