# PR1 Progress Tracker (API-only Bootstrap)

Обновлено: 2026-04-09  
Ветка: `codex/pr1-bootstrap-api-only`

Этот документ фиксирует, что уже реализовано по PR1 (`clone -> .env -> docker compose up`) и что остается добить до финального merge.
Roadmap следующих крупных фич после PR1: `docs/ops/roadmap.md`.

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
- [x] Добавлен Telegram long-polling адаптер с whitelist + offset persistence + exponential backoff + proxy support (`TG_PROXY_URL`) и MVP-командами управления через существующий API (`/tasks`, `/task`, `/say`, `/pause`, `/resume`, `/stop`, `/replan`, `/approve`, `/reject`, `/logs`, `/artifacts`, `/limit`, `/switch-status`, `/held`, `/switch-history`, `/memory`, `/memory-add`, `/memory-enable`, `/memory-disable`).
- [x] Добавлен Telegram bridge системных уведомлений из Redis Streams (`queue.hold_started`, `auth_profile.switch.started/completed/skipped`, `queue.hold_released`) с debounce-защитой от штормов.
- [x] Добавлен task steering endpoint `POST /api/tasks/{id}/say` с persistence в `Intervention` (`type=steer`) и интеграцией в Telegram команду `/say`.
- [x] Добавлен безопасный Telegram discovery-режим: при пустом whitelist адаптер стартует, не исполняет команды и логирует `chat_id/user_id` для первичной настройки.
- [x] Добавлен API endpoint `GET /api/delegation/cards` для operator-visible карточек делегаций (`preparing/running/recent`) с prompt/account/log preview.
- [x] Встроенная Web panel расширена карточками активных агентов и account fleet (лимиты 5h/weekly по каждому профилю).
- [x] Карточки агентов в `/ui/` переработаны для читабельности: structured fields + collapsible `prompt`/`log` drill-down.
- [x] Добавлена baseline система памяти агентов: `POST/GET/PATCH /api/memory/entries`, Prisma-модель `AgentMemoryEntry`, UI-блок Agent Memory и авто-подмешивание `project_id + role` памяти в prompt делегации.
- [x] Встроенная `/ui/` переведена на логические вкладки (Overview, Tasks & Queue, Agents, Accounts & Limits, System), чтобы убрать длинный single-page скролл.
- [x] Вкладка `Tasks & Queue` переведена на task-tracker board (колонки `ожидает запуска / запущена / выполнена`) вместо общего списка.
- [x] Ручное управление памятью скрыто в `System` как fallback/admin override (основной сценарий памяти остается автоматическим).
- [x] Улучшена навигационная логика `/ui/`: добавлен контекстный intro-блок текущей вкладки с явным операционным сценарием.
- [x] `Auth Profiles` в `/ui/` переведены с таблицы на карточки с быстрыми действиями `activate/deactivate` и явной пометкой активного профиля.
- [x] В `Tasks & Queue` добавлены client-side фильтры (`search/project/status`) и карточка `Task Details` по клику на задачу.
- [x] Форма создания задачи сделана collapsible и автосворачивается после первого успешного create.
- [x] Списки `Task board` и `Held Queue` уплотнены фиксированной высотой с прокруткой для лучшей операционной плотности экрана.
- [x] `Agents` получили компактные карточки + отдельный inspector (prompt/log и ключевые поля выбранного запуска).
- [x] `Accounts & Limits` разделены на внутренние подтабы `Profiles/Limits/History`, добавлены фильтры для switch-history.
- [x] Добавлены UI panel states (`loading/success/error`) и toggle автообновления (default off) для `Tasks`, `Agents`, `Switch History`.
- [x] Вкладка `System`: ручная память выделена как `Advanced/fallback` блок с явным warning.
- [x] UI Redesign v2 выполнен с нуля в `hybrid`-архитектуре:
  - `/ui/` теперь отдельная entry-страница;
  - `/ui/console.html` — основная операционная консоль с hash-router (`#/dashboard|tasks|agents|accounts|memory|system|logs`).
