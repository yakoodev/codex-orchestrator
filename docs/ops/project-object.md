# Project Object v1 (Design + Rollout Plan)

Обновлено: 2026-04-08  
Статус: `planned` (документация согласована, реализация следующим этапом).

## 1. Цель

Ввести в систему отдельный доменный объект `Project`, который станет источником истины для проектного контекста:
- проектная память агентов;
- связь с GitHub-репозиторием;
- рабочая директория для делегаций;
- проектные задачи, артефакты и правила автоматизации.

## 2. Почему это нужно

Сейчас `project_id` используется как строковый тег в нескольких сущностях. Это мешает:
- централизованно хранить метаданные проекта;
- валидировать корректность ссылок на проект;
- стабильно запускать агентов в правильной директории;
- строить проектные summary/дашборды без разрозненной логики.

## 3. Scope v1 (MVP)

### 3.1 Новый объект `Project`

Поля (предложение для Prisma):
- `id: String @id @default(cuid())`
- `key: String @unique` (человекочитаемый стабильный идентификатор, например `web-ui`)
- `name: String`
- `description: String?`
- `github_url: String?`
- `github_repo: String?` (`owner/repo`)
- `default_branch: String?`
- `workspace_path: String?` (локальный путь, используемый по умолчанию для делегаций)
- `meta_json: Json?`
- `is_active: Boolean @default(true)`
- `created_at: DateTime @default(now())`
- `updated_at: DateTime @updatedAt`

### 3.2 Связь с текущими сущностями

На этапе v1 сохраняем мягкую совместимость:
- `Task.project_id` остается строкой, но должен соответствовать `Project.key`;
- `AgentMemoryEntry.project_id` остается строкой, но должен соответствовать `Project.key`;
- `ScheduledRule.project_id` (при `scope=project`) должен соответствовать `Project.key`;
- `FileLock.project_id` должен соответствовать `Project.key`.

Это позволяет внедрить `Project` без тяжелой FK-миграции в один шаг.

### 3.3 API v1

Новые endpoints:
- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/{key}`
- `PATCH /api/projects/{key}`
- `GET /api/projects/{key}/summary`

`summary` агрегирует минимум:
- количество задач по статусам;
- количество активных memory entries;
- количество недавних switch events по задачам проекта (best-effort через связанные сущности).

### 3.4 Изменения поведения существующих API

- `POST /api/tasks`: `project_id` валидируется по существующему `Project.key`.
- `POST /api/memory/entries`: `project_id` валидируется по `Project.key`.
- `POST /api/delegation/dispatch`:
  - если `payload.cwd` не задан, использовать `Project.workspace_path` задачи;
  - если `workspace_path` не задан, fallback в текущую логику (`process.cwd()`).

## 4. UI v1

Добавить отдельный экран `Projects` в консоль:
- список проектов;
- создание/редактирование (`key/name/github/default_branch/workspace_path`);
- карточка проекта с summary (`tasks/memory/recent activity`).

В `Tasks` и `Memory`:
- фильтры строятся по реальному списку `Project.key`;
- недействительный `project_id` не должен сохраняться.

## 5. Rollout-план

### Phase A — Data + API core
- Prisma-модель `Project` + миграция.
- Persistence методы CRUD + summary.
- HTTP endpoints `/api/projects*`.
- Валидация `project_id` для `tasks` и `memory`.

### Phase B — Workflow integration
- Использование `Project.workspace_path` в delegation runtime.
- Обновление smoke/manual сценариев.

### Phase C — UI integration
- Новый экран `Projects`.
- Привязка фильтров задач/памяти к `Project` registry.

## 6. Definition of Done (v1)

- Есть отдельный объект `Project` с CRUD API.
- Создание задач и памяти с несуществующим `project_id` невозможно.
- Делегации умеют брать `cwd` из настроек проекта.
- В UI есть отдельный экран проектов и проектные summary.
- Документация и manual сценарии синхронизированы.

## 7. Риски и ограничения

- Мягкая совместимость через `project_id == Project.key` не дает жестких FK-гарантий на уровне БД.
- Полная миграция на FK (`project_ref_id`) требует отдельного этапа и backfill.
- `workspace_path` должен валидироваться и ограничиваться безопасными директориями в следующем security-pass.

## 8. Что сознательно вне v1

- Полный проектный RBAC/ACL.
- GitHub App sync (webhooks/PR metadata ingestion).
- Версионирование проектной памяти.
- Cross-project analytics и billing.
