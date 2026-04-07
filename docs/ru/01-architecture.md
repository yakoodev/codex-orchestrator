# Архитектурный канон MVP

## Baseline
- Backend: Fastify + TypeScript
- Web UI: Next.js + React + TypeScript
- DB: Postgres, Prisma + SQL migrations
- Queue/Event transport: Redis Streams
- API source of truth: OpenAPI 3.1 YAML

## Позиционирование v1.2
- MVP domain-agnostic (SaaS как частный кейс).
- Режим по умолчанию: почти полностью автономный.
- Межагентная оркестрация выполняется только через шину.
- Обязательные gate-паузы по умолчанию отключены, контроль обеспечивается policy+audit.

## Канонические схемы архитектуры
- System context и границы plane: [SCH-01](/docs/schemas/01-system-context.md)
- Deployment/runtime topology: [SCH-02](/docs/schemas/02-container-deployment.md)
- State machine задач: [SCH-03](/docs/schemas/03-task-state-machine.md)
- Auth-switch последовательность: [SCH-04](/docs/schemas/04-auth-switch-sequence.md)
- Guard-логика scheduler: [SCH-05](/docs/schemas/05-scheduler-guards.md)
- Pack lifecycle: [SCH-09](/docs/schemas/09-pack-lifecycle.md)
- Delegation flow: [SCH-10](/docs/schemas/10-delegation-flow.md)
- Schedule evaluation: [SCH-11](/docs/schemas/11-schedule-evaluation-flow.md)

## Краткий канон поведения
- Любая новая задача при limit pressure удерживается через `WAITING_LIMIT`.
- Переключение auth-профиля не прерывает активные задачи.
- После switch warm workers обязательно перезапускаются.
- При `no eligible profile` система остается в `WAITING_LIMIT` и уведомляет Web/TG.
- Role/capability packs материализуются лениво и закрепляются pinned-версией.
- Делегация между агентами выполняется как bus-driven `request/accept/complete`.
- Schedule Engine поддерживает hybrid rule model (time + event + state/limit).

## Проверка точности
- Проверка выполняется по `SCH-99A` и `SCH-99B`:
  - [Review checklist](/docs/schemas/99-review-checklist.md)
  - [Open questions](/docs/schemas/99-open-questions.md)

## ADR ссылки
- [ADR-0001](/docs/adr/ADR-0001-tech-baseline.md)
- [ADR-0002](/docs/adr/ADR-0002-module-runtime.md)
- [ADR-0003](/docs/adr/ADR-0003-auth-switch-policy.md)
- [ADR-0004](/docs/adr/ADR-0004-docker-compose-runtime.md)
- [ADR-0005](/docs/adr/ADR-0005-single-admin-token.md)
- [ADR-0006](/docs/adr/ADR-0006-autonomy-default.md)
- [ADR-0007](/docs/adr/ADR-0007-pack-format.md)
- [ADR-0008](/docs/adr/ADR-0008-hybrid-schedules.md)
- [ADR-0009](/docs/adr/ADR-0009-bus-only-delegation.md)
