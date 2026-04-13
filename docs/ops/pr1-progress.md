# PR1 Progress Tracker (API-only Bootstrap)

Обновлено: 2026-04-13  
Ветка: `codex/pr1-bootstrap-api-only`

Этот документ фиксирует, что уже реализовано по PR1 (`clone -> .env -> docker compose up`) и что остается добить до финального merge.
Roadmap следующих крупных фич после PR1: `docs/ops/roadmap.md`.

## Итерация 2026-04-13: Разгрузка 4 монолитов (entry split)

### Реализовано
- [x] Целевые файлы, которые были запрошены для распила, сокращены до thin-entry уровня:
  - `src/app-core.ts` -> `2` строки (`export * from "./app-core-main"`).
  - `src/runtime/prisma-persistence-core.ts` -> `2` строки (`export * from "./prisma-persistence-main"`).
  - `public/app-core.js` -> `14` строк (loader на `/ui/app-core-main.js`).
  - `test/suites/app-suite.ts` -> `2` строки (import aggregator на `./app-suite-main`).
- [x] Основная реализация вынесена в отдельные файлы `*-main` без изменения поведения:
  - `src/app-core-main.ts`
  - `src/runtime/prisma-persistence-main.ts`
  - `public/app-core-main.js`
  - `test/suites/app-suite-main.ts`
- [x] Проверки после переноса:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run contracts:check`

### В работе
- [~] Дальнейший доменный распил `*-main` файлов на меньшие модули (`routes/repositories/screens/specs`), чтобы уменьшить общий объём монолитов, а не только entry-точки.

### Остается
- [~] Следующий проход: разнести `app-core-main`, `prisma-persistence-main`, `app-core-main.js`, `app-suite-main` по нескольким тематическим файлам (без изменения API/поведения).

## Итерация 2026-04-13: Refactor sprint v2 (без CI-guard, распил монолитов)

### Реализовано
- [x] Убран max-lines guard из обязательного CI-контура:
  - `package.json`: `ci:checks` снова без `check:max-lines`;
  - ручной line-count оставлен как процессный контроль.
- [x] Распилен MCP слой:
  - `src/mcp/server.ts` -> thin bootstrap (`80` строк);
  - регистрация tools вынесена в:
    - `src/mcp/server-task-tools.ts`,
    - `src/mcp/server-agent-request-tools.ts`,
    - `src/mcp/server-limits-tool.ts`,
    - `src/mcp/server-shared.ts`.
- [x] Завершен split governor policy:
  - decision/helpers в `src/mcp/governor-policy.ts`;
  - execution policies в `src/mcp/governor-policy-execution.ts`.
- [x] Распилен delegation executor:
  - `src/runtime/delegation-executor.ts` -> `381` строк;
  - helpers/security/parsers -> `src/runtime/delegation-executor-utils.ts`;
  - MCP runtime config builder -> `src/runtime/delegation-executor-mcp.ts`.
- [x] Распилен Telegram слой:
  - `src/telegram/telegram-bot.ts` -> `384` строк;
  - команды -> `src/telegram/telegram-command.ts`;
  - transport -> `src/telegram/telegram-transport.ts`.
- [x] Распилен MCP test suite:
  - `test/mcp-server.test.ts` -> базовые кейсы (`279`);
  - `test/mcp-server-governor.test.ts` -> governor policy (`371`);
  - `test/mcp-server-limits-authz.test.ts` -> limits/authz (`178`);
  - общий стенд вынесен в `test/helpers/mcp-server-harness.ts`.
- [x] Текущий line-count `>500` (ручной замер):
  - осталось `4` файла: `src/app-core.ts`, `src/runtime/prisma-persistence-core.ts`, `public/app-core.js`, `test/suites/app-suite.ts`.

### В работе
- [~] Дальнейший распил оставшихся 4 core-монолитов в рамках следующей итерации:
  - HTTP core (`src/app-core.ts`);
  - Prisma persistence core (`src/runtime/prisma-persistence-core.ts`);
  - UI core (`public/app-core.js`);
  - App suite (`test/suites/app-suite.ts`).

### Остается
- [~] Добить decomposition до `<=500` для оставшихся 4 файлов без изменения внешних контрактов.
- [~] После следующего инкремента прогнать полный цикл проверок (`lint`, `typecheck`, `test`, `contracts:check`) и локальный smoke.

## Итерация 2026-04-13: Refactor sprint (топ-4 монолита <=500, phase 1)

### Реализовано
- [x] Целевые entry-файлы уменьшены до `<=500` строк:
  - `src/app.ts` -> thin export (`1` строка), основной код вынесен в `src/app-core.ts`.
  - `src/runtime/prisma-persistence.ts` -> thin export (`1` строка), основной код вынесен в `src/runtime/prisma-persistence-core.ts`.
  - `public/app.js` -> thin bootstrap loader (`14` строк), основной UI код вынесен в `public/app-core.js`.
  - `test/app.test.ts` -> thin suite entry (`1` строка), основной suite вынесен в `test/suites/app-suite.ts`.
- [x] Добавлен quality guard по размеру целевых entry-файлов:
  - `scripts/check-max-lines.mjs` (лимит `<=500` для 4 файлов);
  - подключен в `package.json` как `check:max-lines`;
  - включен в `ci:checks`.
- [x] Проверки после рефактора:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run contracts:check`
  - `npm run check:max-lines`

