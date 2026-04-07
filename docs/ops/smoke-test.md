# Smoke Test (Docs-Driven)

## Goal
Verify that runtime deployment and critical control plane endpoints work from documentation only.

## Steps
1. Start compose stack from repository root (`cp .env.example .env && docker compose up -d`).
2. Install dependencies (`npm ci`).
3. Run automated smoke scenario (`npm run smoke:local`).
4. Optional manual spot-check: verify `GET /health/live` and `GET /health/ready`.

## Automated smoke coverage
- Admin guard (`401` without `X-Admin-Token` for `/api/*`).
- Task create/list.
- Delegation capabilities/dispatch/status/result.
- Delegation timeout/retry path with terminal `failed` status.
- Schedules create/trigger/runs.
- Schedule trigger idempotency (same `X-Trace-Id` returns existing run).
- ChatGPT auth profile upload/activate/deactivate + switch-events consistency (`manual_activate`/`manual_deactivate`).
- Custom module config patch + execution history.
- Pack register/materialize.
- Queue held list/release.

## Pass criteria
- `npm run smoke:local` exits with code `0`.
- No unauthorized admin action is accepted without `X-Admin-Token`.
- Health/readiness endpoints return `200` when dependencies are up.
