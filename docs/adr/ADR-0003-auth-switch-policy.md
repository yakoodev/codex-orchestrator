# ADR-0003: Limit-Aware Auth Profile Switch Policy

## Status
Accepted

## Decision
- Switch applies only to new tasks.
- Active tasks are never interrupted for switch.
- Flow: hold new tasks -> drain active -> switch profile -> recycle warm workers -> release held queue.
- Candidate profile is selected by maximum remaining limits among eligible profiles.

## Defaults
- Trigger thresholds: `weekly < 5%` OR `five_hour < 10%`.
- Guard: no switch if nearest reset is in less than `3h`.
- If no eligible profile: remain in `WAITING_LIMIT` and notify Web/TG.

## Consequences
- State machine includes `DRAINING_ACTIVE` and `SWITCHING_AUTH`.
- Scheduler must enforce global switch guards.
