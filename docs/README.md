# Documentation Pack (Decision-Complete)

This package is the implementation source of truth before coding.

## Structure
- `ru/` - Russian product and technical documents.
- `en/` - English mirror documents.
- `schemas/` - Canonical visual verification layer (Mermaid + decision tables).
- `adr/` - Architecture decision records.
- `contracts/` - OpenAPI and event/config schemas.
- `data/` - Prisma and SQL specs.
- `docker/` - Compose runtime specification.
- `ops/` - Runbooks and smoke checks.
- `ci/` - CI policy and validation matrix.

## Canonical Artifacts
- Schema index: `schemas/00-index.md`
- API: `contracts/openapi.yaml` (OpenAPI 3.1)
- Events: `contracts/events/*.schema.json`
- Module config: `contracts/module-config.schema.json`
- Data model: `data/prisma/schema.prisma` + `data/sql/0001_init.sql`

## Defaults
- Runtime: Docker Compose-first.
- Registry: GHCR.
- Architectures: amd64 + arm64.
- Auth mode MVP: single admin token.
