# ─────────────────────────────────────────────
#  ChatFlow Backend — Multi-stage Dockerfile
# ─────────────────────────────────────────────

# Stage 1: Build
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files first (better layer caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build binary — statically linked, no CGO
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s" \
    -o /app/chatflow \
    ./cmd/server

# Stage 2: Runtime
FROM alpine:3.19

WORKDIR /app

# Add CA certificates for HTTPS calls
RUN apk add --no-cache ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/chatflow .

# Copy migrations (needed at startup)
COPY --from=builder /app/migrations ./migrations

# Non-root user for security
RUN addgroup -S chatflow && adduser -S chatflow -G chatflow
USER chatflow

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./chatflow"]
