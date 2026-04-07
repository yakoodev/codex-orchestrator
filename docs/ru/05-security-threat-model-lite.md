# Security + Threat Model Lite

## Активы
- Admin token
- ChatGPT auth ZIP bundles
- Active auth profile state
- Task/artifact/event logs

## Границы доверия
- External clients -> API gateway
- API -> DB/Redis/MinIO
- Module runtime -> OS adapter boundary

## Основные угрозы и митигации
- Утечка auth-пакетов:
  - encrypted at rest;
  - запрет plaintext логов;
  - ограничение доступа admin токеном.
- Компрометация role/capability pack:
  - trust policy MVP: только admin upload/register;
  - pinned version + аудит rotate/materialize;
  - lazy materialize в изолированную директорию runtime.
- Несанкционированный switch профиля:
  - audit every switch;
  - signed/validated control requests;
  - strict module enable flags.
- Рискованные действия без обязательного gate:
  - runtime policy per agent template (sandbox + approval mode);
  - полный event/audit trail для расследования и отката.
- Replay/duplicate module execution:
  - idempotency key;
  - state check before side effects.
- Потеря задач при рестарте:
  - persisted queue/holds in DB;
  - recovery workflow on boot;
  - recompute due-runs для расписаний;
  - восстановление delegation state machine из БД.

## Disclosure flow
1. Приватное сообщение maintainers.
2. Подтверждение получения.
3. Подготовка фикса и advisory.
4. Координированное раскрытие.
