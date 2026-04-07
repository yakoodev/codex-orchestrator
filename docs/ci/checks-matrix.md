# Checks Matrix

| Check | Purpose | Fails on |
|---|---|---|
| lint | Style and basic quality | Formatting/style violations |
| typecheck | TS contract safety | Type incompatibilities |
| unit | Behavioral correctness | Regression in core services |
| contract-openapi | API contract consistency | Invalid OpenAPI or schema mismatch |
| contract-events | Event contract consistency | Invalid event schema or missing envelope fields |
| contract-prisma | Data contract consistency | Invalid Prisma model or migration drift |
