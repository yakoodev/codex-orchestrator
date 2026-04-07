# ADR-0005: MVP Access Model

## Status
Accepted

## Decision
- MVP control plane uses single admin token for privileged operations.
- Token protects web admin actions, API mutation endpoints, and Telegram admin operations.

## Rationale
- Minimizes complexity before introducing full RBAC/user management.

## Consequences
- Security documentation must define token management and rotation process.
- Full RBAC is a post-MVP expansion.
