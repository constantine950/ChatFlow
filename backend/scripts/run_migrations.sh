#!/usr/bin/env bash
# =============================================================
#  run_migrations.sh
#  Runs golang-migrate against the Postgres container.
#
#  Usage:
#    ./scripts/run_migrations.sh up        apply all pending migrations
#    ./scripts/run_migrations.sh down 1    roll back 1 migration
#    ./scripts/run_migrations.sh version   show current version
# =============================================================

set -euo pipefail

# Load .env from the project root (one level up from /scripts)
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

POSTGRES_USER="${POSTGRES_USER:-chatflow}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-chatflow_secret}"
POSTGRES_DB="${POSTGRES_DB:-chatflow}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=disable"

MIGRATIONS_DIR="$(dirname "$0")/../migrations"
COMMAND="${1:-up}"
STEPS="${2:-}"

echo "▶  Running migrate ${COMMAND} ${STEPS}"
echo "   DSN: postgres://${POSTGRES_USER}:***@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"

# Run golang-migrate via Docker (no local install needed)
docker run --rm \
    --network chatflow_chatflow_net \
    -v "$(realpath "$MIGRATIONS_DIR"):/migrations" \
    migrate/migrate:v4.17.0 \
    -path /migrations \
    -database "postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=disable" \
    "$COMMAND" $STEPS

echo "✓  Done"