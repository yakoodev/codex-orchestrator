# Manual Test Scenarios (UI + API)

Обновлено: 2026-04-10

Этот документ даёт точные ручные сценарии, которые можно прогонять после каждого `git pull`.

## 1. Подготовка окружения

```powershell
cd C:\Users\Yakoo\source\repos\codex-orchestrator
docker compose up -d --build bus
npm ci
npm run smoke:local
```

Ожидаемо:
- `smoke:local` заканчивается строкой `smoke scenario completed`.

## 2. Подготовка переменных (PowerShell)

```powershell
$BASE = "http://localhost:8080"
$ADMIN_TOKEN = (
  Get-Content .env |
  Where-Object { $_ -match "^ADMIN_TOKEN=" } |
  ForEach-Object { $_.Split("=",2)[1].Trim() }
)
$HEADERS = @{ "X-Admin-Token" = $ADMIN_TOKEN; "Content-Type" = "application/json" }
```

Проверка:

```powershell
if (-not $ADMIN_TOKEN) { throw "ADMIN_TOKEN not found in .env" }
```

## 3. Сценарий A: UI доступен и локализация работает

1. Открой `http://localhost:8080/ui/`.
2. На entry-странице переключи язык `RU -> EN -> RU` и тему `dark -> light -> dark`.
3. Нажми `Открыть консоль` и проверь, что URL вида `http://localhost:8080/ui/console.html#/dashboard`.
4. В консоли прокликай sidebar-маршруты:
   - `dashboard`
   - `projects`
   - `tasks`
   - `agents`
   - `agent-profiles`
   - `accounts`
   - `memory`
   - `system`
   - `logs`
5. Убедись, что при переключении route меняются `quickbar` заголовок/описание и отображается только активный экран.
6. Переключись по очереди `#/projects -> #/tasks -> #/agents` и проверь, что рабочие панели загружают данные автоматически без ручного клика `Обновить`.
7. Проверь KPI-полосу:
   - на `#/dashboard` KPI видны;
   - на остальных экранах KPI скрыты.
8. Прокрути страницу на `#/dashboard` и убедись, что sticky quickbar не перекрывает KPI.
9. Проверь локализацию: в RU-режиме нет смешанных англо-русских подписей (например `Полный refresh`, `Scope`).
10. В блоке `Последние сигналы` убедись, что API-события читаемы: есть `scope` и строка вида `GET /api/... -> 200 (N мс)`.
11. Проверь выпадающие списки языка/темы: в тёмной теме список и опции не выглядят белыми системными блоками.
12. Вставь `ADMIN_TOKEN` в sidebar-форму `X-Admin-Token` и нажми `Сохранить`.
13. Нажми `Обновить экран` и `Обновить всё`, проверь state-бейджи `loading/ok/error` на панелях.

API-проверка:

```powershell
(Invoke-WebRequest -UseBasicParsing "$BASE/ui/").StatusCode
(Invoke-WebRequest -UseBasicParsing "$BASE/ui/console.html").StatusCode
(Invoke-WebRequest -UseBasicParsing "$BASE/ui/app.js").StatusCode
(Invoke-WebRequest -UseBasicParsing "$BASE/ui/styles.css").StatusCode
```

Ожидаемо: везде `200`.

## 3.1 Сценарий A1: Operator cards (agents + account fleet)

1. Перейди на `#/agents` и нажми `Обновить`.
2. Убедись, что видны три секции: `Preparing`, `Running`, `Recent`.
3. Запусти любую делегацию (например из сценария F), затем снова обнови блок.
4. Проверь, что в каждой колонке есть счетчик карточек.
5. Кликни по карточке агента и проверь Inspector справа:
   - `id/status/capability/template/account`;
   - `trace/execution_mode/created-started-ended`;
   - `cwd/cwd_source` и `memory_context`;
   - `prompt` и `log` в полном виде (не только preview).
6. Проверь, что карточка агента показывает в компактном виде:
   - `status`, `capability`, `template/model`;
   - `account` (label + status);
   - короткий preview без длинных полотен.
7. Убедись, что у карточек агентов включен только вертикальный скролл внутри колонок (как в `Tasks`), горизонтального скролла нет.
8. Перейди на `#/accounts`, выбери секцию `Лимиты`, нажми `Обновить`.
9. Проверь, что по профилям отображаются:
   - `label`, `status`, `display_id` (человекочитаемый `label-xxxxx`);
   - `5h remaining`, `weekly remaining`;
   - reset timestamps.
10. На карточке лимитов нажми `История` и проверь, что автоматически открылась секция `История` с фильтром по выбранному `profile_id`.
11. Вернись в `Лимиты` и проверь inline-кнопки `Активировать/Деактивировать` (после действия в `Истории` должны появляться новые switch-events).
12. В секции `История` переключи фильтр `status` (`started/completed/failed/skipped`) и проверь, что список перерисовывается после server-side запроса (без полного reload страницы).
13. В списке событий нажми кнопку с `profile_id` (from/to) и проверь быстрый drill-down: фильтр `profile` обновляется и подгружается история только по выбранному профилю.

API-проверка server-side фильтров:

```powershell
Invoke-RestMethod -Uri "$BASE/api/auth-profiles/chatgpt/switch-events?profile_id=<PROFILE_ID>&status=completed&limit=20" `
  -Headers $HEADERS
```

## 3.2 Сценарий A2: Agent Memory panel + memory-aware delegation

1. Перейди на `#/memory`.
2. Создай проект `manual-memory` через API (один раз):

```powershell
$projectBody = @{
  key = "manual-memory"
  name = "Manual Memory"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BASE/api/projects" -Method POST -Headers $HEADERS -Body $projectBody
```

3. Проверь, что доступны форма создания и список записей памяти.
4. Заполни:
   - `Project ID` = `manual-memory`;
   - `Agent Role` = `reviewer`;
   - `Memory title` = `GUI note`;
   - `Memory content` = `Use breadcrumbs and sticky header checks first.`
