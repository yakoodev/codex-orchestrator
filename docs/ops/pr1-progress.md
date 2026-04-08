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
- [x] Для ChatGPT profile upload реализована базовая валидация (size, имя файла `auth.json`, JSON mime/payload, checksum).
- [x] В MinIO сохраняется `auth.json`, метаданные в Postgres.
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
  - `auth_profile.switch.started/retried/failed/completed/skipped` (manual activate/deactivate + retry/no-op/failure)
  - `queue.hold_started`, `queue.hold_released`
  - `task.auth_switching`
  - `pack.registered/validated/materialized/rotated`
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
- [x] Локальный smoke-path покрывает ветки timeout/retry делегации, идемпотентный trigger расписаний и manual activate/deactivate switch-events.
- [x] Добавлен этот прогресс-трекер для прозрачной фиксации статуса реализации.

## Что уже дополнительно реализовано сверх базового smoke-core
- [x] Расширенный API слой (agents templates, auth contexts, workers, artifacts, packs, delegation, schedules).
- [x] Route coverage check против OpenAPI (`npm run contract-routes`).
- [x] Schedule rule AST evaluator (`all/any/not`, typed predicates, UTC `time.cron`, legacy `conditions`).
- [x] Идемпотентность `POST /api/schedules/{id}/trigger` по `trace_id` (повтор возвращает существующий run).
- [x] Startup recovery для расписаний с `misfire_policy = recompute_due_on_restart` (идемпотентный запуск по часовому bucket + `schedule.run.started/skipped_due_to_overlap` события).
- [x] Startup recovery работает fail-safe: ошибка чтения правил на старте логируется и не роняет приложение.
- [x] Delegation lifecycle и timeout-retry semantics (до 3 попыток с terminal `failed`).
- [x] Покрыт тестом terminal failed path для делегации при отсутствии подходящего capability target.
- [x] Retry/backoff и идемпотентность для `PATCH /api/custom-modules/{key}`.
- [x] `POST /api/auth-profiles/chatgpt/{id}/activate|deactivate` формируют `AuthSwitchEvent` записи и публикуют lifecycle события (`started/completed/skipped`).
- [x] Manual auth switch (`activate|deactivate`) использует retry/backoff при transient errors и публикует `auth_profile.switch.retried`; terminal ошибка отдает `AUTH_SWITCH_FAILED`.
- [x] Retry и terminal failure manual switch также пишутся в `AuthSwitchEvent` (`manual_*_retry` / `manual_*_failed`, status `failed`) для полной DB-backed истории switch-events.
- [x] Terminal failure manual switch публикует отдельное событие `auth_profile.switch.failed` (помимо DB-backed `AuthSwitchEvent`).
- [x] Side-effects для manual switch (`AuthSwitchEvent`/event publish на retry+failed) работают fail-safe: при их локальной ошибке основной activate/deactivate flow не прерывается.
- [x] Post-commit publish для manual switch success path и `POST /api/queue/held/release` работает best-effort (операция не откатывается из-за сбоя публикации события).
- [x] Manual auth switch теперь проходит через queue workflow `hold -> switch -> release` для `NEW/QUEUED` задач с публикацией `queue.hold_started/queue.hold_released` и `task.auth_switching`.
- [x] Pack lifecycle endpoints публикуют `pack.registered`, `pack.validated`, `pack.rotated`, `pack.materialized`.
- [x] Добавлен встроенный Web operator panel (`/ui/`) в root-сервис для ручного управления workflow: health, tasks, held queue, auth profiles, switch-events, module config.
- [x] Web panel улучшен: добавлены RU/EN локализация, переключатель языка, KPI-статистика по ключевым сущностям и fail-soft refresh панелей.
- [x] Для UI backlog заведена отдельная задача в шине: `cmnonv80f0001mp2uw9zjyt4y` (UI/UX + localization enhancement).
- [x] Синхронизирован API контракт для `GET /api/auth-profiles/chatgpt/active`: документирован ответ `404` при отсутствии выбранного активного профиля.
- [x] Расширен `smoke:local`: проверка выдачи UI-статики (`/ui/*`) и empty-state `active profile` (`404 NOT_FOUND`).
- [x] `smoke:local` делегации сделаны детерминированными через `payload.execution_mode=mock`, чтобы smoke не зависел от внешней модели.
- [x] Добавлен пошаговый manual QA guide с точными PowerShell-сценариями: `docs/ops/manual-test-scenarios.md`.
- [x] Добавлен runtime `DelegationExecutor` с режимами `mock|auto|codex_exec` и timeout policy для реального запуска `codex exec` в `POST /api/delegation/dispatch`.
- [x] В строгом real режиме делегация использует активный ChatGPT auth профиль из MinIO: runtime читает сохраненный `auth.json`, пишет его в `CODEX_HOME/auth.json` и запускает `codex`.
- [x] В Docker-образ `bus` добавлен `@openai/codex`, чтобы реальный executor работал в compose-окружении без ручной установки CLI.
- [x] Добавлены unit/API тесты на injected executor path (`completed`) и terminal fail-path (`AUTH_PROFILE_REQUIRED`) для защиты новой runtime-ветки.
- [x] Добавлен multi-channel механизм операционного съема логов: `npm run logs:check` (API + Docker logs + Redis Streams + optional Loki readiness) и обновлен runbook с диагностическими командами.
- [x] Добавлен механизм съема точных лимитов для нескольких `CODEX_HOME`: `npm run limits:check` использует `codex app-server` RPC `account/rateLimits/read` как primary source, считает и выводит `used_percent` + `remaining_percent` (остаток), плюс fallback-диагностику из sqlite и optional live probe.
- [x] Механизм точных лимитов интегрирован в API: `GET /api/auth-profiles/chatgpt/{id}/limits` возвращает live snapshot (`used_percent` + `remaining_percent`) через `codex app-server` для загруженного профиля.
- [x] Добавлен Telegram long-polling адаптер с whitelist + offset persistence + exponential backoff + proxy support (`TG_PROXY_URL`) и MVP-командами управления через существующий API (`/tasks`, `/task`, `/pause`, `/resume`, `/stop`, `/replan`, `/approve`, `/reject`, `/logs`, `/artifacts`, `/limit`, `/switch-status`, `/held`, `/switch-history`).

## Что намеренно вне PR1
- [~] Полный Next.js кабинет (после PR1). Временный встроенный Web panel (`/ui/`) уже доступен для операционного тестирования.
- [~] Telegram интерфейс (MVP long polling команды есть; системные push-уведомления в Telegram остаются следующим шагом).

## Текущее состояние проверок (ветка PR1)
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run contracts:check`
