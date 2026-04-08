# Manual Test Scenarios (UI + API)

Обновлено: 2026-04-08

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
   - `accounts`
   - `memory`
   - `system`
   - `logs`
5. Убедись, что при переключении route меняются `quickbar` заголовок/описание и отображается только активный экран.
6. Проверь KPI-полосу:
   - на `#/dashboard` KPI видны;
   - на остальных экранах KPI скрыты.
7. Прокрути страницу на `#/dashboard` и убедись, что sticky quickbar не перекрывает KPI.
8. Проверь локализацию: в RU-режиме нет смешанных англо-русских подписей (например `Полный refresh`, `Scope`).
9. В блоке `Последние сигналы` убедись, что API-события читаемы: есть `scope` и строка вида `GET /api/... -> 200 (N мс)`.
10. Проверь выпадающие списки языка/темы: в тёмной теме список и опции не выглядят белыми системными блоками.
11. Вставь `ADMIN_TOKEN` в sidebar-форму `X-Admin-Token` и нажми `Сохранить`.
12. Нажми `Обновить экран` и `Обновить всё`, проверь state-бейджи `loading/ok/error` на панелях.

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
   - `prompt` и `log` в полном виде.
6. Проверь, что карточка агента показывает в компактном виде:
   - `status`, `capability`, `template/model`;
   - `account` (label + status);
   - короткий preview без длинных полотен.
7. Убедись, что у карточек агентов включен только вертикальный скролл внутри колонок (как в `Tasks`), горизонтального скролла нет.
8. Перейди на `#/accounts`, выбери секцию `Лимиты`, нажми `Обновить`.
9. Проверь, что по профилям отображаются:
   - `label`, `status`, `id`;
   - `5h remaining`, `weekly remaining`;
   - reset timestamps.

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
3. Создай новую задачу через форму и проверь, что она появляется в `Ожидает запуска`.
4. Выполни release удержанной очереди (если есть held задачи) и обнови вкладку.
5. Проверь, что карточки перемещаются между колонками в зависимости от `status`.
6. Проверь, что в заголовках колонок обновляются счетчики количества задач.
7. Примени фильтры `search/project/status` и убедись, что колонки пересчитываются по отфильтрованному набору.
8. Кликни по карточке задачи и проверь заполнение `Task Details` справа.
9. После первого успешного создания задачи проверь, что форма `Создать задачу` автосворачивается.

## 3.4 Сценарий A4: Auth profile cards

1. Перейди на `#/accounts`.
2. Проверь внутренние подтабы `Профили / Лимиты / История` и переключение между ними.
3. В `Профили` проверь, что профили показываются карточками (не таблицей).
4. Нажми `Activate` у неактивного профиля.
5. Проверь, что у карточки появляется метка `активный сейчас`.
6. Нажми `Deactivate` и проверь, что метка активного профиля пропадает.
7. В `История` задай фильтры `search/status/profile` и проверь, что список событий фильтруется.
8. В `Лимиты` раскрой карточку аккаунта и проверь детали 5h/week/reset.

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

Ожидаемо:
- ответы приходят в Telegram;
- команды читают текущее состояние сервиса через API;
- `/say` возвращает `OK` и пишет steering-intervention по задаче;
- при неактивном профиле `/limit` возвращает понятный empty-state.
- при активации/деактивации профиля в UI/API в Telegram приходят системные уведомления `switch_*` и `hold_*` (с debounce, без спама).

## 10. Очистка артефактов теста

```powershell
Remove-Item -LiteralPath "$PWD\auth.json" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$PWD\manual-runtime-auth.json" -ErrorAction SilentlyContinue
```
