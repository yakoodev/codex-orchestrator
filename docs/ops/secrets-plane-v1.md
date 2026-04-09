# Secrets Plane v1 (Design + Rollout Plan)

Обновлено: 2026-04-09  
Статус: `in_progress` (Phase 1+2 backend/runtime реализованы)

## 1. Цель

Добавить безопасный контур управления секретами для проектов и агентов, где:
- значения секретов не утекут в UI/логи/API-ответы;
- доступ управляется по `project + role/template binding`;
- runtime получает секреты только на время выполнения через env injection.

## 2. Зафиксированные решения

1. Backend хранение: секреты в БД в шифрованном виде (envelope encryption).
2. Scope доступа: `project` + bind на `role` и/или `agent template`.
3. UI: после сохранения raw value не читается обратно; доступны только rotate/replace/revoke.
4. Runtime: секреты подставляются в окружение запуска и очищаются после завершения run.
5. Операционное отображение: в UI только метаданные и masked preview.

## 3. Модель данных (v1)

### 3.1 Сущности

- `ProjectSecret`
  - `id`, `project_id`, `key`, `description`, `is_active`
  - `ciphertext`, `dek_encrypted`, `dek_kms_key_id`, `algo`, `version`
  - `created_at`, `updated_at`, `rotated_at`, `revoked_at`
  - `created_by`, `updated_by`

- `ProjectSecretTemplateBinding`
  - `secret_id`, `template_id`, `created_at`, `created_by`

- `ProjectSecretRoleBinding`
  - `secret_id`, `role`, `created_at`, `created_by`

- `SecretAuditEvent`
  - `event_type` (`created`, `rotated`, `revoked`, `binding_added`, `binding_removed`, `runtime_injected`, `runtime_cleared`)
  - `secret_id`, `project_id`, `actor`, `trace_id`, `metadata_json`, `created_at`

### 3.2 Envelope encryption

- Значение секрета шифруется DEK (data encryption key).
- DEK шифруется master key/KMS и хранится как `dek_encrypted`.
- В БД не хранится raw value и не хранится DEK в открытом виде.

## 4. API-контракт (planned)

### 4.1 Секреты

- `POST /api/projects/{key}/secrets`
- `GET /api/projects/{key}/secrets`
- `PATCH /api/projects/{key}/secrets/{id}`
- `POST /api/projects/{key}/secrets/{id}/rotate`
- `POST /api/projects/{key}/secrets/{id}/revoke`

### 4.2 Bindings

- `POST /api/projects/{key}/secrets/{id}/bindings/templates/{template_id}`
- `DELETE /api/projects/{key}/secrets/{id}/bindings/templates/{template_id}`
- `POST /api/projects/{key}/secrets/{id}/bindings/roles/{role}`
- `DELETE /api/projects/{key}/secrets/{id}/bindings/roles/{role}`

## 5. UI/UX правила

- Страница секретов показывает:
  - имя/ключ секрета;
  - описание;
  - scope bindings;
  - `created/updated/rotated/revoked` метаданные;
  - masked preview (например `sk-****9k2`).
- После `create`/`rotate` значение не возвращается повторно.
- Доступные действия: `replace`, `rotate`, `revoke`, `bind/unbind`.
- В activity log/UI-логах не допускаются raw values.

## 6. Runtime правила выдачи

1. Во время подготовки запуска резолвится набор секретов по `project_id` и `role/template`.
2. В executor-env добавляются только разрешенные переменные.
3. Любые stdout/stderr трассы проходят redaction-фильтр.
4. После завершения запуска секреты удаляются из runtime-контекста.

## 7. Security требования

- API и UI никогда не возвращают raw secret после сохранения.
- Любые ошибки/логи используют redacted payload.
- Секреты не пишутся в `activity log`, `delegation log`, системные события в открытом виде.
- Для rotate/revoke нужен отдельный audit event.

## 8. Manual acceptance (planned)

1. Создать секрет и проверить, что в ответе нет raw value.
2. Выполнить `GET` списка секретов и убедиться, что видны только метаданные + masked preview.
3. Запустить агент с привязкой секрета и проверить:
  - runtime работает с секретом;
  - в UI/API-логах нет исходного значения.
4. Сделать rotate и revoke, проверить audit trail и недоступность старой версии.

## 9. Out of scope v1

- Версионирование нескольких активных версий секрета одновременно.
- Cross-project inheritance секретов.
- BYOK/self-managed keyring на уровне отдельного проекта.

## 10. Текущий прогресс реализации

- Реализовано (Phase 1+2 backend/runtime):
  - Prisma: `ProjectSecret`, `ProjectSecretTemplateBinding`, `ProjectSecretRoleBinding`, `SecretAuditEvent` (+ миграция `0012_secrets_plane_v1`);
  - API:
    - `POST/GET /api/projects/{key}/secrets`
    - `PATCH /api/projects/{key}/secrets/{id}`
    - `POST /api/projects/{key}/secrets/{id}/rotate`
    - `POST /api/projects/{key}/secrets/{id}/revoke`
    - `POST/DELETE /api/projects/{key}/secrets/{id}/bindings/templates/{template_id}`
    - `POST/DELETE /api/projects/{key}/secrets/{id}/bindings/roles/{role}`;
  - включено envelope encryption (AES-256-GCM, DEK+master-key), masked preview и lifecycle audit events;
  - raw value не возвращается после create/rotate;
  - в `POST /api/delegation/dispatch` добавлен runtime-resolve секретов по `project + role/template` с передачей в `payload.runtime_env` для executor;
  - в completion/failure paths делегации добавлен redaction секретов для `result_summary`, `execution_log`, `execution_meta_json`.
- Остается:
  - UI-экран управления секретами в `/ui/console.html`.
