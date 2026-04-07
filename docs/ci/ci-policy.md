# CI Policy

## Required checks for PR
- lint
- typecheck
- unit
- contract checks

## Contract checks include
- OpenAPI schema validation
- JSON schema validation for event contracts
- Prisma schema validation
- Cross-check: required endpoints from TЗ exist in OpenAPI

## Failing policy
Any required check failure blocks merge.