5. Нажми `Save memory`.
6. Нажми `Обновить` и проверь, что запись видна в списке.
7. Нажми `Выключить` у записи и проверь, что статус сменился на `неактивен`.
8. Нажми `Включить` и верни запись в `активен`.

API-проверка:

```powershell
Invoke-RestMethod -Uri "$BASE/api/memory/entries?project_id=manual-memory&agent_role=reviewer" `
  -Method GET -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN } | ConvertTo-Json -Depth 8
```

Ожидаемо:
- есть хотя бы одна запись памяти с `project_id=manual-memory` и `agent_role=reviewer`;
- запись имеет `is_active=true` после обратного включения.

## 3.3 Сценарий A3: Task board по статусам

1. Перейди на `#/tasks`.
2. Убедись, что задачи показываются в 3 колонках:
   - `Ожидает запуска`
   - `Запущена`
   - `Выполнена`
3. Активируй auth-профиль в `#/accounts -> Профили`.
4. Создай новую задачу через форму и проверь, что в течение 5-15 секунд задача автоматически уходит в выполнение (через встроенный auto-dispatch runner) и затем в `Выполнена` или `FAILED_TERMINAL`.
5. Если активного профиля нет, проверь альтернативный путь: задача уходит в `WAITING_LIMIT` (видна в `Held Queue`).
6. Выполни release удержанной очереди (если есть held задачи) и обнови вкладку.
7. Проверь, что карточки перемещаются между колонками в зависимости от `status`.
8. Проверь, что в заголовках колонок обновляются счетчики количества задач.
9. Примени фильтры `search/project/status` и убедись, что колонки пересчитываются по отфильтрованному набору.
10. Кликни по карточке задачи и проверь заполнение `Task Details` справа.
11. После первого успешного создания задачи проверь, что форма `Создать задачу` автосворачивается.

## 3.4 Сценарий A4: Auth profile cards

1. Перейди на `#/accounts`.
2. Проверь внутренние подтабы `Профили / Лимиты / История` и переключение между ними.
3. В `Профили` проверь, что профили показываются карточками (не таблицей).
4. Убедись, что под названием профиля отображается короткий `display_id` формата `label-xxxxx` (а не длинный cuid).
5. Нажми `Activate` у неактивного профиля.
6. Проверь, что у карточки появляется метка `активный сейчас`.
7. Нажми `Deactivate` и проверь, что метка активного профиля пропадает.
8. Убедись, что на карточке профиля показывается только одна action-кнопка состояния (`Активировать` или `Деактивировать`) и она меняется после переключения статуса.
9. Нажми `Удалить` у тестового неактивного профиля:
   - открывается модальное окно подтверждения;
   - `Отмена` закрывает окно без удаления;
   - `Удалить профиль` удаляет запись и карточка исчезает из `Профили` и `Лимиты`.
10. В `История` задай фильтры `search/status/profile` и проверь, что список событий фильтруется.
11. В `Лимиты` раскрой карточку аккаунта и проверь детали 5h/week/reset.

## 3.5 Сценарий A5: Auto refresh toggles

1. На `#/tasks` включи `авто` у панели задач.
2. Создай новую задачу через API и подожди до 15 секунд.
3. Проверь, что board обновился без ручного `Обновить`.
4. Повтори на `#/agents` и `#/accounts -> История` для соответствующих `авто` toggles.
5. Перезагрузи страницу и проверь, что сохранены:
   - последний активный route;
   - выбранная тема/язык;
   - значения фильтров и auto-refresh toggles.

## 3.6 Сценарий A6: Logs details по клику

1. Перейди на `#/logs`.
2. Убедись, что у записей, где есть JSON details, блок details по умолчанию свернут.
3. Раскрой details у одной записи и проверь содержимое.
4. Примени фильтр `Scope=ui` и строку поиска `route`, убедись, что список корректно фильтруется.

## 3.7 Сценарий A7: Projects registry в UI

1. Перейди на `#/projects`.
2. Создай проект через форму:
   - `key = ui-project-<HHmmss>`
   - `name = UI Project`
   - `github_repo = owner/ui-project`
   - `workspace_path = /app`
3. Нажми `Создать проект` и проверь:
   - проект появился в левом списке;
   - справа открылась карточка summary и форма редактирования.
4. В summary проверь поля:
   - `Всего задач`
   - `Активная память`
   - `Switch events (окно)`
   - `Последний switch`
   - `Задачи по статусам`.
5. В форме редактирования поменяй `name` и `default_branch`, нажми `Сохранить изменения`, проверь, что список/детали обновились.
6. Открой `#/tasks` и проверь, что в форме создания и фильтре проектов есть созданный `project key`.
7. Открой `#/memory` и проверь, что `project_id` выбирается из того же project registry (селект, без свободного ввода).

## 3.8 Сценарий A8: MCP bridge MVP

1. Убедись, что сервис запущен (`docker compose up -d`), а `ADMIN_TOKEN` подготовлен в переменных (`$ADMIN_TOKEN`).
2. В отдельном терминале запусти MCP bridge:

```powershell
cd C:\Users\Yakoo\source\repos\codex-orchestrator
$env:MCP_API_BASE_URL = "http://localhost:8080"
$env:MCP_ADMIN_TOKEN = $ADMIN_TOKEN
npm run mcp:serve
```

3. Подключи любой MCP-клиент к stdio-процессу `npm run mcp:serve`.
4. Вызови MCP tool `orchestrator.list_agents`:
   - ожидаемо: возвращаются `templates`, `capabilities`, `totals`.
5. Вызови MCP tool `orchestrator.list_tasks` с аргументами:

```json
{ "status": "NEW", "limit": 5 }
```

Ожидаемо: возвращаются `items`, `total`, `returned`, `truncated`.

6. Вызови MCP tool `orchestrator.dispatch_agent` с аргументами:

