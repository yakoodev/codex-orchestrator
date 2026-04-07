# Smoke Test (Docs-Driven)

## Goal
Verify that runtime deployment and critical control plane endpoints work from documentation only.

Detailed manual QA scenarios for user acceptance:
- [`docs/ops/manual-test-scenarios.md`](/docs/ops/manual-test-scenarios.md)

## Steps
1. Start compose stack from repository root (`cp .env.example .env && docker compose up -d`).
2. Install dependencies (`npm ci`).
3. Run automated smoke scenario (`npm run smoke:local`).
4. Optional manual spot-check:
   - verify `GET /health/live` and `GET /health/ready`;
   - open `http://localhost:8080/ui/` and run one operator cycle (`create task -> activate profile -> release held queue`).

## Automated smoke coverage
- UI static delivery (`/ui/`, `/ui/app.js`, `/ui/styles.css`) and localization assets presence.
- Admin guard (`401` without `X-Admin-Token` for `/api/*`).
- Active profile empty-state (`GET /api/auth-profiles/chatgpt/active` -> `404 NOT_FOUND` when no active profile).
- Task create/list.
- Delegation capabilities/dispatch/status/result.
- Delegation timeout/retry path with terminal `failed` status.
- Schedules create/trigger/runs.
- Schedule trigger idempotency (same `X-Trace-Id` returns existing run).
- ChatGPT auth profile upload/activate/deactivate + switch-events consistency (`manual_activate`/`manual_deactivate`, `started` + `completed`).
- Custom module config patch + execution history.
- Pack register/materialize.
- Queue held list/release.

Notes:
- With default `DELEGATION_EXECUTOR_MODE=auto`, smoke delegation may use mock fallback when no active auth profile is selected.
- Real codex execution path is validated separately by Scenario F in [`docs/ops/manual-test-scenarios.md`](/docs/ops/manual-test-scenarios.md).

## Pass criteria
- `npm run smoke:local` exits with code `0`.
- No unauthorized admin action is accepted without `X-Admin-Token`.
- Health/readiness endpoints return `200` when dependencies are up.
