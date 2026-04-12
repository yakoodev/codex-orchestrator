# Runbook (MVP)

Обновлено: 2026-04-12

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

## Auto-runners (tasks / schedules / auth-switch)
- Task auto-dispatch:
  - `TASK_AUTODISPATCH_ENABLED` (default `true`)
  - `TASK_AUTODISPATCH_INTERVAL_MS` (default `5000`)
  - `TASK_AUTODISPATCH_EXECUTION_MODE` (default `codex_exec`)
  - `TASK_AUTODISPATCH_SANDBOX_POLICY` (default `danger-full-access`, overrides template sandbox for auto-launch)
  - `TASK_AUTODISPATCH_APPROVAL_POLICY` (default `never`, overrides template approval for auto-launch)
- Schedule runner:
  - `SCHEDULE_RUNNER_ENABLED` (default `true`)
  - `SCHEDULE_RUNNER_INTERVAL_MS` (default `30000`)
- Auth switch runner:
  - `MODULE_SWITCH_ENABLED` (default `true`)
  - `SWITCH_WEEKLY_REMAINING_PERCENT_LT` (default `5`)
  - `SWITCH_FIVE_HOUR_REMAINING_PERCENT_LT` (default `10`)
  - `SWITCH_RESET_GUARD_HOURS` (default `3`)
  - `SWITCH_PROBE_INTERVAL_SEC` (default `60`)
  - `SWITCH_COOLDOWN_SEC` (default `120`)

Runtime notes:
- `switch_chatgpt_auth_on_limit` в `enabled=true` требует непустой `eligible_profile_ids` в `config_json`.
- При отсутствии валидного кандидата для switch задачи переводятся в `WAITING_LIMIT` до ручного release/появления валидного профиля.

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

## Startup with Telegram adapter (long polling)
1. Set Telegram variables in root `.env`:
- `TG_ENABLED=true`
- `TG_BOT_TOKEN=<telegram_bot_token>`
- Optional: `TG_ALLOWED_CHAT_IDS=<chat_id_1,chat_id_2>`
- Optional: `TG_ALLOWED_USER_IDS=<user_id_1,user_id_2>`
- Optional proxy: `TG_PROXY_URL=socks5://host:port` (or `http(s)://`)
2. Start or restart bus service:
```bash
docker compose up -d bus
```
3. Confirm variables are visible in container:
```bash
docker compose exec bus printenv TG_PROXY_URL
docker compose exec bus printenv TG_ENABLED TG_ALLOWED_CHAT_IDS TG_ALLOWED_USER_IDS
```
4. In Telegram, open chat with your bot and use `/help`.

Notes:
- Adapter runs in fail-safe mode: Telegram/API connectivity errors do not stop Web/API control path.
- Incoming updates are deduplicated by `update_id`; last processed offset is persisted in `TG_STATE_FILE_PATH`.
- Adapter also bridges key Redis Stream events into Telegram (`queue.hold_started`, `auth_profile.switch.started/completed/skipped`, `queue.hold_released`) with debounce.
- If whitelist is empty, adapter starts in discovery mode: updates are ignored, while `chat_id/user_id` are logged for initial setup.
- `/say <task_id> <message>` is supported and creates an admin steering intervention (`POST /api/tasks/{id}/say`).
- `/cancel <task_id>` отменяет задачу через `POST /api/tasks/{id}/cancel` (`/stop` поддерживается как совместимый алиас команды бота).

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
- `GET /api/memory/entries?project_id=<id>&agent_role=<role>`

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

## Limits retrieval (exact via Codex app-server RPC)
To read exact current limit percentages for one or many `CODEX_HOME` directories:
```bash
npm run limits:check -- --home="$HOME/.codex"
```

For multiple homes (example, PowerShell):
```powershell
npm run limits:check -- --home "C:\Users\Yakoo\1.codex" --home "C:\Users\Yakoo\2.codex" --home "C:\Users\Yakoo\22.codex" --home "C:\Users\Yakoo\.codex"
```

Optional live probe (`codex exec`) per home:
```bash
npm run limits:check -- --home="$HOME/.codex" --probe --probe-timeout=90
```

JSON output for automation:
```bash
npm run limits:check -- --home="$HOME/.codex" --json
```

Notes:
- Primary source is `codex app-server` JSON-RPC method `account/rateLimits/read`.
- Script reports both `used_percent` and `remaining_percent` (остаток = `100 - used_percent`) for primary/secondary windows.
- Script also keeps fallback diagnostics from sqlite logs (`codex.rate_limits` + latest `usage limit` hit), but these are secondary.
- If RPC fails (auth/network/process issues), exact percentages are unavailable until RPC path is restored.

Service integration (uploaded auth profiles):
- `GET /api/auth-profiles/chatgpt/{id}/limits`
- Returns live snapshot from OpenAI via `codex app-server` using stored `auth.json` for selected profile.
- Errors:
  - `404 NOT_FOUND` when profile id is unknown
  - `500 AUTH_PROFILE_PAYLOAD_INVALID` when stored `auth.json` is corrupted
  - `502 RATE_LIMITS_UNAVAILABLE` when upstream live call is unavailable

## Web operator panel
- Open `http://localhost:8080/ui/`.
- Save `X-Admin-Token` from root `.env` in the Connection section.
- Optional: switch UI locale (`RU/EN`) in panel header.
- Task-first rule:
  - задачи создаются только с явным исполнителем (`agent_profile_id` + `agent_template_id`);
  - операторская остановка задач выполняется через `POST /api/tasks/{id}/cancel`.
- Validate primary workflow from UI:
  - create task;
  - create schedule rule and trigger it;
  - upload ChatGPT `auth.json` profile;
  - activate/deactivate profile (triggers hold -> switch -> release flow);
  - configure `Auto-switch policy` in `Accounts -> Limits`;
  - inspect switch-events and held queue.
- Use operator visibility panels:
  - `Agent Runtime Cards`: watch `preparing/running/recent` delegations with prompt, target template/model, selected account, and log preview.
  - `Agent Memory`: keep role-specific notes per `project_id + agent_role`; active notes are auto-injected into delegation prompt context.
  - `Account Fleet`: inspect all uploaded profiles with live 5h/weekly limits and reset timestamps.

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
