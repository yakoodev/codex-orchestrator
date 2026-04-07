# ADR-0006: Default Autonomy Mode (No Mandatory Gates)

## Status
Accepted

## Decision
- Default runtime mode is near-fully autonomous.
- Mandatory gate/approval pauses are disabled by default.
- Human override remains available via Web/TG at any point.
- Risk control is implemented via runtime policies and full audit trail.

## Rationale
- The target operating mode is "autonomous factory", not human-gated workflow.
- Mandatory gates reduce throughput and break unattended operation scenarios.

## Consequences
- Security model depends on policy enforcement + traceability instead of static gates.
- Incident review/audit quality becomes a critical non-functional requirement.
