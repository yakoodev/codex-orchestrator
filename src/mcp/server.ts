import { createHash, randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v4";
import { TASK_STATUSES } from "../types";
import type { DispatchAgentRequest, OrchestratorApiClient } from "./api-client";
import { OrchestratorApiError } from "./api-client";

export interface CreateOrchestratorMcpServerOptions {
  apiClient: OrchestratorApiClient;
  serverName?: string;
  serverVersion?: string;
}

const DEFAULT_SERVER_NAME = "codex-orchestrator-mcp";
const DEFAULT_SERVER_VERSION = "0.1.0";

function toPrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function toToolSuccess(summary: string, structuredContent: Record<string, unknown>): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: `${summary}\n${toPrettyJson(structuredContent)}`
      }
    ],
    structuredContent
  } as CallToolResult;
}

function toToolError(error: unknown): CallToolResult {
  if (error instanceof OrchestratorApiError) {
    const structuredContent = {
      error: error.message,
      code: error.code,
      status_code: error.statusCode,
      method: error.method,
      path: error.path,
      details: error.details
    };

    return {
      isError: true,
      content: [
        {
          type: "text",
          text: toPrettyJson(structuredContent)
        }
      ],
      structuredContent
    } as CallToolResult;
  }

  const structuredContent = {
    error: error instanceof Error ? error.message : "Unknown MCP bridge error",
    code: "INTERNAL_ERROR"
  };

  return {
    isError: true,
    content: [
      {
        type: "text",
        text: toPrettyJson(structuredContent)
      }
    ],
    structuredContent
  } as CallToolResult;
}

