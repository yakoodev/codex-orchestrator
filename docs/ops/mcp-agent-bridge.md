# MCP Agent Bridge (MVP + v2 AuthZ Design)

Обновлено: 2026-04-09  
Статус: `completed` (MVP), `planned` (AuthZ ACL v2)

## 1. Цель

Дать агентам и внешним ассистентам стандартизированный MCP-интерфейс для работы с `codex-orchestrator`, сохраняя совместимость с текущим REST API и security boundary.

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
- Поддержка `trace_id` и `idempotency_key` (если `trace_id` не задан, bridge формирует детерминированный trace из idempotency key)

4. Получение лимитов:
- MCP tool: `orchestrator.get_limits`
- Источник данных:
  - `GET /api/auth-profiles/chatgpt/{id}/limits`
  - `GET /api/auth-profiles/chatgpt` (fleet snapshot)
- Режимы:
  - по конкретному профилю (`profile_id`)
  - по набору профилей (`include_inactive`, `limit_profiles`)

### 2.2 Security и error mapping

- В MVP bridge использует единый `MCP_ADMIN_TOKEN`/`ADMIN_TOKEN`, который проксируется как `X-Admin-Token` в upstream API.
- Реализация выполнена как proxy-adapter поверх текущего API (без изменения backend контрактов).
- Ошибки upstream API маппятся в единый формат с полями `error`, `code`, `status_code`.

## 3. MCP AuthZ ACL v2 (decision-complete)

### 3.1 Ключевые решения

- Модель доступа переходит на `multi-key` (несколько MCP-ключей, управляемых в БД).
- ACL-модель: `custom-only` allow-list по exact match имен tools (без фиксированных пресетов).
- Привязка ключей к агентам: `template-only` (через binding на `agent_template_id`).
- Каждый ключ поддерживает lifecycle: create, rotate, revoke, expire, `last_used`, audit trail.

### 3.2 Семантика отказов

- `401 Unauthorized`:
  - ключ отсутствует;
  - ключ невалиден;
  - ключ отозван;
  - ключ истек.
- `403 Forbidden`:
  - ключ валиден, но tool не разрешен ACL;
  - ключ валиден, но вызов ограничен template-binding и текущий template не разрешен.

### 3.3 Сущности v2

Планируемые сущности вынесены в отдельный дизайн-док:
- `McpApiKey`
- `McpKeyAclRule`
- `McpKeyTemplateBinding`
- `McpAuthAuditEvent`

См. `docs/ops/mcp-authz-acl-v2.md`.

### 3.4 Планируемые API (v2)

- `POST /api/mcp/keys`
- `GET /api/mcp/keys`
- `PATCH /api/mcp/keys/{id}`
- `POST /api/mcp/keys/{id}/rotate`
- `POST /api/mcp/keys/{id}/revoke`
- `POST /api/mcp/keys/{id}/bindings/templates/{template_id}`
- `DELETE /api/mcp/keys/{id}/bindings/templates/{template_id}`

## 4. Запуск текущего MVP bridge

```powershell
$env:MCP_API_BASE_URL = "http://localhost:8080"
$env:MCP_ADMIN_TOKEN = "<ADMIN_TOKEN>"
npm run mcp:serve
```

Поддерживаемые env:
- `MCP_API_BASE_URL` (default: `http://localhost:8080`)
- `MCP_ADMIN_TOKEN` (fallback: `ADMIN_TOKEN`)
- `MCP_SERVER_NAME` (default: `codex-orchestrator-mcp`)
- `MCP_SERVER_VERSION` (default: `0.1.0`)
- `MCP_REQUEST_TIMEOUT_MS` (default: `15000`)
- `MCP_API_MAX_RETRIES` (default: `1`)

## 5. Минимальный ручной smoke (MVP)

1. Поднять сервис (`docker compose up -d`).
2. Запустить MCP bridge (`npm run mcp:serve`).
3. Подключиться MCP-клиентом и вызвать:
   - `orchestrator.list_agents`
   - `orchestrator.list_tasks`
   - `orchestrator.dispatch_agent`
   - `orchestrator.get_limits`
4. Проверить, что ответы возвращают данные и/или единый error payload при upstream ошибках.

## 6. Следующие шаги

- Реализовать MCP AuthZ ACL v2 поверх существующего bridge runtime (без breaking изменений для tools).
- Добавить streamable HTTP transport для удаленного подключения (отдельный scope).
- Расширить MCP toolset (`projects`, `memory`, `coordination`, `topology`) после фиксации API-контрактов.
