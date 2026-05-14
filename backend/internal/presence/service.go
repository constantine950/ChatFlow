package presence

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// Service manages user presence using Redis sorted sets.
//
// Data structure:
//   Key:   presence:{workspaceID}
//   Type:  Sorted Set
//   Member: userID
//   Score: Unix timestamp of last heartbeat
//
// A user is "online" if their score > now() - 60s.
type Service struct {
	redis *redis.Client
}

func NewService(redis *redis.Client) *Service {
	return &Service{redis: redis}
}

// Heartbeat updates the user's last-seen timestamp in Redis.
// Called every 30s from the WebSocket hub when it receives
// a presence.heartbeat event from the client.
func (s *Service) Heartbeat(ctx context.Context, workspaceID, userID string) error {
	key := presenceKey(workspaceID)
	score := float64(time.Now().Unix())

	return s.redis.ZAdd(ctx, key, redis.Z{
		Score:  score,
		Member: userID,
	}).Err()
}

// SetOffline removes a user from the presence sorted set.
// Called when a WebSocket client disconnects.
func (s *Service) SetOffline(ctx context.Context, workspaceID, userID string) error {
	return s.redis.ZRem(ctx, presenceKey(workspaceID), userID).Err()
}

// GetOnlineUsers returns all users active in the last 60 seconds.
func (s *Service) GetOnlineUsers(ctx context.Context, workspaceID string) ([]string, error) {
	key := presenceKey(workspaceID)
	minScore := strconv.FormatInt(time.Now().Add(-OnlineThreshold).Unix(), 10)

	// ZRANGEBYSCORE key min max — returns members with score >= min
	members, err := s.redis.ZRangeByScore(ctx, key, &redis.ZRangeBy{
		Min: minScore,
		Max: "+inf",
	}).Result()
	if err != nil {
		return nil, err
	}

	return members, nil
}

// IsOnline checks if a single user is currently online.
func (s *Service) IsOnline(ctx context.Context, workspaceID, userID string) (bool, error) {
	score, err := s.redis.ZScore(ctx, presenceKey(workspaceID), userID).Result()
	if err != nil {
		if err == redis.Nil {
			return false, nil
		}
		return false, err
	}

	lastSeen := time.Unix(int64(score), 0)
	return time.Since(lastSeen) <= OnlineThreshold, nil
}

// CleanStale removes users who haven't sent a heartbeat in > 60s.
// Optional — Redis TTL on the key could also handle this,
// but explicit cleanup keeps the set tidy.
func (s *Service) CleanStale(ctx context.Context, workspaceID string) error {
	maxScore := strconv.FormatInt(time.Now().Add(-OnlineThreshold).Unix(), 10)
	return s.redis.ZRemRangeByScore(
		ctx,
		presenceKey(workspaceID),
		"-inf",
		maxScore,
	).Err()
}

// presenceKey returns the Redis key for a workspace's presence set.
func presenceKey(workspaceID string) string {
	return fmt.Sprintf("presence:%s", workspaceID)
}