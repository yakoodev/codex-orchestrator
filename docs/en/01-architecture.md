# MVP Architecture Baseline

## Baseline
- Backend: Fastify + TypeScript
- Web UI: Next.js + React + TypeScript
- DB: Postgres, Prisma + SQL migrations
- Queue/Event transport: Redis Streams
- API source of truth: OpenAPI 3.1 YAML

## v1.2 positioning
- Domain-agnostic MVP (SaaS is only one supported scenario).
- Default mode is near-fully autonomous.
- Inter-agent orchestration is bus-only.
- Mandatory gate pauses are disabled by default; risk is controlled via runtime policy and audit.

## Canonical architecture schemas
- System context and plane boundaries: [SCH-01](/docs/schemas/01-system-context.md)
- Deployment/runtime topology: [SCH-02](/docs/schemas/02-container-deployment.md)
- Task state machine: [SCH-03](/docs/schemas/03-task-state-machine.md)
- Auth-switch sequence: [SCH-04](/docs/schemas/04-auth-switch-sequence.md)
- Scheduler guard logic: [SCH-05](/docs/schemas/05-scheduler-guards.md)
- Pack lifecycle: [SCH-09](/docs/schemas/09-pack-lifecycle.md)
- Delegation flow: [SCH-10](/docs/schemas/10-delegation-flow.md)
- Schedule evaluation: [SCH-11](/docs/schemas/11-schedule-evaluation-flow.md)

## Behavior baseline
- Under limit pressure, new tasks are held via `WAITING_LIMIT`.
- Auth switch never interrupts active tasks.
- Warm workers are recycled after successful switch.
- If no eligible profile exists, system remains in `WAITING_LIMIT` and notifies Web/TG.
- Role/capability packs use lazy materialization with pinned versions.
- Inter-agent delegation follows bus-driven `request/accept/complete` flow.
- Schedule engine evaluates hybrid rules (time + event + state/limit).

## Accuracy validation
- Review flow is defined in:
  - [SCH-99A](/docs/schemas/99-review-checklist.md)
  - [SCH-99B](/docs/schemas/99-open-questions.md)

## ADR links
- [ADR-0001](/docs/adr/ADR-0001-tech-baseline.md)
- [ADR-0002](/docs/adr/ADR-0002-module-runtime.md)
- [ADR-0003](/docs/adr/ADR-0003-auth-switch-policy.md)
- [ADR-0004](/docs/adr/ADR-0004-docker-compose-runtime.md)
- [ADR-0005](/docs/adr/ADR-0005-single-admin-token.md)
- [ADR-0006](/docs/adr/ADR-0006-autonomy-default.md)
- [ADR-0007](/docs/adr/ADR-0007-pack-format.md)
- [ADR-0008](/docs/adr/ADR-0008-hybrid-schedules.md)
- [ADR-0009](/docs/adr/ADR-0009-bus-only-delegation.md)
