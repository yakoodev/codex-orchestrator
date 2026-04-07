# Data + Runtime спецификация

## Источник истины по данным
- Prisma schema: [data/prisma/schema.prisma](/docs/data/prisma/schema.prisma)
- SQL migration baseline: [data/sql/0001_init.sql](/docs/data/sql/0001_init.sql)

Новые сущности v1.2:
- `PackRegistryEntry`
- `ScheduledRule`
- `ScheduledRun`
- `DelegationRequest`

## Канонические схемы данных
- Core ERD: [SCH-06](/docs/schemas/06-erd-core.md)
- Auth/module ERD: [SCH-07](/docs/schemas/07-erd-auth-modules.md)
- Auth-switch runtime последовательность: [SCH-04](/docs/schemas/04-auth-switch-sequence.md)
- Pack lifecycle: [SCH-09](/docs/schemas/09-pack-lifecycle.md)
- Delegation flow: [SCH-10](/docs/schemas/10-delegation-flow.md)
- Schedule evaluation: [SCH-11](/docs/schemas/11-schedule-evaluation-flow.md)

## Auth profile lifecycle (канон)
- Детальная спецификация: [auth-profile-lifecycle.md](/docs/data/auth-profile-lifecycle.md)
- Визуальная валидация edge-case: [SCH-04](/docs/schemas/04-auth-switch-sequence.md)

## Идемпотентность и восстановление
- Switch-операции должны иметь идемпотентный ключ.
- При рестарте шины состояние `WAITING_LIMIT/DRAINING_ACTIVE/SWITCHING_AUTH` восстанавливается из БД.
- Нельзя терять удержанные задачи при восстановлении.
- Scheduled due-runs пересчитываются после рестарта и запускаются идемпотентно.
- Делегации восстанавливаются из persisted состояния без прямых worker-to-worker rewire.

## Проверка точности
- Верификация выполняется через:
  - [SCH-99A](/docs/schemas/99-review-checklist.md)
  - [SCH-99B](/docs/schemas/99-open-questions.md)
