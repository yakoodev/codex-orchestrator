# Product Roadmap (Post-PR1)

Обновлено: 2026-04-09  
Статус PR1: в активной реализации (API-first).

Этот roadmap фиксирует ближайшие продуктовые улучшения после закрытия PR1.

## MCP Bridge for Agent Operations
- Статус: `completed` (MVP).
- Цель: дать агентам и внешним ассистентам стандартный MCP-интерфейс для работы с оркестратором.
- Базовый scope MCP (MVP):
  - `orchestrator.list_agents`: получить доступных агентов/шаблоны;
  - `orchestrator.list_tasks`: получить список задач и статусы;
  - `orchestrator.dispatch_agent`: запустить делегацию/агента на задачу;
  - `orchestrator.get_limits`: получить актуальные лимиты профилей.
- Что реализовано:
  - MCP stdio bridge (`npm run mcp:serve`) как proxy-adapter поверх текущего REST API;
  - единый security boundary через `MCP_ADMIN_TOKEN`/`ADMIN_TOKEN` -> `X-Admin-Token`;
  - trace/idempotency на уровне bridge для `orchestrator.dispatch_agent`;
  - единый error mapping (`error`, `code`, `status_code`) для upstream ошибок.
- Что дальше:
  - streamable HTTP transport и расширение набора MCP tools вынесены в follow-up scope.
- Документ интерфейса: `docs/ops/mcp-agent-bridge.md`.

## Planned: MCP AuthZ ACL v2
- Статус: `planned` (decision-complete, реализация не начата).
- Цель: перейти от single-token модели MCP к multi-key authorization с точным ACL по методам и template-bound ограничениями.
- Зафиксированные решения:
  - `custom-only ACL` (без обязательных пресетов ролей);
  - ключи хранятся и управляются в БД (`DB managed`);
  - доступ к MCP для агента привязывается только через `agent template` (`template-only binding`);
  - ACL-проверка по точным именам методов/tools (exact match);
  - `401` для отсутствующего/невалидного/отозванного/просроченного ключа;
  - `403` для валидного ключа без прав на запрошенный tool/template.
- Документ дизайна: `docs/ops/mcp-authz-acl-v2.md`.
- Зависимости:
  - API и persistence слой MCP keys;
  - аудит и `last_used` обновления;
  - синхронизация с MCP bridge runtime.

## Planned: Secrets Plane v1
- Статус: `planned` (decision-complete, реализация не начата).
- Цель: безопасно хранить и выдавать секреты агентам без утечек в UI, API-логах и activity-log.
- Зафиксированные решения:
  - backend хранит секреты в БД в зашифрованном виде (envelope encryption);
  - scope доступа строится на `project + role/template binding`;
  - после сохранения UI не читает raw value обратно (только rotate/replace/revoke);
  - runtime выдача секретов делается через env injection только в контекст запуска;
  - после завершения запуска секреты очищаются из runtime-контекста.
- Документ дизайна: `docs/ops/secrets-plane-v1.md`.
- Зависимости:
  - KMS/master-key стратегия и ротация ключей шифрования;
  - redaction middleware для логов/трасс;
  - привязка к Project Registry и template-role модели.

## Planned: Coordination Channel (Planning/Control)
- Статус: `planned` (decision-complete, реализация не начата).
- Цель: выделить отдельный централизованный канал координации агентов для planning/control событий.
- Зафиксированные решения:
  - канал идентифицируется связкой `project_id + agent_bundle_id`;
  - хранит только planning/control сообщения (`plan_created`, `step_assigned`, `handoff_*`, `blocker_reported`, `step_closed`);
  - runtime execution logs и сырой контент выполнения в канал не дублируются (остаются в памяти/заметках/операционных логах).
- Документ дизайна: `docs/ops/agent-coordination-channel.md`.
- Зависимости:
  - модель agent bundle;
  - API чтения/публикации сообщений;
  - связь с топологическим UI-инспектором.

## Planned: Topology UI
- Статус: `planned` (decision-complete, реализация не начата).
- Цель: добавить наглядную интерактивную схему взаимодействия `project/channels/tasks/agents`.
- Зафиксированные решения:
  - новый маршрут UI `#/topology`;
  - граф узлов `agents/tasks/channels/project`;
  - фильтры, live-state, click-inspector, визуализация текущих назначений и связей.
- Документ дизайна: `docs/ops/topology-ui.md`.
- Зависимости:
  - Topology API (`/api/topology/graph`);
  - Coordination API (`/api/coordination/channels*`);
  - UI рендерер интерактивного графа и drill-down инспектор.

## Planned: Project Registry (доменный объект Project)
- Статус: `completed` (Phase A/B/C закрыты).
- Цель: ввести отдельный объект `Project` как источник истины для памяти, задач, артефактов и GitHub-контекста.
- Дизайн-док: `docs/ops/project-object.md`.
- Этап A (Data + API core):
  - [x] добавить Prisma-модель `Project` и миграцию;
  - [x] реализовать persistence CRUD + summary;
  - [x] добавить API `POST/GET /api/projects`, `GET/PATCH /api/projects/{key}`, `GET /api/projects/{key}/summary`;
  - [x] добавить валидацию `project_id` при создании задач и памяти.
- Этап B (Workflow integration):
  - [x] использовать `Project.workspace_path` как default `cwd` в delegation runtime;
  - [x] синхронизировать smoke/manual сценарии под проектный registry.
- Этап C (UI integration):
  - [x] добавить отдельный экран `Projects` в `/ui/console.html`;
  - [x] перевести фильтры задач/памяти на список реальных проектов;
  - [x] добавить project summary-карточку в UI.
