import type {
  AgentProfileScriptType
} from "./api-client";
import { OrchestratorApiError } from "./api-client";

export const GOVERNOR_DEFAULT_ID = "mcp-governor-bridge";
export const GOVERNOR_STRATEGY_VERSION = "mcp_bridge_governor_v1";
const AGENT_PROFILE_SCRIPT_OS_VALUES = ["windows", "linux", "macos"] as const;
const AGENT_PROFILE_SCRIPT_TYPE_VALUES = ["instruction", "shell"] as const;
const TOOL_NAME_SERVER_HINTS = [
  { prefix: "browser.", serverName: "browser-mcp" },
  { prefix: "playwright.", serverName: "browser-mcp" },
  { prefix: "docker.", serverName: "docker-mcp" }
] as const;
const RUNTIME_DEPENDENCY_SERVER_HINTS: Record<string, string> = {
  browser: "browser-mcp",
  browser_mcp: "browser-mcp",
  playwright: "browser-mcp",
  docker: "docker-mcp",
  docker_mcp: "docker-mcp"
};
const RUNTIME_DEPENDENCY_SCRIPT_HINTS = new Set([
  "script_set",
  "os_script",
  "runbook_script",
  "instructions"
]);

export interface GovernorDecision {
  finalStatus: "resolved_by_agent" | "blocked_agent";
  reason: string;
  metadata?: Record<string, unknown>;
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

export function asBooleanValue(value: unknown): boolean | null {
  if (typeof value !== "boolean") {
    return null;
  }

  return value;
}

export function asIntegerValue(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    return null;
  }

  return value;
}

export function asAgentProfileScriptOs(
  value: unknown
): (typeof AGENT_PROFILE_SCRIPT_OS_VALUES)[number] | null {
  const parsed = asStringValue(value);
  if (!parsed) {
    return null;
  }

  return AGENT_PROFILE_SCRIPT_OS_VALUES.includes(
    parsed as (typeof AGENT_PROFILE_SCRIPT_OS_VALUES)[number]
  )
    ? (parsed as (typeof AGENT_PROFILE_SCRIPT_OS_VALUES)[number])
    : null;
}

export function asAgentProfileScriptType(value: unknown): AgentProfileScriptType | null {
  const parsed = asStringValue(value);
  if (!parsed) {
    return null;
  }

  return AGENT_PROFILE_SCRIPT_TYPE_VALUES.includes(parsed as AgentProfileScriptType)
    ? (parsed as AgentProfileScriptType)
    : null;
}

export function getAgentRequestPayload(request: Record<string, unknown>): Record<string, unknown> {
  return asRecord(request["request_payload"]);
}

export function withAgentRequestPayload(
  request: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...request,
    request_payload: {
      ...getAgentRequestPayload(request),
      ...patch
    }
  };
}

export function hasMcpServerHint(payload: Record<string, unknown>): boolean {
  return Boolean(
    asStringValue(payload["mcp_server_id"]) ??
      asStringValue(payload["server_id"]) ??
      asStringValue(payload["mcp_server_name"]) ??
      asStringValue(payload["server_name"])
  );
}

export function hasScriptSetHint(payload: Record<string, unknown>): boolean {
  return (
    asAgentProfileScriptOs(payload["os"]) !== null ||
    asStringValue(payload["content"]) !== null
  );
}

function normalizeRuntimeDependencyKey(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function extractRuntimeDependencyKey(payload: Record<string, unknown>): string | null {
  return normalizeRuntimeDependencyKey(
    asStringValue(payload["dependency_type"]) ??
      asStringValue(payload["dependency_kind"]) ??
      asStringValue(payload["kind"]) ??
      asStringValue(payload["dependency"])
  );
}

export function inferServerNameFromToolName(toolName: string | null): string | null {
  if (!toolName) {
    return null;
  }

  const normalized = toolName.trim().toLowerCase();
  for (const hint of TOOL_NAME_SERVER_HINTS) {
    if (normalized.startsWith(hint.prefix)) {
      return hint.serverName;
    }
  }

  return null;
}

export function inferServerNameFromRuntimeDependency(payload: Record<string, unknown>): string | null {
  const key = extractRuntimeDependencyKey(payload);
  if (!key) {
    return null;
  }

  return RUNTIME_DEPENDENCY_SERVER_HINTS[key] ?? null;
}

export function toGovernorDecision(request: Record<string, unknown>): GovernorDecision {
  const type = asStringValue(request["type"]) ?? "other";
  const requestPayload = getAgentRequestPayload(request);
  const manualRequired =
    asBooleanValue(requestPayload["manual_required"]) === true ||
    asBooleanValue(requestPayload["requires_manual_approval"]) === true;
  if (manualRequired) {
    return {
      finalStatus: "blocked_agent",
      reason: "manual_approval_required"
    };
  }

  if (type === "mcp_server_attach") {
    return {
      finalStatus: "resolved_by_agent",
      reason: "policy_mcp_server_attach"
    };
  }

  if (type === "script_set") {
    return {
      finalStatus: "resolved_by_agent",
      reason: "policy_script_set"
    };
  }

  if (type === "mcp_tool_acl") {
    return {
      finalStatus: "resolved_by_agent",
      reason: "policy_mcp_tool_acl"
    };
  }

  if (type === "runtime_dependency") {
    return {
      finalStatus: "resolved_by_agent",
      reason: "policy_runtime_dependency"
    };
  }

  if (asBooleanValue(requestPayload["governor_auto_resolve"]) === true) {
    return {
      finalStatus: "resolved_by_agent",
      reason: "explicit_auto_resolve_flag"
    };
  }

  if (type === "other") {
    return {
      finalStatus: "blocked_agent",
      reason: "unsupported_type_other"
    };
  }

  return {
    finalStatus: "blocked_agent",
    reason: "auto_resolve_flag_missing"
  };
}

export function mapGovernorError(error: unknown): Record<string, unknown> {
  if (error instanceof OrchestratorApiError) {
    return {
      error: error.message,
      code: error.code,
      status_code: error.statusCode,
      method: error.method,
      path: error.path,
      details: error.details
    };
  }

  return {
    error: error instanceof Error ? error.message : "Unknown governor error",
    code: "INTERNAL_ERROR"
  };
}

export { RUNTIME_DEPENDENCY_SCRIPT_HINTS };
