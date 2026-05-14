package presence

import "time"

// UserPresence represents a single user's online status.
type UserPresence struct {
	UserID      string    `json:"user_id"`
	DisplayName string    `json:"display_name"`
	Status      string    `json:"status"`    // "online" | "offline"
	LastSeen    time.Time `json:"last_seen"`
}

// OnlineThreshold is how long without a heartbeat before a user
// is considered offline. Must be longer than the client heartbeat
// interval (30s) to avoid false negatives.
const OnlineThreshold = 60 * time.Second