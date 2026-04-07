# ADR-0007: Role/Capability Pack Format

## Status
Accepted

## Decision
- Pack sources in MVP: `git` and `zip`.
- Registry entry must include pinned version (`commit`/`tag`/`version`).
- Materialization is lazy (first-use), with cached reuse.
- Update/rotate is represented as a new pinned version.
- MVP trust policy: admin-only upload/register (no mandatory signature enforcement).

## Rationale
- Pinned versions guarantee reproducible agent behavior.
- Lazy materialization avoids unnecessary bootstrap costs.
- Admin-only trust boundary is sufficient for MVP scope.

## Consequences
- Data model includes `PackRegistryEntry`.
- API includes pack registry CRUD/materialize operations.
- Audit trail must include register/materialize/rotate events.
