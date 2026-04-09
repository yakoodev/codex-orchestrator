# MCP AuthZ ACL v2 (Design + Rollout Plan)

Обновлено: 2026-04-09  
Статус: `planned` (decision-complete)

## 1. Цель

Добавить управляемую в БД модель авторизации MCP с несколькими ключами, точечным ACL по tools и `AgentProfile`-центричной конфигурацией MCP-серверов.

## 2. Зафиксированные решения

1. ACL-модель: `custom-only`, exact match по имени MCP tool.
2. MCP ключи: `DB managed` lifecycle (`create/rotate/revoke/expire`).
3. Primary owner MCP server set: `AgentProfile`.
4. `AgentTemplate` используется как execution-constraint, но не как primary owner серверного набора.
5. Per-agent `source_policy` определяет, откуда профиль может подключать MCP-серверы.
6. Отказы:
  - `401` для отсутствующего/невалидного/отозванного/просроченного ключа;
  - `403` для запрещенного tool/profile/template.

## 3. Сущности v2

- `McpApiKey`
  - `id`, `name`, `key_prefix`, `key_hash`, `status`, `expires_at`, `last_used_at`
  - `created_at`, `updated_at`, `rotated_at`, `revoked_at`
  - `created_by`, `updated_by`, `meta_json`

- `McpKeyAclRule`
  - `id`, `key_id`, `tool_name`, `effect` (`allow` only в v2)
  - `created_at`, `created_by`

- `McpKeyProfileBinding`
  - `id`, `key_id`, `agent_profile_id`, `created_at`, `created_by`

- `McpKeyTemplateConstraint` (optional execution constraint)
  - `id`, `key_id`, `agent_template_id`, `created_at`, `created_by`

- `McpAuthAuditEvent`
  - `id`, `key_id`, `event_type`, `actor`, `trace_id`, `request_meta_json`, `created_at`

## 4. Авторизация вызова

Порядок проверки для каждого MCP-запроса:
1. Найти ключ по предъявленному значению (`key_hash`).
2. Проверить статус ключа (active/not revoked/not expired).
3. Проверить ACL rule по exact имени tool.
4. Проверить профиль агента (`agent_profile_id`) и profile-binding ключа.
5. При наличии template constraint — проверить template.
6. Пропустить вызов только при прохождении всех applicable проверок.

## 5. API-контракт (planned)

- `POST /api/mcp/keys`
- `GET /api/mcp/keys`
- `PATCH /api/mcp/keys/{id}`
- `POST /api/mcp/keys/{id}/rotate`
- `POST /api/mcp/keys/{id}/revoke`
- `POST /api/mcp/keys/{id}/bindings/profiles/{profile_id}`
- `DELETE /api/mcp/keys/{id}/bindings/profiles/{profile_id}`

Опционально (execution constraints):
- `POST /api/mcp/keys/{id}/constraints/templates/{template_id}`
- `DELETE /api/mcp/keys/{id}/constraints/templates/{template_id}`

Дополнительно в `PATCH`:
- управление ACL (`tool_name` allow-rules);
- `expires_at`, `status`.

## 6. Error contract (planned)

### 6.1 401 Unauthorized

- `MCP_KEY_REQUIRED`
- `MCP_KEY_INVALID`
- `MCP_KEY_REVOKED`
- `MCP_KEY_EXPIRED`

### 6.2 403 Forbidden

- `MCP_TOOL_FORBIDDEN`
- `MCP_PROFILE_FORBIDDEN`
- `MCP_TEMPLATE_FORBIDDEN`

## 7. Audit и observability

- На каждый authz outcome пишется `McpAuthAuditEvent` (`allowed/denied`).
- `last_used_at` обновляется при успешной авторизации.
- Метрики:
  - count allowed/denied;
  - deny-коды;
  - stale keys;
  - top forbidden tools/profiles.

## 8. Manual acceptance (planned)

1. Создать ключ `reviewer-readonly` с allow-list на `orchestrator.list_*`.
2. Убедиться, что `orchestrator.dispatch_agent` возвращает `403 MCP_TOOL_FORBIDDEN`.
3. Привязать ключ к конкретному `agent_profile_id` и проверить `403 MCP_PROFILE_FORBIDDEN` для другого профиля.
4. При добавленном template constraint проверить `403 MCP_TEMPLATE_FORBIDDEN` для другого шаблона.
5. Ревокнуть ключ и проверить `401 MCP_KEY_REVOKED`.

## 9. Out of scope v2

- role presets (`viewer/editor/admin`).
- wildcard ACL (`orchestrator.*`) и deny-rules.
- tenant federation ключей.
