# Agent Coordination Channel (Design + Rollout Plan)

Обновлено: 2026-04-09  
Статус: `planned` (decision-complete)

## 1. Цель

Ввести отдельный централизованный канал координации агентов для planning/control сообщений и lifecycle-событий `Agent Request Plane`.

## 2. Зафиксированные решения

1. Канал идентифицируется по `project_id + agent_bundle_id`.
2. Канал хранит planning/control сообщения и request lifecycle (без runtime output).
3. Runtime-логи и сырой контент выполнения в канал не дублируются.
4. Канал служит источником для topology-инспектора и governor-loop наблюдаемости.

## 3. Модель данных (v1)

- `AgentBundle`
  - `id`, `project_id`, `name`, `status`, `created_at`, `updated_at`

- `CoordinationChannel`
  - `id`, `project_id`, `agent_bundle_id`, `title`, `is_active`, `created_at`, `updated_at`

- `CoordinationMessage`
  - `id`, `channel_id`, `message_type`, `sender_type`, `sender_id`
  - `step_id`, `task_id`, `agent_request_id`, `payload_json`, `created_at`

## 4. Допустимые типы сообщений

### 4.1 Planning/control
- `plan_created`
- `step_assigned`
- `handoff_requested`
- `handoff_accepted`
- `handoff_rejected`
- `blocker_reported`
- `step_closed`

### 4.2 Agent request lifecycle
- `request_created`
- `request_claimed`
- `request_resolved_by_agent`
- `request_blocked_agent`
- `request_resolved_manual`
- `request_rejected_manual`

Ограничение:
- runtime stdout/stderr, chain-of-thought и сырой tool-output в канал не записываются.

## 5. API-контракт (planned)

- `GET /api/coordination/channels?project_id=...`
- `GET /api/coordination/channels/{id}/messages`
- `POST /api/coordination/channels/{id}/messages`

Дополнительно:
- в `GET /api/topology/graph` возвращаются active channels и последние planning/request lifecycle сообщения.

## 6. Поток событий (high-level)

1. PM/оркестратор создает план -> `plan_created`.
2. Шаг назначается агенту -> `step_assigned`.
3. Агент создает заявку -> `request_created`.
4. Governor берет заявку -> `request_claimed`.
5. Governor завершает -> `request_resolved_by_agent` или `request_blocked_agent`.
6. Оператор (fallback) закрывает -> `request_resolved_manual` или `request_rejected_manual`.

## 7. Интеграция с UI

- На `#/topology` канал отображается отдельным узлом `channel`.
- Inspector канала показывает:
  - последние planning/control события;
  - последние request lifecycle события;
  - текущие активные `blocked_agent` заявки.

## 8. Manual acceptance (planned)

1. Создать bundle и канал для проекта.
2. Отправить последовательность `plan_created -> step_assigned`.
3. Создать request и прогнать `request_claimed -> request_blocked_agent`.
4. Выполнить manual fallback (`request_resolved_manual`).
5. Проверить сообщения в `GET /api/coordination/channels/{id}/messages` и topology inspector.

## 9. Out of scope v1

- автогенерация плана внутри канала;
- консенсус/голосование между агентами;
- произвольный агентский чат.
