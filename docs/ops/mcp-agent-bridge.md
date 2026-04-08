# MCP Agent Bridge (Planned)

Обновлено: 2026-04-08  
Статус: `planned` (документ требований; реализация в отдельном инкременте)

## Цель

Добавить MCP-слой для работы агентов и внешних ассистентов с `codex-orchestrator` через стандартизированный интерфейс.

## Обязательные MCP возможности (MVP)

1. Получение доступных агентов:
- MCP method/tool: `orchestrator.list_agents`
- Источник данных: текущие API шаблонов/возможностей (`/api/agents/templates`, `/api/delegation/capabilities`)

2. Получение задач:
- MCP method/tool: `orchestrator.list_tasks`
- Источник данных: `/api/tasks` (с фильтрацией по статусу)

3. Запуск агента/делегации:
- MCP method/tool: `orchestrator.dispatch_agent`
- Источник данных: `/api/delegation/dispatch`
- Требования:
  - передача `trace_id`;
  - идемпотентность и понятный статус выполнения.

4. Получение лимитов:
- MCP method/tool: `orchestrator.get_limits`
- Источник данных: `/api/auth-profiles/chatgpt/{id}/limits`
- Ожидание: возвращать `used_percent`, `remaining_percent`, `resets_at_*` по окнам лимитов.

## Security & Ops

- MCP bridge должен работать через тот же security boundary (`X-Admin-Token` или отдельный service token с эквивалентными правами).
- Все mutating-операции должны логироваться и иметь trace/idempotency.
- Ошибки MCP должны маппиться в единый формат, согласованный с `ErrorResponse`.

## Минимальный rollout

1. Прокси-адаптер MCP поверх существующего API (без ломки текущих REST контрактов).  
2. Поддержка только обязательных 4 методов MVP.  
3. Документация ручного теста MCP рядом с `manual-test-scenarios`.
