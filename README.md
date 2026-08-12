# ChatFlow

A Slack-like real-time chat application built with Go, Next.js, Kafka, Redis, and PostgreSQL.

## Tech Stack

| Layer            | Technology              |
| ---------------- | ----------------------- |
| Backend          | Go + Fiber              |
| Frontend         | Next.js 14 + TypeScript |
| Database         | PostgreSQL              |
| Cache / Presence | Redis                   |
| Message Queue    | Kafka (Redpanda)        |
| File Storage     | MinIO                   |
| Realtime         | WebSockets              |

```bash
docker-compose up -d
```