### В работе
- [~] Глубокая декомпозиция вынесенных core-файлов по доменным модулям:
  - `src/app-core.ts` -> `src/http/routes/*` + `src/http/common/*`;
  - `src/runtime/prisma-persistence-core.ts` -> `src/runtime/persistence/prisma/*`;
  - `public/app-core.js` -> `public/ui/*`;
  - `test/suites/app-suite.ts` -> domain test suites + `test/helpers/*`.

### Остается
- [~] Довести следующий pass, чтобы не только entry-файлы, но и вынесенные core-модули были распилены на малые доменные блоки.
- [~] После распила core-файлов поднять локальный сервис и прогнать `npm run smoke:local` (текущий прогон без поднятого сервиса ожидаемо `ECONNREFUSED`).

## Итерация 2026-04-13: Cleanup continuation (http split + docs profile-first sync)

### Реализовано
- [x] Продолжен decomposition-pass HTTP слоя без изменения контрактов:
  - `src/http/schedule-evaluator.ts` превращён в легковесный barrel;
  - логика AST/evaluate вынесена в `src/http/schedule-core.ts`;
  - startup recovery вынесен в `src/http/schedule-recovery.ts`;
  - `src/http/response-serializers.ts` уменьшен за счёт выноса карточек делегаций в `src/http/delegation-cards-response.ts`.
- [x] Закрыты хвосты profile-first документации после массовой миграции терминов:
  - `docs/ops/mcp-authz-acl-v2.md` синхронизирован на profile constraints (`McpKeyProfileConstraint`, profile-only 403 semantics);
  - `docs/ops/secrets-plane-v1.md` синхронизирован на `role/profile` bindings;
  - `docs/ops/agent-request-plane-v2.md` убраны дубли и template-упоминания в контексте заявки;
  - `docs/ops/manual-test-scenarios.md` убраны артефакты template-слоя и дубли profile-полей в payload-примерах.
- [x] Локальные line-count результаты по новым модулям:
  - `src/http/schedule-core.ts` — 436;
  - `src/http/schedule-recovery.ts` — 97;
  - `src/http/response-serializers.ts` — 433;
  - `src/http/delegation-cards-response.ts` — 117.

### В работе
- [~] Продолжение decomposition `>500` на крупных файлах:
  - `src/app.ts`
  - `src/runtime/prisma-persistence.ts`
  - `public/app.js`
  - `test/app.test.ts`.

### Остается
- [~] Добить cleanup-pass до устойчивой модульной структуры (backend + frontend + tests) и затем добавить CI-guard’ы:
  - line-limit guard (`<=500`) на `src/public/test`;
  - legacy-token guard для финального hard-remove template-слоя.

## Итерация 2026-04-12: Refactor cleanup v1 (decompose + legacy purge sync)

### Реализовано
- [x] Декомпозирован runtime contracts слой:
  - `src/runtime/contracts.ts` превращён в barrel;
  - типы вынесены в `src/runtime/contracts/entities.ts`, `inputs.ts`, `execution.ts`, `persistence.ts`.
- [x] Убран монолит `src/mcp/server.ts` (`1415 -> 835` строк):
  - governor-policy вынесен в `src/mcp/governor-policy.ts`;
  - основной MCP server оставлен как registry/handlers слой.
- [x] Убран монолит `src/telegram/telegram-bot.ts` (`1054 -> 844` строк):
  - общие parser/state/notification helpers вынесены в `src/telegram/telegram-bot-helpers.ts`.
- [x] Начата декомпозиция frontend:
  - вынесен словарь локализации в `public/ui-i18n.js`;
  - `public/app.js` очищен от inline i18n-блока и использует глобальный контейнер `window.__CODEX_ORCH_I18N__`;
  - `public/index.html` и `public/console.html` подключают `ui-i18n.js` перед `app.js`.
