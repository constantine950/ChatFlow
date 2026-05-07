# ChatFlow — Product Requirements Document

---

## 1. Product Goal

Build a Slack-like real-time chat application called **ChatFlow** that demonstrates production-level backend engineering and a polished frontend.

- Multi-workspace support with channels and direct messages
- Real-time messaging backed by WebSockets
- Online/offline/typing presence system
- Full-text message search across a workspace
- Kafka-backed message delivery guarantees
- A clean, Slack-inspired UI

---

## 2. Core Concepts

| Term                    | Definition                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| **Workspace**           | The top-level container (like a Slack workspace/team). A user can belong to many workspaces.        |
| **Channel**             | A named room inside a workspace. Can be public or private.                                          |
| **Direct Message (DM)** | A private channel between exactly 2 users. Stored as a special channel type.                        |
| **Message**             | A single chat message sent by a user into a channel. Can have attachments, reactions, and a thread. |
| **Thread**              | A reply chain hanging off a parent message.                                                         |
| **Reaction**            | An emoji attached to a message by one or more users.                                                |
| **Presence**            | Whether a user is online, offline, or typing in a given channel.                                    |

---

## 3. Data Models

### 3.1 users

```
id            UUID        PK
email         TEXT        UNIQUE NOT NULL
password_hash TEXT        NOT NULL
display_name  TEXT        NOT NULL
avatar_url    TEXT
created_at    TIMESTAMPTZ DEFAULT now()
updated_at    TIMESTAMPTZ DEFAULT now()
```

### 3.2 workspaces

```
id          UUID        PK
name        TEXT        NOT NULL
slug        TEXT        UNIQUE NOT NULL   -- URL-safe identifier
owner_id    UUID        FK → users.id
created_at  TIMESTAMPTZ DEFAULT now()
```

### 3.3 workspace_members

```
workspace_id  UUID   FK → workspaces.id
user_id       UUID   FK → users.id
role          TEXT   CHECK IN ('OWNER', 'ADMIN', 'MEMBER')
joined_at     TIMESTAMPTZ DEFAULT now()
PRIMARY KEY (workspace_id, user_id)
```

### 3.4 channels

```
id            UUID        PK
workspace_id  UUID        FK → workspaces.id
name          TEXT        NOT NULL
is_private    BOOLEAN     DEFAULT false
is_dm         BOOLEAN     DEFAULT false
created_by    UUID        FK → users.id
created_at    TIMESTAMPTZ DEFAULT now()
UNIQUE (workspace_id, name)
```

### 3.5 channel_members

```
channel_id    UUID   FK → channels.id
user_id       UUID   FK → users.id
last_read_at  TIMESTAMPTZ
joined_at     TIMESTAMPTZ DEFAULT now()
PRIMARY KEY (channel_id, user_id)
```

### 3.6 messages

```
id                UUID        PK
channel_id        UUID        FK → channels.id
user_id           UUID        FK → users.id
parent_message_id UUID        FK → messages.id  (NULL = top-level)
content           TEXT        NOT NULL
edited_at         TIMESTAMPTZ
deleted_at        TIMESTAMPTZ
created_at        TIMESTAMPTZ DEFAULT now()
search_vector     TSVECTOR    (maintained by trigger)

INDEX (channel_id, created_at DESC)   -- pagination
INDEX search_vector USING GIN          -- full-text search
```

### 3.7 message_reactions

```
id          UUID   PK
message_id  UUID   FK → messages.id
user_id     UUID   FK → users.id
emoji       TEXT   NOT NULL
created_at  TIMESTAMPTZ DEFAULT now()
UNIQUE (message_id, user_id, emoji)
```

### 3.8 file_attachments

```
id          UUID   PK
message_id  UUID   FK → messages.id
bucket      TEXT   NOT NULL   -- MinIO bucket name
object_key  TEXT   NOT NULL   -- MinIO object key
filename    TEXT   NOT NULL
size_bytes  BIGINT
mime_type   TEXT
created_at  TIMESTAMPTZ DEFAULT now()
```

---

## 4. Real-Time Events

All events are JSON objects sent over the WebSocket connection.

### Client → Server

| Event                | Payload                                       | Description                     |
| -------------------- | --------------------------------------------- | ------------------------------- |
| `message.send`       | `{ channel_id, content, parent_message_id? }` | Send a new message              |
| `typing.start`       | `{ channel_id }`                              | User started typing             |
| `typing.stop`        | `{ channel_id }`                              | User stopped typing             |
| `presence.heartbeat` | `{}`                                          | Keep-alive ping every 30s       |
| `channel.join`       | `{ channel_id }`                              | Subscribe to a channel's events |
| `channel.leave`      | `{ channel_id }`                              | Unsubscribe from a channel      |

### Server → Client

