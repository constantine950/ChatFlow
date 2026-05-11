package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	Port string
	Env  string

	// Database
	DatabaseURL string

	// Redis
	RedisURL string

	// JWT
	JWTSecret string

	// Kafka
	KafkaBrokers string

	// MinIO
	MinioEndpoint  string
	MinioAccessKey string
	MinioSecretKey string
	MinioBucket    string
}

// Load reads .env then environment variables.
// Environment variables always win over .env values.
func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("config: no .env file, reading from environment")
	}

	cfg := &Config{
		Port:           getEnv("PORT", "8080"),
		Env:            getEnv("ENV", "development"),
		DatabaseURL:    mustGetEnv("DATABASE_URL"),
		RedisURL:       mustGetEnv("REDIS_URL"),
		JWTSecret:      mustGetEnv("JWT_SECRET"),
		KafkaBrokers:   getEnv("KAFKA_BROKERS", "localhost:19092"),
		MinioEndpoint:  getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccessKey: getEnv("MINIO_ACCESS_KEY", "minio_admin"),
		MinioSecretKey: getEnv("MINIO_SECRET_KEY", "minio_secret"),
		MinioBucket:    getEnv("MINIO_BUCKET", "chatflow"),
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// mustGetEnv panics at startup if a required variable is missing.
// Better to crash early than to fail silently at runtime.
func mustGetEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("config: required environment variable %q is not set", key)
	}
	return v
}