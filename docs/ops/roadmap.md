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

## Planned: Admin UI Redesign (Tabbed IA)
- Статус: `in_progress`.
- Проблема: текущая `/ui/` перегружена, много таблиц и один длинный скролл, низкая операционная удобность.
- Цель: сделать интерфейс удобным и визуально аккуратным для ежедневной работы оператора.
- Базовый scope:
  - убрать формат “все блоки на одной странице”;
  - внедрить логические вкладки (минимум):
    - `Overview` (health + KPI),
    - `Tasks & Queue`,
    - `Agents` (runtime cards + dispatch),
    - `Accounts & Limits`,
    - `Memory`,
    - `Schedules & Modules`,
    - `System`.
  - сократить количество таблиц в пользу карточек/компактных списков там, где это повышает читаемость;
  - мобильная и desktop адаптация без длинной “простыни”.
- Acceptance:
  - оператор может выполнить core workflow без скролла через всю страницу;
  - ключевые действия доступны в 1-2 клика внутри тематической вкладки.
- Текущий прогресс:
  - реализованы логические вкладки в `/ui/`: `Overview`, `Tasks & Queue`, `Agents`, `Accounts & Limits`, `System`;
  - контент разнесен по тематическим экранам вместо одного длинного полотна;
  - переключение вкладки сохраняется в браузере (`localStorage`) и восстанавливается при следующем открытии.
- Остается:
  - визуальная унификация карточек и сокращение таблиц в ключевых разделах;
  - добавить более компактные action-panels для частых операций;
  - провести отдельный UX-pass по mobile ergonomics.

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
  - в карточках показываются prompt, template/model, выбранный account и log preview.
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
  - лимиты подтягиваются live через `GET /api/auth-profiles/chatgpt/{id}/limits` для каждого профиля.
- Остается:
  - добавить быстрые inline-экшены на карточках;
  - добавить расширенный history drill-down по аккаунту.
