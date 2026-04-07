# ADR-0008: Hybrid Scheduling with JSON Rule AST

## Status
Accepted

## Decision
- Scheduling model is hybrid: `time + event + state/limit`.
- Rule DSL is JSON Rule AST (`all/any/not` + typed predicates).
- Rule scope supports `global` and `project`.
- Overlap policy in MVP: one active run per rule, overlap => `skipped_due_to_overlap`.
- Misfire policy in MVP: recompute due-runs on restart with idempotent launch key.

## Rationale
- Hybrid rules are required for autonomous periodic and conditional behaviors.
- JSON AST is explicit, testable, and API-friendly.

## Consequences
- Data model includes `ScheduledRule` and `ScheduledRun`.
- API includes rule CRUD, dry-run evaluate, trigger-now, run history.
- Event model includes `schedule.rule.*` and `schedule.run.*`.