- [x] Полностью заменен app-shell: `sidebar + quickbar + screen-host`, старые табы/DOM удалены, сохранены только data/API-операции.
- [x] В новой консоли реализован полный parity текущих операций:
  - `Tasks`: create/list/filter/select/details/release-held;
  - `Agents`: preparing/running/recent + inspector;
  - `Accounts`: profiles upload/activate/deactivate + limits + history filters;
  - `Memory`: create/list/enable-disable;
  - `System`: module get/patch + executions;
  - `Logs`: отдельный экран UI/API activity log.
- [x] Введен единый client-side kernel:
  - hash-router + восстановление последнего экрана;
  - единый store для `token/lang/theme/route/filters/autorefresh`;
  - dark-first тема + light switch, RU default + EN toggle, persistence в `localStorage`.
- [x] Обновлены smoke/test проверки UI-статики под новую структуру: `scripts/smoke-local.mjs`, `test/app.test.ts`.
- [x] Закрыт UI Hotfix Pass (финальный дизайн-полиш):
  - KPI-полоса показывается только на `#/dashboard`, устранено конфликтное поведение sticky quickbar/KPI;
  - layout уплотнен в `Tasks/Agents/Memory/System` (compact adaptive высоты, меньше пустых зон);
  - в `Logs` details JSON свернуты по умолчанию и открываются по клику;
  - проведен RU/EN аудит строк (убраны смешанные подписи в RU, EN оставлен полностью англоязычным).
- [x] По операторскому фидбеку скорректирован скролл у карточек `Agents`: оставлен вертикальный скролл внутри колонок (как в `Tasks`), горизонтальный убран; добавлен перенос длинных `agent id` без overflow по ширине.
- [x] Улучшена читаемость системных логов в UI:
  - в `Dashboard -> Последние сигналы` добавлен `scope` и человекочитаемая строка для API (`METHOD route -> status (ms)`);
  - на экране `Logs` тот же компактный summary показывается над JSON details.
- [x] Стилизованы выпадающие списки (`select/option`) для dark/light темы: единый вид с кастомной стрелкой и без светлого системного контраста в тёмной теме.
- [x] Реализован `Project Registry` (Phase A, Data + API core):
  - добавлена Prisma-модель `Project` + миграция `0006_project_registry`;
  - реализованы persistence CRUD + `summary` агрегация (`tasks/memory/switch-events best-effort`);
  - добавлены endpoints:
    - `POST/GET /api/projects`
    - `GET/PATCH /api/projects/{key}`
    - `GET /api/projects/{key}/summary`
  - включена валидация `project_id` в `POST /api/tasks` и `POST /api/memory/entries` (ошибки `PROJECT_NOT_FOUND` / `PROJECT_INACTIVE`);
  - синхронизированы OpenAPI/route-coverage и `smoke:local` под обязательный шаг создания проекта.
- [x] Реализован `Project Registry` (Phase B, Workflow integration):
  - в `POST /api/delegation/dispatch` добавлен fallback `cwd`:
    - при наличии `payload.cwd` используется он;
    - иначе берётся `Project.workspace_path` проекта задачи;
    - если и он не задан, остаётся текущий runtime fallback (`process.cwd()` в executor);
  - в execution meta добавлен `execution_context` с `cwd` и `cwd_source` для диагностики;
  - добавлены тесты на fallback/override поведения `cwd` и синхронизированы manual/smoke сценарии.
- [x] Реализован `Project Registry` (Phase C, UI integration):
  - в `/ui/console.html` добавлен отдельный экран `Projects` (list/create/edit + summary);
  - в `public/app.js` добавлен route/state/render/action flow для `#/projects` с API-интеграцией `POST/GET/PATCH /api/projects` и `GET /api/projects/{key}/summary`;
  - селекты `project_id` в `Tasks` и `Memory`, а также фильтр задач по проекту теперь синхронизируются с реестром проектов (active/all), а не со свободным вводом.
