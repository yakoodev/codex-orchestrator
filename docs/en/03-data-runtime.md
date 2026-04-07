# Data + Runtime Specification

## Source of truth
- Prisma schema: [data/prisma/schema.prisma](/docs/data/prisma/schema.prisma)
- SQL baseline migration: [data/sql/0001_init.sql](/docs/data/sql/0001_init.sql)

New v1.2 entities:
- `PackRegistryEntry`
- `ScheduledRule`
- `ScheduledRun`
- `DelegationRequest`

## Canonical data schemas
- Core ERD: [SCH-06](/docs/schemas/06-erd-core.md)
- Auth/module ERD: [SCH-07](/docs/schemas/07-erd-auth-modules.md)
- Runtime switch sequence: [SCH-04](/docs/schemas/04-auth-switch-sequence.md)
- Pack lifecycle: [SCH-09](/docs/schemas/09-pack-lifecycle.md)
- Delegation flow: [SCH-10](/docs/schemas/10-delegation-flow.md)
- Schedule evaluation: [SCH-11](/docs/schemas/11-schedule-evaluation-flow.md)

## Auth profile lifecycle (canon)
- Detailed spec: [auth-profile-lifecycle.md](/docs/data/auth-profile-lifecycle.md)
- Visual edge-case validation: [SCH-04](/docs/schemas/04-auth-switch-sequence.md)

## Recovery requirements
- Switch operations must be idempotent.
- Hold/switch states must recover after restart.
- Held tasks must never be lost.
- Scheduled due-runs are recomputed on restart with idempotent launch keys.
- Delegation states recover from storage without direct worker-to-worker bypass.

## Accuracy validation
- Review is performed via:
  - [SCH-99A](/docs/schemas/99-review-checklist.md)
  - [SCH-99B](/docs/schemas/99-open-questions.md)
