# Agent Profiles + MCP Server Sets v1 (Design + Rollout Plan)

Обновлено: 2026-04-09  
Статус: `planned` (decision-complete)

## 1. Цель

Ввести `AgentProfile` как primary сущность настройки среды агента:
- какие MCP-серверы доступны;
- какие OS-скрипты/инструкции доступны;
- какие источники MCP разрешены (`source_policy`).

## 2. Зафиксированные решения

1. Настройка MCP-серверов делается на уровне `AgentProfile`.
2. `AgentTemplate` остается execution-шаблоном и может ссылаться на профиль.
3. Orchestrator MCP обязателен для каждого профиля и не удаляется в UI.
4. Script sets хранятся отдельно по ОС: `windows`, `linux`, `macos`.
5. Доступные источники новых MCP-серверов определяются per-profile (`source_policy`).

## 3. Сущности v1

- `AgentProfile`
  - `id`, `project_id`, `name`, `role`, `description`
  - `source_policy` (`catalog_only`, `catalog_plus_custom`, `custom_only`)
  - `is_enabled`, `created_at`, `updated_at`

- `McpServerRegistry`
  - `id`, `name`, `transport`, `endpoint_or_command`, `origin_type`, `is_approved`
  - `meta_json`, `created_at`, `updated_at`

- `AgentProfileMcpServerBinding`
  - `id`, `agent_profile_id`, `mcp_server_id`, `is_required`, `priority`
  - `config_json`, `created_at`, `updated_at`

- `AgentProfileScriptSet`
  - `id`, `agent_profile_id`, `os` (`windows|linux|macos`)
  - `script_type` (`instruction|shell`)
  - `content`, `version`, `created_at`, `updated_at`

## 4. API-контракт (planned)

- `POST /api/agent-profiles`
- `GET /api/agent-profiles`
- `PATCH /api/agent-profiles/{id}`
- `POST /api/agent-profiles/{id}/mcp-servers/{server_id}`
- `DELETE /api/agent-profiles/{id}/mcp-servers/{server_id}`
- `PUT /api/agent-profiles/{id}/scripts/{os}`

Опционально (UI lookup):
- `GET /api/mcp/servers/catalog`

## 5. UI-контур

Экран `Agent Profiles`:
1. список профилей по проекту/роли;
2. карточка профиля с MCP server set;
3. editor OS script sets (`windows/linux/macos`);
4. `source_policy` selector;
5. защита orchestrator MCP от удаления (disabled action + tooltip).

## 6. Runtime резолв

При запуске агента:
1. определяется `agent_profile_id`;
2. подтягивается MCP server set;
3. подтягивается script set по runtime OS;
4. формируется runtime MCP config без утечки секретных значений в UI/log.

## 7. Security требования

- изменение MCP set и script set проходит аудит.
- удаление orchestrator MCP запрещено.
- custom MCP server допускается только если `source_policy` профиля это разрешает.
- значения секретов не хранятся в script set в явном виде.

## 8. Manual acceptance (planned)

1. Создать два профиля: `tester-profile` и `devops-profile`.
2. Для `tester-profile` привязать browser MCP, для `devops-profile` — docker MCP.
3. Убедиться, что наборы серверов различаются и не пересекаются по умолчанию.
4. Для одного профиля задать три script sets (`windows/linux/macos`) и проверить сохранение.
5. Проверить, что orchestrator MCP нельзя удалить из профиля через UI/API.

## 9. Out of scope v1

- автоматическое наследование профилей между проектами;
- version-branching script sets;
- marketplace billing для MCP серверов.
