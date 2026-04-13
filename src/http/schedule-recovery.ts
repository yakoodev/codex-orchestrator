import type { FastifyInstance } from "fastify";
import type { EventPublisher, Persistence } from "../runtime/contracts";
import { evaluateScheduleRuleAst } from "./schedule-core";

export async function runScheduleRecoveryOnStartup(deps: {
  app: FastifyInstance;
  persistence: Persistence;
  publisher: EventPublisher;
}): Promise<void> {
  const { app, persistence, publisher } = deps;
  const now = new Date();
  const recoveryBucket = now.toISOString().slice(0, 13);

  let rules: Awaited<ReturnType<Persistence["listScheduledRules"]>>;
  try {
    rules = await persistence.listScheduledRules();
  } catch (error) {
    app.log.error({ err: error }, "Failed to list schedule rules during startup recovery");
    return;
  }

  for (const rule of rules) {
    if (!rule.is_enabled || rule.misfire_policy !== "recompute_due_on_restart") {
      continue;
    }

    const traceId = `startup-recovery:${rule.id}:${recoveryBucket}`;
    const idempotencyKey = `${rule.id}:startup_recovery:${recoveryBucket}`;

    try {
      const existingRun = await persistence.getScheduledRunByIdempotency(rule.id, idempotencyKey);
      if (existingRun) {
        continue;
      }

      const evaluation = evaluateScheduleRuleAst(rule.rule_ast, {
        nowUtc: now,
        eventType: "system.restart",
        taskStatus: null,
        moduleEnabled: null,
        weeklyRemainingPct: null,
        fiveHourRemainingPct: null,
        resetEtaHours: null
      });

      if (!evaluation.matched) {
        continue;
      }

      const activeRun = await persistence.getActiveScheduledRun(rule.id);
      if (activeRun) {
        const skippedRun = await persistence.createScheduledRun({
          rule_id: rule.id,
          status: "skipped_due_to_overlap",
          started_at: now,
          ended_at: now,
          skip_reason: "active_run_exists_on_recovery",
          trace_id: traceId,
          idempotency_key: idempotencyKey,
          result_json: { active_run_id: activeRun.id, recovery: true }
        });

        await publisher.publish({
          eventType: "schedule.run.skipped_due_to_overlap",
          traceId,
          idempotencyKey: `${skippedRun.id}:${traceId}`,
          payload: {
            rule_id: rule.id,
            run_id: skippedRun.id,
            scope: rule.scope,
            status: skippedRun.status,
            reason: "startup_recovery_overlap"
          }
        });
        continue;
      }

      const startedRun = await persistence.createScheduledRun({
        rule_id: rule.id,
        status: "started",
        started_at: now,
        ended_at: null,
        skip_reason: null,
        trace_id: traceId,
        idempotency_key: idempotencyKey,
        result_json: { recovery: true }
      });

      await publisher.publish({
        eventType: "schedule.run.started",
        traceId,
        idempotencyKey: `${startedRun.id}:${traceId}`,
        payload: {
          rule_id: rule.id,
          run_id: startedRun.id,
          scope: rule.scope,
          status: startedRun.status,
          reason: "startup_recovery"
        }
      });
    } catch (error) {
      app.log.error(
        { err: error, rule_id: rule.id },
        "Failed to recover schedule rule on startup"
      );
    }
  }
}
