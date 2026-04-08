# Product Roadmap (Post-PR1)

Обновлено: 2026-04-08  
Статус PR1: в активной реализации (API-first).

Этот roadmap фиксирует ближайшие продуктовые улучшения после закрытия PR1.

## Planned: MCP Bridge for Agent Operations
- Статус: `planned`.
- Цель: дать агентам и внешним ассистентам стандартный MCP-интерфейс для работы с оркестратором.
- Базовый scope MCP (MVP):
  - `orchestrator.list_agents`: получить доступных агентов/шаблоны;
  - `orchestrator.list_tasks`: получить список задач и статусы;
  - `orchestrator.dispatch_agent`: запустить делегацию/агента на задачу;
  - `orchestrator.get_limits`: получить актуальные лимиты профилей.
- Требования:
  - переиспользование текущих API/контрактов оркестратора;
  - единый security boundary (`X-Admin-Token`/service token);
  - trace/idempotency для операций запуска.
- Документ интерфейса: `docs/ops/mcp-agent-bridge.md`.

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
  - [x] доработать визуальную и навигационную логику админки до уровня production polish.
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
  - prompt/log вынесены из карточки в отдельный inspector, чтобы снизить визуальный шум и дать быстрый drill-down по месту.
- Остается:
  - углубить потоковые runtime-логи по running-агентам;
  - добавить более детальный drill-down по каждому запуску.

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
  - в `/ui/` добавлен блок Agent Memory (создание, просмотр, enable/disable записей).
- Остается:
  - добавить role-aware память в Telegram workflow;
  - добавить richer editor/версионирование памяти и историю изменений.

## Planned: Account Fleet Cards
- Статус: `in_progress`.
- Цель: карточки аккаунтов с обзором “зоопарка” auth-профилей.
- В карточке аккаунта:
  - понятное имя/label;
  - текущие лимиты (5h/weekly, used/remaining, reset time);
  - статус (active/inactive/blocked);
  - быстрые действия (activate/deactivate, drill-down в лимиты и историю switch).
- Текущий прогресс:
  - добавлены UI-карточки account fleet в `/ui/`;
  - лимиты подтягиваются live через `GET /api/auth-profiles/chatgpt/{id}/limits` для каждого профиля;
  - вкладка аккаунтов разделена на `Profiles/Limits/History`, добавлены фильтры по истории switch-событий.
- Остается:
  - добавить быстрые inline-экшены на карточках лимитов;
  - добавить расширенный history drill-down по конкретному аккаунту.