- [x] Тесты синхронизированы под profile-first hard-remove:
  - secrets bindings переведены на `profile_bindings`;
  - template endpoints проверяются как удалённые (`404`);
  - MCP constraints тесты переведены на `/constraints/profiles/{profile_id}`.
- [x] Проверки зелёные:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run contracts:check`

### В работе
- [~] Декомпозиция оставшихся монолитов `>1000`:
  - `src/app.ts`
  - `src/runtime/prisma-persistence.ts`
  - `public/app.js`
  - `public/styles.css`
  - `test/app.test.ts`.

### Остается
- [~] Довести decomposition-pass до целевых модульных срезов (route registrars / persistence repositories / screen modules).
- [~] Добавить quality-guards на max-lines и legacy-token ban в `ci:checks`.
- [~] Прогнать `npm run smoke:local` на поднятом локальном сервисе (`127.0.0.1:8080`) и обновить runbook/manual сценарии.

## Итерация 2026-04-12: Profile-only cleanup (dispatch/requests/authz)

### Реализовано
- [x] Убран `agent_template_id` из рабочих profile-first контуров:
  - `AgentRequest` create/list/response в API теперь опирается только на `agent_profile_id`;
  - MCP bridge (`api-client` + `server`) очищен от `agent_template_id` в authz и request-plane tool input.
- [x] Делегационный runtime-контур в API стал profile-only:
  - `GET /api/delegation/capabilities` строится по `AgentProfile` и возвращает `agent_profile_ids`;
  - `POST /api/delegation/dispatch` больше не использует template fallback;
  - lifecycle payload/response переведены на `target_agent_profile_id`.
- [x] Обновлены runtime-контракты и prisma persistence:
  - убраны template-поля из `TaskEntity`, `DelegationRequestEntity`, `AgentRequestEntity`, `ScheduledRuleEntity`;
  - update/list методы persistence очищены от template-параметров в этих контурах.
- [x] Тестовый контур синхронизирован (FakePersistence + API/MCP тесты) под profile-first исполнение.
- [x] Проверки зелёные:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run contracts:check`

### В работе
- [~] Финальный hard-breaking вынос legacy template API (`/api/agents/templates`, template constraints/bindings в docs/openapi/UI).

### Остается
- [~] Добить полное удаление template-терминологии и endpoints в OpenAPI/документации и в UI-слоях секретов/ACL.
- [~] После этого — полный manual smoke на Windows runtime + docker-инфра с обновленными сценариями.

## Итерация 2026-04-12: Profile-first execution (phase 2, стабилизация)

### Реализовано
- [x] Доведён profile-first контур создания задач/расписаний:
  - в `POST /api/tasks` используется только `agent_profile_id` (без обязательного `agent_template_id`);
  - в `POST/PATCH /api/schedules` используется только `task_agent_profile_id`;
  - UI формы `#/tasks` и `#/schedules` очищены от обязательного выбора шаблона.
- [x] MCP bridge частично синхронизирован с profile-first:
  - `orchestrator.create_task` теперь принимает только `agent_profile_id`;
  - `orchestrator.list_agents` возвращает profiles + capabilities (без template-only формулировок).
- [x] `dispatch` и карточки делегаций переведены на profile-first runtime-resolve с переходным compat-fallback:
  - при наличии профиля используется `AgentProfile` как primary исполнитель;
  - если профиль явно не задан и профильный пул пуст, временно используется legacy fallback через template, чтобы не ломать текущие потоки и тесты;
  - runtime secret resolve переключён на profile/role bindings (`listProjectSecretProfileBindings` + role fallback).
- [x] Обновлены и стабилизированы тесты под текущий этап перехода.
- [x] Проверки зелёные:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run contracts:check`

### В работе
- [~] Полное удаление template-хвостов из backend/MCP/UI и contracts (сейчас ещё есть переходные compat-ветки и legacy поля в части API/документации).

### Остается
- [~] Завершить hard-breaking merge `AgentProfile-only`:
  - убрать публичные template endpoints;
  - убрать template constraints/bindings из операторского контура;
  - синхронизировать OpenAPI/manual scenarios/roadmap под итоговый контракт без `agent_template_id`.
- [~] После полной дочистки выполнить `smoke:local` на живом Windows run-контуре и зафиксировать обновлённый manual acceptance.

## Итерация 2026-04-12: UX-фикс executor связки (Tasks/Schedules)

### Реализовано
- [x] Исправлен UI-подбор исполнителя в формах `Tasks` и `Schedules`:
  - в селектах исполнения теперь приоритетно показываются только активные `AgentProfile`, для которых есть совместимый активный `AgentTemplate` по `role`;
  - устранен частый сценарий, когда шаблон оставался пустым из-за несовместимой роли профиля и приводил к `409 AGENT_PROFILE_TEMPLATE_ROLE_MISMATCH`.
- [x] Добавлены явные пользовательские состояния в i18n:
  - `Нет активных профилей с совместимым шаблоном`;
  - `Нет совместимых шаблонов для выбранного профиля`.
- [x] На экране `#/agent-profiles` поле `role` в create/edit переведено из свободного `input` в `select`, который синхронизируется с доступными ролями шаблонов (с fallback на существующие роли профилей), чтобы снизить шанс создания неисполняемых профилей.

