package presence

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// TypingEvent is the payload published to Redis and forwarded to WS clients.
type TypingEvent struct {
	ChannelID   string `json:"channel_id"`
	UserID      string `json:"user_id"`
	DisplayName string `json:"display_name"`
	Type        string `json:"type"` // "start" | "stop"
}

// TypingHandler is called by the subscriber for each received typing event.
type TypingHandler func(event TypingEvent)

// TypingService manages typing indicators via Redis pub/sub.
//
// Data flow:
//   Client keypress
//     → WS hub receives typing.start
//     → TypingService.Publish() → Redis PUBLISH typing:{channelID}
//     → All hub instances receive via Subscribe()
//     → Each hub broadcasts typing.indicator to its local WS clients
type TypingService struct {
	redis *redis.Client
}

func NewTypingService(redis *redis.Client) *TypingService {
	return &TypingService{redis: redis}
}

// Publish sends a typing event to the Redis pub/sub channel.
func (t *TypingService) Publish(ctx context.Context, event TypingEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return err
	}
	return t.redis.Publish(ctx, typingKey(event.ChannelID), data).Err()
}

// Subscribe listens for typing events on a channel and calls handler for each.
// Run in a goroutine — blocks until ctx is cancelled.
//
// Usage in hub:
//
//	go typingSvc.Subscribe(ctx, channelID, func(e TypingEvent) {
//	    hub.BroadcastToChannel(e.ChannelID, ...)
//	})
func (t *TypingService) Subscribe(ctx context.Context, handler TypingHandler) {
	// Subscribe to all typing channels using a pattern
	pubsub := t.redis.PSubscribe(ctx, "typing:*")
	defer pubsub.Close()

	log.Println("presence: typing subscriber started")

	ch := pubsub.Channel()
	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				return
			}

			var event TypingEvent
			if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
				log.Printf("presence: failed to unmarshal typing event: %v", err)
				continue
			}

			handler(event)

		case <-ctx.Done():
			return
		}
	}
}

// AutoExpire publishes a "stop" event after 3s of inactivity.
// Call this as a goroutine each time a "start" event is received.
// If another "start" arrives before the timer fires, cancel the old one.
func (t *TypingService) AutoExpire(ctx context.Context, event TypingEvent) {
	select {
	case <-time.After(3 * time.Second):
		event.Type = "stop"
		expireCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if err := t.Publish(expireCtx, event); err != nil {
			log.Printf("presence: failed to publish typing stop: %v", err)
		}
	case <-ctx.Done():
		// Cancelled — a new typing.start arrived, don't send stop
	}
}

func typingKey(channelID string) string {
	return fmt.Sprintf("typing:%s", channelID)
}