```json
{
  "requester_task_id": "task-<id>",
  "capability": "reviewer",
  "target_selector": {},
  "payload": { "execution_mode": "mock", "prompt": "mcp smoke run" },
  "idempotency_key": "mcp-smoke-dispatch-1"
}
```

Ожидаемо:
- возвращается `trace_id` (детерминированный от `idempotency_key`, если `trace_id` явно не задан);
- в `result` есть объект делегации от `/api/delegation/dispatch`.

7. Вызови MCP tool `orchestrator.get_limits`:
   - вариант 1: `{ "profile_id": "<profile-id>" }`;
   - вариант 2: `{ "include_inactive": true, "limit_profiles": 10 }`.

Ожидаемо:
- в fleet-режиме есть `requested_profiles/successful_profiles/failed_profiles`;
- при частичных ошибках есть массив `errors` с `error/code/status_code`.

## 3.9 Сценарий A9: MCP key management + runtime authz (Phase 1+2)

Статус: доступно в backend API и MCP bridge (`401/403` enforcement включается через `MCP_API_KEY`).

1. Создай ключ:

```powershell
$body = @{
  name       = "reviewer-readonly"
  acl_tools  = @("orchestrator.list_agents", "orchestrator.list_tasks")
} | ConvertTo-Json

$created = Invoke-RestMethod -Uri "$BASE/api/mcp/keys" -Method POST -Headers $HEADERS -Body $body
$created | ConvertTo-Json -Depth 8
```

Ожидаемо:
- есть `secret` (one-time);
- есть `key_prefix`, `status=active`, `acl_rules`.

2. Проверь list:

```powershell
Invoke-RestMethod -Uri "$BASE/api/mcp/keys" -Method GET -Headers $HEADERS | ConvertTo-Json -Depth 8
```

Ожидаемо:
- ключ присутствует в `items`;
- поля `secret` в list-ответе нет.

3. Создай/выбери `AgentProfile` и привяжи ключ:

```powershell
Invoke-RestMethod -Uri "$BASE/api/mcp/keys/$($created.id)/bindings/profiles/<PROFILE_ID>" `
  -Method POST -Headers $HEADERS | ConvertTo-Json -Depth 8
```

Ожидаемо:
- возвращается binding с `key_id` и `agent_profile_id`.

4. Выполни patch ключа:

```powershell
$patch = @{ status = "disabled"; acl_tools = @() } | ConvertTo-Json
Invoke-RestMethod -Uri "$BASE/api/mcp/keys/$($created.id)" -Method PATCH -Headers $HEADERS -Body $patch | ConvertTo-Json -Depth 8
```

Ожидаемо:
- `status=disabled`;
- `acl_rules` пустой.

5. Выполни rotate:

```powershell
$rotated = Invoke-RestMethod -Uri "$BASE/api/mcp/keys/$($created.id)/rotate" -Method POST -Headers $HEADERS
$rotated | ConvertTo-Json -Depth 8
```

Ожидаемо:
- новый `secret` возвращается только в rotate-ответе;
- `status=active`, заполнен `rotated_at`.

6. Выполни revoke и проверь скрытие в default list:

```powershell
Invoke-RestMethod -Uri "$BASE/api/mcp/keys/$($created.id)/revoke" -Method POST -Headers $HEADERS | Out-Null
Invoke-RestMethod -Uri "$BASE/api/mcp/keys" -Method GET -Headers $HEADERS | ConvertTo-Json -Depth 8
Invoke-RestMethod -Uri "$BASE/api/mcp/keys?include_revoked=true" -Method GET -Headers $HEADERS | ConvertTo-Json -Depth 8
```

Ожидаемо:
- после revoke ключ отсутствует в default list;
- с `include_revoked=true` ключ снова виден.

7. Проверь template constraint:

```powershell
Invoke-RestMethod -Uri "$BASE/api/mcp/keys/$($created.id)/constraints/templates/<TEMPLATE_ID>" `
  -Method POST -Headers $HEADERS | ConvertTo-Json -Depth 8
```

Ожидаемо:
- возвращается constraint с `key_id` и `agent_template_id`.

8. Проверь authz evaluate endpoint:

```powershell
$eval = @{
  api_key = $created.secret
  tool_name = "orchestrator.list_tasks"
  agent_profile_id = "<PROFILE_ID>"
  agent_template_id = "<TEMPLATE_ID>"
  actor = "manual-test"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BASE/api/mcp/authz/evaluate" `
  -Method POST -Headers $HEADERS -Body $eval | ConvertTo-Json -Depth 8
```

Ожидаемо:
- `allowed = true` для разрешенных комбинаций;
- `401` для `invalid/revoked/expired` ключа;
- `403` для запрета по tool/profile/template.

9. Проверь runtime authz в MCP bridge:

```powershell
$env:MCP_API_BASE_URL = $BASE
$env:MCP_ADMIN_TOKEN = $ADMIN_TOKEN
$env:MCP_API_KEY = $created.secret
$env:MCP_AGENT_PROFILE_ID = "<PROFILE_ID>"
$env:MCP_AGENT_TEMPLATE_ID = "<TEMPLATE_ID>"
npm run mcp:serve
```

Ожидаемо:
- разрешенные tools выполняются;
- запрещенные tools завершаются ошибкой с `code/status_code` (`401/403`).

## 3.10 Сценарий A10: Project Secrets v1 (Phase 1+2 backend/runtime)

Статус: доступно в backend/runtime (`encrypted storage + bindings + runtime env injection + redaction`).

1. Создай секрет:

```powershell
$secretBody = @{
  key = "OPENAI_API_KEY"
  value = "sk-manual-test-12345"
  description = "Manual test key"
  bind_roles = @("reviewer")
} | ConvertTo-Json

$secret = Invoke-RestMethod -Uri "$BASE/api/projects/project/secrets" `
  -Method POST -Headers $HEADERS -Body $secretBody
$secret | ConvertTo-Json -Depth 8
```

