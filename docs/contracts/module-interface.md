# Module Interface Contract

## Signature
`onEvent(event, context) -> ModuleDecision`

## Input
- `event`: normalized bus event envelope.
- `context`: runtime context (db client, scheduler handle, limit snapshot resolver, clock, logger).

## Output: ModuleDecision
```ts
type ModuleDecisionAction =
  | "hold_new_tasks"
  | "start_switch"
  | "no_action"
  | "emit_notification"
  | "emit_audit";

interface ModuleDecision {
  action: ModuleDecisionAction;
  reason: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}
```

## Runtime constraints
- timeout: 30s (default)
- retries: up to 3 with exponential backoff
- idempotency: must honor `event_id + module_key`
- fail-safe: module failure must not lose queued/held tasks
