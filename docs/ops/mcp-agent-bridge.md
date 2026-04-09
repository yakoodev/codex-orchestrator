# MCP Agent Bridge (MVP + Request Plane + AuthZ v2)

Обновлено: 2026-04-09  
Статус: `completed` (MVP), `in_progress` (Request Plane v2 Phase 1), `planned` (AuthZ ACL v2)

## 1. Цель

Дать агентам и внешним ассистентам стандартизированный MCP-интерфейс для работы с `codex-orchestrator`, сохраняя совместимость с REST API и добавляя agent-native workflow заявок на недостающие возможности.

## 2. Что уже реализовано (MVP)

### 2.1 MCP tools

1. Получение доступных агентов:
- MCP tool: `orchestrator.list_agents`
- Источник данных: `GET /api/agents/templates` + `GET /api/delegation/capabilities`

2. Получение задач:
- MCP tool: `orchestrator.list_tasks`
- Источник данных: `GET /api/tasks`
- Поддержка входных параметров: `status`, `limit`

3. Запуск агента/делегации:
- MCP tool: `orchestrator.dispatch_agent`
- Источник данных: `POST /api/delegation/dispatch`
- Поддержка `trace_id` и `idempotency_key`

4. Получение лимитов:
- MCP tool: `orchestrator.get_limits`
- Источник данных:
  - `GET /api/auth-profiles/chatgpt/{id}/limits`
  - `GET /api/auth-profiles/chatgpt`

### 2.2 Security и error mapping (MVP)

- В MVP bridge использует `MCP_ADMIN_TOKEN`/`ADMIN_TOKEN` и проксирует его как `X-Admin-Token` в upstream API.
- Ошибки upstream API маппятся в единый формат: `error`, `code`, `status_code`.

## 3. Agent Request Plane v2 (in_progress)

### 3.1 Новые MCP tools

Для агентов и governor-агента доступны:
- `orchestrator.create_agent_request`
- `orchestrator.list_open_agent_requests`
- `orchestrator.resolve_agent_request`
- `orchestrator.governor_process_open_agent_requests`

Backend API, используемый bridge:
- `POST /api/agent-requests`
- `GET /api/agent-requests` (`open_pool=true` + optional `include_in_progress`)
- `GET /api/agent-requests/{id}`
- `POST /api/agent-requests/{id}/resolve`

### 3.2 Семантика

- Агент создает универсальную заявку, если ему не хватает MCP/tool/script/runtime.
- Governor-агент обрабатывает open-пул и ставит:
  - `resolved_by_agent`, если изменение применено;
  - `blocked_agent`, если выполнить не удалось.
- `blocked_agent` по умолчанию возвращается в `list_open` для повторной обработки.
- Оператор/PM имеет manual fallback через UI (`resolved_manual` / `rejected_manual`).
- MCP bridge теперь поддерживает базовый governor-loop tool:
  - `list_open -> claim(in_progress) -> finalize(resolved_by_agent|blocked_agent)`;
  - авто-`resolved_by_agent` выполняется только при явном флаге `request_payload.governor_auto_resolve=true`;
  - по умолчанию заявки без этого флага переводятся в `blocked_agent`.
- Текущее ограничение: audit trail и backend-side governor orchestration остаются follow-up.

### 3.3 Error mapping (request-plane)

- `REQUEST_VALIDATION_FAILED`
- `REQUEST_FORBIDDEN`
- `REQUEST_NOT_FOUND`
- `REQUEST_STATE_CONFLICT`

## 4. MCP AuthZ ACL v2 (planned)

### 4.1 Ключевые решения

- multi-key модель (`DB managed`).
- `custom-only ACL` по exact tool name.
- primary owner для MCP server set: `AgentProfile`.
- template binding может использоваться как execution-constraint, но не как primary owner конфигурации MCP-серверов.

### 4.2 Планируемые API

- `POST /api/mcp/keys`
- `GET /api/mcp/keys`
- `PATCH /api/mcp/keys/{id}`
- `POST /api/mcp/keys/{id}/rotate`
- `POST /api/mcp/keys/{id}/revoke`
- `POST /api/mcp/keys/{id}/bindings/profiles/{profile_id}`
- `DELETE /api/mcp/keys/{id}/bindings/profiles/{profile_id}`

## 5. Запуск текущего MVP bridge

```powershell
$env:MCP_API_BASE_URL = "http://localhost:8080"
$env:MCP_ADMIN_TOKEN = "<ADMIN_TOKEN>"
npm run mcp:serve
```

Поддерживаемые env:
- `MCP_API_BASE_URL`
- `MCP_ADMIN_TOKEN`
- `MCP_SERVER_NAME`
- `MCP_SERVER_VERSION`
- `MCP_REQUEST_TIMEOUT_MS`
- `MCP_API_MAX_RETRIES`

## 6. Минимальный ручной smoke (MVP)

1. Поднять сервис (`docker compose up -d`).
2. Запустить MCP bridge (`npm run mcp:serve`).
3. Вызвать:
   - `orchestrator.list_agents`
   - `orchestrator.list_tasks`
   - `orchestrator.dispatch_agent`
   - `orchestrator.get_limits`

## 7. Следующие шаги

- Довести `Agent Request Plane v2`: audit trail + governor automation + UI fallback поток.
- Расширить governor automation: добавить policy-driven резолверы (MCP attach/ACL/script/runtime) вместо флага `governor_auto_resolve`.
- Реализовать `MCP AuthZ ACL v2` с привязкой к `AgentProfile`.
- Добавить streamable HTTP transport.
