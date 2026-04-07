# ADR-0004: Docker Compose as Primary Runtime

## Status
Accepted

## Decision
- Primary local and OSS runtime delivery is Docker Compose.
- Base stack: bus + postgres + redis + minio.
- Optional profile: observability stack.
- Images are published to GHCR as multi-arch (`amd64`, `arm64`).

## Rationale
- One-command startup is required for broad portability.
- Compose is transparent and easy for contributors.

## Consequences
- Documentation must define complete env/config and healthchecks.
- Standalone deployment is secondary and not canonical for MVP.
