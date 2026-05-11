package apperr

import "github.com/gofiber/fiber/v2"

// Common sentinel errors mapped to HTTP status codes.
// Use these in handlers instead of hardcoding status codes everywhere.

func BadRequest(msg string) error {
	return fiber.NewError(fiber.StatusBadRequest, msg)
}

func Unauthorized(msg string) error {
	return fiber.NewError(fiber.StatusUnauthorized, msg)
}

func Forbidden(msg string) error {
	return fiber.NewError(fiber.StatusForbidden, msg)
}

func NotFound(msg string) error {
	return fiber.NewError(fiber.StatusNotFound, msg)
}

func Conflict(msg string) error {
	return fiber.NewError(fiber.StatusConflict, msg)
}

func Internal(msg string) error {
	return fiber.NewError(fiber.StatusInternalServerError, msg)
}