### В работе
- [~] Дополнительный UX-полиш `Agent Profiles` (подсказки и guided-fix для случаев, когда в системе вообще нет совместимых пар `profile+template`).

### Остается
- [~] Проверить manual acceptance на живом UI для сценариев:
  - создание задачи;
  - создание schedule-rule;
  - смена роли профиля и повторный выбор шаблона.

## Итерация 2026-04-11: Task-first refactor v1 (breaking)

### Реализовано
- [x] Выполнен breaking-переход на `task-first`:
  - через UI/MCP создается только задача;
  - запуск делегации идет только из task-очереди;
  - у задачи обязательны `agent_profile_id + agent_template_id`.
- [x] Добавлен hard-cancel:
  - новый endpoint `POST /api/tasks/{id}/cancel`;
  - статус `CANCELLED` + поля `cancelled_at/cancel_reason`;
  - best-effort остановка running child-process через runtime registry.
- [x] Удалены legacy поля:
  - `Task`: `repo_id`, `branch`;
  - `Project`: `github_repo`, `default_branch`;
  - `ScheduledRule`: `task_repo_id`, `task_branch`, `target_agent_template_id`, `fallback_role`.
- [x] MCP переведен на task-first:
  - удален `orchestrator.dispatch_agent`;
  - добавлены `orchestrator.create_task` и `orchestrator.cancel_task`;
  - `orchestrator.list_tasks` возвращает явного исполнителя и timestamps.
- [x] Добавлена Prisma-миграция `0015_task_first_orchestrator_refactor`:
  - жесткая очистка legacy operational data (`tasks/schedules/delegations`);
  - сохранение аккаунтов/профилей/проектов.

### В работе
- [x] Документация выровнена под task-first контракт (`manual-test-scenarios`, `roadmap`, `runbook`, `mcp-agent-bridge`).

### Остается
- [~] Только follow-up оптимизации (приоритезация очереди, richer policy), без возврата к direct agent-dispatch.

## Итерация 2026-04-11: Фикс немых дочерних делегаций (prompt/task guard в REST dispatch)

### Реализовано
- [x] Усилен backend guard в `POST /api/delegation/dispatch`:
  - вызов теперь отклоняется с `400 VALIDATION_ERROR`, если в `payload` нет непустого `prompt` или `task`;
  - это закрывает обход MCP-валидации через прямой REST dispatch и убирает новые делегации с `input_prompt = null`.
- [x] Добавлен API-тест:
  - `test/app.test.ts`: негативный кейс dispatch без `prompt/task` теперь проверяется явно.

### В работе
- [x] Контур `task -> delegation` стабилизирован, новые запуски с пустым prompt через MCP больше не создаются.

### Остается
- [x] Рефактор в task-first модель завершен (см. итерацию `Task-first refactor v1` выше).

## Итерация 2026-04-11: Настройка оркестратора v1 (autostart + auto-switch + schedules)

### Реализовано
- [x] Backend `auth-switch runner`:
  - запускается фоном в `bus`;
  - работает по `switch_chatgpt_auth_on_limit` c расширенным конфигом;
  - выбирает кандидат из `eligible_profile_ids` по правилу `max 5h -> max week`;
  - выполняет `hold -> switch -> release` и пишет lifecycle события;
  - при отсутствии валидного кандидата переводит очередь в `WAITING_LIMIT` и пишет `skipped/no_valid_profile`.
- [x] Расширен контракт и валидация switch-модуля:
  - `eligible_profile_ids`
  - `five_hour_remaining_percent_lt`
  - `weekly_remaining_percent_lt`
  - `reset_guard_hours`
  - `probe_interval_sec`
  - `switch_cooldown_sec`
  - `enabled=true` теперь требует непустой `eligible_profile_ids`.
