# Runbook (MVP)

## Prerequisites
- Docker Engine with Compose plugin.
- Host minimum: 4 CPU / 8 GB RAM.

## Startup
```bash
cp .env.example .env
docker compose up -d
```

## Port conflicts (Windows/common local stacks)
- Default MinIO host ports in this repo are `19000` (API) and `19001` (console) to reduce conflicts.
- If these ports are also occupied on your host, update `MINIO_API_PORT` and `MINIO_CONSOLE_PORT` in root `.env`, then restart compose:
```bash
docker compose up -d
```

## Startup with observability profile
```bash
docker compose --profile observability up -d
```

## Startup with Telegram proxy
1. Set `TG_PROXY_URL` in root `.env` (see examples in root `.env.example`).
2. Start or restart bus service:
```bash
docker compose up -d bus
```
3. Confirm the variable is visible in the container:
```bash
docker compose exec bus printenv TG_PROXY_URL
```

## Health checks
- Bus liveness: `GET /health/live`
- Bus readiness: `GET /health/ready`
- Postgres: `pg_isready`
- Redis: `redis-cli ping`
- MinIO: `/minio/health/live`

## Backup
- Postgres: `pg_dump` of `orchestrator` database.
- MinIO: bucket snapshot/export.
- Optional: periodic copy of encrypted auth-profile storage path.

## Restore
1. Stop bus.
2. Restore Postgres dump.
3. Restore MinIO bucket and auth-profile encrypted store.
4. Start services and verify readiness.
5. Run smoke checks.

## Failure handling
- If switch process was interrupted, restart service and validate recovered state from DB:
  - held queue still marked;
  - switch event status is resumed/reconciled;
  - no task loss.
- If Telegram direct access is blocked, set `TG_PROXY_URL` and restart bus.
- If proxy is unavailable/misconfigured, Telegram commands and notifications may fail or be delayed, but Web/API control path must remain operational.
