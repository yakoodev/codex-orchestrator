# API and Event Contracts

## Canonical files
- OpenAPI: [contracts/openapi.yaml](/docs/contracts/openapi.yaml)
- Event envelope: [contracts/events/envelope.schema.json](/docs/contracts/events/envelope.schema.json)
- Module config schema: [contracts/module-config.schema.json](/docs/contracts/module-config.schema.json)
- Event schemas: `module.execution`, `queue.hold`, `auth_profile`, `pack`, `schedule`, `delegation`, `task.auth_switching`

## HTTP API groups
- Tasks
- Agent Templates
- Workers
- Auth Contexts
- Artifacts
- Custom Modules
- ChatGPT Auth Profiles
- Queue Hold/Release
- Packs
- Delegation
- Schedules

## Required event topics
- `module.execution.*`
- `queue.hold_*`
- `auth_profile.*` (including `auth_profile.switch.retried`)
- `pack.*`
- `schedule.rule.*`
- `schedule.run.*`
- `agent.delegation.*`
- `task.auth_switching`

## Delegation and scheduling guarantees
- Inter-agent calls are allowed only through bus APIs and event topics.
- Direct worker-to-worker invocation is contractually disallowed.
- Schedules are expressed as JSON Rule AST (`all/any/not` + typed predicates).
- `time.*` schedule predicates are evaluated in UTC.
- Separate cooldown fields are not part of MVP schedule contracts (cooldown is expressed via AST predicates).

## Module interface
`onEvent(event, context) -> ModuleDecision`

`ModuleDecision.action`:
- `hold_new_tasks`
- `start_switch`
- `no_action`
- `emit_notification`
- `emit_audit`
