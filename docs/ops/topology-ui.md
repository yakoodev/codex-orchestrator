# Topology UI (Design + Rollout Plan)

Обновлено: 2026-04-09  
Статус: `planned` (decision-complete)

## 1. Цель

Добавить в web-консоль интерактивную страницу `#/topology`, где оператор видит структуру проекта, агентов, задач и каналов координации в виде графа.

## 2. Зафиксированные решения

1. Новый маршрут: `#/topology` в `/ui/console.html`.
2. Узлы графа: `project`, `channel`, `agent`, `task`.
3. Взаимодействие: фильтры, live-state, click-inspector, drill-down по связям.
4. Экран нужен для наглядного контроля распределения задач и обменов между агентами.

## 3. Информационная архитектура экрана

### 3.1 Левая зона

- фильтры:
  - `project`
  - `bundle/channel`
  - `agent status`
  - `task status`
- toggle `live updates`.

### 3.2 Центральная зона

- интерактивный граф связей:
  - `project -> channel`
  - `channel -> agent`
  - `agent -> task`
  - `task -> project`
- визуальные состояния:
  - active/idle/blocked/completed;
  - тип связи (assignment/handoff/control).

### 3.3 Правая зона (Inspector)

- данные выбранного узла:
  - для `agent`: capability/template/account/current task;
  - для `task`: status/priority/project/owner-agent;
  - для `channel`: последние planning/control сообщения;
  - для `project`: summary и активные связи.

## 4. API-контракт (planned)

- `GET /api/topology/graph?project_id=...`
- `GET /api/coordination/channels?project_id=...`
- `GET /api/coordination/channels/{id}/messages`
- `POST /api/coordination/channels/{id}/messages`

## 5. Требования к данным графа

Ответ `GET /api/topology/graph` должен включать:
- `nodes[]`:
  - `id`, `type`, `label`, `status`, `meta`
- `edges[]`:
  - `id`, `from`, `to`, `relation_type`, `status`, `meta`
- `snapshot_time`

Ограничение:
- в графе не должно быть сырого содержимого секретов, runtime stdout/stderr и чувствительных payload.

## 6. UX/A11y требования

- zoom/pan без потери доступности keyboard-navigation;
- таб-фокус на фильтрах и inspector-элементах;
- читаемые состояния узлов при dark/light теме;
- fallback empty/error состояния при отсутствии граф-данных.

## 7. Manual acceptance (planned)

1. Открыть `#/topology` и убедиться, что граф загружается для выбранного проекта.
2. Применить фильтр по статусу агента и проверить перерисовку узлов/связей.
3. Кликнуть по узлу `agent` и проверить inspector (template/account/task).
4. Кликнуть по узлу `channel` и проверить последние planning/control сообщения.
5. Проверить live-update режим: изменения в канале/назначениях отражаются без полного reload.

## 8. Out of scope v1

- Редактирование графа drag-and-drop.
- Автоматическая оптимизация назначения агентов на задачи прямо из topology.
- 3D/advanced visualization режимы.
