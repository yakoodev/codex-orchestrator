import { createHash, randomUUID } from "node:crypto";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  AgentRequestCreateInput,
  CreateTaskRequest,
  OrchestratorApiClient
} from "./api-client";
import { OrchestratorApiError } from "./api-client";

export const AGENT_REQUEST_TYPE_VALUES = [
  "mcp_server_attach",
  "mcp_tool_acl",
  "script_set",
  "runtime_dependency",
  "other"
] as const;

export const AGENT_REQUEST_RESOLVE_STATUS_VALUES = [
  "in_progress",
  "blocked_agent",
  "resolved_by_agent",
  "resolved_manual",
  "rejected_manual"
] as const;

function toPrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

export function toToolSuccess(
  summary: string,
  structuredContent: Record<string, unknown>
): CallToolResult {
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

export function toToolError(error: unknown): CallToolResult {
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

export function resolveTraceId(traceId: string | undefined, idempotencyKey: string | undefined): string {
  if (traceId && traceId.trim()) {
    return traceId.trim();
  }

  if (idempotencyKey && idempotencyKey.trim()) {
    const digest = createHash("sha256").update(idempotencyKey.trim()).digest("hex").slice(0, 24);
    return `mcp-idempotency-${digest}`;
  }

  return randomUUID();
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function asStringValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeCreateTaskInput(input: {
  title: string;
  description: string;
  project_id: string;
  agent_profile_id: string;
  priority?: number;
}): CreateTaskRequest {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    project_id: input.project_id.trim().toLowerCase(),
    agent_profile_id: input.agent_profile_id.trim(),
    priority: input.priority
  };
}

export function normalizeAgentRequestCreateInput(input: {
  type: AgentRequestCreateInput["type"];
  priority?: number;
  project_id: string;
  task_id: string;
  agent_run_id?: string | null;
  agent_profile_id?: string | null;
  requested_by_agent_id?: string | null;
  title: string;
  reason: string;
  request_payload?: Record<string, unknown> | null;
}): AgentRequestCreateInput {
  return {
    type: input.type,
    priority: input.priority,
    project_id: input.project_id.trim().toLowerCase(),
    task_id: input.task_id.trim(),
    agent_run_id: input.agent_run_id?.trim() ?? null,
    agent_profile_id: input.agent_profile_id?.trim() ?? null,
    requested_by_agent_id: input.requested_by_agent_id?.trim() ?? null,
    title: input.title.trim(),
    reason: input.reason.trim(),
    request_payload: input.request_payload ?? null
  };
}

export function extractProfileSummary(item: Record<string, unknown>): {
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

export type AuthorizeToolCall = (
  toolName: string,
  toolInput?: unknown
) => Promise<CallToolResult | null>;

export interface RegisterMcpToolOptions {
  server: McpServer;
  apiClient: OrchestratorApiClient;
  authorizeToolCall: AuthorizeToolCall;
}