| Event              | Payload                                  | Description                      |
| ------------------ | ---------------------------------------- | -------------------------------- | --------------- |
| `message.new`      | Full message object                      | Broadcast to channel subscribers |
| `message.updated`  | `{ id, content, edited_at }`             | Edit broadcast                   |
| `message.deleted`  | `{ id }`                                 | Delete broadcast                 |
| `typing.indicator` | `{ channel_id, user_id, display_name }`  | Typing broadcast                 |
| `presence.update`  | `{ user_id, status: 'online'             | 'offline' }`                     | Presence change |
| `reaction.update`  | `{ message_id, emoji, count, user_ids }` | Reaction change                  |
| `error`            | `{ code, message }`                      | Server error                     |

---

## 5. REST API Surface

Base path: `/api/v1`

### Auth

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
DELETE /auth/logout
```

### Workspaces

```
POST   /workspaces                        Create workspace
GET    /workspaces                        List my workspaces
GET    /workspaces/:id                    Get workspace
POST   /workspaces/:id/members            Join workspace
DELETE /workspaces/:id/members/:user_id   Remove member
GET    /workspaces/:id/members            List members
GET    /workspaces/:id/presence           Online users (last 60s)
GET    /workspaces/:id/search?q=          Full-text search
```

### Channels

```
POST   /workspaces/:id/channels           Create channel
GET    /workspaces/:id/channels           List channels
GET    /channels/:id                      Get channel
DELETE /channels/:id                      Delete channel
POST   /channels/:id/members             Join channel
DELETE /channels/:id/members/:user_id    Leave channel
GET    /channels/:id/members             List members
```

### Messages

```
GET    /channels/:id/messages             List messages (paginated, cursor-based)
GET    /messages/:id/thread              Get thread replies
POST   /messages/:id/reactions           Toggle reaction
DELETE /messages/:id/reactions/:emoji    Remove reaction
PATCH  /messages/:id                     Edit message
DELETE /messages/:id                     Soft-delete message
```

### Files

```
POST   /files/upload                      Get presigned upload URL from MinIO
GET    /files/:key                        Get presigned download URL
```

---

## 6. Pagination Strategy

All list endpoints use **cursor-based pagination** (not offset-based) for performance on large message tables.

```
GET /channels/:id/messages?before=<message_id>&limit=50
```

Response:

```json
{
  "data": [...],
  "next_cursor": "msg_uuid_or_null",
  "has_more": true
}
```

---

## 7. Authentication Strategy

- **Registration/Login:** bcrypt (cost 12) for password hashing
- **Access token:** JWT, 15-minute expiry, signed with HMAC-SHA256
- **Refresh token:** Opaque random token, 7-day expiry, stored in Redis
- **Rotation:** Every refresh call issues a new refresh token and invalidates the old one
- **Storage (client):** Access token in memory, refresh token in httpOnly cookie

---

## 8. Message Delivery Guarantee

```
Client → WebSocket Hub → Kafka (chat.messages topic)
                              ↓
                    Consumer Group → Postgres (write)
                              ↓
                    Consumer Group → WS Hub (broadcast)
```

- Every sent message goes to Kafka first — the client never writes directly to Postgres
- Consumer writes to Postgres then broadcasts the confirmed message back to all channel subscribers
- Dead letter topic (`chat.messages.dlq`) catches failed writes for alerting
- Optimistic UI: client shows the message immediately, reverts if no confirmation arrives within 5s

---

## 9. Presence Strategy

- **Storage:** Redis sorted set per workspace — `presence:{workspace_id}` → member score = last-seen Unix timestamp
- **Heartbeat:** Client sends a ping every 30 seconds; server updates the score
- **Online threshold:** Users with `last_seen > now() - 60s` are considered online
- **Typing:** Redis pub/sub channel `typing:{channel_id}` — expires after 3 seconds of inactivity

---

## 10. Search Strategy

- **Engine:** PostgreSQL full-text search (no Elasticsearch needed at this scale)
- **Column:** `messages.search_vector` (type `tsvector`)
- **Updated by:** Postgres trigger on INSERT/UPDATE
- **Index:** GIN index on `search_vector`
- **Query:** `ts_rank` for relevance scoring, `ts_headline` for snippet highlighting
- **Scope:** Search is always scoped to a single workspace

---

## 11. File Storage Strategy

- **Service:** MinIO (S3-compatible, self-hosted in Docker)
- **Upload flow:** Client requests a presigned PUT URL → uploads directly to MinIO → sends message with object key
- **Download flow:** Client requests a presigned GET URL (expires in 1 hour)
- **Stored on message:** `object_key` only (not the full URL, since URLs are time-limited)

---

## 12. Out of Scope

- End-to-end encryption
- Video/audio calls
- Mobile apps (iOS/Android)
- Email notifications
- Slash commands / bots
- Message scheduling
- Admin dashboard
- Billing / multi-tenancy pricing

---

## 13. Non-Functional Requirements

| Requirement                      | Target                         |
| -------------------------------- | ------------------------------ |
| Message latency (WS round-trip)  | < 200ms p99 on local network   |
| Search response time             | < 500ms for up to 1M messages  |
| Concurrent WebSocket connections | 1,000+ on a single Go instance |
| Postgres connection pool         | 20 max connections (pgxpool)   |
| Redis connection pool            | 10 max connections             |

---
