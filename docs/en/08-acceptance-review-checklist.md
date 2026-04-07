# Documentation Acceptance Checklist

## Contract completeness
- OpenAPI covers all required endpoints.
- Event schemas and payload examples exist for required topics.

## Traceability
- Every key requirement maps to concrete docs/contracts and acceptance criteria.

## Scenario walkthrough
- Mandatory scenarios are validated from docs only.
- Pack lifecycle scenarios are documented (register/materialize/rotate).
- Bus-only delegation scenarios are documented.
- Schedule overlap (`skipped_due_to_overlap`) and restart recovery are documented.
- Auth switch retry event (`auth_profile.switch.retried`) is documented.
- Delegation timeout flow is documented (retry to limit, default 3, then terminal failed path).
- Schedule time predicates are documented as UTC-based.
- Absence of a dedicated `manual switch now` endpoint in MVP API is documented.
- Telegram blocked-region scenario with valid `TG_PROXY_URL` is documented.
- Telegram blocked-region scenario with invalid/unavailable `TG_PROXY_URL` keeps Web/API control path operational.

## Operability
- Compose deployment and smoke checks are executable without verbal instructions.

## Security
- Secret handling, admin-token boundary, and audit trail are unambiguous.

## OSS readiness
- License, contribution policy, changelog policy, and templates are present.
