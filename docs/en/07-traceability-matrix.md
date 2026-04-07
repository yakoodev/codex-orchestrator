# Requirements Traceability Matrix

| Requirement | Documentation artifact | Schema ID | Acceptance-check |
|---|---|---|---|
| Contract-first API | `/docs/contracts/openapi.yaml` | SCH-08 | API groups/endpoints are fully mapped |
| Event contract coverage | `/docs/contracts/events/*.schema.json` | SCH-08, SCH-04 | Event topics and envelope alignment is validated |
| Module runtime formalization | `/docs/contracts/module-interface.md` + ADR-0002 | SCH-05 | Guard logic aligns with `ModuleDecision` contract |
| Limit-aware switch flow | `/docs/en/01-architecture.md` + ADR-0003 | SCH-03, SCH-04 | State path is present and edge-cases are covered |
| Data model definition | `/docs/data/prisma/schema.prisma` + SQL | SCH-06, SCH-07 | ERD cardinalities match Prisma/SQL |
| Role/capability pack model | `/docs/contracts/openapi.yaml` + `/docs/data/prisma/schema.prisma` | SCH-09, SCH-08 | Pack lifecycle and pinned-version semantics are explicit |
| Bus-only delegation | `/docs/contracts/openapi.yaml` + `/docs/schemas/10-delegation-flow.md` | SCH-10, SCH-08 | Delegation is routed only through bus contracts |
| Auth switch retry observability | `/docs/contracts/events/auth_profile.event.schema.json` + `/docs/schemas/04-auth-switch-sequence.md` | SCH-04, SCH-08 | Retry attempts are captured by `auth_profile.switch.retried` |
| Delegation timeout policy | `/docs/schemas/10-delegation-flow.md` + `/docs/schemas/03-task-state-machine.md` | SCH-10, SCH-03 | Timeout flow is explicit: retry to limit (default 3) then terminal failed path |
| Hybrid scheduling | `/docs/contracts/openapi.yaml` + `/docs/schemas/11-schedule-evaluation-flow.md` | SCH-11, SCH-08 | JSON Rule AST, overlap policy, and restart recovery are unambiguous |
| Schedule UTC semantics | `/docs/contracts/openapi.yaml` + `/docs/schemas/11-schedule-evaluation-flow.md` | SCH-11, SCH-08 | `time.*` predicates are evaluated in UTC and cooldown is AST-only |
| No manual switch endpoint (MVP) | `/docs/schemas/08-api-surface-map.md` + `/docs/contracts/openapi.yaml` | SCH-08, SCH-04 | No dedicated `manual switch now` endpoint exists in MVP contracts |
| Docker portability | `/docs/docker/docker-compose.example.yml` | SCH-02 | Compose base and optional profile are represented |
| Telegram proxy operability | `/docs/en/09-telegram.md` + `/docs/ops/runbook.md` + `/docs/docker/.env.example` | SCH-02 | `TG_PROXY_URL` behavior and Telegram-channel degradation path are explicit while Web/API remains operational |
| Security baseline | `/docs/en/05-security-threat-model-lite.md` | SCH-04, SCH-07 | Security-sensitive branches stay auditable |
| OSS governance | `/CONTRIBUTING.md`, `/SECURITY.md`, `/CHANGELOG.md` | SCH-99A | Review checklist supports go/no-go decision |
