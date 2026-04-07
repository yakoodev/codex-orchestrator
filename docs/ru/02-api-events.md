# Контракты API и событий

## Канонические файлы
- OpenAPI: [contracts/openapi.yaml](/docs/contracts/openapi.yaml)
- Event envelope: [contracts/events/envelope.schema.json](/docs/contracts/events/envelope.schema.json)
- Module config schema: [contracts/module-config.schema.json](/docs/contracts/module-config.schema.json)
- Event schemas: `module.execution`, `queue.hold`, `auth_profile`, `pack`, `schedule`, `delegation`, `task.auth_switching`

## Группы HTTP API
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

## Обязательные event topics
- `module.execution.started`
- `module.execution.completed`
- `module.execution.failed`
- `queue.hold_started`
- `queue.hold_released`
- `auth_profile.uploaded`
- `auth_profile.activated`
- `auth_profile.switch.started`
- `auth_profile.switch.retried`
- `auth_profile.switch.completed`
- `auth_profile.switch.skipped`
- `pack.registered`
- `pack.validated`
- `pack.materialized`
- `pack.rotated`
- `schedule.rule.created`
- `schedule.rule.updated`
- `schedule.rule.enabled`
- `schedule.rule.disabled`
- `schedule.run.started`
- `schedule.run.completed`
- `schedule.run.failed`
- `schedule.run.skipped_due_to_overlap`
- `agent.delegation.requested`
- `agent.delegation.accepted`
- `agent.delegation.completed`
- `agent.delegation.failed`
- `task.auth_switching`

## Принципы делегации и расписаний
- Межагентные вызовы выполняются только через API шины и event bus.
- Прямой worker-to-worker вызов вне шины запрещен контрактом.
- Расписания описываются через JSON Rule AST (`all/any/not` + typed predicates).
- `time.*` predicates в расписаниях интерпретируются в UTC.
- Отдельный cooldown между scheduled runs в MVP не вводится (только через AST predicates).

## Единый envelope событий
- `event_id`
- `event_type`
- `timestamp`
- `trace_id`
- `task_id` (опционально)
- `worker_id` (опционально)
- `payload`
- `version`
- `idempotency_key` (опционально)

## Контракт модуля
`onEvent(event, context) -> ModuleDecision`

`ModuleDecision.action`:
- `hold_new_tasks`
- `start_switch`
- `no_action`
- `emit_notification`
- `emit_audit`
