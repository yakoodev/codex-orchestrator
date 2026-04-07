# codex-orchestrator

Open-source orchestrator bus for Codex workers with limit-aware scheduling, deterministic task state machine, and controllable auth-profile switching.

## Quick Links
- Russian docs: [`docs/ru/00-index.md`](/docs/ru/00-index.md)
- English docs: [`docs/en/00-index.md`](/docs/en/00-index.md)
- Contracts: [`docs/contracts`](/docs/contracts)
- Docker/Ops: [`docs/docker`](/docs/docker)
- PR1 status tracker: [`docs/ops/pr1-progress.md`](/docs/ops/pr1-progress.md)
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
- Run end-to-end operator workflow: create task -> upload profile -> activate/deactivate -> inspect held queue and switch-events

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