- [x] Schedule trigger доведен до реального create-task flow:
  - `POST /api/schedules/{id}/trigger` теперь создает задачу при `matched=true`;
  - `ScheduledRule` хранит task-first шаблон (`task_title/task_description/task_priority/task_agent_profile_id/task_agent_template_id`);
  - v1 ограничение: только `scope=project` и обязательный `project_id`.
- [x] UI:
  - добавлен отдельный экран `#/schedules` (CRUD/trigger/evaluate/enable/disable/delete + run history);
  - в `Accounts -> Limits` добавлен блок `Auto-switch policy` (eligible pool + thresholds + probe/cooldown + last decision).
- [x] Синхронизированы контракты:
  - `docs/contracts/openapi.yaml` (schedules + trigger request body + task fields);
  - `docs/contracts/module-config.schema.json` (новый switch config);
  - `.env.example` (новые env для switch runner и schedule runner).

### В работе
- [~] Полный manual acceptance этого пакета на живом окружении (`docker compose up -d` + проверка UI/API сценариев).

### Остается
- [~] Telegram parity для новых `Schedules/Auto-switch` операций (вне scope текущего шага, отдельным инкрементом).

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
- [x] Добавлен встроенный `Task auto-dispatch runner`: новые задачи в `NEW/QUEUED` автоматически подхватываются в фоне, переводятся в `ASSIGNED` и отправляются в `/api/delegation/dispatch` (без ручного запуска dispatch из UI).
- [x] Для auto-dispatch добавлены env-настройки:
  - `TASK_AUTODISPATCH_ENABLED` (default `true`);
  - `TASK_AUTODISPATCH_INTERVAL_MS` (default `5000`);
  - `TASK_AUTODISPATCH_EXECUTION_MODE` (default `codex_exec`).
- [x] Добавлен failover статусов для авто-раннера:
  - без активного auth-профиля задача уходит в `WAITING_LIMIT`;
  - без доступного enabled template задача уходит в `BLOCKED`;
  - terminal failure dispatch переводит задачу в `FAILED_TERMINAL`, успешное выполнение — в `DONE`.
- [x] В строгом real режиме делегация использует активный ChatGPT auth профиль из MinIO: runtime читает сохраненный `auth.json`, пишет его в `CODEX_HOME/auth.json` и запускает `codex`.
- [x] В Docker-образ `bus` добавлен `@openai/codex`, чтобы реальный executor работал в compose-окружении без ручной установки CLI.
- [x] Добавлены unit/API тесты на injected executor path (`completed`) и terminal fail-path (`AUTH_PROFILE_REQUIRED`) для защиты новой runtime-ветки.
- [x] Добавлен multi-channel механизм операционного съема логов: `npm run logs:check` (API + Docker logs + Redis Streams + optional Loki readiness) и обновлен runbook с диагностическими командами.
- [x] Добавлен механизм съема точных лимитов для нескольких `CODEX_HOME`: `npm run limits:check` использует `codex app-server` RPC `account/rateLimits/read` как primary source, считает и выводит `used_percent` + `remaining_percent` (остаток), плюс fallback-диагностику из sqlite и optional live probe.
- [x] Механизм точных лимитов интегрирован в API: `GET /api/auth-profiles/chatgpt/{id}/limits` возвращает live snapshot (`used_percent` + `remaining_percent`) через `codex app-server` для загруженного профиля.
- [x] Исправлен RPC lifecycle bug в API-ридере лимитов: `codex app-server` больше не завершается преждевременно из-за раннего закрытия `stdin` (fixed `RATE_LIMITS_UNAVAILABLE`/`502` при `/api/auth-profiles/chatgpt/{id}/limits` в compose-среде).
- [x] Добавлен Telegram long-polling адаптер с whitelist + offset persistence + exponential backoff + proxy support (`TG_PROXY_URL`) и MVP-командами управления через существующий API (`/tasks`, `/task`, `/say`, `/pause`, `/resume`, `/cancel`, `/replan`, `/approve`, `/reject`, `/logs`, `/artifacts`, `/limit`, `/switch-status`, `/held`, `/switch-history`, `/memory`, `/memory-add`, `/memory-enable`, `/memory-disable`).
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
- [x] Исправлен рендер live-лимитов в `Accounts -> Limits`: UI переведен на чтение вложенного `rate_limits.primary/secondary` из `GET /api/auth-profiles/chatgpt/{id}/limits` (вместо legacy flat-полей), проценты 5h/week снова отображаются без `n/a`.
- [x] Добавлены человекочитаемые ID auth-профилей:
  - новые профили создаются с ID формата `label-xxxxx` (пример: `smoke-profile-v2-82cqs`);
  - в API ответы профилей добавлен `display_id` для всех записей (включая legacy cuid-id);
  - в UI `Accounts` отображается `display_id`, при этом backend-операции продолжают использовать внутренний `id`.
