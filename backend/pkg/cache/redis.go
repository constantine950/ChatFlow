package cache

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// Connect parses the Redis URL, creates a client, and pings the server.
// Example URL: redis://:password@localhost:6379/0
func Connect(redisURL string) (*redis.Client, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return client, nil
}