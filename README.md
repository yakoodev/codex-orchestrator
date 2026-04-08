# codex-orchestrator

Open-source orchestrator bus for Codex workers with limit-aware scheduling, deterministic task state machine, and controllable auth-profile switching.

## Quick Links
- Russian docs: [`docs/ru/00-index.md`](/docs/ru/00-index.md)
- English docs: [`docs/en/00-index.md`](/docs/en/00-index.md)
- Contracts: [`docs/contracts`](/docs/contracts)
- Docker/Ops: [`docs/docker`](/docs/docker)
- PR1 status tracker: [`docs/ops/pr1-progress.md`](/docs/ops/pr1-progress.md)
- Product roadmap (post-PR1): [`docs/ops/roadmap.md`](/docs/ops/roadmap.md)
- MCP bridge plan: [`docs/ops/mcp-agent-bridge.md`](/docs/ops/mcp-agent-bridge.md)
- Manual test scenarios: [`docs/ops/manual-test-scenarios.md`](/docs/ops/manual-test-scenarios.md)

## Quickstart (Root UX)
```bash
git clone <repo-url>
cd codex-orchestrator
cp .env.example .env
docker compose up -d
```

Health endpoints:
- `GET http://localhost:8080/health/live`
- `GET http://localhost:8080/health/ready`
- Web control panel: `http://localhost:8080/ui/`

Local smoke path (after `docker compose up -d`):
```bash
npm ci
npm run smoke:local
```
The smoke script checks auth guard, tasks, delegation, schedules, auth-profiles, custom modules, packs, and queue endpoints.
For exact manual QA scenarios (UI + API), use [`docs/ops/manual-test-scenarios.md`](/docs/ops/manual-test-scenarios.md).

Quick multi-channel logs probe:
```bash
npm run logs:check
```
The script verifies API health/events, `docker compose logs` for `bus`, Redis Streams (`orchestrator.events`), and optional Loki readiness.

Exact limits probe for one or many `CODEX_HOME` profiles:
```bash
npm run limits:check -- --home="$HOME/.codex"
```
The script uses Codex app-server RPC `account/rateLimits/read` for exact current percentages, plus fallback diagnostics from sqlite logs and optional live probe (`--probe`).
Output includes both `used_percent` and `remaining_percent` for primary/secondary windows.
For service-side live lookup from uploaded auth profiles, use API endpoint:
- `GET /api/auth-profiles/chatgpt/{id}/limits`

Real Codex delegation runtime:
- `bus` image includes `@openai/codex` CLI.
- Runtime mode is controlled by `.env`:
  - `DELEGATION_EXECUTOR_MODE=auto` (default): use real `codex exec` when command + active auth profile are available; otherwise fallback to deterministic mock.
  - `DELEGATION_EXECUTOR_MODE=codex_exec`: strict real mode (fails without active auth profile or codex command).
  - `DELEGATION_EXECUTOR_MODE=mock`: force mock mode.
- For real execution path, upload and activate ChatGPT `auth.json`, then call `POST /api/delegation/dispatch` with `payload.prompt`.
- Storage/runtime behavior: service persists uploaded `auth.json` in MinIO and writes it to per-run `CODEX_HOME/auth.json` before `codex exec`.
- You can override mode per request with `payload.execution_mode` (`mock` or `codex_exec`).

Built-in web control panel:
- Open `http://localhost:8080/ui/`
- Save `X-Admin-Token` from your `.env`
- Select language (`RU/EN`) in header if needed
- Use tabbed IA to avoid long single-page scroll: `Overview`, `Tasks & Queue`, `Agents`, `Accounts & Limits`, `System`
- Run end-to-end operator workflow: create task -> upload profile -> activate/deactivate -> inspect held queue and switch-events
- Monitor runtime with new operator cards:
  - `Agent Runtime Cards` (`preparing/running/recent`) with prompt, selected account, and execution log preview
  - `Agent Memory` panel: create/update per `project_id + agent_role` notes and toggle them on/off
  - `Account Fleet` cards with per-profile live limits (5h/weekly remaining + reset timestamps)

Telegram adapter (MVP long polling):
- Enable in `.env`: `TG_ENABLED=true`, `TG_BOT_TOKEN=...`, and optionally whitelist (`TG_ALLOWED_CHAT_IDS` and/or `TG_ALLOWED_USER_IDS`)
- Optional proxy: `TG_PROXY_URL=socks5://...` or `http(s)://...`
- Supported commands: `/help`, `/tasks`, `/task`, `/say`, `/pause`, `/resume`, `/stop`, `/replan`, `/approve`, `/reject`, `/logs`, `/artifacts`, `/limit`, `/switch-status`, `/held`, `/switch-history`
- System notifications are bridged from Redis Streams with debounce (`queue.hold_started`, `auth_profile.switch.started/completed/skipped`, `queue.hold_released`)
- If whitelist is empty, adapter starts in discovery mode and logs incoming `chat_id/user_id` for initial safe setup.

Optional observability profile:
```bash
docker compose --profile observability up -d
```

## Scope
- MVP stack: Fastify + TypeScript, Next.js, Prisma + SQL migrations, Redis Streams, OpenAPI 3.1.
- Module runtime: TypeScript-first with optional PowerShell adapter.
- Auth mode MVP: single admin token.
- Delivery mode: Docker Compose-first.

## Run Model (Documentation-First)
This repository contains a decision-complete documentation pack and an API-only PR1 bootstrap:
- architecture baseline and ADRs;
- canonical API and event contracts;
- data/runtime specification;
- Docker and operations runbook;
- OSS process and release policy.

## License
Apache-2.0. See [`LICENSE`](LICENSE).
