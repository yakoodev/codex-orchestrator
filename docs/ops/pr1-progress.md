# PR1 Progress Tracker (API-only Bootstrap)

Обновлено: 2026-04-07  
Ветка: `codex/pr1-bootstrap-api-only`

Этот документ фиксирует, что уже реализовано по PR1 (`clone -> .env -> docker compose up`) и что остается добить до финального merge.

## Статус по плану PR1

### 1. Backend foundation (root-сервис)
- [x] Один root-сервис на `Node.js + TypeScript` (npm-only).
- [x] HTTP слой на `Fastify`.
- [x] Тесты на `Vitest + Supertest`.
- [x] Стандартные lifecycle scripts: `start`, `dev`, `test`, `lint`, `typecheck`, `prisma:*`, `contract-*`, `contracts:check`.

### 2. Docker UX и инфраструктура
- [x] Runtime entrypoint в root: `.env.example`, `docker-compose.yml`, `Dockerfile`.
- [x] Из root поднимаются `bus`, `postgres`, `redis`, `minio`.
- [x] При старте `bus` выполняется `prisma migrate deploy`, затем старт API.
- [x] `GET /health/ready` возвращает `200` только при доступности Postgres+Redis+MinIO, иначе `503`.

### 3. Данные и storage
- [x] Подключена полная Prisma-схема по канону + миграции в репозитории.
- [x] Для ChatGPT profile upload реализована базовая валидация (size, zip signature/mime, checksum).
- [x] Бинарник профиля сохраняется в MinIO, метаданные в Postgres.
- [x] `GET /api/queue/held` строится из задач со статусом `WAITING_LIMIT`.
- [x] `GET /api/auth-profiles/chatgpt/switch-events` читает из persistence (`AuthSwitchEvent`).

### 4. API поведение
- [x] Реализованы smoke-core endpoints:
  - `GET /health/live`, `GET /health/ready`
  - `POST /api/tasks`, `GET /api/tasks`
  - `POST /api/auth-profiles/chatgpt/upload`
  - `POST /api/auth-profiles/chatgpt/{id}/activate`
  - `GET /api/auth-profiles/chatgpt/switch-events`
  - `GET /api/queue/held`
  - `GET/PATCH /api/custom-modules/{key}`
- [x] Для custom module есть auto-seed дефолта `switch_chatgpt_auth_on_limit`.
- [x] Для остальных OpenAPI paths зарегистрированы явные stubs с `501` и единым `ErrorResponse`.

### 5. Security и события
- [x] Все `/api/*` защищены `X-Admin-Token`, health endpoints публичны.
- [x] Реализован Redis Streams publisher с envelope (`event_id`, `event_type`, `timestamp`, `trace_id`, `payload`, `version`, `idempotency_key`).
- [x] Публикуются обязательные события для реализованных действий, включая:
  - `auth_profile.uploaded`, `auth_profile.activated`
  - `module.execution.started/completed/failed`
  - `agent.delegation.requested/accepted/completed/failed`
  - `schedule.rule.*`, `schedule.run.*`

### 6. CI и docs sync
- [x] Есть GitHub Actions workflow с обязательными checks:
  - `lint`
  - `typecheck`
  - `contract-openapi`
  - `contract-routes`
  - `contract-events`
  - `contract-prisma`
- [x] E2E smoke не включен в CI (только локальный compose smoke-path).
- [x] Локальный smoke-path документирован (`docs/ops/smoke-test.md`, `npm run smoke:local`).
- [x] Локальный smoke-path покрывает ветки timeout/retry делегации и идемпотентный trigger расписаний.
- [x] Добавлен этот прогресс-трекер для прозрачной фиксации статуса реализации.

## Что уже дополнительно реализовано сверх базового smoke-core
- [x] Расширенный API слой (agents templates, auth contexts, workers, artifacts, packs, delegation, schedules).
- [x] Route coverage check против OpenAPI (`npm run contract-routes`).
- [x] Schedule rule AST evaluator (`all/any/not`, typed predicates, UTC `time.cron`, legacy `conditions`).
- [x] Идемпотентность `POST /api/schedules/{id}/trigger` по `trace_id` (повтор возвращает существующий run).
- [x] Startup recovery для расписаний с `misfire_policy = recompute_due_on_restart` (идемпотентный запуск по часовому bucket + `schedule.run.started/skipped_due_to_overlap` события).
- [x] Delegation lifecycle и timeout-retry semantics (до 3 попыток с terminal `failed`).
- [x] Покрыт тестом terminal failed path для делегации при отсутствии подходящего capability target.
- [x] Retry/backoff и идемпотентность для `PATCH /api/custom-modules/{key}`.

## Что намеренно вне PR1
- [ ] Web UI.
- [ ] Telegram интерфейс.

## Текущее состояние проверок (ветка PR1)
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run contracts:check`