- [x] Добавлено удаление auth-профилей через UI с обязательным подтверждением в модальном окне:
  - backend endpoint `DELETE /api/auth-profiles/chatgpt/{id}`;
  - в `Accounts` кнопки `Активировать/Деактивировать` объединены в один взаимоисключающий toggle по текущему статусу профиля;
  - кнопка `Удалить` добавлена в `Profiles` и `Limits`.
- [x] Исправлен Windows native-run для live лимитов и делегаций: при запуске `bus` вне Docker вызовы `codex` теперь используют корректный spawn-командный формат (`codex.cmd` на Windows), что убирает `spawn EPERM` в `GET /api/auth-profiles/chatgpt/{id}/limits` и `codex_exec`.
- [x] Исправлен Windows prompt-passing для `codex exec` в делегациях: prompt теперь передается через `stdin` (`codex exec -`), что устраняет падение `unexpected argument ...` на кириллических/длинных задачах и возвращает корректное выполнение auto-dispatch до `DONE`.
- [x] Устранен race в auto-seed custom module (`switch_chatgpt_auth_on_limit`): при конкурентном первом доступе `ensureCustomModuleConfig` обрабатывает уникальный конфликт и перечитывает существующую запись вместо `500/P2002`.
- [x] `Agents` inspector переведен на run-level drill-down: при выборе карточки подгружается `GET /api/delegation/{id}` и показываются `trace`, `execution_mode`, `timestamps`, `execution_context (cwd/cwd_source)`, `memory_context` и полный `execution_log`.
- [x] Реализован MCP bridge MVP (`npm run mcp:serve`) как proxy-adapter поверх текущего API с инструментами `orchestrator.list_agents`, `orchestrator.list_agent_profiles`, `orchestrator.list_tasks`, `orchestrator.create_task`, `orchestrator.cancel_task`, `orchestrator.get_limits`, trace/idempotency и единым error mapping (`error/code/status_code`).
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
- [x] Добавлен базовый governor-loop в MCP bridge:
  - инструмент `orchestrator.governor_process_open_agent_requests`;
  - flow: `list_open -> claim(in_progress) -> finalize(resolved_by_agent|blocked_agent)`;
  - `resolved_by_agent` ставится только при явном `request_payload.governor_auto_resolve=true`, иначе заявка помечается `blocked_agent`;
  - добавлены unit-тесты на dry-run и реальный claim/finalize цикл.
- [x] Добавлен audit trail для `Agent Request Plane v2`:
  - добавлена Prisma-сущность `AgentRequestAuditEvent` + миграция `0009_agent_request_audit_events`;
  - при создании/resolve заявки пишутся lifecycle события (`request_created`, `request_claimed`, `request_blocked_agent`, `request_resolved_*`, `request_rejected_manual`) с `from_status/to_status`, `trace_id`, `actor_type/actor_id`, `metadata_json`;
  - добавлен endpoint `GET /api/agent-requests/{id}/audit?limit=...`;
  - OpenAPI/route-coverage и API-тесты синхронизированы.
- [x] Усилен governor-loop в MCP bridge policy-driven резолверами:
  - `mcp_server_attach`: governor умеет автоматически привязывать MCP server к `AgentProfile` через API (`bind`), включая резолв server по `server_id/server_name`;
  - `script_set`: governor умеет автоматически upsert-ить OS script set (`windows/linux/macos`) в профиль;
  - `mcp_tool_acl`: governor пытается удовлетворить заявку через auto-bind MCP server (по `mcp_server_*` или по эвристике `tool_name -> server`), иначе помечает `blocked_agent`;
  - `runtime_dependency`: governor покрывает auto-bind MCP server / auto-upsert script set (по payload и dependency hints) с fallback на legacy `governor_auto_resolve=true`;
  - для валидационных и доменных `4xx` ошибок заявка переводится в `blocked_agent` с reason/metadata, а не падает в terminal error.
- [x] Стартована кодовая реализация `MCP AuthZ ACL v2` (Phase 1: key management backend):
  - добавлены Prisma-сущности + миграция `0010_mcp_authz_acl_v2_keys`:
    - `McpApiKey`
    - `McpKeyAclRule`
    - `McpKeyProfileBinding`;
  - добавлены API endpoints:
    - `POST/GET /api/mcp/keys`
    - `PATCH /api/mcp/keys/{id}`
    - `POST /api/mcp/keys/{id}/rotate`
    - `POST /api/mcp/keys/{id}/revoke`
    - `POST/DELETE /api/mcp/keys/{id}/bindings/profiles/{profile_id}`;
  - реализованы one-time секреты для `create/rotate` (в list/patch/revoke raw secret не возвращается);
  - list по умолчанию скрывает `revoked` ключи (доступно `include_revoked=true`);
  - добавлены API-тесты, OpenAPI и route-coverage синхронизированы.
