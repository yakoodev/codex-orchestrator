# Agent Request Plane v2 (Design + Rollout Plan)

Обновлено: 2026-04-09  
Статус: `planned` (decision-complete)

## 1. Цель

Заменить узкую модель `tool access request` универсальным контуром заявок, где агент может запросить любую недостающую возможность для выполнения задачи.

Примеры:
- нужен MCP-сервер (browser/docker/etc);
- не хватает прав на конкретный MCP tool;
- отсутствуют OS-скрипты/инструкции;
- не хватает runtime-зависимости;
- прочий блокер, который нельзя закрыть в текущем контексте.

## 2. Зафиксированные решения

1. Заявка создается в контексте `project + task + agent_profile + agent_template + agent_run`.
2. Единая типизация заявок:
  - `mcp_server_attach`
  - `mcp_tool_acl`
  - `script_set`
  - `runtime_dependency`
  - `other`
3. Для агентов вводятся отдельные MCP tools оркестратора:
  - `orchestrator.create_agent_request`
  - `orchestrator.list_open_agent_requests`
  - `orchestrator.resolve_agent_request`
4. Governor-агент автозапускается и решает по системному промпту:
  - если может выполнить заявку — применяет изменение и ставит `resolved_by_agent`;
  - если не может — ставит `blocked_agent`.
5. `blocked_agent` по умолчанию входит в open-пул и должен возвращаться в повторных вызовах `list_open`.
6. Manual fallback обязателен: оператор/PM в UI может перевести заявку в `resolved_manual` или `rejected_manual`.

## 3. Модель данных (v2)

- `AgentRequest`
  - `id`, `type`, `status`, `priority`
  - `project_id`, `task_id`, `agent_run_id`
  - `agent_profile_id`, `agent_template_id`, `requested_by_agent_id`
  - `title`, `reason`, `request_payload_json`, `resolution_payload_json`
  - `claimed_by_governor_id`, `resolved_by`, `resolved_at`
  - `created_at`, `updated_at`

- `AgentRequestAuditEvent`
  - `id`, `request_id`, `event_type`, `actor_type`, `actor_id`
  - `trace_id`, `metadata_json`, `created_at`

## 4. Статусы и open-пул

Статусы:
- `open`
- `in_progress`
- `resolved_by_agent`
- `blocked_agent`
- `resolved_manual`
- `rejected_manual`

Правило open-пула:
- `list_open` по умолчанию возвращает `open` + `blocked_agent`.
- `in_progress` может быть включен отдельным флагом фильтра.

## 5. API-контракт (planned)

### 5.1 MCP tools (для агентов и governor)

- `orchestrator.create_agent_request`
- `orchestrator.list_open_agent_requests`
- `orchestrator.resolve_agent_request`

### 5.2 REST для UI/governor integration

- `POST /api/agent-requests`
- `GET /api/agent-requests`
- `GET /api/agent-requests/{id}`
- `POST /api/agent-requests/{id}/resolve`

Базовые фильтры:
- `project_id`, `task_id`, `agent_profile_id`, `agent_template_id`, `status`, `type`.

## 6. Governor loop

1. Governor запрашивает open-пул (`list_open`).
2. Claim заявки (`in_progress`).
3. Пытается выполнить действие на основе `type + payload`.
4. Результат:
  - успех -> `resolved_by_agent`;
  - не может выполнить -> `blocked_agent`.
5. При ручном вмешательстве оператора:
  - `resolved_manual` или `rejected_manual`.

## 7. Интеграция с другими эпиками

- `MCP AuthZ ACL v2`: права и ограничения на вызовы/действия.
- `Agent Profiles + MCP Server Sets`: применение заявок на MCP servers и OS scripts.
- `Coordination Channel`: сообщения `request_*` lifecycle.
- `Topology UI`: узлы заявок и их текущие состояния.

## 8. Error contract (planned)

- `REQUEST_VALIDATION_FAILED`
- `REQUEST_FORBIDDEN`
- `REQUEST_NOT_FOUND`
- `REQUEST_STATE_CONFLICT`

## 9. Security требования

- Агент не может напрямую эскалировать привилегии, обходя request-plane.
- Все переходы статусов пишутся в audit trail.
- В payload/логах применяется redaction для чувствительных данных.
- Governor и manual fallback должны быть идемпотентными на повторные запросы.

## 10. Manual acceptance (planned)

1. Агент создает заявку через MCP метод.
2. Governor получает заявку через `list_open`.
3. Governor переводит заявку в `resolved_by_agent` или `blocked_agent`.
4. Убедиться, что `blocked_agent` повторно возвращается в `list_open`.
5. Оператор вручную закрывает одну `blocked_agent` заявку как `resolved_manual` и другую как `rejected_manual`.
6. Проверить отображение всех переходов в topology/coordination и audit.

## 11. Out of scope v2

- SLA/эскалации по времени бездействия governor.
- Политики auto-prioritization на основе ML.
- Кросс-инстансная федерация заявок.