Ожидаемо:
- есть `id/key/masked_preview/template_bindings/role_bindings`;
- raw `value` в ответе отсутствует.

2. Проверь list:

```powershell
Invoke-RestMethod -Uri "$BASE/api/projects/project/secrets" `
  -Method GET -Headers $HEADERS | ConvertTo-Json -Depth 8
```

Ожидаемо:
- секрет присутствует в `items`;
- в ответе нет полей `ciphertext/dek_encrypted`.

3. Обнови метаданные:

```powershell
$patchBody = @{ description = "Updated secret desc"; is_active = $true } | ConvertTo-Json
Invoke-RestMethod -Uri "$BASE/api/projects/project/secrets/$($secret.id)" `
  -Method PATCH -Headers $HEADERS -Body $patchBody | ConvertTo-Json -Depth 8
```

4. Сделай rotate:

```powershell
$rotateBody = @{ value = "sk-rotated-manual-67890" } | ConvertTo-Json
Invoke-RestMethod -Uri "$BASE/api/projects/project/secrets/$($secret.id)/rotate" `
  -Method POST -Headers $HEADERS -Body $rotateBody | ConvertTo-Json -Depth 8
```

Ожидаемо:
- `version` увеличивается;
- raw `value` отсутствует.

5. Добавь и удали bindings:

```powershell
Invoke-RestMethod -Uri "$BASE/api/projects/project/secrets/$($secret.id)/bindings/roles/tester" `
  -Method POST -Headers $HEADERS | ConvertTo-Json -Depth 8

Invoke-RestMethod -Uri "$BASE/api/projects/project/secrets/$($secret.id)/bindings/roles/tester" `
  -Method DELETE -Headers $HEADERS | ConvertTo-Json -Depth 8
```

6. Выполни revoke:

```powershell
Invoke-RestMethod -Uri "$BASE/api/projects/project/secrets/$($secret.id)/revoke" `
  -Method POST -Headers $HEADERS | ConvertTo-Json -Depth 8
```

Ожидаемо:
- `is_active = false`, заполнен `revoked_at`.

7. Проверь runtime-resolve и redaction в делегации:

```powershell
$templateBody = @{
  name = "secret-runtime-reviewer"
  role = "reviewer"
  model = "gpt-5.4-mini"
  system_prompt = "Use runtime secrets when needed"
  sandbox_policy = "workspace-write"
  approval_policy = "never"
} | ConvertTo-Json

$template = Invoke-RestMethod -Uri "$BASE/api/agents/templates" -Method POST -Headers $HEADERS -Body $templateBody

$taskBody = @{
  title = "secret-runtime-task-$(Get-Date -Format HHmmss)"
  description = "runtime secret resolve check"
  project_id = "project"
  repo_id = "project"
  priority = 90
} | ConvertTo-Json

$task = Invoke-RestMethod -Uri "$BASE/api/tasks" -Method POST -Headers $HEADERS -Body $taskBody

$dispatchBody = @{
  requester_task_id = $task.id
  capability = "reviewer"
  target_selector = @{
    role = "reviewer"
    agent_template_id = $template.id
  }
  payload = @{
    execution_mode = "mock"
    prompt = "Secret runtime smoke"
  }
  priority = 80
} | ConvertTo-Json -Depth 8

$dispatch = Invoke-RestMethod -Uri "$BASE/api/delegation/dispatch" `
  -Method POST -Headers $HEADERS -Body $dispatchBody
$dispatch | ConvertTo-Json -Depth 10
```

Ожидаемо:
- в `execution_meta_json.secrets_context` есть `injected_count` и список `injected_keys` (если bindings совпали);
- `result_summary` и `execution_log` не содержат raw значения секрета.

## 3.10.1 Сценарий A10b: UI Secrets screen (`#/secrets`)

Статус: доступно в новом UI-маршруте `/ui/console.html#/secrets`.

1. Открой `http://localhost:8080/ui/console.html#/secrets`.
2. В sidebar вставь `X-Admin-Token` и нажми `Сохранить`.
3. В форме секрета выбери `Проект`, заполни:
   - `Ключ (ENV)` (`OPENAI_API_KEY`);
   - `Значение`;
   - `Описание`;
   - опционально `Роли` и `ID шаблонов` через запятую.
4. Нажми `Сохранить секрет`.
5. Проверь в списке:
   - карточка секрета появилась;
   - видны `Маска`, `Версия`, `Статус`, `Обновлено/Ротирован/Отозван`;
   - отображаются `Привязки ролей` и `Привязки шаблонов`.
6. В поле `Поиск` введи часть `key`/`description` и проверь фильтрацию карточек.
7. Нажми на карточке:
   - `Ротировать` (введи новое значение);
   - `Привязать роль` / `Отвязать роль`;
   - `Привязать шаблон` / `Отвязать шаблон`;
   - `Деактивировать` / `Активировать`;
   - `Отозвать`.
8. Обнови страницу и проверь persistence:
   - выбранный `project` и строка поиска сохранены (`localStorage`);
   - данные подтягиваются после route-enter без ручного полного reload.

Ожидаемо:
- raw значение секрета не отображается в UI;
- все операции из карточки отрабатывают без перехода на другие экраны;
- в RU-режиме нет смешанных англо-русских подписей в блоке `Secrets`.

## 3.11 Сценарий A11 (planned): Topology + Coordination channel

Статус: выполняется после реализации `docs/ops/topology-ui.md` и `docs/ops/agent-coordination-channel.md`.

1. Открой `#/topology` и выбери проект.
2. Убедись, что видны узлы `project`, `channels`, `agents`, `tasks`.
3. Через `POST /api/coordination/channels/{id}/messages` отправь сообщения:
  - `plan_created`
  - `step_assigned`
  - `blocker_reported`
  - `step_closed`
4. Проверь, что события появились в topology inspector и в `GET /api/coordination/channels/{id}/messages`.
5. Убедись, что runtime stdout/stderr и чувствительные payload не дублируются в coordination channel.

