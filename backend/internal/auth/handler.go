package auth

import (
	"errors"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes mounts all auth endpoints onto the given router group.
// Call this from main.go: auth.RegisterRoutes(api.Group("/auth"))
func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Post("/register", h.register)
	router.Post("/login", h.login)
	router.Post("/refresh", h.refresh)
	router.Delete("/logout", h.logout)
}

// POST /auth/register
func (h *Handler) register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	if err := validateRegister(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	resp, err := h.service.Register(c.Context(), req)
	if err != nil {
		if errors.Is(err, ErrEmailTaken) {
			return fiber.NewError(fiber.StatusConflict, "email already in use")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "could not create account")
	}

	return c.Status(fiber.StatusCreated).JSON(resp)
}

// POST /auth/login
func (h *Handler) login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	resp, err := h.service.Login(c.Context(), req)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid email or password")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "login failed")
	}

	return c.JSON(resp)
}

// POST /auth/refresh
func (h *Handler) refresh(c *fiber.Ctx) error {
	var req RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	if req.RefreshToken == "" {
		return fiber.NewError(fiber.StatusBadRequest, "refresh_token is required")
	}

	resp, err := h.service.Refresh(c.Context(), req.RefreshToken)
	if err != nil {
		if errors.Is(err, ErrInvalidToken) {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired refresh token")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "could not refresh token")
	}

	return c.JSON(resp)
}

// DELETE /auth/logout
func (h *Handler) logout(c *fiber.Ctx) error {
	var req RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	if req.RefreshToken != "" {
		// Best-effort — don't fail the logout if Redis is down
		_ = h.service.Logout(c.Context(), req.RefreshToken)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// Validation

func validateRegister(req RegisterRequest) error {
	if req.Email == "" {
		return errors.New("email is required")
	}
	if len(req.Password) < 8 {
		return errors.New("password must be at least 8 characters")
	}
	if req.DisplayName == "" {
		return errors.New("display_name is required")
	}
	return nil
}