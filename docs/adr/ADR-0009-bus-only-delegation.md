# ADR-0009: Bus-Only Inter-Agent Delegation

## Status
Accepted

## Decision
- Inter-agent delegation is allowed only via orchestrator bus APIs/events.
- Direct worker-to-worker calls are prohibited.
- Delegation lifecycle is persisted as a first-class entity (`DelegationRequest`).

## Rationale
- Bus-only routing preserves observability, policy checks, and deterministic recovery.
- Direct worker-to-worker communication would bypass scheduler/security/audit controls.

## Consequences
- API includes discovery/dispatch/status/result endpoints for delegation.
- Event topics include `agent.delegation.requested|accepted|completed|failed`.
- Recovery logic must restore delegation state from persisted storage.
