import type {
  AgentProfileScriptOs,
  AgentProfileScriptType,
  AgentProfileSourcePolicy,
  AgentRequestStatus,
  AgentRequestType,
  AuthContextType,
  McpApiKeyStatus,
  McpServerOriginType,
  McpServerTransport,
  ScheduleMisfirePolicy,
  ScheduleOverlapPolicy,
  ScheduleScope
} from "../runtime/contracts";
import type { TaskStatus } from "../types";

export const AUTH_CONTEXT_TYPES = new Set<AuthContextType>(["apikey", "chatgpt", "chatgptAuthTokens"]);
export const AGENT_REQUEST_TYPES = new Set<AgentRequestType>([
  "mcp_server_attach",
  "mcp_tool_acl",
  "script_set",
  "runtime_dependency",
  "other"
]);
export const AGENT_REQUEST_STATUSES = new Set<AgentRequestStatus>([
  "open",
  "in_progress",
  "resolved_by_agent",
  "blocked_agent",
  "resolved_manual",
  "rejected_manual"
]);
export const AGENT_REQUEST_TERMINAL_STATUSES = new Set<AgentRequestStatus>([
  "resolved_by_agent",
  "resolved_manual",
  "rejected_manual"
]);
export const AGENT_REQUEST_RESOLVE_ALLOWED_STATUSES = new Set<AgentRequestStatus>([
  "in_progress",
  "blocked_agent",
  "resolved_by_agent",
  "resolved_manual",
  "rejected_manual"
]);
export const AGENT_PROFILE_SOURCE_POLICIES = new Set<AgentProfileSourcePolicy>([
  "catalog_only",
  "catalog_plus_custom",
  "custom_only"
]);
export const MCP_SERVER_TRANSPORTS = new Set<McpServerTransport>(["stdio", "http"]);
export const MCP_SERVER_ORIGIN_TYPES = new Set<McpServerOriginType>(["built_in", "catalog", "custom"]);
export const MCP_API_KEY_STATUSES = new Set<McpApiKeyStatus>(["active", "disabled", "revoked"]);
export const MCP_API_KEY_PATCH_STATUSES = new Set<McpApiKeyStatus>(["active", "disabled"]);
export const AGENT_PROFILE_SCRIPT_OSES = new Set<AgentProfileScriptOs>(["windows", "linux", "macos"]);
export const AGENT_PROFILE_SCRIPT_TYPES = new Set<AgentProfileScriptType>(["instruction", "shell"]);
export const ORCHESTRATOR_MCP_SERVER_NAME = "orchestrator-core";
export const SCHEDULE_SCOPES = new Set<ScheduleScope>(["global", "project"]);
export const SCHEDULE_OVERLAP_POLICIES = new Set<ScheduleOverlapPolicy>(["one_active_skip"]);
export const SCHEDULE_MISFIRE_POLICIES = new Set<ScheduleMisfirePolicy>(["recompute_due_on_restart"]);
export const DEFAULT_DELEGATION_TIMEOUT_RETRY_LIMIT = 3;
export const DEFAULT_AUTH_SWITCH_RETRY_LIMIT = 3;
export const DEFAULT_PROJECT_SUMMARY_WINDOW_HOURS = 24;
export const MAX_PROJECT_SUMMARY_WINDOW_HOURS = 24 * 30;
export const MAX_DELEGATION_PROMPT_LENGTH = 4_000;
export const MAX_DELEGATION_EXECUTION_PROMPT_LENGTH = 12_000;
export const MAX_DELEGATION_LOG_LENGTH = 12_000;
export const MAX_MEMORY_CONTENT_LENGTH = 8_000;
export const MAX_MEMORY_CONTEXT_ENTRIES = 6;
export const MAX_AGENT_PROFILE_PROMPT_SCRIPT_LENGTH = 4_000;
export const MAX_AGENT_PROFILE_PROMPT_MCP_SERVERS = 12;
export const MAX_AGENT_PROFILE_SCRIPT_CONTENT_LENGTH = 20_000;
export const MAX_MCP_KEY_ACL_TOOLS = 200;
export const MAX_MCP_KEY_PROFILE_BINDINGS = 100;
export const MAX_PROJECT_SECRET_VALUE_LENGTH = 32_000;
export const MAX_PROJECT_SECRET_BINDINGS = 128;
export const MAX_RUNTIME_SECRET_ENV_VARS = 64;
export const PROJECT_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
export const PROJECT_SECRET_KEY_PATTERN = /^[A-Z][A-Z0-9_]{1,127}$/;
export const DELEGATION_SANDBOX_POLICIES = new Set(["read-only", "workspace-write", "danger-full-access"]);
export const DELEGATION_APPROVAL_POLICIES = new Set(["never", "on-request", "on-failure", "untrusted"]);
export const TASK_AUTODISPATCH_SOURCE = "task_auto_dispatcher";
export const TASK_AUTODISPATCH_PICKUP_STATUSES = new Set<TaskStatus>(["NEW", "QUEUED"]);
export const TASK_AUTODISPATCH_RUNNING_STATUSES = new Set(["requested", "accepted", "running"]);
export const TASK_AUTODISPATCH_WAITING_LIMIT_ERROR_CODES = new Set(["AUTH_PROFILE_REQUIRED"]);
export const TASK_AUTODISPATCH_RESULT_SUCCESS_MARKER = "TASK_RESULT:SUCCESS";
export const TASK_AUTODISPATCH_RESULT_FAILED_MARKER = "TASK_RESULT:FAILED";
export const TASK_AUTODISPATCH_FAILURE_TEXT_PATTERNS = [
  "не смог",
  "не удалось",
  "cannot",
  "can't",
  "unable",
  "failed",
  "ошибка",
  "нет доступа",
  "permission denied",
  "access denied"
];

export type ComparisonOperator = "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in" | "contains";

export const COMPARISON_OPERATORS = new Set<ComparisonOperator>([
  "eq",
  "ne",
  "lt",
  "lte",
  "gt",
  "gte",
  "in",
  "contains"
]);

export interface ScheduleEvaluationContext {
  nowUtc: Date;
  eventType: string | null;
  taskStatus: string | null;
  moduleEnabled: boolean | null;
  weeklyRemainingPct: number | null;
  fiveHourRemainingPct: number | null;
  resetEtaHours: number | null;
}
