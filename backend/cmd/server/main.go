package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file in development
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName: "ChatFlow API v1",
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(logger.New())

	// Health check — used by Docker and load balancers
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "chatflow-api",
		})
	})

	// API v1 group — routes will be registered here day by day
	api := app.Group("/api/v1")
	_ = api // silence unused warning until Day 4

	// TODO Day 4:  register auth routes
	// TODO Day 5:  register workspace + channel routes
	// TODO Day 6:  register WebSocket endpoint
	// TODO Day 8+: register message routes

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("ChatFlow API starting on :%s\n", port)
	log.Fatal(app.Listen(":" + port))
}