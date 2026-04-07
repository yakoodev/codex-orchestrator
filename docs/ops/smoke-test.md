# Smoke Test (Docs-Driven)

## Goal
Verify that runtime deployment and critical control plane endpoints work from documentation only.

## Steps
1. Start compose stack from repository root (`cp .env.example .env && docker compose up -d`).
2. Verify `GET /health/live` and `GET /health/ready`.
3. Create a task via `POST /api/tasks` with `X-Admin-Token`.
4. List tasks via `GET /api/tasks` with `X-Admin-Token`.
5. Upload a ChatGPT auth profile ZIP via `POST /api/auth-profiles/chatgpt/upload` with `X-Admin-Token`.
6. Activate profile via `POST /api/auth-profiles/chatgpt/{id}/activate` with `X-Admin-Token`.
7. Fetch module config and update switch settings (`GET/PATCH /api/custom-modules/{key}` with `X-Admin-Token`).
8. Read queue hold status and switch-events history endpoints with `X-Admin-Token`.

## Pass criteria
- All endpoints return valid responses per OpenAPI schema.
- No unauthorized admin action is accepted without `X-Admin-Token`.
- Event logs include module/hold/auth-switch events with required envelope fields.
