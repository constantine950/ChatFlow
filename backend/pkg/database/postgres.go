package database

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect creates a pgx connection pool and verifies connectivity.
// Call once at startup and pass the pool around via dependency injection.
func Connect(databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}

	// Pool sizing — matches the non-functional requirements in the PRD
	cfg.MaxConns = 20
	cfg.MinConns = 2
	cfg.MaxConnLifetime = 1 * time.Hour
	cfg.MaxConnIdleTime = 30 * time.Minute

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}

	// Ping to verify the connection is actually usable
	if err := pool.Ping(ctx); err != nil {
		return nil, err
	}

	return pool, nil
}