# MCP Agent Bridge (MVP Implemented)

Обновлено: 2026-04-08  
Статус: `completed` (MVP)

## Цель

Добавлен MCP-слой для работы агентов и внешних ассистентов с `codex-orchestrator` через стандартизированный интерфейс, без изменения существующих REST контрактов.

## Реализованные MCP возможности (MVP)

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

## Security & Ops

- MCP bridge использует тот же security boundary через `X-Admin-Token` (передаётся в upstream API из `MCP_ADMIN_TOKEN`/`ADMIN_TOKEN`).
- Реализация выполнена как proxy-adapter поверх существующего API (без изменения backend контрактов).
- Ошибки upstream API маппятся в единый формат с полями `error`, `code` (+ `status_code`).

## Запуск

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

## Минимальный ручной smoke

1. Поднять сервис (`docker compose up -d`).
2. Запустить MCP bridge (`npm run mcp:serve`).
3. Подключиться MCP-клиентом и вызвать:
   - `orchestrator.list_agents`
   - `orchestrator.list_tasks`
   - `orchestrator.dispatch_agent`
   - `orchestrator.get_limits`
4. Проверить, что ответы возвращают данные и/или единый error payload при upstream ошибках.

## Следующие шаги (out of MVP)

- Streamable HTTP transport для удаленного подключения (отдельный scope).
- Расширение MCP toolset (projects/memory/schedules/workers) после утверждения product-scope.
