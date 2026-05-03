# ChatFlow

A Slack-like real-time chat application built with Go, Next.js, Kafka, Redis, and PostgreSQL.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go + Fiber |
| Frontend | Next.js 14 + TypeScript |
| Database | PostgreSQL |
| Cache / Presence | Redis |
| Message Queue | Kafka (Redpanda) |
| File Storage | MinIO |
| Realtime | WebSockets |

## Project Structure

```
chatflow/
├── backend/          # Go API server
├── frontend/         # Next.js app
├── docs/             # PRD, Architecture, API docs
├── infra/            # Nginx, deployment configs
├── docker-compose.yml
└── .env.example
```

## Getting Started

> Files will be filled in day by day following the 30-day plan.

```bash
cp .env.example .env
docker-compose up -d
```

## 30-Day Build Plan

- **Week 1** — Foundation & Infrastructure (Days 1–7)
- **Week 2** — Real-Time Features (Days 8–14)
- **Week 3** — Frontend UI (Days 15–20)
- **Week 4** — Polish, Deploy & Portfolio (Days 21–30)
