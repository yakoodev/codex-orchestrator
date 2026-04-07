# Docker + Operations

## Primary run mode
- Docker Compose-first.
- Base stack: `bus + postgres + redis + minio`.
- Optional profile: observability.

## Canonical files
- Compose: [docker/docker-compose.example.yml](/docs/docker/docker-compose.example.yml)
- Env example: [docker/.env.example](/docs/docker/.env.example)
- Runbook: [ops/runbook.md](/docs/ops/runbook.md)

## Minimum host requirements
- 4 CPU
- 8 GB RAM
- Docker Engine + Compose plugin

## Image publication
- GHCR
- Multi-arch: amd64 + arm64
