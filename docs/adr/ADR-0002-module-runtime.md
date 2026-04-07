# ADR-0002: Custom Module Runtime

## Status
Accepted

## Decision
- Primary runtime: in-process TypeScript modules.
- Optional adapter: PowerShell command execution for targeted OS-specific integrations.

## Rationale
- TS-first keeps behavior type-safe, testable, and cross-platform in Docker.
- Optional PowerShell preserves extensibility for specific operational cases.

## Consequences
- Module interface is strict (`onEvent(event, context) -> ModuleDecision`).
- PowerShell adapter must be treated as optional and non-canonical path.
