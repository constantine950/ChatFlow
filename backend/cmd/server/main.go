package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/constantine950/ChatFlow/internal/auth"
	"github.com/constantine950/ChatFlow/internal/channel"
	"github.com/constantine950/ChatFlow/internal/workspace"
	"github.com/constantine950/ChatFlow/pkg/cache"
	"github.com/constantine950/ChatFlow/pkg/config"
	"github.com/constantine950/ChatFlow/pkg/database"
)

func main() {
	// Config
	cfg := config.Load()

	// Database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: failed to connect: %v", err)
	}
	defer db.Close()
	log.Println("database: connected")

	// Redis
	redisClient, err := cache.Connect(cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis: failed to connect: %v", err)
	}
	defer redisClient.Close()
	log.Println("redis: connected")

	// Wire up layers
	authRepo    := auth.NewRepository(db)
	authService := auth.NewService(authRepo, redisClient, cfg.JWTSecret)
	authHandler := auth.NewHandler(authService)

	wsRepo     := workspace.NewRepository(db)
	wsService  := workspace.NewService(wsRepo)
	wsHandler  := workspace.NewHandler(wsService)

	chRepo     := channel.NewRepository(db)
	chService  := channel.NewService(chRepo)
	chHandler  := channel.NewHandler(chService)

	// Fiber app
	app := fiber.New(fiber.Config{
		AppName: "ChatFlow API v1",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			msg  := "internal server error"
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
				msg  = e.Message
			}
			return c.Status(code).JSON(fiber.Map{"error": msg})
		},
	})

	app.Use(recover.New())
	app.Use(logger.New())

	// Routes
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "chatflow-api"})
	})

	api := app.Group("/api/v1")

	// Public
	authHandler.RegisterRoutes(api.Group("/auth"))

	// Protected — all routes below require a valid JWT
	protected := api.Group("/", authService.Middleware())

	// Workspaces
	wsHandler.RegisterRoutes(protected.Group("/workspaces"))

	// Channels — two mount points
	chHandler.RegisterRoutes(
		protected.Group("/workspaces/:wsID/channels"),
		protected.Group("/channels"),
	)

	// TODO Day 6:  WebSocket endpoint
	// TODO Day 8:  Message routes

	// Start
	log.Printf("ChatFlow API starting on :%s\n", cfg.Port)
	log.Fatal(app.Listen(":" + cfg.Port))
}