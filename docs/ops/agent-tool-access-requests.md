# Agent Tool Access Requests v1 (Design + Rollout Plan)

Обновлено: 2026-04-09  
Статус: `planned` (decision-complete)

## 1. Цель

Добавить встроенный workflow заявок, где агент может запросить недостающий инструмент/доступ для выполнения задачи.

Пример: агент-тестировщик получает задачу тестирования веб-сервиса, но у его template нет browser-инструмента.

## 2. Зафиксированные решения

1. Заявка создается в контексте `project + task + agent template`.
2. Запрос всегда точечный: конкретный `tool_name` (exact) и причина запроса.
3. Обработка заявки не меняет права мгновенно: требуется решение оператора/PM (`approve/reject`).
4. После `approved` право применяется через существующий ACL/template binding контур.
5. Все шаги фиксируются в audit trail и видны в UI/topology.

## 3. Модель данных (v1)

- `ToolAccessRequest`
  - `id`, `project_id`, `task_id`, `agent_run_id`, `agent_template_id`
  - `tool_name`, `reason`, `requested_by_agent_id`
  - `status` (`new`, `in_review`, `approved`, `rejected`, `applied`, `failed_apply`)
  - `reviewed_by`, `review_comment`
  - `created_at`, `updated_at`, `resolved_at`

- `ToolAccessRequestAuditEvent`
  - `id`, `request_id`, `event_type`, `actor`, `trace_id`, `metadata_json`, `created_at`

## 4. API-контракт (planned)

- `POST /api/tool-access/requests`
- `GET /api/tool-access/requests`
- `GET /api/tool-access/requests/{id}`
- `POST /api/tool-access/requests/{id}/approve`
- `POST /api/tool-access/requests/{id}/reject`
- `POST /api/tool-access/requests/{id}/apply`

Фильтры списка:
- `project_id`, `task_id`, `agent_template_id`, `status`, `tool_name`.

## 5. Workflow

1. Агент обнаруживает недостающий инструмент (например, `browser.open`) и отправляет `POST /api/tool-access/requests`.
2. Оператор/PM видит заявку в UI (`Requests` panel + topology inspector).
3. Решение:
  - `approve`: разрешить изменение;
  - `reject`: отклонить с комментарием.
4. После approve выполняется `apply`: создается/обновляется ACL/template binding.
5. Статус меняется на `applied` или `failed_apply`.

## 6. Интеграция с существующими эпиками

- `MCP AuthZ ACL v2`: источник прав, куда применяются approved-заявки.
- `Coordination Channel`: сообщения `tool_access.request_created|approved|rejected|applied`.
- `Topology UI`: отображение активных заявок на графе проекта.

## 7. Security требования

- Агент не может сам выдать себе доступ без review.
- API использует `X-Admin-Token` для операторских действий approve/reject/apply.
- В audit trail не пишутся секреты и внутренние токены.
- Любые массовые изменения прав (bulk-apply) вне v1.

## 8. Manual acceptance (planned)

1. Запустить задачу, где агенту нужен отсутствующий tool.
2. Проверить, что создается заявка со статусом `new`.
3. Выполнить `approve`, затем `apply`.
4. Проверить, что ACL/template binding обновлен и агент повторно может вызвать tool.
5. Выполнить негативный сценарий `reject` и убедиться, что доступ не выдан.

## 9. Out of scope v1

- Auto-approve по политикам.
- SLA/эскалации заявок.
- ML-рекомендации по авто-подбору инструментов.
