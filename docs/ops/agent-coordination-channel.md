# Agent Coordination Channel (Design + Rollout Plan)

Обновлено: 2026-04-09  
Статус: `planned` (decision-complete)

## 1. Цель

Ввести отдельный централизованный канал координации агентов для planning/control сообщений, отделив его от runtime execution логов.

## 2. Зафиксированные решения

1. Канал идентифицируется по `project_id + agent_bundle_id`.
2. Канал хранит только planning/control события.
3. Runtime-логи и контент выполнения в канал не дублируются.
4. Канал используется как источник данных для topology-инспектора и операционного контроля handoff/blockers.

## 3. Модель данных (v1)

- `AgentBundle`
  - `id`, `project_id`, `name`, `status`, `created_at`, `updated_at`

- `CoordinationChannel`
  - `id`, `project_id`, `agent_bundle_id`, `title`, `is_active`, `created_at`, `updated_at`

- `CoordinationMessage`
  - `id`, `channel_id`, `message_type`, `sender_type`, `sender_id`
  - `step_id`, `task_id`, `payload_json`, `created_at`

## 4. Допустимые типы сообщений

Минимальный набор (planning/control):
- `plan_created`
- `step_assigned`
- `handoff_requested`
- `handoff_accepted`
- `handoff_rejected`
- `blocker_reported`
- `step_closed`

Ограничение:
- сообщения вида runtime stdout/stderr, chain-of-thought и сырой tool-output в канал не записываются.

## 5. API-контракт (planned)

- `GET /api/coordination/channels?project_id=...`
- `GET /api/coordination/channels/{id}/messages`
- `POST /api/coordination/channels/{id}/messages`

Дополнительно:
- в `GET /api/topology/graph` возвращаются ссылки на active channels и последние planning/control сообщения.

## 6. Поток событий (high-level)

1. PM/оркестратор создает plan -> `plan_created`.
2. Шаг назначается агенту -> `step_assigned`.
3. При передаче контекста между агентами -> `handoff_*`.
4. При блокере -> `blocker_reported`.
5. При завершении шага -> `step_closed`.

## 7. Интеграция с UI

- На `#/topology` канал отображается отдельным типом узла `channel`.
- Inspector канала показывает:
  - последние сообщения planning/control;
  - текущие связанные шаги;
  - состояние bundle и активных агентов.

## 8. Manual acceptance (planned)

1. Создать bundle и канал для проекта.
2. Отправить последовательность `plan_created -> step_assigned -> blocker_reported -> step_closed`.
3. Проверить, что сообщения видны через `GET /api/coordination/channels/{id}/messages`.
4. Проверить, что runtime logs агента не попали в канал.
5. Проверить отображение этих же событий в topology-инспекторе.

## 9. Out of scope v1

- Автоматическая генерация плана через LLM внутри канала.
- Консенсус/голосование между агентами.
- Полноценный чат для произвольной переписки агентов.