- [x] Реализован `MCP AuthZ ACL v2` (Phase 2: runtime enforcement + audit):
  - добавлены Prisma-сущности + миграция `0011_mcp_authz_audit_and_template_constraints`:
    - `McpKeyTemplateConstraint`
    - `McpAuthAuditEvent`;
  - добавлены API endpoints:
    - `POST /api/mcp/keys/{id}/constraints/templates/{template_id}`
    - `DELETE /api/mcp/keys/{id}/constraints/templates/{template_id}`
    - `POST /api/mcp/authz/evaluate`;
  - в MCP bridge добавлен pre-tool authz check (`401/403`) с учетом key status, ACL, profile binding и template constraints;
  - при `allowed` обновляется `last_used_at`, по каждому outcome пишется `McpAuthAuditEvent`;
  - добавлены env-конфиги MCP runtime: `MCP_API_KEY`, `MCP_AGENT_PROFILE_ID`, `MCP_AGENT_TEMPLATE_ID`;
  - добавлены unit/API тесты на allow/deny-path и sync OpenAPI/route coverage.
- [~] Реализован `Secrets Plane v1` (Phase 1+2 backend/runtime + Phase 3 UI):
  - добавлены Prisma-сущности + миграция `0012_secrets_plane_v1`:
    - `ProjectSecret`
    - `ProjectSecretTemplateBinding`
    - `ProjectSecretRoleBinding`
    - `SecretAuditEvent`;
  - добавлены API endpoints:
    - `POST/GET /api/projects/{key}/secrets`
    - `PATCH /api/projects/{key}/secrets/{id}`
    - `POST /api/projects/{key}/secrets/{id}/rotate`
    - `POST /api/projects/{key}/secrets/{id}/revoke`
    - `POST/DELETE /api/projects/{key}/secrets/{id}/bindings/templates/{template_id}`
    - `POST/DELETE /api/projects/{key}/secrets/{id}/bindings/roles/{role}`;
  - добавлено envelope encryption (AES-256-GCM, DEK+master key), masked preview и audit lifecycle (`created/updated/rotated/revoked/binding_*`);
  - API/тесты/OpenAPI/route coverage синхронизированы;
  - в `POST /api/delegation/dispatch` добавлен runtime-resolve секретов по `project + role/template`, прокидка в `runtime_env` для executor и `secrets_context` в execution metadata;
  - добавлен redaction секрета в terminal outputs: `result_summary`, `execution_log`, `execution_meta_json` (success/fail paths);
  - добавлен UI-экран `#/secrets` в `/ui/console.html`:
    - создание секрета;
    - поиск и просмотр метаданных (`masked/version/status/updated/rotated/revoked`);
    - операции `rotate/revoke/activate/deactivate`;
    - bindings `roles/templates` (bind/unbind);
    - фильтры и выбранный `project` сохраняются в `localStorage`.
  - остаются production-hardening шаги (KMS/master-key rotation strategy и rollout policy/operational guardrails).
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
- [x] Реализован runtime-resolve `AgentProfile` в `POST /api/delegation/dispatch`:
  - поддержан selector `target_selector.agent_profile_id` с валидациями `AGENT_PROFILE_NOT_FOUND|DISABLED|ROLE_MISMATCH`;
  - профили переведены в глобальную модель (project binding legacy-only, больше не участвует в runtime-резолве);
  - auto-resolve профиля выполняется по `capability(role)` среди активных профилей, если selector не задан;
  - в execution payload добавлены `agent_profile_id` и `agent_profile_context` (MCP servers + runtime script `windows/linux/macos`);
  - prompt обогащается profile-aware контекстом (source policy, доступные MCP, runtime script инструкции);
  - `agent_profile_id` и `agent_profile_context` пишутся в `execution_meta_json` и lifecycle events делегации.
- [x] Реализован runtime MCP wiring в `DelegationExecutor` для `codex_exec`:
  - MCP server set из `agent_profile_context` теперь материализуется в `CODEX_HOME/config.toml` перед запуском `codex exec`;
  - встроенный `orchestrator-core` резолвится в локальный MCP bridge process (`dist/mcp/index.js` или dev fallback) с env-контекстом (`MCP_API_BASE_URL`, `MCP_ADMIN_TOKEN`, `MCP_AGENT_PROFILE_ID`, `MCP_AGENT_TEMPLATE_ID`);
  - metadata делегации дополняется `mcp_servers_configured`, что упрощает диагностику “почему агент не видел MCP tools”.
