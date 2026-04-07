# Event Examples

## module.execution.completed
```json
{
  "event_id": "evt-01",
  "event_type": "module.execution.completed",
  "timestamp": "2026-04-06T12:00:00Z",
  "trace_id": "trace-abc",
  "task_id": null,
  "worker_id": null,
  "idempotency_key": "evt-01:switch_chatgpt_auth_on_limit",
  "version": "1.0",
  "payload": {
    "module_key": "switch_chatgpt_auth_on_limit",
    "status": "completed",
    "reason": "switch finished",
    "duration_ms": 842
  }
}
```

## queue.hold_started
```json
{
  "event_id": "evt-02",
  "event_type": "queue.hold_started",
  "timestamp": "2026-04-06T12:05:00Z",
  "trace_id": "trace-def",
  "task_id": null,
  "worker_id": null,
  "idempotency_key": null,
  "version": "1.0",
  "payload": {
    "reason": "limit_pressure",
    "held_count": 7
  }
}
```

## task.auth_switching
```json
{
  "event_id": "evt-02a",
  "event_type": "task.auth_switching",
  "timestamp": "2026-04-06T12:05:10Z",
  "trace_id": "trace-switch-01",
  "task_id": "task-123",
  "worker_id": null,
  "idempotency_key": "task-123:QUEUED:WAITING_LIMIT:trace-switch-01",
  "version": "1.0",
  "payload": {
    "task_id": "task-123",
    "status_before": "QUEUED",
    "status_after": "WAITING_LIMIT",
    "reason": "auth_switch_hold_started"
  }
}
```

## auth_profile.switch.retried
```json
{
  "event_id": "evt-02b",
  "event_type": "auth_profile.switch.retried",
  "timestamp": "2026-04-06T12:05:30Z",
  "trace_id": "trace-switch-01",
  "task_id": null,
  "worker_id": null,
  "idempotency_key": "switch:ctx-main:attempt-2",
  "version": "1.0",
  "payload": {
    "profile_id": null,
    "from_profile_id": "chatgpt-profile-01",
    "to_profile_id": "chatgpt-profile-03",
    "reason": "switch_attempt_timeout",
    "retry_attempt": 2
  }
}
```

## auth_profile.switch.failed
```json
{
  "event_id": "evt-02c",
  "event_type": "auth_profile.switch.failed",
  "timestamp": "2026-04-06T12:05:45Z",
  "trace_id": "trace-switch-01",
  "task_id": null,
  "worker_id": null,
  "idempotency_key": "profile-3:activate_failed:trace-switch-01",
  "version": "1.0",
  "payload": {
    "profile_id": "chatgpt-profile-03",
    "from_profile_id": "chatgpt-profile-01",
    "to_profile_id": "chatgpt-profile-03",
    "reason": "manual_activate_failed",
    "attempts": 3
  }
}
```

## schedule.run.skipped_due_to_overlap
```json
{
  "event_id": "evt-03",
  "event_type": "schedule.run.skipped_due_to_overlap",
  "timestamp": "2026-04-06T12:06:00Z",
  "trace_id": "trace-sched-01",
  "task_id": null,
  "worker_id": null,
  "idempotency_key": "rule-qa-hourly:2026-04-06T12",
  "version": "1.0",
  "payload": {
    "rule_id": "rule-qa-hourly",
    "run_id": null,
    "scope": "global",
    "status": "skipped_due_to_overlap",
    "reason": "active_run_exists"
  }
}
```

## agent.delegation.completed
```json
{
  "event_id": "evt-04",
  "event_type": "agent.delegation.completed",
  "timestamp": "2026-04-06T12:07:00Z",
  "trace_id": "trace-del-01",
  "task_id": "task-123",
  "worker_id": "worker-dev-1",
  "idempotency_key": null,
  "version": "1.0",
  "payload": {
    "delegation_id": "del-777",
    "requester_task_id": "task-123",
    "capability": "ui-click-smoke",
    "status": "completed",
    "target_agent_template_id": "tmpl-tester",
    "target_worker_instance_id": "worker-tester-9",
    "reason": null
  }
}
```

## pack.registered
```json
{
  "event_id": "evt-04a",
  "event_type": "pack.registered",
  "timestamp": "2026-04-06T12:07:30Z",
  "trace_id": "trace-pack-02",
  "task_id": null,
  "worker_id": null,
  "idempotency_key": "pack-01:pack_registered:trace-pack-02",
  "version": "1.0",
  "payload": {
    "pack_id": "ui-tester-pack",
    "source_type": "git",
    "pinned_version": "v1.3.0",
    "materialize_status": "registered",
    "reason": "pack_registered"
  }
}
```

## pack.materialized
```json
{
  "event_id": "evt-05",
  "event_type": "pack.materialized",
  "timestamp": "2026-04-06T12:08:00Z",
  "trace_id": "trace-pack-01",
  "task_id": null,
  "worker_id": null,
  "idempotency_key": "pack-ui-tester:v1.3.0",
  "version": "1.0",
  "payload": {
    "pack_id": "ui-tester-pack",
    "source_type": "git",
    "pinned_version": "v1.3.0",
    "materialize_status": "materialized",
    "reason": null
  }
}
```
