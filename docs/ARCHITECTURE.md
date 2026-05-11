# ChatFlow — Architecture

---

## 1. High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│              Browser Tab A    Browser Tab B                 │
└──────────────┬──────────────────────┬───────────────────────┘
               │ HTTP (REST)          │ WebSocket
               ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Go + Fiber API Server                     │
│                                                             │
│   ┌─────────────┐   ┌──────────────┐   ┌───────────────┐  │
│   │ Auth Routes │   │  REST Routes │   │  WS Hub       │  │
│   │ /auth/*     │   │  /api/v1/*   │   │  /ws          │  │
│   └──────┬──────┘   └──────┬───────┘   └──────┬────────┘  │
│          │                 │                   │            │
│          └─────────────────┼───────────────────┘            │
│                            │                                │
│              ┌─────────────▼──────────────┐                 │
│              │       Service Layer         │                 │
│              │  auth / workspace / channel │                 │
│              │  message / presence / search│                 │
│              └─────────────┬──────────────┘                 │
│                            │                                │
│              ┌─────────────▼──────────────┐                 │
│              │     Repository Layer        │                 │
│              │   (pure DB queries only)    │                 │
│              └─────────────┬──────────────┘                 │
└────────────────────────────┼────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────────┐
          │                  │                       │
          ▼                  ▼                       ▼
   ┌────────────┐    ┌──────────────┐      ┌──────────────┐
   │ PostgreSQL │    │    Redis     │      │   Redpanda   │
   │  port 5433 │    │  port 6379   │      │  port 19092  │
   └────────────┘    └──────────────┘      └──────────────┘
          │                  │
          │           ┌──────┴───────┐
          │           │  Presence    │
          │           │  sorted sets │
          │           │  Typing      │
          │           │  pub/sub     │
          │           └──────────────┘
          │
   ┌──────┴──────────────────────────┐
   │  Tables                         │
   │  users            messages       │
   │  workspaces       reactions      │
   │  workspace_members file_attachments│
   │  channels         (search_vector │
   │  channel_members   GIN index)    │
   └─────────────────────────────────┘
```

---

## 2. Message Send Flow

```
Client                WS Hub           Kafka            Postgres       Subscribers
  │                     │                │                  │               │
  │── message.send ────►│                │                  │               │
  │                     │── produce ────►│                  │               │
  │                     │                │── consume ───────►│               │
  │                     │                │                  │ INSERT        │
  │                     │                │◄─────────────────│               │
  │                     │── broadcast ──────────────────────────────────────►│
  │                     │                │                  │               │
```

**Why Kafka in the middle?**

- Decouples write from broadcast — if Postgres is slow, messages don't back up in the WS hub
- Consumer group can be scaled horizontally
- Dead letter queue catches failed writes without losing the message
- Replay capability for debugging

---

## 3. Layer Separation Rules

Each package follows a strict 3-layer pattern. Breaking these rules creates spaghetti.

```
Handler  (transport)
  │  Knows: HTTP verbs, request parsing, response formatting
  │  Does NOT: contain business logic or SQL
  │
  ▼
Service  (business logic)
  │  Knows: validation, orchestration, domain rules
  │  Does NOT: know about HTTP or SQL syntax
  │
  ▼
Repository  (data access)
     Knows: SQL queries, table names, pgx
     Does NOT: contain business logic
```

### Package map

```
backend/
├── cmd/server/
│   └── main.go              ← wiring only — no logic here
├── internal/
│   ├── auth/
│   │   ├── models.go        ← structs shared across layers
│   │   ├── repository.go    ← DB queries
│   │   ├── service.go       ← bcrypt, JWT, refresh token logic
│   │   ├── handler.go       ← Fiber HTTP handlers
│   │   └── middleware.go    ← JWT validation middleware
│   ├── workspace/
│   │   ├── models.go
│   │   ├── repository.go
│   │   ├── service.go
│   │   └── handler.go
│   ├── channel/
│   │   ├── models.go
│   │   ├── repository.go
│   │   ├── service.go
│   │   └── handler.go
│   ├── message/
│   ├── presence/
│   ├── search/
│   ├── storage/
│   └── websocket/
│       ├── events.go        ← event type constants + payloads
│       ├── client.go        ← one connected browser tab
│       └── hub.go           ← central registry + broadcast
├── pkg/
│   ├── config/config.go     ← env var loading
│   ├── database/postgres.go ← pgxpool setup
│   └── cache/redis.go       ← redis client setup
├── migrations/              ← golang-migrate SQL files
└── scripts/                 ← seed.sql, run_migrations.sh
```

---

## 4. Presence System

```
Client heartbeat (every 30s)
         │
         ▼
   WS Hub receives EventPresenceHeartbeat
         │
         ▼
   Redis ZADD presence:{workspace_id} score=now() member=user_id
         │
         ▼
   GET /workspaces/:id/presence
   → ZRANGEBYSCORE presence:{workspace_id} min=(now-60s) max=+inf
   → returns online user IDs
```

---

## 5. Typing Indicators

```
Client keypress
    │
    ▼
WS Hub receives typing.start
    │
    ▼
Redis PUBLISH typing:{channel_id}  {user_id, display_name}
    │
    ▼
Redis subscriber (all WS hub instances) receives message
    │
    ▼
Hub broadcasts typing.indicator to channel subscribers
    │
    ▼
Auto-expire: typing state cleared after 3s of no new events
```

---

## 6. Full-Text Search

```
Message INSERT/UPDATE
    │
    ▼
Postgres trigger fires
    │
    ▼
search_vector = to_tsvector('english', content)
    │
    ▼
GET /workspaces/:id/search?q=kafka
    │
    ▼
SELECT ... WHERE search_vector @@ plainto_tsquery('english', 'kafka')
ORDER BY ts_rank(search_vector, query) DESC
    │
    ▼
ts_headline() generates snippet with highlighted match
```

---

## 7. Key Design Decisions

### Why Go + Fiber?

Fiber is built on fasthttp — handles 100k+ req/s on a single core. Go's goroutine model maps perfectly to WebSocket connections: one goroutine per client read pump, one per write pump. Memory overhead per connection is ~8KB vs ~1MB for Node.js.

### Why Redpanda instead of Kafka?

Redpanda is Kafka-compatible but runs as a single binary — no ZooKeeper, no JVM. Perfect for development and small production deployments. The API is identical so switching to managed Kafka (Confluent, MSK) later requires zero code changes.

### Why PostgreSQL full-text search over Elasticsearch?

At the scale of this project (millions of messages, not billions), Postgres FTS with a GIN index is fast enough (< 200ms) and eliminates an entire infrastructure dependency. The `tsvector` column is maintained automatically by a trigger — no sync job needed.

### Why Redis for presence instead of WebSocket state?

The WS hub is in-process memory. If the server restarts or we scale to multiple instances, in-process presence state is lost. Redis sorted sets survive restarts and are shared across all server instances automatically.

### Why cursor-based pagination?

Offset pagination (`LIMIT 50 OFFSET 500`) requires scanning 550 rows to return 50. Cursor pagination (`WHERE created_at < $cursor ORDER BY created_at DESC LIMIT 50`) uses the index directly — O(log n) instead of O(n).

---

## 8. Error Handling Convention

All HTTP errors return:

```json
{ "error": "human readable message" }
```

WebSocket errors return:

```json
{
  "type": "error",
  "payload": { "code": "machine_code", "message": "human readable" }
}
```

HTTP status codes used:

- `400` Bad Request — invalid input
- `401` Unauthorized — missing or invalid token
- `403` Forbidden — authenticated but not allowed
- `404` Not Found — resource doesn't exist
- `409` Conflict — duplicate (email, slug, channel name)
- `500` Internal Server Error — something broke server-side

---
