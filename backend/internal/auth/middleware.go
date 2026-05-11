package auth

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

const UserKey = "user" // key used to store claims in fiber context

// Middleware returns a Fiber handler that validates the JWT on every request.
// Attach it to any route group that requires authentication.
//
// Usage in main.go:
//
//	protected := api.Group("/", authMiddleware.Middleware())
func (s *Service) Middleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract token from Authorization: Bearer <token>
		header := c.Get("Authorization")
		if header == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "missing authorization header")
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return fiber.NewError(fiber.StatusUnauthorized, "authorization header must be: Bearer <token>")
		}

		claims, err := s.ValidateAccessToken(parts[1])
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
		}

		// Store claims in context so handlers can read them
		c.Locals(UserKey, claims)
		return c.Next()
	}
}

// GetClaims is a helper that extracts the authenticated user's claims
// from the Fiber context. Call this inside any protected handler.
//
//	claims := auth.GetClaims(c)
//	fmt.Println(claims.UserID)
func GetClaims(c *fiber.Ctx) *Claims {
	claims, _ := c.Locals(UserKey).(*Claims)
	return claims
}