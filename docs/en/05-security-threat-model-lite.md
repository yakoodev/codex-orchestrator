# Security + Threat Model Lite

## Assets
- Admin token
- ChatGPT auth ZIP bundles
- Active auth profile pointer
- Task/artifact/event logs

## Trust boundaries
- External clients -> API gateway
- API -> DB/Redis/MinIO
- Module runtime -> OS adapter boundary

## Threats and mitigations
- Auth bundle leak: encrypt at rest, no plaintext logs, strict admin boundary.
- Role/capability pack compromise: admin-only register/upload, pinned versions, audited rotate/materialize.
- Unauthorized profile switch: full audit, validated control requests, explicit module enablement.
- Risky actions without mandatory gates: per-template runtime policy controls plus full event/audit traceability.
- Replay module execution: idempotency keys and pre-side-effect checks.
- Task loss on restart: persisted hold queue, schedule due-run recomputation, and delegation state recovery.

## Disclosure process
Private report -> acknowledgment -> coordinated fix -> advisory publication.
