package main

import (
	"context"
	"log"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	fiberws "github.com/gofiber/websocket/v2"

	"github.com/constantine950/ChatFlow/internal/auth"
	"github.com/constantine950/ChatFlow/internal/channel"
	"github.com/constantine950/ChatFlow/internal/kafka"
	"github.com/constantine950/ChatFlow/internal/message"
	"github.com/constantine950/ChatFlow/internal/presence"
	"github.com/constantine950/ChatFlow/internal/search"
	ws "github.com/constantine950/ChatFlow/internal/websocket"
	"github.com/constantine950/ChatFlow/internal/workspace"
	"github.com/constantine950/ChatFlow/pkg/cache"
	"github.com/constantine950/ChatFlow/pkg/config"
	"github.com/constantine950/ChatFlow/pkg/database"
)

func main() {
	cfg := config.Load()

	// ── Database ──────────────────────────────────────────────
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: failed to connect: %v", err)
	}
	defer db.Close()
	log.Println("database: connected")

	// ── Redis ─────────────────────────────────────────────────
	redisClient, err := cache.Connect(cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis: failed to connect: %v", err)
	}
	defer redisClient.Close()
	log.Println("redis: connected")

	// ── Kafka ─────────────────────────────────────────────────
	brokers := strings.Split(cfg.KafkaBrokers, ",")
	if err := kafka.EnsureTopics(brokers); err != nil {
		log.Printf("kafka: could not ensure topics: %v", err)
	}
	producer := kafka.NewProducer(brokers)
	defer producer.Close()
	log.Println("kafka: producer ready")

	// ── Wire layers ───────────────────────────────────────────
	authRepo    := auth.NewRepository(db)
	authService := auth.NewService(authRepo, redisClient, cfg.JWTSecret)
	authHandler := auth.NewHandler(authService)

	// Workspace service now gets Redis for member caching
	wsRepo    := workspace.NewRepository(db)
	wsService := workspace.NewService(wsRepo, redisClient)
	wsHandler := workspace.NewHandler(wsService)

	chRepo    := channel.NewRepository(db)
	chService := channel.NewService(chRepo)
	chHandler := channel.NewHandler(chService)

	msgRepo    := message.NewRepository(db)
	msgService := message.NewService(msgRepo)
	msgHandler := message.NewHandler(msgService)

	rxRepo    := message.NewReactionsRepository(db)
	rxService := message.NewReactionsService(rxRepo)

	presenceSvc     := presence.NewService(redisClient)
	presenceHandler := presence.NewHandler(presenceSvc)
	typingSvc       := presence.NewTypingService(redisClient)

	searchService := search.NewService(db)
	searchHandler := search.NewHandler(searchService)

	// ── WebSocket hub ─────────────────────────────────────────
	hub := ws.NewHub(producer, presenceSvc, typingSvc)
	go hub.Run()

	typingCtx, cancelTyping := context.WithCancel(context.Background())
	defer cancelTyping()
	go hub.StartTypingSubscriber(typingCtx)

	// ── Reactions handler ─────────────────────────────────────
	rxHandler := message.NewReactionsHandler(rxService, func(channelID, messageID string, summaries []*message.ReactionSummary) {
		hub.BroadcastToChannel(channelID, ws.Event{
			Type: ws.EventReactionUpdate,
			Payload: ws.ReactionUpdatePayload{
				MessageID: messageID,
				Reactions: summaries,
			},
		})
	})

	// ── Kafka consumer ────────────────────────────────────────
	consumer := kafka.NewConsumer(brokers, func(ctx context.Context, msg kafka.ChatMessage) error {
		var parentID *string
		if msg.ParentMessageID != "" {
			parentID = &msg.ParentMessageID
		}
		saved, err := msgRepo.Insert(ctx, message.InsertParams{
			ID:              msg.ID,
			ChannelID:       msg.ChannelID,
			UserID:          msg.UserID,
			ParentMessageID: parentID,
			Content:         msg.Content,
		})
		if err != nil {
			return err
		}
		hub.BroadcastToChannel(saved.ChannelID, ws.Event{
			Type: ws.EventMessageNew,
			Payload: ws.MessageNewPayload{
				ID:          saved.ID,
				ChannelID:   saved.ChannelID,
				UserID:      saved.UserID,
				DisplayName: msg.DisplayName,
				Content:     saved.Content,
				CreatedAt:   saved.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			},
		})
		return nil
	})

	consumerCtx, cancelConsumer := context.WithCancel(context.Background())
	defer cancelConsumer()
	go consumer.Run(consumerCtx)
	defer consumer.Close()
	log.Println("kafka: consumer started")

	// ── Fiber ─────────────────────────────────────────────────
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
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000",
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Authorization",
		AllowCredentials: true,
	}))

	// ── Routes ────────────────────────────────────────────────
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "chatflow-api"})
	})

	app.Use("/ws", func(c *fiber.Ctx) error {
		if fiberws.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	app.Get("/ws", fiberws.New(hub.Handler(authService)))

	api := app.Group("/api/v1")
	authHandler.RegisterRoutes(api.Group("/auth"))

	protected := api.Group("/", authService.Middleware())
	wsHandler.RegisterRoutes(protected.Group("/workspaces"))
	chHandler.RegisterRoutes(
		protected.Group("/workspaces/:wsID/channels"),
		protected.Group("/channels"),
	)
	presenceHandler.RegisterRoutes(protected.Group("/workspaces/:wsID/presence"))
	searchHandler.RegisterRoutes(protected.Group("/workspaces/:wsID/search"))
	msgHandler.RegisterRoutes(
		protected.Group("/channels"),
		protected.Group("/messages"),
	)
	rxHandler.RegisterRoutes(protected.Group("/messages"))

	log.Printf("ChatFlow API starting on :%s\n", cfg.Port)
	log.Fatal(app.Listen(":" + cfg.Port))
}