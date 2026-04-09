# Topology UI (Design + Rollout Plan)

Обновлено: 2026-04-09  
Статус: `planned` (decision-complete)

## 1. Цель

Добавить в web-консоль интерактивную страницу `#/topology`, где оператор видит структуру проекта, агентов, профилей, задач, заявок и каналов координации в виде графа.

## 2. Зафиксированные решения

1. Новый маршрут: `#/topology` в `/ui/console.html`.
2. Узлы графа: `project`, `channel`, `agent_profile`, `agent`, `task`, `request`.
3. `request`-узлы отражают `Agent Request Plane v2` lifecycle.
4. Взаимодействие: фильтры, live-state, click-inspector, drill-down по связям.

## 3. Информационная архитектура экрана

### 3.1 Левая зона

- фильтры:
  - `project`
  - `bundle/channel`
  - `agent profile`
  - `agent status`
  - `task status`
  - `request status/type`
- toggle `live updates`.

### 3.2 Центральная зона

- интерактивный граф связей:
  - `project -> channel`
  - `project -> agent_profile`
  - `agent_profile -> agent`
  - `agent -> task`
  - `task -> request`
  - `request -> agent_profile`
- визуальные состояния:
  - active/idle/blocked/completed;
  - тип связи (assignment/handoff/control/request).

### 3.3 Правая зона (Inspector)

- для `agent`: capability/template/account/current task;
- для `agent_profile`: MCP server set, source policy, OS script sets summary;
- для `task`: status/priority/project/owner-agent;
- для `request`: type/status/reason/current owner/governor result/manual fallback actions;
- для `channel`: последние planning/control/request lifecycle сообщения;
- для `project`: summary и активные связи.

## 4. API-контракт (planned)

- `GET /api/topology/graph?project_id=...`
- `GET /api/coordination/channels?project_id=...`
- `GET /api/coordination/channels/{id}/messages`
- `POST /api/coordination/channels/{id}/messages`
- `GET /api/agent-requests?project_id=...`

## 5. Требования к данным графа

Ответ `GET /api/topology/graph` должен включать:
- `nodes[]`: `id`, `type`, `label`, `status`, `meta`
- `edges[]`: `id`, `from`, `to`, `relation_type`, `status`, `meta`
- `snapshot_time`

Ограничение:
- в графе не должно быть raw секретов, runtime stdout/stderr и чувствительных payload.

## 6. Lifecycle события заявок в topology

- `request_created`
- `request_claimed`
- `request_resolved_by_agent`
- `request_blocked_agent`
- `request_resolved_manual`
- `request_rejected_manual`

## 7. UX/A11y требования

- zoom/pan без потери keyboard-navigation;
- таб-фокус на фильтрах и inspector;
- читаемые состояния узлов в dark/light;
- fallback empty/error состояния.

## 8. Manual acceptance (planned)

1. Открыть `#/topology` и проверить загрузку графа для проекта.
2. Убедиться, что видны узлы `request` и `agent_profile`.
3. Создать заявку агента и проверить появление `request`-узла и связей.
4. Перевести заявку в `blocked_agent` и проверить обновление статуса/инспектора.
5. Выполнить manual fallback (`resolved_manual`/`rejected_manual`) и проверить отражение в графе.

## 9. Out of scope v1

- drag-and-drop редактирование графа;
- автоматическая оптимизация назначений прямо из topology;
- 3D visualization.
