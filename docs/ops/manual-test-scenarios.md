# Manual Test Scenarios (UI + API)

Обновлено: 2026-04-07

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
2. В шапке переключи язык `RU -> EN -> RU`.
3. Проверь, что заголовки меняются.
4. Вставь `ADMIN_TOKEN` в блоке `Connection` и нажми `Сохранить токен`.

API-проверка:

```powershell
(Invoke-WebRequest -UseBasicParsing "$BASE/ui/").StatusCode
(Invoke-WebRequest -UseBasicParsing "$BASE/ui/app.js").StatusCode
(Invoke-WebRequest -UseBasicParsing "$BASE/ui/styles.css").StatusCode
```

Ожидаемо: везде `200`.

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

Создай ZIP с единственным `auth.json`:

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

Compress-Archive -Path "$PWD\auth.json" -DestinationPath "$PWD\manual-profile.zip" -Force
```

Загрузи профиль:

```powershell
$uploadRaw = curl.exe -s -X POST "$BASE/api/auth-profiles/chatgpt/upload" `
  -H "X-Admin-Token: $ADMIN_TOKEN" `
  -F "label=manual-profile" `
  -F "file=@manual-profile.zip;type=application/zip"
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
- upload проходит только если внутри ZIP нет ничего кроме `auth.json`.

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

## 8. Сценарий F: Реальный codex execution с auth archive

```powershell
# 8.1 Включи strict real runtime и перезапусти bus
(Get-Content .env) `
  -replace "^DELEGATION_EXECUTOR_MODE=.*$", "DELEGATION_EXECUTOR_MODE=codex_exec" `
  | Set-Content .env

docker compose up -d --build bus
```

Создай ZIP c единственным `auth.json` из локального профиля codex:

```powershell
New-Item -ItemType Directory -Path "$PWD\.tmp-auth" -Force | Out-Null
Copy-Item "$HOME\.codex\auth.json" "$PWD\.tmp-auth\auth.json" -Force
Compress-Archive -Path "$PWD\.tmp-auth\auth.json" -DestinationPath "$PWD\manual-runtime-auth.zip" -Force
```

Загрузи и активируй профиль:

```powershell
$uploadRaw = curl.exe -s -X POST "$BASE/api/auth-profiles/chatgpt/upload" `
  -H "X-Admin-Token: $ADMIN_TOKEN" `
  -F "label=manual-runtime-auth" `
  -F "file=@manual-runtime-auth.zip;type=application/zip"
$upload = $uploadRaw | ConvertFrom-Json
$runtimeProfileId = $upload.id

curl.exe -s -X POST "$BASE/api/auth-profiles/chatgpt/$runtimeProfileId/activate" `
  -H "X-Admin-Token: $ADMIN_TOKEN"
```

Создай task + template и отправь delegation с `payload.prompt`:

```powershell
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
    cwd = "/app"
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

## 9. Очистка артефактов теста

```powershell
Remove-Item -LiteralPath "$PWD\manual-profile.zip" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$PWD\auth.json" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$PWD\manual-runtime-auth.zip" -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$PWD\.tmp-auth" -Recurse -Force -ErrorAction SilentlyContinue
```
