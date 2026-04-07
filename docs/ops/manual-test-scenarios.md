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

Создай минимальный ZIP для upload:

```powershell
[System.IO.File]::WriteAllBytes("$PWD\manual-profile.zip", [byte[]](0x50,0x4B,0x03,0x04))
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

## 8. Очистка артефакта теста

```powershell
Remove-Item -LiteralPath "$PWD\manual-profile.zip" -ErrorAction SilentlyContinue
```
