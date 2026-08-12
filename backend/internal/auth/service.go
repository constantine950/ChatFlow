package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

const (
	accessTokenTTL  = 15 * time.Minute
	refreshTokenTTL = 7 * 24 * time.Hour
	bcryptCost      = 12
	refreshTokenLen = 32 // bytes → 64 hex chars
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrInvalidToken       = errors.New("invalid or expired token")
)

type Service struct {
	repo      *Repository
	redis     *redis.Client
	jwtSecret []byte
}

func NewService(repo *Repository, redis *redis.Client, jwtSecret string) *Service {
	return &Service{
		repo:      repo,
		redis:     redis,
		jwtSecret: []byte(jwtSecret),
	}
}

// Register creates a new user account and returns tokens.
func (s *Service) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	// Hash password with bcrypt
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
	if err != nil {
		return nil, err
	}

	user, err := s.repo.CreateUser(ctx, req.Email, string(hash), req.DisplayName)
	if err != nil {
		return nil, err
	}

	return s.buildAuthResponse(ctx, user)
}

// Login verifies credentials and returns tokens.
func (s *Service) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	user, err := s.repo.FindByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			// Don't reveal whether the email exists
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return s.buildAuthResponse(ctx, user)
}

// Refresh validates a refresh token, issues new tokens, and rotates the old one.
func (s *Service) Refresh(ctx context.Context, refreshToken string) (*AuthResponse, error) {
	// Look up the user ID stored against this refresh token in Redis
	key := refreshKey(refreshToken)
	userID, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, ErrInvalidToken
		}
		return nil, err
	}

	// Delete the old refresh token immediately (rotation)
	s.redis.Del(ctx, key)

	user, err := s.repo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return s.buildAuthResponse(ctx, user)
}

// Logout deletes the refresh token from Redis.
func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	return s.redis.Del(ctx, refreshKey(refreshToken)).Err()
}

// ValidateAccessToken parses and validates a JWT, returning the claims.
func (s *Service) ValidateAccessToken(tokenStr string) (*Claims, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return s.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}

	mapClaims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, ErrInvalidToken
	}

	return &Claims{
		UserID:      mapClaims["sub"].(string),
		Email:       mapClaims["email"].(string),
		DisplayName: mapClaims["display_name"].(string),
	}, nil
}

// Private helpers

func (s *Service) buildAuthResponse(ctx context.Context, user *User) (*AuthResponse, error) {
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: UserInfo{
			ID:          user.ID,
			Email:       user.Email,
			DisplayName: user.DisplayName,
			AvatarURL:   user.AvatarURL,
		},
	}, nil
}

func (s *Service) generateAccessToken(user *User) (string, error) {
	claims := jwt.MapClaims{
		"sub":          user.ID,
		"email":        user.Email,
		"display_name": user.DisplayName,
		"exp":          time.Now().Add(accessTokenTTL).Unix(),
		"iat":          time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *Service) generateRefreshToken(ctx context.Context, userID string) (string, error) {
	// Generate cryptographically random token
	bytes := make([]byte, refreshTokenLen)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	token := hex.EncodeToString(bytes)

	// Store in Redis: key → userID, TTL = 7 days
	if err := s.redis.Set(ctx, refreshKey(token), userID, refreshTokenTTL).Err(); err != nil {
		return "", err
	}

	return token, nil
}

// refreshKey namespaces the Redis key so it doesn't collide with other data.
func refreshKey(token string) string {
	return "refresh:" + token
}