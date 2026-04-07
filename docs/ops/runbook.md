# Runbook (MVP)

## Prerequisites
- Docker Engine with Compose plugin.
- Host minimum: 4 CPU / 8 GB RAM.

## Startup
```bash
cp .env.example .env
docker compose up -d
```

## Delegation runtime modes
- `DELEGATION_EXECUTOR_MODE=auto` (default): tries real `codex exec` if active auth profile exists, otherwise falls back to mock executor.
- `DELEGATION_EXECUTOR_MODE=codex_exec`: strict real mode (terminal `failed` if active auth profile is missing or codex command is unavailable).
- `DELEGATION_EXECUTOR_MODE=mock`: force deterministic mock execution.
- `CODEX_COMMAND` defaults to `codex`.
- `WORKER_RUNTIME_DIR` defines where per-delegation runtime artifacts are stored inside container (`/tmp/orchestrator-workers` by default).
- `DELEGATION_EXECUTION_TIMEOUT_MS` controls timeout for one codex attempt (default `180000` ms).
- Per-request override in `POST /api/delegation/dispatch` payload:
  - `payload.execution_mode = "mock"` forces mock executor.
  - `payload.execution_mode = "codex_exec"` forces real executor for this call.

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
- Web control panel: `GET /ui/`
- Postgres: `pg_isready`
- Redis: `redis-cli ping`
- MinIO: `/minio/health/live`

## Log retrieval (multiple methods)
Method 1, API-backed operational history:
- `GET /api/auth-profiles/chatgpt/switch-events`
- `GET /api/delegation/{id}`
- `GET /api/delegation/{id}/result`

Method 2, container runtime logs:
```bash
docker compose logs --tail=200 bus
docker compose logs -f bus
```

Method 3, event stream log (Redis Streams):
```bash
docker compose exec -T redis redis-cli XLEN orchestrator.events
docker compose exec -T redis redis-cli XREVRANGE orchestrator.events + - COUNT 20
```

Method 4, one-shot probe for all channels:
```bash
npm run logs:check
```
Optional params:
```bash
npm run logs:check -- --tail=300 --events=30 --switch=15
```

If observability profile is enabled, Loki readiness can be verified by:
```bash
curl http://localhost:${LOKI_PORT:-3100}/ready
```
If port `3100` is busy on host, change `LOKI_PORT` in root `.env` before starting `--profile observability`.

## Web operator panel
- Open `http://localhost:8080/ui/`.
- Save `X-Admin-Token` from root `.env` in the Connection section.
- Optional: switch UI locale (`RU/EN`) in panel header.
- Validate primary workflow from UI:
  - create task;
  - upload ChatGPT `auth.json` profile;
  - activate/deactivate profile (triggers hold -> switch -> release flow);
  - inspect switch-events and held queue.

Notes:
- `GET /api/auth-profiles/chatgpt/active` may return `404` when no active profile is selected; panel treats it as normal "no active profile" state.

## Real codex execution quick check
1. Ensure `DELEGATION_EXECUTOR_MODE` is `auto` or `codex_exec`.
2. Upload and activate `auth.json` from local `.codex`.
3. Create task and reviewer template.
4. Call `POST /api/delegation/dispatch` with `payload.prompt`.
5. Expected: delegation `status=completed`, `result_summary` contains model answer (real mode) instead of mock text.

Auth storage note:
- Upload endpoint accepts only `auth.json` file (multipart upload).
- During execution, worker writes that `auth.json` into isolated `CODEX_HOME` for current delegation.

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
