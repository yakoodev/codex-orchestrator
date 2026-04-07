# Contributing

## Language
- User-facing docs: Russian and English.
- Contracts and code-level artifacts: English preferred.

## Development Policy
- Follow docs-first approach: update contracts and specs before implementation.
- Do not introduce behavior not covered by documented acceptance criteria.
- Keep modules idempotent and auditable.

## Branching
- Feature branches: `feat/<short-name>`
- Fix branches: `fix/<short-name>`
- Docs branches: `docs/<short-name>`

## Pull Requests
- One PR should contain one coherent change.
- Required in PR description:
  - problem statement;
  - contract impact (OpenAPI/events/schema);
  - migration impact (Prisma/SQL);
  - rollout and rollback notes.

## Mandatory Checks
- lint
- typecheck
- unit tests
- contract checks (OpenAPI + JSON schemas + Prisma schema consistency)

## Review Policy
- At least one maintainer approval.
- Security-sensitive changes (auth profiles, token handling, module runtime) require explicit security review.