## 3.12 Сценарий A12: Agent Request Plane v2 через MCP + audit trail

Статус: доступно в backend + MCP bridge (governor baseline + request audit trail, без topology UI).

1. Запусти агента без нужной возможности (например, без browser MCP) и получи блокер.
2. Через MCP вызови `orchestrator.create_agent_request` с типом `mcp_server_attach`.
3. Проверь, что заявка создана со статусом `open`.
4. Через MCP вызови `orchestrator.list_open_agent_requests`.
5. Убедись, что созданная заявка возвращается в open-пуле.
6. Через MCP вызови `orchestrator.resolve_agent_request`:
  - путь A: `resolved_by_agent`;
  - путь B: `blocked_agent`.
7. Через API проверь open-pool фильтр:

```powershell
Invoke-RestMethod -Uri "$BASE/api/agent-requests?open_pool=true&project_id=<PROJECT_KEY>" `
  -Method GET -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN } | ConvertTo-Json -Depth 8
```

Ожидаемо:
- в open-пул входят `open` и `blocked_agent` (и `in_progress`, если явно включен флаг);
- после `resolved_*` заявка больше не возвращается в open-пуле.
8. Проверь audit trail заявки:

```powershell
Invoke-RestMethod -Uri "$BASE/api/agent-requests/<REQUEST_ID>/audit?limit=20" `
  -Method GET -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN } | ConvertTo-Json -Depth 8
```

9. Ожидаемо в `items`:
- есть `request_created` (с `from_status = null`, `to_status = open`);
- есть событие перехода (`request_claimed` / `request_blocked_agent` / `request_resolved_*`);
- заполнены `trace_id`, `actor_type/actor_id`, `from_status/to_status`.

## 3.13 Сценарий A13: Governor loop в MCP bridge и повторная выдача blocked_agent

Статус: доступно на уровне MCP bridge (`orchestrator.governor_process_open_agent_requests`) с policy v1 для `mcp_server_attach/script_set`, без coordination/topology событий.

1. Создай 2 заявки:
  - A: с `request_payload.governor_auto_resolve=true`;
  - B: без этого флага.
2. Вызови `orchestrator.governor_process_open_agent_requests` с `dry_run=true`.
3. Проверь, что в `actions`:
  - для A планируется `resolved_by_agent`;
  - для B планируется `blocked_agent`.
4. Вызови `orchestrator.governor_process_open_agent_requests` без `dry_run`.
5. Проверь, что governor делает `claim -> finalize` (две операции resolve на заявку).
6. Вызови `orchestrator.list_open_agent_requests` и убедись:
  - заявка A (`resolved_by_agent`) больше не в open-пуле;
  - заявка B (`blocked_agent`) остаётся в open-пуле.
7. Повтори запуск governor с `retry_blocked=false` и проверь, что `blocked_agent` заявка пропускается.
8. Выполни manual fallback для B через `orchestrator.resolve_agent_request` (`resolved_manual` или `rejected_manual`) и проверь, что она исчезла из open-пула.
9. Проверь policy `mcp_server_attach`:
  - создай заявку с `type = mcp_server_attach`, `agent_profile_id`, `request_payload.mcp_server_id` (или `server_name`);
  - запусти governor и проверь, что заявка уходит в `resolved_by_agent`;
  - проверь binding через API:

```powershell
Invoke-RestMethod -Uri "$BASE/api/agent-profiles/<PROFILE_ID>/mcp-servers" `
  -Method GET -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN } | ConvertTo-Json -Depth 8
```

10. Проверь policy `script_set`:
  - создай заявку с `type = script_set`, `agent_profile_id`, `request_payload = { os, script_type, content }`;
  - запусти governor и проверь `resolved_by_agent`;
  - проверь сохранение script set через API:

```powershell
Invoke-RestMethod -Uri "$BASE/api/agent-profiles/<PROFILE_ID>/scripts" `
  -Method GET -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN } | ConvertTo-Json -Depth 8
```

11. Проверь policy `mcp_tool_acl`:
  - создай заявку `type = mcp_tool_acl`, `request_payload.tool_name = browser.navigate`;
  - запусти governor и проверь, что итог `resolved_by_agent` с `decision_reason = mcp_tool_acl_satisfied_by_server_attach`.
12. Проверь policy `runtime_dependency`:
  - создай заявку `type = runtime_dependency`, `request_payload.dependency_type = browser_mcp`;
  - запусти governor и проверь `resolved_by_agent` с `decision_reason = runtime_dependency_satisfied_by_inferred_server`;
  - для неподдержанной зависимости ожидаемо `blocked_agent` с `decision_reason = runtime_dependency_policy_unavailable`.

## 3.14 Сценарий A14: Agent Profiles + MCP Server Sets + OS scripts (Phase 2 runtime dispatch)

Статус: доступно на API-уровне + runtime-resolve + runtime MCP wiring в `codex_exec`.

1. Создай профиль:

```powershell
$profileBody = @{
  project_id = "project"
  name = "tester-profile"
  role = "tester"
  source_policy = "catalog_plus_custom"
} | ConvertTo-Json

$profile = Invoke-RestMethod -Uri "$BASE/api/agent-profiles" -Method POST -Headers $HEADERS -Body $profileBody
$profile | ConvertTo-Json -Depth 8
```

2. Проверь, что у нового профиля автоматически привязан `orchestrator-core`:

```powershell
Invoke-RestMethod -Uri "$BASE/api/agent-profiles/$($profile.id)/mcp-servers" `
  -Method GET -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN } | ConvertTo-Json -Depth 8
```

3. Зарегистрируй кастомный MCP сервер и привяжи его к профилю:

```powershell
$mcpBody = @{
  name = "browser-mcp"
  transport = "stdio"
  endpoint_or_command = "npx @playwright/mcp"
  origin_type = "catalog"
  is_approved = $true
} | ConvertTo-Json

