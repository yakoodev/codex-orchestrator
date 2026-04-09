# MCP AuthZ ACL v2 (Design + Rollout Plan)

Обновлено: 2026-04-09  
Статус: `planned` (decision-complete)

## 1. Цель

Добавить управляемую в БД модель авторизации MCP с несколькими ключами и точечным контролем доступа к tools и шаблонам агентов.

## 2. Зафиксированные решения

1. ACL-модель: `custom-only` (без предустановленных профилей), exact match по имени MCP tool.
2. MCP ключи: `DB managed` lifecycle (create/rotate/revoke/expire).
3. Привязка доступа ключа к агентам: `template-only`.
4. Отказы:
  - `401` для отсутствующего/невалидного/отозванного/просроченного ключа;
  - `403` для запрещенного tool/template.

## 3. Сущности v2

- `McpApiKey`
  - `id`, `name`, `key_prefix`, `key_hash`, `status`, `expires_at`, `last_used_at`
  - `created_at`, `updated_at`, `rotated_at`, `revoked_at`
  - `created_by`, `updated_by`, `meta_json`

- `McpKeyAclRule`
  - `id`, `key_id`, `tool_name`, `effect` (`allow` only в v2)
  - `created_at`, `created_by`

- `McpKeyTemplateBinding`
  - `id`, `key_id`, `template_id`, `created_at`, `created_by`

- `McpAuthAuditEvent`
  - `id`, `key_id`, `event_type`, `actor`, `trace_id`, `request_meta_json`, `created_at`

## 4. Авторизация вызова

Порядок проверки для каждого MCP-запроса:
1. Найти ключ по предъявленному значению (`key_hash`).
2. Проверить статус ключа (active/not revoked/not expired).
3. Проверить ACL rule по exact имени tool.
4. Если вызов относится к агенту/шаблону, проверить `template binding`.
5. Пропустить в bridge только разрешенный вызов.

## 5. API-контракт (planned)

- `POST /api/mcp/keys`
- `GET /api/mcp/keys`
- `PATCH /api/mcp/keys/{id}`
- `POST /api/mcp/keys/{id}/rotate`
- `POST /api/mcp/keys/{id}/revoke`
- `POST /api/mcp/keys/{id}/bindings/templates/{template_id}`
- `DELETE /api/mcp/keys/{id}/bindings/templates/{template_id}`

Дополнительно (внутри `PATCH`):
- управление ACL (add/remove `tool_name` allow-rules);
- управление `expires_at` и `status`.

## 6. Error contract (planned)

### 6.1 401 Unauthorized

Коды:
- `MCP_KEY_REQUIRED`
- `MCP_KEY_INVALID`
- `MCP_KEY_REVOKED`
- `MCP_KEY_EXPIRED`

### 6.2 403 Forbidden

Коды:
- `MCP_TOOL_FORBIDDEN`
- `MCP_TEMPLATE_FORBIDDEN`

## 7. Audit и observability

- На каждый authz outcome пишется `McpAuthAuditEvent` (`allowed/denied`) без утечки чувствительных значений.
- `last_used_at` обновляется при успешной авторизации ключа.
- Метрики:
  - count разрешенных/запрещенных вызовов;
  - топ deny-кодов;
  - ключи без использования (`stale keys`).

## 8. Manual acceptance (planned)

1. Создать ключ `reviewer-readonly` с allow-list только на `orchestrator.list_*`.
2. Убедиться, что вызовы `orchestrator.dispatch_agent` возвращают `403 MCP_TOOL_FORBIDDEN`.
3. Привязать ключ к конкретному `template_id` и проверить `403 MCP_TEMPLATE_FORBIDDEN` для другого шаблона.
4. Ревокнуть ключ и проверить `401 MCP_KEY_REVOKED`.
5. Проверить, что в audit trail есть события create/allow/deny/rotate/revoke.

## 9. Out of scope v2

- Ролевые пресеты ACL (viewer/editor/admin).
- Политики wildcard (`orchestrator.*`) и deny-rules.
- Tenant-level federation ключей между инстансами.