- Критерий готовности:
  - [x] `project_id` больше не “свободная строка” в runtime-сценариях;
  - [x] делегации стабильно берут рабочую директорию из настроек проекта;
  - [x] проектные данные доступны через API и UI.

## Planned: Admin UI Redesign v2 (Hybrid Console)
- Статус: `completed` (дизайн-цикл закрыт, далее только точечные bugfix-правки).
- Решение:
  - `/ui/` — entry-страница;
  - `/ui/console.html` — основная консоль с hash-router.
- Новая IA:
  - `#/dashboard`
  - `#/projects`
  - `#/tasks`
  - `#/agents`
  - `#/accounts`
  - `#/memory`
  - `#/system`
  - `#/logs`
- Что уже закрыто:
  - полный пересбор UI-shell с нуля (`sidebar + quickbar + screen-host`), без наследования старой tab-DOM структуры;
  - dark-first тема + переключение dark/light;
  - RU/EN переключение (RU default), строки через i18n-ключи;
  - сохранение `token/lang/theme/route/filters/autorefresh` в `localStorage`;
  - отдельный экран `Logs` с фильтрами и централизованным журналом UI/API событий;
  - полный parity операций на `Tasks`, `Agents`, `Accounts`, `Memory`, `System`;
  - KPI перенесены в `Dashboard`-only режим (без перекрытия sticky quickbar);
  - compact adaptive плотность на рабочих экранах (`Tasks/Agents/Memory/System`) с уменьшением пустых зон;
  - в `Logs` детали JSON свернуты по умолчанию и раскрываются по клику;
  - проведен RU/EN аудит (убраны смешанные подписи в RU).
- Дальше:
  - только точечные UI багфиксы по фидбеку;
  - более глубокий mobile/a11y pass вынесен в отдельный follow-up при необходимости.
- Новые задачи по операторскому фидбеку (2026-04-08):
  - [x] сделать задачи в формате task-tracker доски с 3 колонками (`ожидает запуска / запущена / выполнена`);
  - [x] вынести память агентов в отдельный экран `Memory` (а не hidden fallback);
  - [x] доработать визуальную и навигационную логику админки до уровня production polish;
  - [x] повысить надежность автозагрузки данных UI без ручного `Обновить`: route-enter hydration + unified retry/backoff для частичных панелей.

## Planned: Operator visibility for agents
- Статус: `in_progress`.
- Цель: отдельные карточки для `starting/running` агентов в UI.
- В карточке агента:
  - входной prompt (что отправлено агенту);
  - активный auth/account профиль;
  - лог рассуждения/выполнения (в безопасном redacted-виде).
- Текущий прогресс:
  - добавлен API `GET /api/delegation/cards` c группами `preparing/running/recent`;
  - добавлены UI-карточки агентов в встроенной панели `/ui/`;
  - в карточках показываются prompt, template/model, выбранный account и log preview;
  - prompt/log вынесены из карточки в отдельный inspector, чтобы снизить визуальный шум и дать быстрый drill-down по месту;
  - inspector теперь догружает run-level детали через `GET /api/delegation/{id}`: `trace`, `execution_mode`, `timestamps`, `execution_context (cwd/cwd_source)`, `memory_context`, полный `execution_log`.
- Остается:
  - углубить потоковые runtime-логи по running-агентам;
  - [x] добавить более детальный drill-down по каждому запуску.

## Planned: Project/Agent Memory System
- Статус: `in_progress`.
- Цель: память по проекту и по ролям агентов (designer/tester/etc).
- Базовый scope:
  - хранилище памяти с привязкой `project_id + agent_role`;
  - запись/чтение памяти в workflow задач и делегаций;
  - UI-представление памяти для оператора.
- Пример сценария: дизайнер фиксирует GUI-контекст, тестировщик использует эту память для более быстрой навигации и регресс-проверок.
- Текущий прогресс:
  - добавлен API памяти: `POST/GET/PATCH /api/memory/entries`;
  - добавлена Prisma-модель `AgentMemoryEntry` + миграция;
  - память по `project_id + role` автоматически подмешивается в prompt делегации при `POST /api/delegation/dispatch`;
  - в `/ui/` добавлен блок Agent Memory (создание, просмотр, enable/disable записей);
  - в Telegram добавлены memory-команды (`/memory`, `/memory-add`, `/memory-enable`, `/memory-disable`) для role-aware работы с проектной памятью без UI.
- Остается:
  - [x] добавить role-aware память в Telegram workflow;
  - добавить richer editor/версионирование памяти и историю изменений.

## Planned: Account Fleet Cards
- Статус: `completed`.
- Цель: карточки аккаунтов с обзором “зоопарка” auth-профилей.
- В карточке аккаунта:
  - понятное имя/label;
  - текущие лимиты (5h/weekly, used/remaining, reset time);
  - статус (active/inactive/blocked);
  - быстрые действия (activate/deactivate, drill-down в лимиты и историю switch).
- Текущий прогресс:
  - добавлены UI-карточки account fleet в `/ui/`;
  - лимиты подтягиваются live через `GET /api/auth-profiles/chatgpt/{id}/limits` для каждого профиля;
  - вкладка аккаунтов разделена на `Profiles/Limits/History`, добавлены фильтры по истории switch-событий;
  - [x] добавить быстрые inline-экшены на карточках лимитов;
  - [x] добавить расширенный history drill-down по конкретному аккаунту (server-side filters `profile/status/limit` + быстрый filter-by-profile из списка событий).