$mcp = Invoke-RestMethod -Uri "$BASE/api/mcp/servers" -Method POST -Headers $HEADERS -Body $mcpBody

$bindingBody = @{
  is_required = $false
  priority = 40
  config_json = @{ channel = "stable" }
} | ConvertTo-Json -Depth 8

Invoke-RestMethod -Uri "$BASE/api/agent-profiles/$($profile.id)/mcp-servers/$($mcp.id)" `
  -Method POST -Headers $HEADERS -Body $bindingBody | ConvertTo-Json -Depth 8
```

4. Попробуй удалить orchestrator binding:

```powershell
$bindings = Invoke-RestMethod -Uri "$BASE/api/agent-profiles/$($profile.id)/mcp-servers" `
  -Method GET -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN }
$orchestratorBinding = $bindings.items | Where-Object { $_.mcp_server.name -eq "orchestrator-core" } | Select-Object -First 1

$deleteOrch = Invoke-WebRequest -UseBasicParsing `
  "$BASE/api/agent-profiles/$($profile.id)/mcp-servers/$($orchestratorBinding.mcp_server_id)" `
  -Method DELETE -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN } -SkipHttpErrorCheck

$deleteOrch.StatusCode
$deleteOrch.Content
```

Ожидаемо:
- `StatusCode = 409`;
- body содержит `MCP_SERVER_REQUIRED`.

5. Запиши скрипты для `windows/linux/macos`:

```powershell
$scriptWin = @{ script_type = "shell"; content = "Write-Host 'run windows checks'" } | ConvertTo-Json
$scriptLinux = @{ script_type = "shell"; content = "echo 'run linux checks'" } | ConvertTo-Json
$scriptMac = @{ script_type = "instruction"; content = "Use macOS-specific smoke checklist first." } | ConvertTo-Json

Invoke-RestMethod -Uri "$BASE/api/agent-profiles/$($profile.id)/scripts/windows" -Method PUT -Headers $HEADERS -Body $scriptWin
Invoke-RestMethod -Uri "$BASE/api/agent-profiles/$($profile.id)/scripts/linux" -Method PUT -Headers $HEADERS -Body $scriptLinux
Invoke-RestMethod -Uri "$BASE/api/agent-profiles/$($profile.id)/scripts/macos" -Method PUT -Headers $HEADERS -Body $scriptMac

Invoke-RestMethod -Uri "$BASE/api/agent-profiles/$($profile.id)/scripts" `
  -Method GET -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN } | ConvertTo-Json -Depth 8
```

Ожидаемо:
- возвращаются 3 script set записи (`windows/linux/macos`);
- при повторном `PUT` по той же ОС инкрементируется `version`.

## 3.15 Сценарий A15: Agent Profiles UI (`#/agent-profiles`)

1. Открой `http://localhost:8080/ui/console.html#/agent-profiles`.
2. Убедись, что экран содержит:
   - левую колонку `create + filters + list`;
   - правую колонку `profile summary/edit + MCP servers + OS scripts`.
3. В форме `Создать профиль агента` выбери активный `project_id`, задай `name`, `role`, `source_policy` и нажми `Создать профиль`.
4. Проверь, что:
   - новый профиль появился в списке;
   - справа открылся detail-инспектор профиля;
   - в списке MCP binding присутствует обязательный `orchestrator-core`.
5. Из блока `Зарегистрировать MCP сервер` создай новый server (`name`, `transport`, `origin`, `endpoint`).
6. В форме `Привязать сервер` выбери созданный server, задай `priority`, опционально `config_json`, нажми `Привязать сервер`.
7. Проверь, что binding появился в списке и кнопка `Отвязать` доступна для не-required binding.
8. Нажми `Отвязать` для кастомного binding и проверь, что он исчез из списка.
9. В блоке `OS script sets` сохрани `windows`, `linux`, `macos` script (`instruction` или `shell`).
10. Проверь, что после сохранения у каждого OS-блока обновляется metadata (`version`, timestamp).
11. Примени фильтры `search/project/role/include disabled` и убедись, что список профилей фильтруется без полного reload.
12. Обнови страницу браузера и проверь восстановление фильтров (`localStorage`).

13. Проверь runtime-resolve профиля в dispatch:

```powershell
$templateBody = @{
  name = "profile-runtime-reviewer"
  role = "reviewer"
  model = "gpt-5.4-mini"
  system_prompt = "Use profile runtime context"
  sandbox_policy = "workspace-write"
  approval_policy = "never"
} | ConvertTo-Json

$template = Invoke-RestMethod -Uri "$BASE/api/agents/templates" -Method POST -Headers $HEADERS -Body $templateBody

$taskBody = @{
  title = "profile-runtime-task-$(Get-Date -Format HHmmss)"
  description = "runtime profile resolve check"
  project_id = "project"
  repo_id = "project"
  priority = 90
} | ConvertTo-Json

$task = Invoke-RestMethod -Uri "$BASE/api/tasks" -Method POST -Headers $HEADERS -Body $taskBody

$dispatchBody = @{
  requester_task_id = $task.id
  capability = "reviewer"
  target_selector = @{
    role = "reviewer"
    agent_profile_id = $profile.id
  }
  payload = @{
    execution_mode = "mock"
    prompt = "Проверь profile context"
  }
  priority = 80
} | ConvertTo-Json -Depth 8

$dispatch = Invoke-RestMethod -Uri "$BASE/api/delegation/dispatch" `
  -Method POST -Headers $HEADERS -Body $dispatchBody

$dispatch | ConvertTo-Json -Depth 10
```

14. Ожидаемо в ответе dispatch:
   - присутствует `execution_meta_json.agent_profile_context`;
   - `execution_meta_json.agent_profile_context.profile_id` совпадает с `$profile.id`;
   - в payload выполнения используется `agent_profile_id` и profile-aware prompt (MCP + runtime script).

15. Проверь, что MCP server set реально подключается в `codex_exec` (а не только попадает в metadata):

```powershell
$taskBody = @{
  title = "mcp-child-delegation-$(Get-Date -Format HHmmss)"
  description = "e2e check: agent dispatches child via MCP"
  project_id = "project"
  repo_id = "project"
  priority = 95
} | ConvertTo-Json