- [x] Исправлена загрузка данных при навигации по sidebar в `/ui/console.html`: при переходе между hash-экранами теперь выполняется `refreshCurrentRoute()` без необходимости вручную нажимать `Обновить`.
- [x] Стартован UI reliability-pass: добавлен fail-soft retry для route-enter refresh (`sidebar/hash/init/quick refresh/token update/accounts section`) при transient ошибках загрузки.
- [x] Завершен unified partial-panel retry/backoff: для `dashboard`, `tasks`, `system`, `full refresh` и `tasks auto-refresh` добавлена повторная подгрузка только упавших панелей без ручного refresh.
- [x] `Accounts -> Limits` усилен inline-действиями: прямо в карточках лимитов добавлены `activate/deactivate` и быстрый переход в `History` с авто-prefilter по выбранному `profile_id`.
- [x] `Switch History` переведен на server-side drill-down: `GET /api/auth-profiles/chatgpt/switch-events` поддерживает фильтры `profile_id/status/reason/limit`, UI применяет их при смене фильтров и дает быстрый profile drill-down прямо из карточек history.
- [x] `Agents` inspector переведен на run-level drill-down: при выборе карточки подгружается `GET /api/delegation/{id}` и показываются `trace`, `execution_mode`, `timestamps`, `execution_context (cwd/cwd_source)`, `memory_context` и полный `execution_log`.
- [x] Реализован MCP bridge MVP (`npm run mcp:serve`) как proxy-adapter поверх текущего API с инструментами `orchestrator.list_agents`, `orchestrator.list_tasks`, `orchestrator.dispatch_agent`, `orchestrator.get_limits`, trace/idempotency для dispatch и единым error mapping (`error/code/status_code`).
- [x] Выполнен Doc/Roadmap Upgrade v3: добавлены design-доки и roadmap-эпики для `MCP AuthZ ACL v2`, `Secrets Plane v1`, `Coordination Channel`, `Topology UI`; обновлены `manual-test-scenarios` под планируемую приемку secret-redaction/ACL/topology.
- [x] В docs добавлен feature backlog `Agent Tool Access Requests` (v1, tool-only).
- [x] Выполнен Doc Upgrade v4: v1 tool-only модель superseded универсальным `Agent Request Plane v2`; добавлены docs по `Agent Profiles + MCP Server Sets`, governor-loop, MCP request tools и обновленные manual acceptance сценарии.
- [x] Стартована кодовая реализация `Agent Request Plane v2` (Phase 1 backend):
  - добавлена Prisma-модель `AgentRequest` + миграция `0007_agent_request_plane_v2`;
  - добавлены API:
    - `POST /api/agent-requests`
    - `GET /api/agent-requests`
    - `GET /api/agent-requests/{id}`
    - `POST /api/agent-requests/{id}/resolve`
  - добавлен open-pool фильтр (`open|blocked_agent` + optional `in_progress`);
  - MCP bridge расширен инструментами:
    - `orchestrator.create_agent_request`
    - `orchestrator.list_open_agent_requests`
    - `orchestrator.resolve_agent_request`;
  - добавлены unit/API тесты для request-plane и MCP bridge.
- [x] Стартована кодовая реализация `Agent Profiles + MCP Server Sets` (Phase 1 backend):
  - добавлены Prisma-сущности + миграция `0008_agent_profiles_mcp_servers`:
    - `AgentProfile`
    - `McpServerRegistry`
    - `AgentProfileMcpServerBinding`
    - `AgentProfileScriptSet`;
  - добавлены API:
    - `POST/GET /api/agent-profiles`
    - `GET/PATCH /api/agent-profiles/{id}`
    - `GET /api/agent-profiles/{id}/mcp-servers`
    - `POST/DELETE /api/agent-profiles/{id}/mcp-servers/{server_id}`
    - `GET /api/agent-profiles/{id}/scripts`
    - `PUT /api/agent-profiles/{id}/scripts/{os}`
    - `POST/GET /api/mcp/servers`;
  - при создании профиля автоматически подключается обязательный `orchestrator-core`;
  - удаление `orchestrator-core` binding через API заблокировано (`MCP_SERVER_REQUIRED`);
  - OpenAPI/route-coverage и API-тесты синхронизированы.
