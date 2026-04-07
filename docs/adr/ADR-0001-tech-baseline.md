# ADR-0001: MVP Technical Baseline

## Status
Accepted

## Decision
Use:
- Fastify + TypeScript for backend control plane.
- Next.js + React + TypeScript for web UI.
- Prisma + SQL migrations for database.
- Redis Streams for queue/event transport.
- OpenAPI 3.1 YAML for API source of truth.

## Rationale
- Good balance of implementation speed and runtime performance.
- Strong type-safety and contract consistency for agent-driven development.

## Consequences
- Contract-first workflow is mandatory.
- Any API/data changes must update OpenAPI and Prisma/SQL specs.