$task = Invoke-RestMethod -Uri "$BASE/api/tasks" -Method POST -Headers $HEADERS -Body $taskBody

$prompt = @"
Вызови один раз MCP инструмент orchestrator.dispatch_agent.
Используй поля:
- requester_task_id: $($task.id)
- capability: reviewer
- target_selector: {"role":"reviewer","agent_profile_id":"$($profile.id)"}
- payload: {"execution_mode":"mock","prompt":"child delegation smoke"}
- priority: 70
После вызова верни TASK_RESULT:SUCCESS.
"@

$dispatchBody = @{
  requester_task_id = $task.id
  capability = "reviewer"
  target_selector = @{
    role = "reviewer"
    agent_profile_id = $profile.id
  }
  payload = @{
    execution_mode = "codex_exec"
    prompt = $prompt
  }
  priority = 95
} | ConvertTo-Json -Depth 8

$dispatch = Invoke-RestMethod -Uri "$BASE/api/delegation/dispatch" -Method POST -Headers $HEADERS -Body $dispatchBody
$delegation = Invoke-RestMethod -Uri "$BASE/api/delegation/$($dispatch.id)" -Method GET -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN }

$delegation.execution_meta_json | ConvertTo-Json -Depth 10
```

Ожидаемо:
- `status = completed`, `execution_mode = codex_exec`;
- `result_summary` содержит `TASK_RESULT:SUCCESS`;
- в `execution_meta_json` присутствует `mcp_servers_configured` с `orchestrator-core`;
- в БД/карточках делегаций появляется дочерняя делегация (`execution_mode = mock`) для того же `requester_task_id`.

## 4. Сценарий B: Security boundary

```powershell
$resp = Invoke-WebRequest -UseBasicParsing "$BASE/api/tasks" -Method GET -SkipHttpErrorCheck
$resp.StatusCode
$resp.Content
```

Ожидаемо:
- `StatusCode = 401`
- в body есть `MISSING_ADMIN_TOKEN`.

## 5. Сценарий C: Task create/list

```powershell
$projectBody = @{
  key = "manual-project"
  name = "Manual Project"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BASE/api/projects" -Method POST -Headers $HEADERS -Body $projectBody

$taskBody = @{
  title = "manual-task-$(Get-Date -Format HHmmss)"
  description = "created in manual scenario"
  project_id = "manual-project"
  repo_id = "manual-repo"
  priority = 90
} | ConvertTo-Json

$created = Invoke-RestMethod -Uri "$BASE/api/tasks" -Method POST -Headers $HEADERS -Body $taskBody
$created | ConvertTo-Json -Depth 5

$tasks = Invoke-RestMethod -Uri "$BASE/api/tasks" -Method GET -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN }
$tasks.items | Select-Object -First 5 | ConvertTo-Json -Depth 5
```

Ожидаемо:
- create возвращает объект задачи со `status = NEW`;
- list содержит только что созданную задачу.

## 6. Сценарий D: Auth profile lifecycle + switch-events

Подготовь `auth.json`:

```powershell
$authJson = @'
{
  "auth_mode": "chatgpt",
  "access_token": "manual-access-token",
  "refresh_token": "manual-refresh-token"
}
'@

[System.IO.File]::WriteAllText(
  "$PWD\auth.json",
  $authJson,
  (New-Object System.Text.UTF8Encoding($false))
)

```

Загрузи профиль:

```powershell
$uploadRaw = curl.exe -s -X POST "$BASE/api/auth-profiles/chatgpt/upload" `
  -H "X-Admin-Token: $ADMIN_TOKEN" `
  -F "label=manual-profile" `
  -F "file=@auth.json;type=application/json"
$upload = $uploadRaw | ConvertFrom-Json
$profileId = $upload.id
$upload | ConvertTo-Json -Depth 5
```

Ожидаемо: `id` и `display_id` в ответе имеют формат `manual-profile-xxxxx`.

Активируй и деактивируй:

```powershell
curl.exe -s -X POST "$BASE/api/auth-profiles/chatgpt/$profileId/activate" -H "X-Admin-Token: $ADMIN_TOKEN"
curl.exe -s -X POST "$BASE/api/auth-profiles/chatgpt/$profileId/deactivate" -H "X-Admin-Token: $ADMIN_TOKEN"
```

Проверь active-profile empty state:

```powershell
$activeResp = Invoke-WebRequest -UseBasicParsing "$BASE/api/auth-profiles/chatgpt/active" `
  -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN } -SkipHttpErrorCheck
$activeResp.StatusCode
$activeResp.Content
```

Ожидаемо:
- `StatusCode = 404`;
- body содержит `NOT_FOUND`.

Проверь switch-events:

```powershell
$events = Invoke-RestMethod -Uri "$BASE/api/auth-profiles/chatgpt/switch-events" `
  -Method GET -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN }
$events.items | Select-Object -First 10 | ConvertTo-Json -Depth 6
```

Ожидаемо:
- есть `manual_activate` (`started` + `completed`);
- есть `manual_deactivate` (`started` + `completed`).
- upload проходит только если загружен файл с именем `auth.json` и валидным JSON-объектом.

## 7. Сценарий E: Held queue + module patch

```powershell
Invoke-RestMethod -Uri "$BASE/api/queue/held" -Method GET -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "$BASE/api/queue/held/release" -Method POST -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN } | ConvertTo-Json -Depth 5
```

```powershell
$moduleBody = @{
  is_enabled = $true
  config_json = @{
    threshold = 33
    note = "manual-check"
  }
} | ConvertTo-Json -Depth 6

Invoke-RestMethod -Uri "$BASE/api/custom-modules/switch_chatgpt_auth_on_limit" `
  -Method PATCH -Headers $HEADERS -Body $moduleBody | ConvertTo-Json -Depth 6