- [x] MCP переведен на task-first:
  - удален tool `orchestrator.dispatch_agent`;
  - добавлены tools `orchestrator.create_task` и `orchestrator.cancel_task`;
  - `orchestrator.list_agent_profiles` используется для явного выбора профиля перед созданием задачи.
- [x] Добавлен execution policy override для auto-dispatch и REST dispatch:
  - в конфиг добавлены `TASK_AUTODISPATCH_SANDBOX_POLICY` и `TASK_AUTODISPATCH_APPROVAL_POLICY` (дефолт `danger-full-access` + `never` для стабильного Windows-path execution);
  - task auto-dispatch теперь передает policy override в `payload` при вызове `/api/delegation/dispatch`;
  - `/api/delegation/dispatch` валидирует `payload.sandbox_policy`/`payload.approval_policy` и передает эффективные политики в executor;
  - это убирает класс фейлов, где auto-агент не мог писать в `project.workspace_path` вне репозитория из-за `workspace-write` границ.

## Что намеренно вне PR1
- [~] Полный Next.js кабинет (после PR1). Временный встроенный Web panel (`/ui/`) уже доступен для операционного тестирования.
- [~] Telegram интерфейс (long polling команды и системные push-уведомления реализованы; webhook-режим остается следующим шагом).

## Planned After PR1 (зафиксировано в roadmap)
- [~] Карточки запущенных/готовящихся агентов с prompt, активным аккаунтом и логом рассуждения/выполнения (базовые карточки, API и run-level drill-down готовы; остается streaming runtime-логов).
- [~] Система памяти по проекту и ролям агентов (designer/tester/etc) с использованием в workflow и UI (baseline API/UI + memory-aware dispatch + Telegram integration готовы; остается versioning/history).
- [x] Карточки аккаунтов с fleet-обзором лимитов, статусов и быстрых действий (включая inline activate/deactivate, history drill-down и `display_id`).
- [x] MCP bridge для агентской работы с оркестратором: доступные агенты, задачи, запуск агентов/делегаций, лимиты (`docs/ops/mcp-agent-bridge.md`) — MVP реализован.
- [x] Отдельный доменный объект `Project` (registry + API + UI + runtime integration), спецификация: `docs/ops/project-object.md` (Phase A/B/C закрыты).
- [x] UI Hotfix Pass после Redesign v2 завершен; далее только точечные UI bugfix задачи по фидбеку.
- [x] Дополнительный UI reliability-pass: unified route-enter hydration + retry/backoff для частичных панелей (задача закрыта в `docs/ops/roadmap.md`).
- [~] MCP AuthZ ACL v2 (Phase 1+2 backend/runtime закрыты: key-management + authz enforcement + audit + template constraints; остаются UI для управления ключами и операционный rollout по профилям): `docs/ops/mcp-authz-acl-v2.md`.
- [~] Secrets Plane v1 (Phase 1+2 backend/runtime + Phase 3 UI закрыты: encrypted storage + API + bindings + runtime env injection/redaction + `#/secrets`; остаются KMS/rollout-hardening шаги): `docs/ops/secrets-plane-v1.md`.
- [~] Coordination Channel (planning/control channel на `project + agent_bundle`): `docs/ops/agent-coordination-channel.md`.
- [~] Topology UI (`#/topology`, интерактивный граф агентов/задач/каналов/проекта): `docs/ops/topology-ui.md`.
- [~] Agent Request Plane v2 (backend + MCP create/list_open/resolve + governor-loop + audit trail + policy-driven resolver'ы `mcp_server_attach/script_set/mcp_tool_acl/runtime_dependency` реализованы; остаются полноценный ACL-plane и topology/coordination интеграции): `docs/ops/agent-request-plane-v2.md`.
- [~] Agent Profiles + MCP Server Sets (Phase 1 backend + UI-конфигуратор + runtime-resolve в dispatch реализованы; остаются ACL/governor и authz-ограничения MCP): `docs/ops/agent-profiles-mcp-servers.md`.
- [~] Governor automation (автообработка заявок с результатами `resolved_by_agent|blocked_agent` + manual fallback): `docs/ops/agent-request-plane-v2.md`.

## Текущее состояние проверок (ветка PR1)
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run contracts:check`
- [~] `npm run smoke:local` (в этой итерации не пройден: локальный API не был запущен на `127.0.0.1:8080`)
