import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v4";
import type { AgentRequestResolveInput } from "./api-client";
import {
  executeGovernorDecision
} from "./governor-policy-execution";
import {
  GOVERNOR_DEFAULT_ID,
  GOVERNOR_STRATEGY_VERSION,
  mapGovernorError,
  toGovernorDecision
} from "./governor-policy";
import {
  AGENT_REQUEST_RESOLVE_STATUS_VALUES,
  AGENT_REQUEST_TYPE_VALUES,
  asRecord,
  normalizeAgentRequestCreateInput,
  resolveTraceId,
  toToolError,
  toToolSuccess
} from "./server-shared";
import type { RegisterMcpToolOptions } from "./server-shared";

export function registerAgentRequestTools(options: RegisterMcpToolOptions): void {
  const { server, apiClient, authorizeToolCall } = options;

  server.registerTool(
    "orchestrator.create_agent_request",
    {
      description:
        "Создать универсальную агентскую заявку (MCP/server/ACL/script/runtime/other) через request-plane API.",
      inputSchema: {
        type: z.enum(AGENT_REQUEST_TYPE_VALUES),
        priority: z.number().int().min(0).max(1_000).optional(),
        project_id: z.string().min(1),
        task_id: z.string().min(1),
        agent_run_id: z.string().min(1).optional(),
        agent_profile_id: z.string().min(1).optional(),
        requested_by_agent_id: z.string().min(1).optional(),
        title: z.string().min(1),
        reason: z.string().min(1),
        request_payload: z.record(z.string(), z.unknown()).nullable().optional(),
        trace_id: z.string().min(1).optional(),
        idempotency_key: z.string().min(1).optional()
      }
    },
    async (input): Promise<CallToolResult> => {
      try {
        const authError = await authorizeToolCall("orchestrator.create_agent_request", input);
        if (authError) {
          return authError;
        }

        const traceId = resolveTraceId(input.trace_id, input.idempotency_key);
        const payload = normalizeAgentRequestCreateInput(input);
        const result = await apiClient.createAgentRequest(payload, traceId);

        return toToolSuccess("Agent request created", {
          trace_id: traceId,
          idempotency_key: input.idempotency_key ?? null,
          request: asRecord(result)
        });
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "orchestrator.list_open_agent_requests",
    {
      description:
        "Получить open-пул agent requests (open + blocked_agent, опционально in_progress).",
      inputSchema: {
        project_id: z.string().min(1).optional(),
        task_id: z.string().min(1).optional(),
        agent_profile_id: z.string().min(1).optional(),
        type: z.enum(AGENT_REQUEST_TYPE_VALUES).optional(),
        include_in_progress: z.boolean().optional(),
        limit: z.number().int().min(1).max(500).optional()
      }
    },
    async (input): Promise<CallToolResult> => {
      try {
        const authError = await authorizeToolCall("orchestrator.list_open_agent_requests", input);
        if (authError) {
          return authError;
        }

        const response = await apiClient.listOpenAgentRequests({
          project_id: input.project_id?.trim().toLowerCase(),
          task_id: input.task_id?.trim(),
          agent_profile_id: input.agent_profile_id?.trim(),
          type: input.type,
          include_in_progress: input.include_in_progress,
          limit: input.limit
        });

        return toToolSuccess(`Loaded ${response.items.length} open agent requests`, {
          open_pool_statuses: input.include_in_progress
            ? ["open", "blocked_agent", "in_progress"]
            : ["open", "blocked_agent"],
          total: response.items.length,
          items: response.items
        });
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "orchestrator.resolve_agent_request",
    {
      description:
        "Обновить статус agent request (claim/in-progress, blocked, resolved_by_agent/manual, rejected_manual).",
      inputSchema: {
        request_id: z.string().min(1),
        status: z.enum(AGENT_REQUEST_RESOLVE_STATUS_VALUES),
        resolution_payload: z.record(z.string(), z.unknown()).nullable().optional(),
        claimed_by_governor_id: z.string().min(1).nullable().optional(),
        resolved_by: z.string().min(1).nullable().optional(),
        trace_id: z.string().min(1).optional(),
        idempotency_key: z.string().min(1).optional()
      }
    },
    async (input): Promise<CallToolResult> => {
      try {
        const authError = await authorizeToolCall("orchestrator.resolve_agent_request", input);
        if (authError) {
          return authError;
        }

        const traceId = resolveTraceId(input.trace_id, input.idempotency_key);
        const resolveInput: AgentRequestResolveInput = {
          status: input.status,
          resolution_payload: input.resolution_payload,
          claimed_by_governor_id: input.claimed_by_governor_id,
          resolved_by: input.resolved_by
        };
        const result = await apiClient.resolveAgentRequest(
          input.request_id.trim(),
          resolveInput,
          traceId
        );

        return toToolSuccess("Agent request updated", {
          trace_id: traceId,
          idempotency_key: input.idempotency_key ?? null,
          request: asRecord(result)
        });
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "orchestrator.governor_process_open_agent_requests",
    {
      description:
        "Автообработать open-пул agent requests: claim (in_progress) и финальный статус (resolved_by_agent/blocked_agent).",
      inputSchema: {
        project_id: z.string().min(1).optional(),
        task_id: z.string().min(1).optional(),
        agent_profile_id: z.string().min(1).optional(),
        type: z.enum(AGENT_REQUEST_TYPE_VALUES).optional(),
        include_in_progress: z.boolean().optional(),
        retry_blocked: z.boolean().optional(),
        dry_run: z.boolean().optional(),
        governor_id: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(500).optional(),
        trace_id: z.string().min(1).optional(),
        idempotency_key: z.string().min(1).optional()
      }
    },
    async (input): Promise<CallToolResult> => {
      try {
        const authError = await authorizeToolCall(
          "orchestrator.governor_process_open_agent_requests",
          input
        );
        if (authError) {
          return authError;
        }

        const baseTraceId = resolveTraceId(input.trace_id, input.idempotency_key);
        const governorId = input.governor_id?.trim() || GOVERNOR_DEFAULT_ID;
        const includeInProgress = input.include_in_progress ?? false;
        const retryBlocked = input.retry_blocked ?? false;
        const dryRun = input.dry_run ?? false;
        const response = await apiClient.listOpenAgentRequests({
          project_id: input.project_id?.trim().toLowerCase(),
          task_id: input.task_id?.trim(),
          agent_profile_id: input.agent_profile_id?.trim(),
          type: input.type,
          include_in_progress: includeInProgress,
          limit: input.limit
        });

        const actions: Array<Record<string, unknown>> = [];
        let claimed = 0;
        let processed = 0;
        let resolvedByAgent = 0;
        let blockedAgent = 0;
        let skipped = 0;
        let errors = 0;

        for (const rawItem of response.items) {
          const item = asRecord(rawItem);
          const requestId = typeof item["id"] === "string" ? item["id"] : null;
          const previousStatus = typeof item["status"] === "string" ? item["status"] : null;
          const requestType = typeof item["type"] === "string" ? item["type"] : null;

          if (!requestId || !previousStatus) {
            skipped += 1;
            actions.push({
              request_id: requestId ?? null,
              action: "skipped",
              reason: "missing_id_or_status"
            });
            continue;
          }

          if (previousStatus === "in_progress") {
            skipped += 1;
            actions.push({
              request_id: requestId,
              previous_status: previousStatus,
              action: "skipped",
              reason: "already_in_progress"
            });
            continue;
          }

          if (previousStatus === "blocked_agent" && !retryBlocked) {
            skipped += 1;
            actions.push({
              request_id: requestId,
              previous_status: previousStatus,
              action: "skipped",
              reason: "blocked_retry_disabled"
            });
            continue;
          }

          const decision = toGovernorDecision(item);
          if (dryRun) {
            actions.push({
              request_id: requestId,
              previous_status: previousStatus,
              request_type: requestType,
              action: "planned",
              planned_final_status: decision.finalStatus,
              decision_reason: decision.reason,
              decision_metadata: decision.metadata ?? null
            });
            continue;
          }

          try {
            const claimTraceId = `${baseTraceId}:claim:${requestId}`;
            await apiClient.resolveAgentRequest(
              requestId,
              {
                status: "in_progress",
                claimed_by_governor_id: governorId,
                resolution_payload: {
                  governor_strategy: GOVERNOR_STRATEGY_VERSION,
                  governor_phase: "claim"
                }
              },
              claimTraceId
            );
            claimed += 1;

            const policyTraceId = `${baseTraceId}:policy:${requestId}`;
            const finalDecision = await executeGovernorDecision(apiClient, item, decision, policyTraceId);

            const finalizeTraceId = `${baseTraceId}:finalize:${requestId}`;
            const finalInput: AgentRequestResolveInput = {
              status: finalDecision.finalStatus,
              claimed_by_governor_id: governorId,
              resolution_payload: {
                governor_strategy: GOVERNOR_STRATEGY_VERSION,
                governor_phase: "finalize",
                decision_reason: finalDecision.reason,
                decision_metadata: finalDecision.metadata ?? null,
                request_type: requestType ?? null,
                previous_status: previousStatus
              },
              resolved_by:
                finalDecision.finalStatus === "resolved_by_agent" ? governorId : undefined
            };
            const finalized = await apiClient.resolveAgentRequest(requestId, finalInput, finalizeTraceId);

            processed += 1;
            if (finalDecision.finalStatus === "resolved_by_agent") {
              resolvedByAgent += 1;
            } else {
              blockedAgent += 1;
            }

            actions.push({
              request_id: requestId,
              previous_status: previousStatus,
              request_type: requestType,
              action: "processed",
              claim_trace_id: claimTraceId,
              policy_trace_id: policyTraceId,
              finalize_trace_id: finalizeTraceId,
              final_status: finalDecision.finalStatus,
              decision_reason: finalDecision.reason,
              decision_metadata: finalDecision.metadata ?? null,
              request: asRecord(finalized)
            });
          } catch (error) {
            errors += 1;
            actions.push({
              request_id: requestId,
              previous_status: previousStatus,
              request_type: requestType,
              action: "error",
              error: mapGovernorError(error)
            });
          }
        }

        return toToolSuccess(
          dryRun
            ? `Governor dry-run prepared ${actions.length} actions`
            : `Governor processed ${processed} requests`,
          {
            trace_id: baseTraceId,
            governor_id: governorId,
            dry_run: dryRun,
            retry_blocked: retryBlocked,
            include_in_progress: includeInProgress,
            total_candidates: response.items.length,
            claimed,
            processed,
            resolved_by_agent: resolvedByAgent,
            blocked_agent: blockedAgent,
            skipped,
            errors,
            actions
          }
        );
      } catch (error) {
        return toToolError(error);
      }
    }
  );
}