Invoke-RestMethod -Uri "$BASE/api/custom-modules/switch_chatgpt_auth_on_limit/executions" `
  -Method GET -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN } | ConvertTo-Json -Depth 6
```

Ожидаемо:
- `PATCH` возвращает обновлённый модуль;
- в executions появляется новый `module.execution.completed`.

## 8. Сценарий F: Реальный codex execution с auth.json

```powershell
# 8.1 Включи strict real runtime и перезапусти bus
(Get-Content .env) `
  -replace "^DELEGATION_EXECUTOR_MODE=.*$", "DELEGATION_EXECUTOR_MODE=codex_exec" `
  | Set-Content .env

docker compose up -d --build bus
```

Подготовь `auth.json` из локального профиля codex:

```powershell
Copy-Item "$HOME\.codex\auth.json" "$PWD\manual-runtime-auth.json" -Force
```

Загрузи и активируй профиль:

```powershell
$uploadRaw = curl.exe -s -X POST "$BASE/api/auth-profiles/chatgpt/upload" `
  -H "X-Admin-Token: $ADMIN_TOKEN" `
  -F "label=manual-runtime-auth" `
  -F "file=@manual-runtime-auth.json;type=application/json"
$upload = $uploadRaw | ConvertFrom-Json
$runtimeProfileId = $upload.id

curl.exe -s -X POST "$BASE/api/auth-profiles/chatgpt/$runtimeProfileId/activate" `
  -H "X-Admin-Token: $ADMIN_TOKEN"
```

Создай task + template и отправь delegation с `payload.prompt`:

```powershell
$projectBody = @{
  key = "manual-runtime"
  name = "Manual Runtime"
  workspace_path = "/app"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BASE/api/projects" -Method POST -Headers $HEADERS -Body $projectBody

$taskBody = @{
  title = "manual-runtime-task-$(Get-Date -Format HHmmss)"
  description = "runtime delegation test"
  project_id = "manual-runtime"
  repo_id = "manual-runtime"
} | ConvertTo-Json
$task = Invoke-RestMethod -Uri "$BASE/api/tasks" -Method POST -Headers $HEADERS -Body $taskBody

$templateBody = @{
  name = "manual-runtime-reviewer"
  role = "reviewer"
  model = "gpt-5.4-mini"
  system_prompt = "You are runtime reviewer"
  sandbox_policy = "workspace-write"
  approval_policy = "never"
} | ConvertTo-Json
$template = Invoke-RestMethod -Uri "$BASE/api/agents/templates" -Method POST -Headers $HEADERS -Body $templateBody

$dispatchBody = @{
  requester_task_id = $task.id
  requester_task_run_id = $null
  capability = "reviewer"
  target_selector = @{
    role = "reviewer"
    agent_template_id = $template.id
  }
  payload = @{
    execution_mode = "codex_exec"
    prompt = "Reply exactly READY and nothing else."
  }
  priority = 100
} | ConvertTo-Json -Depth 8

$dispatch = Invoke-RestMethod -Uri "$BASE/api/delegation/dispatch" `
  -Method POST `
  -Headers @{ "X-Admin-Token" = $ADMIN_TOKEN; "Content-Type" = "application/json"; "X-Trace-Id" = "manual-runtime-codex-1" } `
  -Body $dispatchBody

$dispatch | ConvertTo-Json -Depth 8
```

Ожидаемо:
- `status = completed`;
- `result_summary` содержит ответ модели (например `READY`), а не mock-строку вида `Delegation completed by template ...`.
- делегация берёт рабочую директорию из `Project.workspace_path` (`/app`), даже если `payload.cwd` не передан явно.

## 9. Сценарий G: Telegram long polling команды

Подготовка `.env`:

```powershell
(Get-Content .env) `
  -replace "^TG_ENABLED=.*$", "TG_ENABLED=true" `
  -replace "^TG_BOT_TOKEN=.*$", "TG_BOT_TOKEN=<YOUR_BOT_TOKEN>" `
  -replace "^TG_ALLOWED_CHAT_IDS=.*$", "TG_ALLOWED_CHAT_IDS=<YOUR_CHAT_ID>" `
  | Set-Content .env

docker compose up -d --build bus
```

Если `chat_id` пока неизвестен:
- оставь `TG_ALLOWED_CHAT_IDS=` пустым;
- перезапусти `bus` и отправь любое сообщение боту;
- в `docker compose logs --tail=120 bus` забери `chat_id/user_id` из `Unauthorized telegram update ignored`;
- пропиши найденный id в whitelist и перезапусти `bus`.

Проверка старта адаптера:

```powershell
docker compose logs --tail=80 bus
```

Ожидаемо: в логах есть `Telegram adapter started`.

Дальше в чате с ботом отправь команды:
- `/help`
- `/tasks`
- `/say <task_id> проверь edge-cases`
- `/held`
- `/switch-status`
- `/limit`
- `/memory web-ui reviewer all`
- `/memory-add web-ui reviewer Telegram note || Проверять sticky-header и breadcrumbs`
- `/memory web-ui reviewer all`
- `/memory-disable <memory_id>`
- `/memory-enable <memory_id>`

Ожидаемо:
- ответы приходят в Telegram;
- команды читают текущее состояние сервиса через API;
- `/say` возвращает `OK` и пишет steering-intervention по задаче;
- при неактивном профиле `/limit` возвращает понятный empty-state.
- memory-команды создают и переключают `is_active` для записей памяти без использования UI.
- при активации/деактивации профиля в UI/API в Telegram приходят системные уведомления `switch_*` и `hold_*` (с debounce, без спама).

## 10. Очистка артефактов теста

```powershell
Remove-Item -LiteralPath "$PWD\auth.json" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$PWD\manual-runtime-auth.json" -ErrorAction SilentlyContinue
```