- [x] Реализован UI-конфигуратор `Agent Profiles` в `/ui/console.html#/agent-profiles`:
  - добавлен отдельный экран профилей агентов (create/list/filter/edit);
  - добавлено управление MCP server set профиля: регистрация MCP сервера, bind/unbind, required/priority/config;
  - добавлено управление `OS script sets` (`windows/linux/macos`) с сохранением `script_type/content`;
  - добавлен отдельный panel-state и route-level refresh для `agent-profiles`;
  - состояние фильтров страницы сохраняется в `localStorage`.

## Что намеренно вне PR1
- [~] Полный Next.js кабинет (после PR1). Временный встроенный Web panel (`/ui/`) уже доступен для операционного тестирования.
- [~] Telegram интерфейс (long polling команды и системные push-уведомления реализованы; webhook-режим остается следующим шагом).

## Planned After PR1 (зафиксировано в roadmap)
- [~] Карточки запущенных/готовящихся агентов с prompt, активным аккаунтом и логом рассуждения/выполнения (базовые карточки, API и run-level drill-down готовы; остается streaming runtime-логов).
- [~] Система памяти по проекту и ролям агентов (designer/tester/etc) с использованием в workflow и UI (baseline API/UI + memory-aware dispatch + Telegram integration готовы; остается versioning/history).
- [~] Карточки аккаунтов с fleet-обзором лимитов, статусов и быстрых действий (базовые карточки и live limits готовы; остаются inline-экшены и history drill-down).
- [x] MCP bridge для агентской работы с оркестратором: доступные агенты, задачи, запуск агентов/делегаций, лимиты (`docs/ops/mcp-agent-bridge.md`) — MVP реализован.
- [x] Отдельный доменный объект `Project` (registry + API + UI + runtime integration), спецификация: `docs/ops/project-object.md` (Phase A/B/C закрыты).
- [x] UI Hotfix Pass после Redesign v2 завершен; далее только точечные UI bugfix задачи по фидбеку.
- [x] Дополнительный UI reliability-pass: unified route-enter hydration + retry/backoff для частичных панелей (задача закрыта в `docs/ops/roadmap.md`).
- [~] MCP AuthZ ACL v2 (multi-key, custom-only ACL, agent-profile primary binding, 401/403 модели отказов): `docs/ops/mcp-authz-acl-v2.md`.
- [~] Secrets Plane v1 (encrypted storage, project+role/template bindings, runtime env injection, redaction): `docs/ops/secrets-plane-v1.md`.
- [~] Coordination Channel (planning/control channel на `project + agent_bundle`): `docs/ops/agent-coordination-channel.md`.
- [~] Topology UI (`#/topology`, интерактивный граф агентов/задач/каналов/проекта): `docs/ops/topology-ui.md`.
- [~] Agent Request Plane v2 (Phase 1 backend + MCP create/list_open/resolve реализованы; остаются governor automation, audit trail, topology/coordination интеграции): `docs/ops/agent-request-plane-v2.md`.
- [~] Agent Profiles + MCP Server Sets (Phase 1 backend + UI-конфигуратор реализованы; остаются runtime-resolve по profile и интеграция с ACL/governor): `docs/ops/agent-profiles-mcp-servers.md`.
- [~] Governor automation (автообработка заявок с результатами `resolved_by_agent|blocked_agent` + manual fallback): `docs/ops/agent-request-plane-v2.md`.

## Текущее состояние проверок (ветка PR1)
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run contracts:check`
- [~] `npm run smoke:local` (последний прогон в этой итерации: `ECONNREFUSED 127.0.0.1:8080`, сервис не был запущен локально)
