# Docker + Ops

## Основной режим запуска
- Docker Compose-first.
- Базовый стек: `bus + postgres + redis + minio`.
- Optional profile: `observability`.

## Канонические файлы
- Compose: [docker/docker-compose.example.yml](/docs/docker/docker-compose.example.yml)
- Env example: [docker/.env.example](/docs/docker/.env.example)
- Runbook: [ops/runbook.md](/docs/ops/runbook.md)

## Минимальные требования хоста
- 4 CPU
- 8 GB RAM
- Docker Engine + Docker Compose plugin

## Публикация образов
- GHCR
- Multi-arch: amd64 + arm64

## Health и bootstrap
- `/health/live` для liveness
- `/health/ready` для readiness
- bootstrap проверяет доступность Postgres, Redis и MinIO