function resolveTraceId(traceId: string | undefined, idempotencyKey: string | undefined): string {
  if (traceId && traceId.trim()) {
    return traceId.trim();
  }

  if (idempotencyKey && idempotencyKey.trim()) {
    const digest = createHash("sha256").update(idempotencyKey.trim()).digest("hex").slice(0, 24);
    return `mcp-idempotency-${digest}`;
  }

  return randomUUID();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asStringValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeDispatchInput(input: {
  requester_task_id: string;
  requester_task_run_id?: string;
  capability: string;
  target_selector?: Record<string, unknown>;
  payload: Record<string, unknown>;
  priority?: number;
}): DispatchAgentRequest {
  return {
    requester_task_id: input.requester_task_id.trim(),
    requester_task_run_id: input.requester_task_run_id?.trim(),
    capability: input.capability.trim(),
    target_selector: input.target_selector ?? {},
    payload: input.payload,
    priority: input.priority
  };
}

function extractProfileSummary(item: Record<string, unknown>): {
  id: string;
  label: string | null;
  status: string | null;
} | null {
  const id = asStringValue(item["id"]);
  if (!id) {
    return null;
  }

  return {
    id,
    label: asStringValue(item["label"]),
    status: asStringValue(item["status"])
  };
}

export function createOrchestratorMcpServer(
  options: CreateOrchestratorMcpServerOptions
): McpServer {
  const server = new McpServer({
    name: options.serverName ?? DEFAULT_SERVER_NAME,
    version: options.serverVersion ?? DEFAULT_SERVER_VERSION
  });

  server.registerTool(
    "orchestrator.list_agents",
    {
      description:
        "Получить доступные agent templates и capability map оркестратора через текущий REST API."
    },
    async (): Promise<CallToolResult> => {
      try {
        const [templatesResponse, capabilitiesResponse] = await Promise.all([
          options.apiClient.listAgentTemplates(),
          options.apiClient.listDelegationCapabilities()
        ]);

        const structuredContent = {
          templates: templatesResponse.items,
          capabilities: capabilitiesResponse.items,
          totals: {
            templates: templatesResponse.items.length,
            capabilities: capabilitiesResponse.items.length
          }
        };

        return toToolSuccess(
          `Loaded ${templatesResponse.items.length} templates and ${capabilitiesResponse.items.length} capabilities`,
          structuredContent
        );
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "orchestrator.list_tasks",
    {
      description:
        "Получить задачи оркестратора с опциональным фильтром по статусу и ограничением по количеству.",
      inputSchema: {
        status: z.enum(TASK_STATUSES).optional(),
        limit: z.number().int().min(1).max(500).optional()
      }
    },
    async ({ status, limit }): Promise<CallToolResult> => {
      try {
        const tasksResponse = await options.apiClient.listTasks({ status });
        const limitedItems =
          typeof limit === "number" ? tasksResponse.items.slice(0, limit) : tasksResponse.items;

        const structuredContent = {
          status: status ?? null,
          total: tasksResponse.items.length,
          returned: limitedItems.length,
          truncated: limitedItems.length < tasksResponse.items.length,
          items: limitedItems
        };

        return toToolSuccess(
          `Loaded ${limitedItems.length} task items${status ? ` for status ${status}` : ""}`,
          structuredContent
        );
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "orchestrator.dispatch_agent",
    {
      description:
        "Запустить делегацию агента через /api/delegation/dispatch с trace/idempotency на уровне MCP bridge.",
      inputSchema: {
        requester_task_id: z.string().min(1),
        requester_task_run_id: z.string().min(1).optional(),
        capability: z.string().min(1),
        target_selector: z.record(z.string(), z.unknown()).optional(),
        payload: z.record(z.string(), z.unknown()),
        priority: z.number().int().min(0).max(1_000).optional(),
        trace_id: z.string().min(1).optional(),
        idempotency_key: z.string().min(1).optional()
      }
    },
    async (input): Promise<CallToolResult> => {
      try {
        const traceId = resolveTraceId(input.trace_id, input.idempotency_key);
        const dispatchInput = normalizeDispatchInput(input);
        const response = await options.apiClient.dispatchAgent(dispatchInput, traceId);
        const structuredContent = {
          trace_id: traceId,
          idempotency_key: input.idempotency_key ?? null,
          result: asRecord(response)
        };

        return toToolSuccess("Dispatch request accepted", structuredContent);
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "orchestrator.get_limits",
    {
      description:
        "Получить live rate limits по конкретному auth profile или по набору профилей (fleet snapshot).",
      inputSchema: {
        profile_id: z.string().min(1).optional(),
        include_inactive: z.boolean().optional(),
        limit_profiles: z.number().int().min(1).max(100).optional()
      }
    },
    async ({
      profile_id: profileIdInput,
      include_inactive: includeInactiveInput,
      limit_profiles: limitProfiles
    }): Promise<CallToolResult> => {
      try {
        const profileId = asStringValue(profileIdInput);

        if (profileId) {
          const limits = await options.apiClient.getAuthProfileLimits(profileId);
          const structuredContent = {
            requested_profiles: 1,
            successful_profiles: 1,
            failed_profiles: 0,
            items: [limits],
            errors: []
          };

          return toToolSuccess(`Loaded limits for profile ${profileId}`, structuredContent);
        }

        const includeInactive = includeInactiveInput ?? true;
        const profilesResponse = await options.apiClient.listAuthProfiles();
        const profiles = profilesResponse.items
          .map((item) => ({
            raw: item,
            profile: extractProfileSummary(item)
          }))
          .filter(
            (
              item
            ): item is {
              raw: Record<string, unknown>;
              profile: { id: string; label: string | null; status: string | null };
            } => item.profile !== null
          )
          .filter((item) => includeInactive || item.profile.status === "active")
          .slice(0, limitProfiles ?? profilesResponse.items.length);

        const limitsResults = await Promise.all(
          profiles.map(async ({ raw, profile }) => {
            try {
              const limits = await options.apiClient.getAuthProfileLimits(profile.id);
              return {
                ok: true as const,
                item: {
                  profile,
                  limits,
                  profile_raw: raw
                }
              };
            } catch (error) {
              return {
                ok: false as const,
                error,
                profile
              };
            }
          })
        );

        const items = limitsResults.filter((result) => result.ok).map((result) => result.item);

        const errors = limitsResults
          .filter(
            (
              result
            ): result is {
              ok: false;
              error: unknown;
              profile: { id: string; label: string | null; status: string | null };
            } => !result.ok
          )
          .map((result) => {
            if (result.error instanceof OrchestratorApiError) {
              return {
                profile_id: result.profile.id,
                profile_label: result.profile.label,
                profile_status: result.profile.status,
                error: result.error.message,
                code: result.error.code,
                status_code: result.error.statusCode
              };
            }

            return {
              profile_id: result.profile.id,
              profile_label: result.profile.label,
              profile_status: result.profile.status,
              error: result.error instanceof Error ? result.error.message : "Unknown limits error",
              code: "INTERNAL_ERROR"
            };
          });

        const structuredContent = {
          requested_profiles: profiles.length,
          successful_profiles: items.length,
          failed_profiles: errors.length,
          items,
          errors
        };

        return toToolSuccess(
          `Loaded limits for ${items.length}/${profiles.length} profiles`,
          structuredContent
        );
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  return server;
}
