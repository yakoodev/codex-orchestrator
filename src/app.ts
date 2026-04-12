import { createHash, randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import type { AppConfig } from "./config";
import {
  hasAuthJsonMime,
  isAuthJsonFilename,
  parseAuthJsonBuffer
} from "./lib/auth-profile-json";
import {
  buildSecretMaskedPreview,
  decryptProjectSecretValue,
  encryptProjectSecretValue
} from "./lib/secrets-envelope";
import { registerOpenApiStubs } from "./lib/openapi-stubs";
import {
  AuthProfileRateLimitsError,
  createAuthProfileRateLimitsReader
} from "./runtime/auth-profile-rate-limits";
import type {
  AgentProfileEntity,
  AgentProfileMcpServerBindingEntity,
  AgentProfileScriptOs,
  AgentProfileScriptSetEntity,
  AgentProfileScriptType,
  AgentProfileSourcePolicy,
  AgentRequestAuditEventEntity,
  AgentRequestEntity,
  AgentRequestStatus,
  AgentRequestType,
  AgentMemoryEntryEntity,
  AgentTemplateEntity,
  ArtifactEntity,
  AuthContextEntity,
  AuthContextType,
  AuthProfileRateLimitsReader,
  DelegationExecutionError,
  DelegationExecutor,
  AuthProfileEntity,
  DelegationRequestEntity,
  EventPublishInput,
  EventPublisher,
  McpServerOriginType,
  McpApiKeyEntity,
  McpApiKeyStatus,
  McpKeyAclRuleEntity,
  McpKeyProfileBindingEntity,
  McpKeyTemplateConstraintEntity,
  McpServerRegistryEntity,
  McpServerTransport,
  ModuleExecutionEntity,
  PackRegistryEntity,
  Persistence,
  ProjectEntity,
  ProjectSecretEntity,
  ProjectSecretRoleBindingEntity,
  ProjectSecretTemplateBindingEntity,
  ProjectSummaryEntity,
  ScheduleMisfirePolicy,
  ScheduledRuleEntity,
  ScheduledRunEntity,
  ScheduleOverlapPolicy,
  ScheduleScope,
  StorageService,
  TaskEntity,
  WorkerEntity
} from "./runtime/contracts";
import { isTaskStatus, type TaskStatus } from "./types";

const IMPLEMENTED_ROUTES = new Set<string>([
  "GET /health/live",
  "GET /health/ready",
  "POST /api/projects",
  "GET /api/projects",
  "GET /api/projects/{key}",
  "PATCH /api/projects/{key}",
  "GET /api/projects/{key}/summary",
  "POST /api/projects/{key}/secrets",
  "GET /api/projects/{key}/secrets",
  "PATCH /api/projects/{key}/secrets/{id}",
  "POST /api/projects/{key}/secrets/{id}/rotate",
  "POST /api/projects/{key}/secrets/{id}/revoke",
  "POST /api/projects/{key}/secrets/{id}/bindings/templates/{template_id}",
  "DELETE /api/projects/{key}/secrets/{id}/bindings/templates/{template_id}",
  "POST /api/projects/{key}/secrets/{id}/bindings/roles/{role}",
  "DELETE /api/projects/{key}/secrets/{id}/bindings/roles/{role}",
  "POST /api/tasks",
  "GET /api/tasks",
  "GET /api/tasks/{id}",
  "POST /api/tasks/{id}/pause",
  "POST /api/tasks/{id}/resume",
  "POST /api/tasks/{id}/cancel",
  "POST /api/tasks/{id}/replan",
  "POST /api/tasks/{id}/say",
  "POST /api/tasks/{id}/approve",
  "POST /api/tasks/{id}/reject",
  "POST /api/agents/templates",
  "GET /api/agents/templates",
  "PATCH /api/agents/templates/{id}",
  "DELETE /api/agents/templates/{id}",
  "GET /api/workers",
  "POST /api/workers/{id}/restart",
  "POST /api/workers/{id}/disable",
  "GET /api/workers/{id}/logs",
  "POST /api/auth-contexts",
  "GET /api/auth-contexts",
  "PATCH /api/auth-contexts/{id}",
  "POST /api/auth-contexts/{id}/disable",
  "GET /api/tasks/{id}/artifacts",
  "GET /api/artifacts/{id}",
  "POST /api/auth-profiles/chatgpt/upload",
  "GET /api/auth-profiles/chatgpt",
  "DELETE /api/auth-profiles/chatgpt/{id}",
  "POST /api/auth-profiles/chatgpt/{id}/activate",
  "POST /api/auth-profiles/chatgpt/{id}/deactivate",
  "GET /api/auth-profiles/chatgpt/{id}/limits",
  "GET /api/auth-profiles/chatgpt/active",
  "GET /api/auth-profiles/chatgpt/switch-events",
  "POST /api/packs",
  "GET /api/packs",
  "GET /api/packs/{id}",
  "PATCH /api/packs/{id}",
  "POST /api/packs/{id}/materialize",
  "GET /api/delegation/capabilities",
  "POST /api/delegation/dispatch",
  "GET /api/delegation/cards",
  "POST /api/agent-requests",
  "GET /api/agent-requests",
  "GET /api/agent-requests/{id}",
  "GET /api/agent-requests/{id}/audit",
  "POST /api/agent-requests/{id}/resolve",
  "POST /api/agent-profiles",
  "GET /api/agent-profiles",
  "GET /api/agent-profiles/{id}",
  "PATCH /api/agent-profiles/{id}",
  "GET /api/agent-profiles/{id}/mcp-servers",
  "POST /api/agent-profiles/{id}/mcp-servers/{server_id}",
  "DELETE /api/agent-profiles/{id}/mcp-servers/{server_id}",
  "GET /api/agent-profiles/{id}/scripts",
  "PUT /api/agent-profiles/{id}/scripts/{os}",
  "POST /api/mcp/servers",
  "GET /api/mcp/servers",
  "POST /api/mcp/keys",
  "GET /api/mcp/keys",
  "PATCH /api/mcp/keys/{id}",
  "POST /api/mcp/keys/{id}/rotate",
  "POST /api/mcp/keys/{id}/revoke",
  "POST /api/mcp/keys/{id}/bindings/profiles/{profile_id}",
  "DELETE /api/mcp/keys/{id}/bindings/profiles/{profile_id}",
  "POST /api/mcp/keys/{id}/constraints/templates/{template_id}",
  "DELETE /api/mcp/keys/{id}/constraints/templates/{template_id}",
  "POST /api/mcp/authz/evaluate",
  "POST /api/memory/entries",
  "GET /api/memory/entries",
  "PATCH /api/memory/entries/{id}",
  "GET /api/delegation/{id}",
  "GET /api/delegation/{id}/result",
  "POST /api/schedules",
  "GET /api/schedules",
  "GET /api/schedules/{id}",
  "PATCH /api/schedules/{id}",
  "DELETE /api/schedules/{id}",
  "POST /api/schedules/{id}/enable",
  "POST /api/schedules/{id}/disable",
  "POST /api/schedules/{id}/evaluate",
  "POST /api/schedules/{id}/trigger",
  "GET /api/schedules/{id}/runs",
  "GET /api/queue/held",
  "POST /api/queue/held/release",
  "GET /api/custom-modules",
  "GET /api/custom-modules/{key}",
  "GET /api/custom-modules/{key}/executions",
  "PATCH /api/custom-modules/{key}"
]);

export const SWITCH_MODULE_KEY = "switch_chatgpt_auth_on_limit";

interface AppDependencies {
  config: AppConfig;
  persistence: Persistence;
  publisher: EventPublisher;
  storage: StorageService;
  delegationExecutor?: DelegationExecutor;
  authProfileRateLimitsReader?: AuthProfileRateLimitsReader;
}

interface TaskCreateRequest {
  title?: unknown;
  description?: unknown;
  project_id?: unknown;
  agent_profile_id?: unknown;
  priority?: unknown;
}

interface ProjectCreateRequest {
  key?: unknown;
  name?: unknown;
  description?: unknown;
  github_url?: unknown;
  workspace_path?: unknown;
  meta_json?: unknown;
  is_active?: unknown;
}

interface ProjectPatchRequest {
  name?: unknown;
  description?: unknown;
  github_url?: unknown;
  workspace_path?: unknown;
  meta_json?: unknown;
  is_active?: unknown;
}

interface ProjectSecretCreateRequest {
  key?: unknown;
  value?: unknown;
  description?: unknown;
  is_active?: unknown;
  bind_template_ids?: unknown;
  bind_roles?: unknown;
}

interface ProjectSecretPatchRequest {
  description?: unknown;
  is_active?: unknown;
}

interface ProjectSecretRotateRequest {
  value?: unknown;
}

interface TaskSayRequest {
  message?: unknown;
}

interface TaskCancelRequest {
  reason?: unknown;
}

interface AuthContextCreateRequest {
  label?: unknown;
  type?: unknown;
  provider?: unknown;
  usage_policy?: unknown;
  limit_policy?: unknown;
}

interface AuthContextPatchRequest {
  label?: unknown;
  type?: unknown;
  provider?: unknown;
  usage_policy?: unknown;
  limit_policy?: unknown;
  is_enabled?: unknown;
  notes?: unknown;
}

interface AgentTemplateCreateRequest {
  name?: unknown;
  role?: unknown;
  description?: unknown;
  model?: unknown;
  auth_context_id?: unknown;
  pack_registry_entry_id?: unknown;
  system_prompt?: unknown;
  instructions_md?: unknown;
  sandbox_policy?: unknown;
  approval_policy?: unknown;
  output_schema?: unknown;
}

interface AgentTemplatePatchRequest {
  name?: unknown;
  role?: unknown;
  description?: unknown;
  model?: unknown;
  auth_context_id?: unknown;
  pack_registry_entry_id?: unknown;
  system_prompt?: unknown;
  instructions_md?: unknown;
  sandbox_policy?: unknown;
  approval_policy?: unknown;
  output_schema?: unknown;
  is_enabled?: unknown;
}

interface PackCreateRequest {
  pack_id?: unknown;
  role?: unknown;
  capabilities_json?: unknown;
  source_type?: unknown;
  source_ref?: unknown;
  pinned_version?: unknown;
  manifest_json?: unknown;
}

interface PackPatchRequest {
  pinned_version?: unknown;
  is_enabled?: unknown;
  source_ref?: unknown;
}

interface DelegationDispatchRequest {
  requester_task_id?: unknown;
  requester_task_run_id?: unknown;
  capability?: unknown;
  target_selector?: unknown;
  payload?: unknown;
  priority?: unknown;
}

interface MemoryEntryCreateRequest {
  project_id?: unknown;
  agent_role?: unknown;
  title?: unknown;
  content?: unknown;
  is_active?: unknown;
}

interface MemoryEntryPatchRequest {
  title?: unknown;
  content?: unknown;
  is_active?: unknown;
}

interface AgentRequestCreateRequest {
  type?: unknown;
  priority?: unknown;
  project_id?: unknown;
  task_id?: unknown;
  agent_run_id?: unknown;
  agent_profile_id?: unknown;
  requested_by_agent_id?: unknown;
  title?: unknown;
  reason?: unknown;
  request_payload?: unknown;
}

interface AgentRequestResolveRequest {
  status?: unknown;
  resolution_payload?: unknown;
  claimed_by_governor_id?: unknown;
  resolved_by?: unknown;
}

interface AgentProfileCreateRequest {
  name?: unknown;
  role?: unknown;
  description?: unknown;
  source_policy?: unknown;
  is_enabled?: unknown;
}

interface AgentProfilePatchRequest {
  name?: unknown;
  role?: unknown;
  description?: unknown;
  source_policy?: unknown;
  is_enabled?: unknown;
}

interface AgentProfileMcpBindingRequest {
  is_required?: unknown;
  priority?: unknown;
  config_json?: unknown;
}

interface AgentProfileScriptUpsertRequest {
  script_type?: unknown;
  content?: unknown;
}

interface McpServerCreateRequest {
  name?: unknown;
  transport?: unknown;
  endpoint_or_command?: unknown;
  origin_type?: unknown;
  is_approved?: unknown;
  meta_json?: unknown;
}

interface McpApiKeyCreateRequest {
  name?: unknown;
  expires_at?: unknown;
  meta_json?: unknown;
  acl_tools?: unknown;
  profile_ids?: unknown;
}

interface McpApiKeyPatchRequest {
  name?: unknown;
  status?: unknown;
  expires_at?: unknown;
  meta_json?: unknown;
  acl_tools?: unknown;
}

interface McpAuthzEvaluateRequest {
  api_key?: unknown;
  tool_name?: unknown;
  agent_profile_id?: unknown;
  actor?: unknown;
}

interface ModulePatchRequest {
  is_enabled?: unknown;
  config_json?: unknown;
}

interface ScheduleCreateRequest {
  name?: unknown;
  scope?: unknown;
  project_id?: unknown;
  rule_ast?: unknown;
  task_agent_profile_id?: unknown;
  task_agent_template_id?: unknown;
  task_title?: unknown;
  task_description?: unknown;
  task_priority?: unknown;
  overlap_policy?: unknown;
  misfire_policy?: unknown;
}

interface SchedulePatchRequest {
  name?: unknown;
  is_enabled?: unknown;
  rule_ast?: unknown;
  task_agent_profile_id?: unknown;
  task_agent_template_id?: unknown;
  task_title?: unknown;
  task_description?: unknown;
  task_priority?: unknown;
  overlap_policy?: unknown;
  misfire_policy?: unknown;
}

interface ScheduleTriggerRequest {
  dry_run_context?: unknown;
}

const AUTH_CONTEXT_TYPES = new Set<AuthContextType>(["apikey", "chatgpt", "chatgptAuthTokens"]);
const AGENT_REQUEST_TYPES = new Set<AgentRequestType>([
  "mcp_server_attach",
  "mcp_tool_acl",
  "script_set",
  "runtime_dependency",
  "other"
]);
const AGENT_REQUEST_STATUSES = new Set<AgentRequestStatus>([
  "open",
  "in_progress",
  "resolved_by_agent",
  "blocked_agent",
  "resolved_manual",
  "rejected_manual"
]);
const AGENT_REQUEST_TERMINAL_STATUSES = new Set<AgentRequestStatus>([
  "resolved_by_agent",
  "resolved_manual",
  "rejected_manual"
]);
const AGENT_REQUEST_RESOLVE_ALLOWED_STATUSES = new Set<AgentRequestStatus>([
  "in_progress",
  "blocked_agent",
  "resolved_by_agent",
  "resolved_manual",
  "rejected_manual"
]);
const AGENT_PROFILE_SOURCE_POLICIES = new Set<AgentProfileSourcePolicy>([
  "catalog_only",
  "catalog_plus_custom",
  "custom_only"
]);
const MCP_SERVER_TRANSPORTS = new Set<McpServerTransport>(["stdio", "http"]);
const MCP_SERVER_ORIGIN_TYPES = new Set<McpServerOriginType>(["built_in", "catalog", "custom"]);
const MCP_API_KEY_STATUSES = new Set<McpApiKeyStatus>(["active", "disabled", "revoked"]);
const MCP_API_KEY_PATCH_STATUSES = new Set<McpApiKeyStatus>(["active", "disabled"]);
const AGENT_PROFILE_SCRIPT_OSES = new Set<AgentProfileScriptOs>(["windows", "linux", "macos"]);
const AGENT_PROFILE_SCRIPT_TYPES = new Set<AgentProfileScriptType>(["instruction", "shell"]);
const ORCHESTRATOR_MCP_SERVER_NAME = "orchestrator-core";
const SCHEDULE_SCOPES = new Set<ScheduleScope>(["global", "project"]);
const SCHEDULE_OVERLAP_POLICIES = new Set<ScheduleOverlapPolicy>(["one_active_skip"]);
const SCHEDULE_MISFIRE_POLICIES = new Set<ScheduleMisfirePolicy>(["recompute_due_on_restart"]);
const DEFAULT_DELEGATION_TIMEOUT_RETRY_LIMIT = 3;
const DEFAULT_AUTH_SWITCH_RETRY_LIMIT = 3;
const DEFAULT_PROJECT_SUMMARY_WINDOW_HOURS = 24;
const MAX_PROJECT_SUMMARY_WINDOW_HOURS = 24 * 30;
const MAX_DELEGATION_PROMPT_LENGTH = 4_000;
const MAX_DELEGATION_EXECUTION_PROMPT_LENGTH = 12_000;
const MAX_DELEGATION_LOG_LENGTH = 12_000;
const MAX_MEMORY_CONTENT_LENGTH = 8_000;
const MAX_MEMORY_CONTEXT_ENTRIES = 6;
const MAX_AGENT_PROFILE_PROMPT_SCRIPT_LENGTH = 4_000;
const MAX_AGENT_PROFILE_PROMPT_MCP_SERVERS = 12;
const MAX_AGENT_PROFILE_SCRIPT_CONTENT_LENGTH = 20_000;
const MAX_MCP_KEY_ACL_TOOLS = 200;
const MAX_MCP_KEY_PROFILE_BINDINGS = 100;
const MAX_PROJECT_SECRET_VALUE_LENGTH = 32_000;
const MAX_PROJECT_SECRET_BINDINGS = 128;
const MAX_RUNTIME_SECRET_ENV_VARS = 64;
const PROJECT_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const PROJECT_SECRET_KEY_PATTERN = /^[A-Z][A-Z0-9_]{1,127}$/;
const DELEGATION_SANDBOX_POLICIES = new Set(["read-only", "workspace-write", "danger-full-access"]);
const DELEGATION_APPROVAL_POLICIES = new Set(["never", "on-request", "on-failure", "untrusted"]);
const TASK_AUTODISPATCH_SOURCE = "task_auto_dispatcher";
const TASK_AUTODISPATCH_PICKUP_STATUSES = new Set<TaskStatus>(["NEW", "QUEUED"]);
const TASK_AUTODISPATCH_RUNNING_STATUSES = new Set(["requested", "accepted", "running"]);
const TASK_AUTODISPATCH_WAITING_LIMIT_ERROR_CODES = new Set(["AUTH_PROFILE_REQUIRED"]);
const TASK_AUTODISPATCH_RESULT_SUCCESS_MARKER = "TASK_RESULT:SUCCESS";
const TASK_AUTODISPATCH_RESULT_FAILED_MARKER = "TASK_RESULT:FAILED";
const TASK_AUTODISPATCH_FAILURE_TEXT_PATTERNS = [
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
const COMPARISON_OPERATORS = new Set<ComparisonOperator>([
  "eq",
  "ne",
  "lt",
  "lte",
  "gt",
  "gte",
  "in",
  "contains"
]);

type ComparisonOperator = "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in" | "contains";

interface ScheduleEvaluationContext {
  nowUtc: Date;
  eventType: string | null;
  taskStatus: string | null;
  moduleEnabled: boolean | null;
  weeklyRemainingPct: number | null;
  fiveHourRemainingPct: number | null;
  resetEtaHours: number | null;
}

function createDefaultDelegationExecutor(): DelegationExecutor {
  return {
    async execute(input) {
      const targetId = input.target_template?.id ?? "unknown-profile";
      const summary = `Delegation completed by profile ${targetId}`;
      return {
        execution_mode: "mock",
        result_summary: summary,
        output_text: summary
      };
    }
  };
}

function isDelegationExecutionError(error: unknown): error is DelegationExecutionError {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as Partial<DelegationExecutionError>).code;
  return code === "TIMEOUT" || code === "AUTH_PROFILE_REQUIRED" || code === "EXECUTION_FAILED";
}

function delegationFailureReasonFromCode(
  code: DelegationExecutionError["code"],
  isTerminalAttempt: boolean
): string {
  if (code === "TIMEOUT") {
    return isTerminalAttempt ? "timeout_exhausted" : "timeout_attempt";
  }

  if (code === "AUTH_PROFILE_REQUIRED") {
    return "auth_profile_required";
  }

  return "execution_failed";
}

function sendError(reply: FastifyReply, statusCode: number, error: string, code: string): FastifyReply {
  return reply.code(statusCode).send({ error, code });
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function asProjectKey(value: unknown): string | null {
  const candidate = asNonEmptyString(value);
  if (!candidate) {
    return null;
  }

  const normalized = candidate.toLowerCase();
  if (!PROJECT_KEY_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

function asProjectSecretKey(value: unknown): string | null {
  const candidate = asNonEmptyString(value);
  if (!candidate) {
    return null;
  }

  const normalized = candidate.toUpperCase();
  if (!PROJECT_SECRET_KEY_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  return (error as { code?: unknown }).code === "P2002";
}

function parseBooleanLike(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }

  return null;
}

function parseOptionalIsoDate(value: unknown, fieldName: string): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }

  const candidate = asNonEmptyString(value);
  if (!candidate) {
    throw new Error(`${fieldName} must be a non-empty ISO datetime string or null`);
  }

  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO datetime string`);
  }

  return parsed;
}

function parseOptionalStringArray(
  value: unknown,
  fieldName: string,
  options?: { maxItems?: number }
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array of non-empty strings`);
  }
  if (options?.maxItems !== undefined && value.length > options.maxItems) {
    throw new Error(`${fieldName} must contain at most ${options.maxItems} items`);
  }

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const parsed = asNonEmptyString(item);
    if (!parsed) {
      throw new Error(`${fieldName} must contain only non-empty strings`);
    }
    if (!seen.has(parsed)) {
      seen.add(parsed);
      normalized.push(parsed);
    }
  }

  return normalized;
}

function generateMcpApiKeySecret(): {
  secret: string;
  key_prefix: string;
  key_hash: string;
} {
  const secret = `mcpk_${randomBytes(24).toString("hex")}`;
  return {
    secret,
    key_prefix: secret.slice(0, 16),
    key_hash: createHash("sha256").update(secret).digest("hex")
  };
}

async function writeMcpAuthAuditEventBestEffort(
  persistence: Persistence,
  input: {
    key_id?: string | null;
    event_type: string;
    actor: string;
    trace_id?: string | null;
    request_meta_json?: Record<string, unknown> | null;
  },
  logger?: Pick<FastifyRequest["log"], "error">
): Promise<void> {
  try {
    await persistence.createMcpAuthAuditEvent({
      key_id: input.key_id ?? null,
      event_type: input.event_type,
      actor: input.actor,
      trace_id: input.trace_id ?? null,
      request_meta_json: input.request_meta_json ?? null
    });
  } catch (error) {
    logger?.error({ err: error, event_type: input.event_type }, "Failed to write MCP auth audit event");
  }
}

async function writeSecretAuditEventBestEffort(
  persistence: Persistence,
  input: {
    secret_id?: string | null;
    project_id: string;
    event_type: string;
    actor: string;
    trace_id?: string | null;
    metadata_json?: Record<string, unknown> | null;
  },
  logger?: Pick<FastifyRequest["log"], "error">
): Promise<void> {
  try {
    await persistence.createSecretAuditEvent({
      secret_id: input.secret_id ?? null,
      project_id: input.project_id,
      event_type: input.event_type,
      actor: input.actor,
      trace_id: input.trace_id ?? null,
      metadata_json: input.metadata_json ?? null
    });
  } catch (error) {
    logger?.error({ err: error, event_type: input.event_type }, "Failed to write secret audit event");
  }
}

function getTraceId(request: FastifyRequest): string {
  const header = request.headers["x-trace-id"];
  if (Array.isArray(header) && header[0]) {
    return header[0];
  }
  if (typeof header === "string" && header.trim()) {
    return header;
  }

  return randomUUID();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "unknown_error";
}

function trimToLimit(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function extractDelegationPrompt(payload: Record<string, unknown>): string | null {
  const prompt = asNonEmptyString(payload["prompt"]) ?? asNonEmptyString(payload["task"]);
  if (!prompt) {
    return null;
  }

  return trimToLimit(prompt, MAX_DELEGATION_PROMPT_LENGTH);
}

function parseJsonObject(body: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(body) as unknown;
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function buildTaskAutoDispatchPrompt(task: TaskEntity): string {
  const lines = [
    "Выполни задачу оркестратора и верни короткий итог выполненной работы.",
    "В конце ответа добавь строку с маркером результата:",
    "- TASK_RESULT:SUCCESS (если задача реально выполнена по факту)",
    "- TASK_RESULT:FAILED (если выполнить задачу не удалось или выполнена частично)",
    `task_id: ${task.id}`,
    `project_id: ${task.project_id}`,
    `agent_profile_id: ${task.agent_profile_id}`,
    `priority: ${task.priority}`,
    "",
    `Title: ${task.title}`,
    `Description: ${task.description}`
  ];

  return trimToLimit(lines.join("\n"), MAX_DELEGATION_PROMPT_LENGTH);
}

function detectTaskAutoDispatchOutcome(
  resultSummary: string
): "success" | "failed" | "unknown" {
  const normalized = resultSummary.toUpperCase();
  if (normalized.includes(TASK_AUTODISPATCH_RESULT_FAILED_MARKER)) {
    return "failed";
  }
  if (normalized.includes(TASK_AUTODISPATCH_RESULT_SUCCESS_MARKER)) {
    return "success";
  }

  const lowered = resultSummary.toLowerCase();
  const hasFailurePattern = TASK_AUTODISPATCH_FAILURE_TEXT_PATTERNS.some((pattern) =>
    lowered.includes(pattern)
  );
  if (hasFailurePattern) {
    return "failed";
  }

  return "unknown";
}

function resolveTaskStatusAfterAutoDispatchFailure(
  dispatchBody: Record<string, unknown>
): TaskStatus {
  const executionMeta = dispatchBody["execution_meta_json"];
  if (!isPlainObject(executionMeta)) {
    return "FAILED_TERMINAL";
  }

  const code = asNonEmptyString(executionMeta["code"]);
  const reason = asNonEmptyString(executionMeta["reason"]);
  if (code && TASK_AUTODISPATCH_WAITING_LIMIT_ERROR_CODES.has(code)) {
    return "WAITING_LIMIT";
  }

  if (reason === "no_capability_target") {
    return "BLOCKED";
  }

  return "FAILED_TERMINAL";
}

function normalizeAgentRole(role: string): string {
  return role.trim().toLowerCase();
}

function memoryEntryToResponse(entry: AgentMemoryEntryEntity): Record<string, unknown> {
  return {
    id: entry.id,
    project_id: entry.project_id,
    agent_role: entry.agent_role,
    title: entry.title,
    content: entry.content,
    is_active: entry.is_active,
    created_by: entry.created_by,
    updated_by: entry.updated_by,
    created_at: entry.created_at,
    updated_at: entry.updated_at
  };
}

function buildMemoryAwarePrompt(options: {
  basePrompt: string | null;
  projectId: string;
  agentRole: string;
  memoryEntries: AgentMemoryEntryEntity[];
}): string {
  const basePrompt = options.basePrompt ?? "Выполни делегированную задачу и верни краткий итог.";
  if (options.memoryEntries.length === 0) {
    return trimToLimit(basePrompt, MAX_DELEGATION_EXECUTION_PROMPT_LENGTH);
  }

  const lines = options.memoryEntries.map((entry, index) => {
    const compactContent = trimToLimit(entry.content.replace(/\s+/g, " ").trim(), 500);
    return `${index + 1}. [${entry.title}] ${compactContent}`;
  });

  const enriched = [
    basePrompt,
    "",
    `Память проекта (${options.projectId}) для роли ${options.agentRole}:`,
    ...lines,
    "",
    "Используй память только если она релевантна задаче."
  ].join("\n");

  return trimToLimit(enriched, MAX_DELEGATION_EXECUTION_PROMPT_LENGTH);
}

function runtimeScriptOsFromPlatform(
  platform: NodeJS.Platform = process.platform
): AgentProfileScriptOs {
  if (platform === "win32") {
    return "windows";
  }
  if (platform === "darwin") {
    return "macos";
  }
  return "linux";
}

function isMcpServerAllowedForAgentProfile(
  profile: AgentProfileEntity,
  server: McpServerRegistryEntity
): boolean {
  if (server.name === ORCHESTRATOR_MCP_SERVER_NAME) {
    return true;
  }

  if (profile.source_policy === "catalog_only") {
    return server.origin_type === "built_in" || server.origin_type === "catalog";
  }

  if (profile.source_policy === "custom_only") {
    return server.origin_type === "custom";
  }

  return true;
}

function buildAgentProfileAwarePrompt(options: {
  basePrompt: string;
  profile: AgentProfileEntity | null;
  runtimeScript: AgentProfileScriptSetEntity | null;
  mcpServers: Array<{
    id: string;
    name: string;
    transport: McpServerTransport;
    origin_type: McpServerOriginType;
    is_required: boolean;
    priority: number;
  }>;
}): string {
  const basePrompt = options.basePrompt;
  if (!options.profile) {
    return trimToLimit(basePrompt, MAX_DELEGATION_EXECUTION_PROMPT_LENGTH);
  }

  const lines: string[] = [
    basePrompt,
    "",
    `Профиль агента: ${options.profile.name} (${options.profile.id})`,
    `Роль профиля: ${options.profile.role}`,
    `Source policy: ${options.profile.source_policy}`
  ];

  if (options.mcpServers.length > 0) {
    const serverLines = options.mcpServers
      .slice(0, MAX_AGENT_PROFILE_PROMPT_MCP_SERVERS)
      .map((server, index) => {
        const requiredTag = server.is_required ? "required" : "optional";
        return `${index + 1}. ${server.name} [${server.transport}/${server.origin_type}] p=${server.priority} ${requiredTag}`;
      });
    lines.push("", "Доступные MCP серверы профиля:", ...serverLines);
  }

  if (options.runtimeScript) {
    const compactContent = trimToLimit(
      options.runtimeScript.content.replace(/\s+/g, " ").trim(),
      MAX_AGENT_PROFILE_PROMPT_SCRIPT_LENGTH
    );
    lines.push(
      "",
      `Runtime script (${options.runtimeScript.os}, ${options.runtimeScript.script_type}, v${options.runtimeScript.version}):`,
      compactContent,
      "",
      "Следуй runtime script инструкциям, если они релевантны задаче."
    );
  }

  return trimToLimit(lines.join("\n"), MAX_DELEGATION_EXECUTION_PROMPT_LENGTH);
}

async function resolveRuntimeSecretEnvironment(options: {
  persistence: Persistence;
  projectId: string;
  agentRole: string;
  agentProfileId: string;
  secretsMasterKey: string;
}): Promise<{
  env: Record<string, string>;
  keys: string[];
}> {
  const projectSecrets = await options.persistence.listProjectSecrets(options.projectId, {
    include_inactive: false,
    limit: 200
  });

  const runtimeEnv: Record<string, string> = {};
  const resolvedKeys: string[] = [];

  for (const secret of projectSecrets) {
    const [profileBindings, roleBindings] = await Promise.all([
      options.persistence.listProjectSecretProfileBindings(secret.id),
      options.persistence.listProjectSecretRoleBindings(secret.id)
    ]);

    const hasBindings = profileBindings.length > 0 || roleBindings.length > 0;
    const profileMatched = profileBindings.some((binding) => binding.profile_id === options.agentProfileId);
    const roleMatched = roleBindings.some(
      (binding) => normalizeAgentRole(binding.role) === options.agentRole
    );
    if (hasBindings && !profileMatched && !roleMatched) {
      continue;
    }

    const decryptedValue = decryptProjectSecretValue(
      {
        ciphertext: secret.ciphertext,
        dek_encrypted: secret.dek_encrypted
      },
      options.secretsMasterKey
    );
    runtimeEnv[secret.key] = decryptedValue;
    resolvedKeys.push(secret.key);

    if (resolvedKeys.length >= MAX_RUNTIME_SECRET_ENV_VARS) {
      break;
    }
  }

  resolvedKeys.sort((a, b) => a.localeCompare(b));
  return { env: runtimeEnv, keys: resolvedKeys };
}

function buildRuntimeSecretRedactionValues(runtimeEnv: Record<string, string>): string[] {
  const unique = new Set<string>();
  for (const value of Object.values(runtimeEnv)) {
    if (typeof value !== "string" || value.length < 4) {
      continue;
    }
    unique.add(value);
  }

  return Array.from(unique).sort((left, right) => {
    if (left.length === right.length) {
      return left.localeCompare(right);
    }
    return right.length - left.length;
  });
}

function redactSecretsInText(value: string, redactionValues: string[]): string {
  if (!value || redactionValues.length === 0) {
    return value;
  }

  let redacted = value;
  for (const secret of redactionValues) {
    if (!secret || !redacted.includes(secret)) {
      continue;
    }
    redacted = redacted.split(secret).join("[REDACTED_SECRET]");
  }

  return redacted;
}

function redactSecretsInUnknown(value: unknown, redactionValues: string[]): unknown {
  if (typeof value === "string") {
    return redactSecretsInText(value, redactionValues);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSecretsInUnknown(item, redactionValues));
  }
  if (isPlainObject(value)) {
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      next[key] = redactSecretsInUnknown(item, redactionValues);
    }
    return next;
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function detectLegacyFields(body: unknown, legacyFields: readonly string[]): string[] {
  if (!isPlainObject(body)) {
    return [];
  }

  return legacyFields.filter((field) => Object.prototype.hasOwnProperty.call(body, field));
}

function isAuthContextType(value: string): value is AuthContextType {
  return AUTH_CONTEXT_TYPES.has(value as AuthContextType);
}

function isAgentRequestType(value: string): value is AgentRequestType {
  return AGENT_REQUEST_TYPES.has(value as AgentRequestType);
}

function isAgentRequestStatus(value: string): value is AgentRequestStatus {
  return AGENT_REQUEST_STATUSES.has(value as AgentRequestStatus);
}

function isAgentProfileSourcePolicy(value: string): value is AgentProfileSourcePolicy {
  return AGENT_PROFILE_SOURCE_POLICIES.has(value as AgentProfileSourcePolicy);
}

function isMcpServerTransport(value: string): value is McpServerTransport {
  return MCP_SERVER_TRANSPORTS.has(value as McpServerTransport);
}

function isMcpServerOriginType(value: string): value is McpServerOriginType {
  return MCP_SERVER_ORIGIN_TYPES.has(value as McpServerOriginType);
}

function isMcpApiKeyStatus(value: string): value is McpApiKeyStatus {
  return MCP_API_KEY_STATUSES.has(value as McpApiKeyStatus);
}

function isAgentProfileScriptOs(value: string): value is AgentProfileScriptOs {
  return AGENT_PROFILE_SCRIPT_OSES.has(value as AgentProfileScriptOs);
}

function isAgentProfileScriptType(value: string): value is AgentProfileScriptType {
  return AGENT_PROFILE_SCRIPT_TYPES.has(value as AgentProfileScriptType);
}

function isScheduleScope(value: string): value is ScheduleScope {
  return SCHEDULE_SCOPES.has(value as ScheduleScope);
}

function isScheduleOverlapPolicy(value: string): value is ScheduleOverlapPolicy {
  return SCHEDULE_OVERLAP_POLICIES.has(value as ScheduleOverlapPolicy);
}

function isScheduleMisfirePolicy(value: string): value is ScheduleMisfirePolicy {
  return SCHEDULE_MISFIRE_POLICIES.has(value as ScheduleMisfirePolicy);
}

function isDelegationSandboxPolicy(
  value: string
): value is "read-only" | "workspace-write" | "danger-full-access" {
  return DELEGATION_SANDBOX_POLICIES.has(value);
}

function isDelegationApprovalPolicy(
  value: string
): value is "never" | "on-request" | "on-failure" | "untrusted" {
  return DELEGATION_APPROVAL_POLICIES.has(value);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withRetry<T>(options: {
  operationName: string;
  maxAttempts: number;
  initialDelayMs: number;
  fn: () => Promise<T>;
  onRetry: (ctx: {
    operationName: string;
    attempt: number;
    error: unknown;
    nextDelayMs: number;
  }) => void | Promise<void>;
}): Promise<T> {
  const { operationName, maxAttempts, initialDelayMs, fn, onRetry } = options;

  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error;
      }

      const nextDelayMs = initialDelayMs * 2 ** (attempt - 1);
      await onRetry({ operationName, attempt, error, nextDelayMs });
      await sleep(nextDelayMs);
    }
  }

  throw new Error(`${operationName} failed after ${maxAttempts} attempts`);
}

async function publishEventBestEffort(options: {
  app: FastifyInstance;
  publisher: EventPublisher;
  event: EventPublishInput;
  logMessage: string;
  logContext?: Record<string, unknown>;
}): Promise<void> {
  try {
    await options.publisher.publish(options.event);
  } catch (error) {
    options.app.log.error(
      {
        err: error,
        event_type: options.event.eventType,
        trace_id: options.event.traceId,
        ...(options.logContext ?? {})
      },
      options.logMessage
    );
  }
}

interface TaskStatusTransition {
  task_id: string;
  status_before: TaskStatus;
  status_after: TaskStatus;
}

async function holdNewAndQueuedTasksForAuthSwitch(
  persistence: Persistence
): Promise<TaskStatusTransition[]> {
  const tasks = await persistence.listTasks();
  const candidates = tasks.filter((task) => task.status === "NEW" || task.status === "QUEUED");

  const transitions: TaskStatusTransition[] = [];
  for (const task of candidates) {
    const statusBefore = task.status;
    const updated = await persistence.updateTaskStatus(task.id, "WAITING_LIMIT");
    if (!updated) {
      continue;
    }

    transitions.push({
      task_id: task.id,
      status_before: statusBefore,
      status_after: "WAITING_LIMIT"
    });
  }

  return transitions;
}

async function releaseHeldTasksForAuthSwitch(
  persistence: Persistence
): Promise<TaskStatusTransition[]> {
  const heldTasks = await persistence.listHeldTasks();
  await persistence.releaseHeldQueue();

  return heldTasks.map((task) => ({
    task_id: task.id,
    status_before: "WAITING_LIMIT",
    status_after: "QUEUED"
  }));
}

async function publishTaskAuthSwitchingEvents(options: {
  app: FastifyInstance;
  publisher: EventPublisher;
  traceId: string;
  transitions: TaskStatusTransition[];
  reason: string;
}): Promise<void> {
  for (const transition of options.transitions) {
    await publishEventBestEffort({
      app: options.app,
      publisher: options.publisher,
      event: {
        eventType: "task.auth_switching",
        traceId: options.traceId,
        taskId: transition.task_id,
        idempotencyKey: `${transition.task_id}:${transition.status_before}:${transition.status_after}:${options.traceId}`,
        payload: {
          task_id: transition.task_id,
          status_before: transition.status_before,
          status_after: transition.status_after,
          reason: options.reason
        }
      },
      logMessage: "Failed to publish task.auth_switching",
      logContext: {
        task_id: transition.task_id,
        status_before: transition.status_before,
        status_after: transition.status_after
      }
    });
  }
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function asNonNegativeInteger(value: unknown): number | null {
  const parsed = asFiniteNumber(value);
  if (parsed === null || !Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseScheduleEvaluationContext(
  dryRunContext: Record<string, unknown>
): { context: ScheduleEvaluationContext; warnings: string[] } {
  const warnings: string[] = [];

  let nowUtc = new Date();
  const rawNowUtc = asNonEmptyString(dryRunContext["now_utc"]);
  if (rawNowUtc) {
    const parsed = new Date(rawNowUtc);
    if (Number.isNaN(parsed.getTime())) {
      warnings.push("dry_run_context.now_utc_invalid_fallback_to_current_time");
    } else {
      nowUtc = parsed;
    }
  }

  return {
    context: {
      nowUtc,
      eventType: asNonEmptyString(dryRunContext["event_type"]),
      taskStatus: asNonEmptyString(dryRunContext["task_status"]),
      moduleEnabled:
        typeof dryRunContext["module_enabled"] === "boolean"
          ? dryRunContext["module_enabled"]
          : null,
      weeklyRemainingPct: asFiniteNumber(dryRunContext["weekly_remaining_pct"]),
      fiveHourRemainingPct: asFiniteNumber(dryRunContext["five_hour_remaining_pct"]),
      resetEtaHours: asFiniteNumber(dryRunContext["reset_eta_hours"])
    },
    warnings
  };
}

function defaultOperatorForPredicate(predicate: string): ComparisonOperator {
  switch (predicate) {
    case "limit.weekly_remaining_lt":
    case "limit.five_hour_remaining_lt":
    case "limit.reset_eta_hours_lt":
      return "lt";
    case "limit.weekly_remaining_gt":
      return "gt";
    default:
      return "eq";
  }
}

function parseComparisonOperator(
  operator: unknown,
  fallback: ComparisonOperator
): ComparisonOperator {
  const value = asNonEmptyString(operator);
  if (!value) {
    return fallback;
  }

  return COMPARISON_OPERATORS.has(value as ComparisonOperator)
    ? (value as ComparisonOperator)
    : fallback;
}

function areValuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }

  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) {
    return false;
  }

  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function compareValues(actual: unknown, expected: unknown, operator: ComparisonOperator): boolean {
  switch (operator) {
    case "eq":
      return areValuesEqual(actual, expected);
    case "ne":
      return !areValuesEqual(actual, expected);
    case "lt":
    case "lte":
    case "gt":
    case "gte": {
      const actualNumber = asFiniteNumber(actual);
      const expectedNumber = asFiniteNumber(expected);
      if (actualNumber === null || expectedNumber === null) {
        return false;
      }

      if (operator === "lt") {
        return actualNumber < expectedNumber;
      }

      if (operator === "lte") {
        return actualNumber <= expectedNumber;
      }

      if (operator === "gt") {
        return actualNumber > expectedNumber;
      }

      return actualNumber >= expectedNumber;
    }
    case "in":
      return Array.isArray(expected) && expected.some((item) => areValuesEqual(actual, item));
    case "contains":
      if (typeof actual === "string" && typeof expected === "string") {
        return actual.includes(expected);
      }

      if (Array.isArray(actual)) {
        return actual.some((item) => areValuesEqual(item, expected));
      }

      return false;
    default:
      return false;
  }
}

function parseCronValue(
  rawValue: string,
  min: number,
  max: number,
  allowSevenAsZero: boolean
): number | null {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed)) {
    return null;
  }

  if (allowSevenAsZero && parsed === 7) {
    return 0;
  }

  if (parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

function expandCronToken(
  rawToken: string,
  min: number,
  max: number,
  allowSevenAsZero: boolean
): number[] | null {
  let token = rawToken.trim();
  if (!token) {
    return null;
  }

  let step = 1;
  if (token.includes("/")) {
    const [base, rawStep, ...rest] = token.split("/");
    if (rest.length > 0 || !base || !rawStep) {
      return null;
    }

    const parsedStep = Number(rawStep);
    if (!Number.isInteger(parsedStep) || parsedStep <= 0) {
      return null;
    }

    step = parsedStep;
    token = base;
  }

  let rangeStart = min;
  let rangeEnd = max;

  if (token !== "*") {
    if (token.includes("-")) {
      const [rawStart, rawEnd, ...rest] = token.split("-");
      if (rest.length > 0 || !rawStart || !rawEnd) {
        return null;
      }

      const parsedStart = parseCronValue(rawStart, min, max, allowSevenAsZero);
      const parsedEnd = parseCronValue(rawEnd, min, max, allowSevenAsZero);
      if (parsedStart === null || parsedEnd === null || parsedStart > parsedEnd) {
        return null;
      }

      rangeStart = parsedStart;
      rangeEnd = parsedEnd;
    } else {
      const parsedValue = parseCronValue(token, min, max, allowSevenAsZero);
      if (parsedValue === null) {
        return null;
      }

      rangeStart = parsedValue;
      rangeEnd = parsedValue;
    }
  }

  const values: number[] = [];
  for (let value = rangeStart; value <= rangeEnd; value += step) {
    values.push(allowSevenAsZero && value === 7 ? 0 : value);
  }

  return values;
}

function expandCronField(
  rawField: string,
  min: number,
  max: number,
  allowSevenAsZero = false
): Set<number> | null {
  const tokens = rawField.split(",");
  if (tokens.length === 0) {
    return null;
  }

  const expanded = new Set<number>();
  for (const token of tokens) {
    const values = expandCronToken(token, min, max, allowSevenAsZero);
    if (!values) {
      return null;
    }

    for (const value of values) {
      expanded.add(value);
    }
  }

  return expanded;
}

function matchesCronExpressionUtc(expression: string, nowUtc: Date): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }

  const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] = parts;
  if (!minuteField || !hourField || !dayOfMonthField || !monthField || !dayOfWeekField) {
    return false;
  }

  const minute = expandCronField(minuteField, 0, 59);
  const hour = expandCronField(hourField, 0, 23);
  const dayOfMonth = expandCronField(dayOfMonthField, 1, 31);
  const month = expandCronField(monthField, 1, 12);
  const dayOfWeek = expandCronField(dayOfWeekField, 0, 7, true);

  if (!minute || !hour || !dayOfMonth || !month || !dayOfWeek) {
    return false;
  }

  return (
    minute.has(nowUtc.getUTCMinutes()) &&
    hour.has(nowUtc.getUTCHours()) &&
    dayOfMonth.has(nowUtc.getUTCDate()) &&
    month.has(nowUtc.getUTCMonth() + 1) &&
    dayOfWeek.has(nowUtc.getUTCDay())
  );
}

function evaluateScheduleRuleAst(
  node: unknown,
  context: ScheduleEvaluationContext,
  path = "rule_ast"
): { matched: boolean; reasons: string[] } {
  if (!isPlainObject(node)) {
    return {
      matched: false,
      reasons: [`${path}:invalid_node`]
    };
  }

  if (Array.isArray(node["all"])) {
    const all = node["all"];
    if (all.length === 0) {
      return {
        matched: false,
        reasons: [`${path}.all:empty`]
      };
    }

    const reasons: string[] = [];
    let matched = true;
    all.forEach((child, index) => {
      const childResult = evaluateScheduleRuleAst(child, context, `${path}.all[${index}]`);
      matched = matched && childResult.matched;
      reasons.push(...childResult.reasons);
    });

    reasons.push(`${path}.all:${matched ? "matched" : "not_matched"}`);
    return { matched, reasons };
  }

  if (Array.isArray(node["any"])) {
    const any = node["any"];
    if (any.length === 0) {
      return {
        matched: false,
        reasons: [`${path}.any:empty`]
      };
    }

    const reasons: string[] = [];
    let matched = false;
    any.forEach((child, index) => {
      const childResult = evaluateScheduleRuleAst(child, context, `${path}.any[${index}]`);
      matched = matched || childResult.matched;
      reasons.push(...childResult.reasons);
    });

    reasons.push(`${path}.any:${matched ? "matched" : "not_matched"}`);
    return { matched, reasons };
  }

  if (node["not"] !== undefined) {
    const childResult = evaluateScheduleRuleAst(node["not"], context, `${path}.not`);
    const matched = !childResult.matched;
    return {
      matched,
      reasons: [...childResult.reasons, `${path}.not:${matched ? "matched" : "not_matched"}`]
    };
  }

  if (Array.isArray(node["conditions"])) {
    const conditions = node["conditions"];
    if (conditions.length === 0) {
      return {
        matched: false,
        reasons: [`${path}.conditions:empty`]
      };
    }

    const reasons: string[] = [];
    let matched = true;
    conditions.forEach((child, index) => {
      const childResult = evaluateScheduleRuleAst(child, context, `${path}.conditions[${index}]`);
      matched = matched && childResult.matched;
      reasons.push(...childResult.reasons);
    });

    reasons.push(`${path}.conditions:${matched ? "matched" : "not_matched"}`);
    return { matched, reasons };
  }

  const predicate = asNonEmptyString(node["predicate"]);
  if (!predicate) {
    return {
      matched: false,
      reasons: [`${path}:unsupported_node`]
    };
  }

  const expectedValue = node["value"];
  if (expectedValue === undefined) {
    return {
      matched: false,
      reasons: [`${path}.${predicate}:value_required`]
    };
  }

  const operator = parseComparisonOperator(
    node["operator"],
    defaultOperatorForPredicate(predicate)
  );

  if (predicate === "time.cron") {
    const expression = asNonEmptyString(expectedValue);
    if (!expression) {
      return {
        matched: false,
        reasons: [`${path}.time.cron:invalid_expression`]
      };
    }

    const matched = matchesCronExpressionUtc(expression, context.nowUtc);
    return {
      matched,
      reasons: [
        `${path}.time.cron:${matched ? "matched" : "not_matched"}:${context.nowUtc.toISOString()}`
      ]
    };
  }

  const compareWithContext = (actual: unknown, reasonPrefix: string): { matched: boolean; reasons: string[] } => {
    const matched = compareValues(actual, expectedValue, operator);
    return {
      matched,
      reasons: [`${reasonPrefix}:${matched ? "matched" : "not_matched"}`]
    };
  };

  switch (predicate) {
    case "event.type":
      return compareWithContext(context.eventType, `${path}.event.type`);
    case "state.task_status":
      return compareWithContext(context.taskStatus, `${path}.state.task_status`);
    case "state.module_enabled":
      return compareWithContext(context.moduleEnabled, `${path}.state.module_enabled`);
    case "limit.weekly_remaining_lt":
    case "limit.weekly_remaining_gt":
      if (context.weeklyRemainingPct === null) {
        return {
          matched: false,
          reasons: [`${path}.${predicate}:context_missing_weekly_remaining_pct`]
        };
      }
      return compareWithContext(context.weeklyRemainingPct, `${path}.${predicate}`);
    case "limit.five_hour_remaining_lt":
      if (context.fiveHourRemainingPct === null) {
        return {
          matched: false,
          reasons: [`${path}.${predicate}:context_missing_five_hour_remaining_pct`]
        };
      }
      return compareWithContext(context.fiveHourRemainingPct, `${path}.${predicate}`);
    case "limit.reset_eta_hours_lt":
      if (context.resetEtaHours === null) {
        return {
          matched: false,
          reasons: [`${path}.${predicate}:context_missing_reset_eta_hours`]
        };
      }
      return compareWithContext(context.resetEtaHours, `${path}.${predicate}`);
    default:
      return {
        matched: false,
        reasons: [`${path}.${predicate}:unsupported_predicate`]
      };
  }
}

async function runScheduleRecoveryOnStartup(deps: {
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

function projectToResponse(project: ProjectEntity): Record<string, unknown> {
  return {
    id: project.id,
    key: project.key,
    name: project.name,
    description: project.description,
    github_url: project.github_url,
    workspace_path: project.workspace_path,
    meta_json: project.meta_json,
    is_active: project.is_active,
    created_at: project.created_at,
    updated_at: project.updated_at
  };
}

function projectSummaryToResponse(summary: ProjectSummaryEntity): Record<string, unknown> {
  return {
    project: projectToResponse(summary.project),
    tasks_total: summary.tasks_total,
    tasks_by_status: summary.tasks_by_status,
    active_memory_entries: summary.active_memory_entries,
    switch_events_recent: summary.switch_events_recent,
    switch_events_window_hours: summary.switch_events_window_hours,
    last_switch_event_at: summary.last_switch_event_at
  };
}

function projectSecretToResponse(secret: ProjectSecretEntity): Record<string, unknown> {
  return {
    id: secret.id,
    project_id: secret.project_id,
    key: secret.key,
    description: secret.description,
    masked_preview: secret.masked_preview,
    is_active: secret.is_active,
    algo: secret.algo,
    version: secret.version,
    created_by: secret.created_by,
    updated_by: secret.updated_by,
    created_at: secret.created_at,
    updated_at: secret.updated_at,
    rotated_at: secret.rotated_at,
    revoked_at: secret.revoked_at
  };
}

function projectSecretTemplateBindingToResponse(
  binding: ProjectSecretTemplateBindingEntity
): Record<string, unknown> {
  return {
    id: binding.id,
    secret_id: binding.secret_id,
    template_id: binding.template_id,
    created_by: binding.created_by,
    created_at: binding.created_at
  };
}

function projectSecretRoleBindingToResponse(
  binding: ProjectSecretRoleBindingEntity
): Record<string, unknown> {
  return {
    id: binding.id,
    secret_id: binding.secret_id,
    role: binding.role,
    created_by: binding.created_by,
    created_at: binding.created_at
  };
}

async function buildProjectSecretResponse(
  persistence: Persistence,
  secret: ProjectSecretEntity
): Promise<Record<string, unknown>> {
  const [templateBindings, roleBindings] = await Promise.all([
    persistence.listProjectSecretTemplateBindings(secret.id),
    persistence.listProjectSecretRoleBindings(secret.id)
  ]);

  return {
    ...projectSecretToResponse(secret),
    template_bindings: templateBindings.map((item) =>
      projectSecretTemplateBindingToResponse(item)
    ),
    role_bindings: roleBindings.map((item) => projectSecretRoleBindingToResponse(item))
  };
}

function taskToResponse(task: TaskEntity): Record<string, unknown> {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    project_id: task.project_id,
    agent_profile_id: task.agent_profile_id,
    cancel_reason: task.cancel_reason,
    cancelled_at: task.cancelled_at,
    created_at: task.created_at,
    updated_at: task.updated_at
  };
}

function workerToResponse(worker: WorkerEntity): Record<string, unknown> {
  return {
    id: worker.id,
    status: worker.status,
    runtime_mode: worker.runtime_mode,
    current_task_id: worker.current_task_id
  };
}

function authContextToResponse(authContext: AuthContextEntity): Record<string, unknown> {
  return {
    id: authContext.id,
    label: authContext.label,
    type: authContext.type,
    is_enabled: authContext.is_enabled
  };
}

function artifactToResponse(artifact: ArtifactEntity): Record<string, unknown> {
  return {
    id: artifact.id,
    task_id: artifact.task_id,
    type: artifact.type,
    path: artifact.path
  };
}

function agentTemplateToResponse(template: AgentTemplateEntity): Record<string, unknown> {
  return {
    id: template.id,
    name: template.name,
    role: template.role,
    model: template.model,
    auth_context_id: template.auth_context_id,
    pack_registry_entry_id: template.pack_registry_entry_id,
    sandbox_policy: template.sandbox_policy,
    approval_policy: template.approval_policy,
    is_enabled: template.is_enabled
  };
}

function packToResponse(pack: PackRegistryEntity): Record<string, unknown> {
  return {
    id: pack.id,
    pack_id: pack.pack_id,
    role: pack.role,
    capabilities_json: pack.capabilities_json,
    source_type: pack.source_type,
    source_ref: pack.source_ref,
    pinned_version: pack.pinned_version,
    manifest_json: pack.manifest_json,
    materialize_status: pack.materialize_status,
    cached_path: pack.cached_path,
    is_enabled: pack.is_enabled,
    registered_by: pack.registered_by,
    created_at: pack.created_at,
    updated_at: pack.updated_at
  };
}

function delegationToResponse(delegation: DelegationRequestEntity): Record<string, unknown> {
  return {
    id: delegation.id,
    requester_task_id: delegation.requester_task_id,
    requester_task_run_id: delegation.requester_task_run_id,
    capability: delegation.capability,
    target_selector: delegation.target_selector,
    payload: delegation.payload,
    priority: delegation.priority,
    status: delegation.status,
    target_agent_profile_id: delegation.target_agent_profile_id,
    target_worker_instance_id: delegation.target_worker_instance_id,
    result_summary: delegation.result_summary,
    input_prompt: delegation.input_prompt,
    selected_auth_profile_id: delegation.selected_auth_profile_id,
    execution_mode: delegation.execution_mode,
    execution_log: delegation.execution_log,
    execution_meta_json: delegation.execution_meta_json,
    trace_id: delegation.trace_id,
    created_at: delegation.created_at,
    started_at: delegation.started_at,
    ended_at: delegation.ended_at
  };
}

function agentRequestToResponse(agentRequest: AgentRequestEntity): Record<string, unknown> {
  return {
    id: agentRequest.id,
    type: agentRequest.type,
    status: agentRequest.status,
    priority: agentRequest.priority,
    project_id: agentRequest.project_id,
    task_id: agentRequest.task_id,
    agent_run_id: agentRequest.agent_run_id,
    agent_profile_id: agentRequest.agent_profile_id,
    requested_by_agent_id: agentRequest.requested_by_agent_id,
    title: agentRequest.title,
    reason: agentRequest.reason,
    request_payload: agentRequest.request_payload_json,
    resolution_payload: agentRequest.resolution_payload_json,
    claimed_by_governor_id: agentRequest.claimed_by_governor_id,
    resolved_by: agentRequest.resolved_by,
    resolved_at: agentRequest.resolved_at,
    created_by: agentRequest.created_by,
    created_at: agentRequest.created_at,
    updated_at: agentRequest.updated_at
  };
}

function agentRequestAuditEventToResponse(
  event: AgentRequestAuditEventEntity
): Record<string, unknown> {
  return {
    id: event.id,
    request_id: event.request_id,
    event_type: event.event_type,
    from_status: event.from_status,
    to_status: event.to_status,
    actor_type: event.actor_type,
    actor_id: event.actor_id,
    trace_id: event.trace_id,
    metadata_json: event.metadata_json,
    created_at: event.created_at
  };
}

function getAgentRequestStatusEventType(status: AgentRequestStatus): string {
  if (status === "in_progress") {
    return "request_claimed";
  }
  if (status === "blocked_agent") {
    return "request_blocked_agent";
  }
  if (status === "resolved_by_agent") {
    return "request_resolved_by_agent";
  }
  if (status === "resolved_manual") {
    return "request_resolved_manual";
  }
  if (status === "rejected_manual") {
    return "request_rejected_manual";
  }

  return "request_status_updated";
}

function agentProfileToResponse(profile: AgentProfileEntity): Record<string, unknown> {
  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    description: profile.description,
    source_policy: profile.source_policy,
    is_enabled: profile.is_enabled,
    created_at: profile.created_at,
    updated_at: profile.updated_at
  };
}

function mcpServerRegistryToResponse(server: McpServerRegistryEntity): Record<string, unknown> {
  return {
    id: server.id,
    name: server.name,
    transport: server.transport,
    endpoint_or_command: server.endpoint_or_command,
    origin_type: server.origin_type,
    is_approved: server.is_approved,
    meta_json: server.meta_json,
    created_at: server.created_at,
    updated_at: server.updated_at
  };
}

function agentProfileMcpBindingToResponse(
  binding: AgentProfileMcpServerBindingEntity,
  server?: McpServerRegistryEntity | null
): Record<string, unknown> {
  return {
    id: binding.id,
    agent_profile_id: binding.agent_profile_id,
    mcp_server_id: binding.mcp_server_id,
    is_required: binding.is_required,
    priority: binding.priority,
    config_json: binding.config_json,
    created_at: binding.created_at,
    updated_at: binding.updated_at,
    mcp_server: server ? mcpServerRegistryToResponse(server) : null
  };
}

function agentProfileScriptSetToResponse(scriptSet: AgentProfileScriptSetEntity): Record<string, unknown> {
  return {
    id: scriptSet.id,
    agent_profile_id: scriptSet.agent_profile_id,
    os: scriptSet.os,
    script_type: scriptSet.script_type,
    content: scriptSet.content,
    version: scriptSet.version,
    created_at: scriptSet.created_at,
    updated_at: scriptSet.updated_at
  };
}

function mcpApiKeyToResponse(key: McpApiKeyEntity): Record<string, unknown> {
  return {
    id: key.id,
    name: key.name,
    key_prefix: key.key_prefix,
    status: key.status,
    expires_at: key.expires_at,
    last_used_at: key.last_used_at,
    rotated_at: key.rotated_at,
    revoked_at: key.revoked_at,
    created_by: key.created_by,
    updated_by: key.updated_by,
    meta_json: key.meta_json,
    created_at: key.created_at,
    updated_at: key.updated_at
  };
}

function mcpKeyAclRuleToResponse(rule: McpKeyAclRuleEntity): Record<string, unknown> {
  return {
    id: rule.id,
    key_id: rule.key_id,
    tool_name: rule.tool_name,
    effect: rule.effect,
    created_by: rule.created_by,
    created_at: rule.created_at
  };
}

function mcpKeyProfileBindingToResponse(binding: McpKeyProfileBindingEntity): Record<string, unknown> {
  return {
    id: binding.id,
    key_id: binding.key_id,
    agent_profile_id: binding.agent_profile_id,
    created_by: binding.created_by,
    created_at: binding.created_at
  };
}

function mcpKeyTemplateConstraintToResponse(
  constraint: McpKeyTemplateConstraintEntity
): Record<string, unknown> {
  return {
    id: constraint.id,
    key_id: constraint.key_id,
    agent_template_id: constraint.agent_template_id,
    created_by: constraint.created_by,
    created_at: constraint.created_at
  };
}

async function buildMcpApiKeyResponse(
  persistence: Persistence,
  key: McpApiKeyEntity
): Promise<Record<string, unknown>> {
  const [aclRules, profileBindings, templateConstraints] = await Promise.all([
    persistence.listMcpKeyAclRules(key.id),
    persistence.listMcpKeyProfileBindings(key.id),
    persistence.listMcpKeyTemplateConstraints(key.id)
  ]);

  return {
    ...mcpApiKeyToResponse(key),
    acl_rules: aclRules.map((item) => mcpKeyAclRuleToResponse(item)),
    profile_bindings: profileBindings.map((item) => mcpKeyProfileBindingToResponse(item)),
    template_constraints: templateConstraints.map((item) =>
      mcpKeyTemplateConstraintToResponse(item)
    )
  };
}

async function buildDelegationCardsResponse(options: {
  persistence: Persistence;
  limit: number;
}): Promise<{
  preparing: Record<string, unknown>[];
  running: Record<string, unknown>[];
  recent: Record<string, unknown>[];
}> {
  const [delegations, agentProfiles, fallbackActiveProfile] = await Promise.all([
    options.persistence.listDelegationRequests({ limit: options.limit }),
    options.persistence.listAgentProfiles({ include_disabled: true, limit: 500 }),
    options.persistence.getActiveAuthProfile()
  ]);

  const agentProfileMap = new Map(agentProfiles.map((profile) => [profile.id, profile]));

  const profileIds = new Set<string>();
  for (const delegation of delegations) {
    const profileId = delegation.selected_auth_profile_id;
    if (profileId) {
      profileIds.add(profileId);
    }
  }

  const profileMap = new Map<
    string,
    Awaited<ReturnType<Persistence["getAuthProfileRuntimeById"]>>
  >();
  await Promise.all(
    Array.from(profileIds).map(async (profileId) => {
      const profile = await options.persistence.getAuthProfileRuntimeById(profileId);
      if (profile) {
        profileMap.set(profileId, profile);
      }
    })
  );

  const toCard = (delegation: DelegationRequestEntity): Record<string, unknown> => {
    const targetProfile = delegation.target_agent_profile_id
      ? agentProfileMap.get(delegation.target_agent_profile_id) ?? null
      : null;

    const selectedProfileId = delegation.selected_auth_profile_id;
    const selectedProfile = selectedProfileId ? profileMap.get(selectedProfileId) ?? null : null;
    const fallbackProfile =
      !selectedProfile && fallbackActiveProfile
        ? {
            id: fallbackActiveProfile.id,
            label: fallbackActiveProfile.label,
            status: fallbackActiveProfile.status
          }
        : null;
    const account = selectedProfile ?? fallbackProfile;

    const prompt = delegation.input_prompt ?? extractDelegationPrompt(delegation.payload);
    const rawLog = delegation.execution_log ?? delegation.result_summary ?? null;
    const logPreview = rawLog ? trimToLimit(rawLog, MAX_DELEGATION_LOG_LENGTH) : null;

    return {
      id: delegation.id,
      status: delegation.status,
      capability: delegation.capability,
      prompt,
      trace_id: delegation.trace_id,
      created_at: delegation.created_at,
      started_at: delegation.started_at,
      ended_at: delegation.ended_at,
      target_profile: targetProfile
        ? {
            id: targetProfile.id,
            name: targetProfile.name,
            role: targetProfile.role,
            model: targetProfile.model
          }
        : null,
      target_template: targetProfile
        ? {
            id: targetProfile.id,
            name: targetProfile.name,
            role: targetProfile.role,
            model: targetProfile.model
          }
        : null,
      account: account
        ? {
            id: account.id,
            label: account.label,
            status: account.status
          }
        : null,
      execution_mode: delegation.execution_mode,
      log_preview: logPreview
    };
  };

  const preparingStatuses: DelegationRequestEntity["status"][] = ["requested", "accepted"];
  const runningStatuses: DelegationRequestEntity["status"][] = ["running"];
  const recentStatuses: DelegationRequestEntity["status"][] = ["completed", "failed", "cancelled"];

  return {
    preparing: delegations
      .filter((delegation) => preparingStatuses.includes(delegation.status))
      .map((delegation) => toCard(delegation)),
    running: delegations
      .filter((delegation) => runningStatuses.includes(delegation.status))
      .map((delegation) => toCard(delegation)),
    recent: delegations
      .filter((delegation) => recentStatuses.includes(delegation.status))
      .slice(0, 20)
      .map((delegation) => toCard(delegation))
  };
}

function scheduledRuleToResponse(rule: ScheduledRuleEntity): Record<string, unknown> {
  return {
    id: rule.id,
    name: rule.name,
    scope: rule.scope,
    project_id: rule.project_id,
    is_enabled: rule.is_enabled,
    rule_ast: rule.rule_ast,
    task_agent_profile_id: rule.task_agent_profile_id,
    task_title: rule.task_title,
    task_description: rule.task_description,
    task_priority: rule.task_priority,
    overlap_policy: rule.overlap_policy,
    misfire_policy: rule.misfire_policy,
    created_by: rule.created_by,
    created_at: rule.created_at,
    updated_at: rule.updated_at
  };
}

function scheduledRunToResponse(run: ScheduledRunEntity): Record<string, unknown> {
  return {
    id: run.id,
    rule_id: run.rule_id,
    created_task_id: run.created_task_id,
    status: run.status,
    started_at: run.started_at,
    ended_at: run.ended_at,
    skip_reason: run.skip_reason,
    trace_id: run.trace_id,
    idempotency_key: run.idempotency_key,
    result_json: run.result_json
  };
}

function moduleExecutionToResponse(execution: ModuleExecutionEntity): Record<string, unknown> {
  return {
    id: execution.id,
    module_key: execution.module_key,
    event_type: execution.event_type,
    status: execution.status,
    started_at: execution.started_at,
    ended_at: execution.ended_at
  };
}

function toAuthProfileDisplayId(label: string, id: string): string {
  const normalizedLabel = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  const base = (normalizedLabel || "profile").slice(0, 40);
  const compactId = id.toLowerCase().replace(/[^a-z0-9]/g, "");
  const suffix = compactId.slice(-5).padStart(5, "0");
  return `${base}-${suffix}`;
}

function authProfileToResponse(profile: AuthProfileEntity): Record<string, unknown> {
  return {
    id: profile.id,
    display_id: toAuthProfileDisplayId(profile.label, profile.id),
    label: profile.label,
    status: profile.status,
    checksum: profile.checksum,
    created_at: profile.created_at
  };
}

function extractMultipartFieldValue(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return extractMultipartFieldValue(value[0]);
  }

  if (typeof value === "object" && value !== null && "value" in value) {
    const fieldValue = (value as { value?: unknown }).value;
    return asNonEmptyString(fieldValue);
  }

  return null;
}

function buildSwitchModuleDefaultConfig(config: AppConfig): Record<string, unknown> {
  return {
    eligible_profile_ids: [],
    weekly_remaining_percent_lt: config.switchWeeklyRemainingPercentLt,
    five_hour_remaining_percent_lt: config.switchFiveHourRemainingPercentLt,
    reset_guard_hours: config.switchResetGuardHours,
    probe_interval_sec: config.switchProbeIntervalSec,
    switch_cooldown_sec: config.switchCooldownSec
  };
}

interface SwitchModuleRuntimeConfig {
  eligible_profile_ids: string[];
  weekly_remaining_percent_lt: number;
  five_hour_remaining_percent_lt: number;
  reset_guard_hours: number;
  probe_interval_sec: number;
  switch_cooldown_sec: number;
}

interface SwitchModuleValidationResult {
  mergedConfig: SwitchModuleRuntimeConfig;
  isEnabled: boolean;
  error: string | null;
}

function normalizeSwitchModuleRuntimeConfig(
  defaults: AppConfig,
  rawConfig: unknown
): SwitchModuleRuntimeConfig {
  const raw = isPlainObject(rawConfig) ? rawConfig : {};
  const parsePercent = (value: unknown, fallback: number): number => {
    const parsed = asFiniteNumber(value);
    if (parsed === null) {
      return fallback;
    }
    return Math.max(0, Math.min(100, parsed));
  };
  const parseNonNegative = (value: unknown, fallback: number): number => {
    const parsed = asFiniteNumber(value);
    if (parsed === null || parsed < 0) {
      return fallback;
    }
    return parsed;
  };
  const parseIntWithMin = (value: unknown, fallback: number, min: number): number => {
    const parsed = asFiniteNumber(value);
    if (parsed === null) {
      return fallback;
    }
    return Math.max(min, Math.round(parsed));
  };

  const eligibleIds = Array.isArray(raw["eligible_profile_ids"])
    ? Array.from(
        new Set(
          raw["eligible_profile_ids"]
            .map((item) => asNonEmptyString(item))
            .filter((item): item is string => Boolean(item))
        )
      )
    : [];

  return {
    eligible_profile_ids: eligibleIds,
    weekly_remaining_percent_lt: parsePercent(
      raw["weekly_remaining_percent_lt"],
      defaults.switchWeeklyRemainingPercentLt
    ),
    five_hour_remaining_percent_lt: parsePercent(
      raw["five_hour_remaining_percent_lt"],
      defaults.switchFiveHourRemainingPercentLt
    ),
    reset_guard_hours: parseNonNegative(raw["reset_guard_hours"], defaults.switchResetGuardHours),
    probe_interval_sec: parseIntWithMin(
      raw["probe_interval_sec"],
      defaults.switchProbeIntervalSec,
      5
    ),
    switch_cooldown_sec: parseIntWithMin(
      raw["switch_cooldown_sec"],
      defaults.switchCooldownSec,
      0
    )
  };
}

function validateSwitchModulePatch(options: {
  appConfig: AppConfig;
  currentConfig: Record<string, unknown>;
  currentEnabled: boolean;
  patchConfig?: Record<string, unknown>;
  patchEnabled?: boolean;
}): SwitchModuleValidationResult {
  const mergedRawConfig =
    options.patchConfig != null ? options.patchConfig : options.currentConfig;
  const mergedConfig = normalizeSwitchModuleRuntimeConfig(options.appConfig, mergedRawConfig);
  const isEnabled =
    typeof options.patchEnabled === "boolean" ? options.patchEnabled : options.currentEnabled;

  if (isEnabled && mergedConfig.eligible_profile_ids.length === 0) {
    return {
      mergedConfig,
      isEnabled,
      error: "enabled switch module requires non-empty eligible_profile_ids"
    };
  }

  return {
    mergedConfig,
    isEnabled,
    error: null
  };
}

async function ensureCustomModuleConfig(
  persistence: Persistence,
  config: AppConfig,
  key: string
): Promise<Awaited<ReturnType<Persistence["getCustomModuleConfig"]>> | null> {
  const existing = await persistence.getCustomModuleConfig(key);
  if (existing) {
    return existing;
  }

  if (key !== SWITCH_MODULE_KEY) {
    return null;
  }

  const defaultConfig = buildSwitchModuleDefaultConfig(config);
  const defaultEligible = Array.isArray(defaultConfig["eligible_profile_ids"])
    ? defaultConfig["eligible_profile_ids"]
    : [];
  const defaultEnabled = config.switchModuleDefaultEnabled && defaultEligible.length > 0;

  try {
    return await persistence.createCustomModuleConfig({
      module_key: SWITCH_MODULE_KEY,
      is_enabled: defaultEnabled,
      scope: "global",
      config_json: defaultConfig,
      updated_by: "system"
    });
  } catch (error) {
    const raced = await persistence.getCustomModuleConfig(key);
    if (raced) {
      return raced;
    }
    throw error;
  }
}

function adminGuard(config: AppConfig, request: FastifyRequest, reply: FastifyReply): FastifyReply | null {
  const path = (request.raw.url ?? "").split("?")[0] ?? "";
  if (!path.startsWith("/api/")) {
    return null;
  }

  const tokenHeader = request.headers["x-admin-token"];
  if (!tokenHeader) {
    return sendError(reply, 401, "Missing X-Admin-Token header", "MISSING_ADMIN_TOKEN");
  }

  const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;
  if (token !== config.adminToken) {
    return sendError(reply, 403, "Invalid admin token", "INVALID_ADMIN_TOKEN");
  }

  return null;
}

function isAuthJsonUpload(
  filename: string,
  mimeType: string
): boolean {
  return isAuthJsonFilename(filename) && hasAuthJsonMime(mimeType);
}

export async function createApp(deps: AppDependencies): Promise<FastifyInstance> {
  const { config, persistence, publisher, storage } = deps;
  const delegationExecutor = deps.delegationExecutor ?? createDefaultDelegationExecutor();
  const authProfileRateLimitsReader =
    deps.authProfileRateLimitsReader ??
    createAuthProfileRateLimitsReader({
      config,
      persistence,
      storage
    });

  const app = Fastify({ logger: true });

  await app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), "public"),
    prefix: "/ui/"
  });

  await app.register(multipart, {
    limits: {
      fileSize: config.maxAuthJsonBytes,
      files: 1
    }
  });

  app.get("/", async (_request, reply) => {
    return reply.redirect("/ui/");
  });

  app.get("/ui", async (_request, reply) => {
    return reply.redirect("/ui/");
  });

  app.addHook("onRequest", async (request, reply) => {
    const guardError = adminGuard(config, request, reply);
    if (guardError) {
      return guardError;
    }

    return undefined;
  });

  let taskAutoDispatchTimer: NodeJS.Timeout | null = null;
  let taskAutoDispatchInFlight = false;
  let taskAutoDispatchStopped = false;
  let scheduleRunnerTimer: NodeJS.Timeout | null = null;
  let scheduleRunnerInFlight = false;
  let scheduleRunnerStopped = false;
  let authSwitchRunnerTimer: NodeJS.Timeout | null = null;
  let authSwitchRunnerInFlight = false;
  let authSwitchRunnerStopped = false;
  let authSwitchLastProbeAt = 0;
  let authSwitchLastDecisionAt = 0;

  const runTaskAutoDispatchTick = async (): Promise<void> => {
    if (!config.taskAutoDispatchEnabled || taskAutoDispatchStopped || taskAutoDispatchInFlight) {
      return;
    }

    taskAutoDispatchInFlight = true;
    try {
      const tasks = await persistence.listTasks();
      const nextTask =
        tasks
          .filter((task) => TASK_AUTODISPATCH_PICKUP_STATUSES.has(task.status))
          .sort((left, right) => {
            if (left.priority === right.priority) {
              return left.id.localeCompare(right.id);
            }
            return left.priority - right.priority;
          })[0] ?? null;
      if (!nextTask) {
        return;
      }

      const currentTask = await persistence.getTaskById(nextTask.id);
      if (!currentTask || !TASK_AUTODISPATCH_PICKUP_STATUSES.has(currentTask.status)) {
        return;
      }

      const activeAuthProfile = await persistence.getActiveAuthProfile();
      if (!activeAuthProfile) {
        await persistence.updateTaskStatus(currentTask.id, "WAITING_LIMIT");
        app.log.info(
          { task_id: currentTask.id },
          "Task moved to WAITING_LIMIT because no active auth profile is selected"
        );
        return;
      }

      const agentProfile = await persistence.getAgentProfileById(currentTask.agent_profile_id);
      if (!agentProfile) {
        await persistence.updateTaskStatus(currentTask.id, "BLOCKED");
        app.log.warn(
          { task_id: currentTask.id },
          "Task moved to BLOCKED because assigned agent profile was not found"
        );
        return;
      }
      if (!agentProfile.is_enabled) {
        await persistence.updateTaskStatus(currentTask.id, "BLOCKED");
        app.log.warn(
          { task_id: currentTask.id },
          "Task moved to BLOCKED because assigned agent profile is disabled"
        );
        return;
      }

      const assignedTask = await persistence.updateTaskStatus(currentTask.id, "ASSIGNED");
      if (!assignedTask) {
        return;
      }

      const traceId = `task-auto:${assignedTask.id}:${Date.now()}`;
      const dispatchResponse = await app.inject({
        method: "POST",
        url: "/api/delegation/dispatch",
        headers: {
          "x-admin-token": config.adminToken,
          "x-trace-id": traceId
        },
        payload: {
          requester_task_id: assignedTask.id,
          capability: agentProfile.role,
          target_selector: {
            agent_profile_id: assignedTask.agent_profile_id
          },
          payload: {
            source: TASK_AUTODISPATCH_SOURCE,
            task_id: assignedTask.id,
            execution_mode: config.taskAutoDispatchExecutionMode,
            sandbox_policy: config.taskAutoDispatchSandboxPolicy,
            approval_policy: config.taskAutoDispatchApprovalPolicy,
            prompt: buildTaskAutoDispatchPrompt(assignedTask)
          }
        }
      });

      const dispatchBody = parseJsonObject(dispatchResponse.body);
      if (dispatchResponse.statusCode !== 202 || !dispatchBody) {
        const latestTask = await persistence.getTaskById(assignedTask.id);
        if (latestTask && (latestTask.status === "CANCELLED" || latestTask.status === "INTERRUPTING")) {
          return;
        }
        await persistence.updateTaskStatus(assignedTask.id, "FAILED_TERMINAL");
        app.log.error(
          {
            task_id: assignedTask.id,
            status_code: dispatchResponse.statusCode,
            response_body: dispatchResponse.body
          },
          "Task auto-dispatch failed"
        );
        return;
      }

      const delegationStatus = asNonEmptyString(dispatchBody["status"]);
      if (delegationStatus === "completed") {
        const resultSummary = asNonEmptyString(dispatchBody["result_summary"]) ?? "";
        const outcome = detectTaskAutoDispatchOutcome(resultSummary);
        const latestTask = await persistence.getTaskById(assignedTask.id);
        if (latestTask && (latestTask.status === "CANCELLED" || latestTask.status === "INTERRUPTING")) {
          return;
        }
        if (outcome === "failed") {
          await persistence.updateTaskStatus(assignedTask.id, "FAILED_TERMINAL");
          app.log.warn(
            {
              task_id: assignedTask.id,
              result_summary: resultSummary
            },
            "Task auto-dispatch marked as FAILED_TERMINAL due to failed completion outcome"
          );
          return;
        }

        await persistence.updateTaskStatus(assignedTask.id, "DONE");
        return;
      }

      if (delegationStatus === "failed") {
        const latestTask = await persistence.getTaskById(assignedTask.id);
        if (latestTask && (latestTask.status === "CANCELLED" || latestTask.status === "INTERRUPTING")) {
          return;
        }
        const failedTaskStatus = resolveTaskStatusAfterAutoDispatchFailure(dispatchBody);
        await persistence.updateTaskStatus(assignedTask.id, failedTaskStatus);
        return;
      }

      if (delegationStatus && TASK_AUTODISPATCH_RUNNING_STATUSES.has(delegationStatus)) {
        const latestTask = await persistence.getTaskById(assignedTask.id);
        if (latestTask && (latestTask.status === "CANCELLED" || latestTask.status === "INTERRUPTING")) {
          return;
        }
        await persistence.updateTaskStatus(assignedTask.id, "RUNNING");
        return;
      }

      const latestTask = await persistence.getTaskById(assignedTask.id);
      if (latestTask && (latestTask.status === "CANCELLED" || latestTask.status === "INTERRUPTING")) {
        return;
      }
      await persistence.updateTaskStatus(assignedTask.id, "FAILED_TERMINAL");
      app.log.error(
        { task_id: assignedTask.id, delegation_status: delegationStatus ?? null },
        "Task auto-dispatch returned unsupported delegation status"
      );
    } catch (error) {
      app.log.error({ err: error }, "Task auto-dispatch tick failed");
    } finally {
      taskAutoDispatchInFlight = false;
    }
  };

  interface ProfileLimitProbe {
    profile: AuthProfileEntity;
    fiveHourRemainingPct: number | null;
    weeklyRemainingPct: number | null;
    resetEtaHours: number | null;
    source: string;
    error: string | null;
  }

  const holdQueueForSwitch = async (traceId: string, reason: string): Promise<TaskStatusTransition[]> => {
    const holdTransitions = await holdNewAndQueuedTasksForAuthSwitch(persistence);
    if (holdTransitions.length === 0) {
      return holdTransitions;
    }

    await publishEventBestEffort({
      app,
      publisher,
      event: {
        eventType: "queue.hold_started",
        traceId,
        idempotencyKey: `queue_hold_start:${traceId}`,
        payload: {
          reason,
          held_count: holdTransitions.length
        }
      },
      logMessage: "Failed to publish queue.hold_started"
    });
    await publishTaskAuthSwitchingEvents({
      app,
      publisher,
      traceId,
      transitions: holdTransitions,
      reason
    });
    return holdTransitions;
  };

  const releaseQueueAfterSwitch = async (
    traceId: string,
    reason: string
  ): Promise<TaskStatusTransition[]> => {
    const releaseTransitions = await releaseHeldTasksForAuthSwitch(persistence);
    if (releaseTransitions.length === 0) {
      return releaseTransitions;
    }

    await publishEventBestEffort({
      app,
      publisher,
      event: {
        eventType: "queue.hold_released",
        traceId,
        idempotencyKey: `queue_hold_release:${traceId}`,
        payload: {
          reason,
          held_count: releaseTransitions.length
        }
      },
      logMessage: "Failed to publish queue.hold_released"
    });
    await publishTaskAuthSwitchingEvents({
      app,
      publisher,
      traceId,
      transitions: releaseTransitions,
      reason
    });
    return releaseTransitions;
  };

  const readProfileLimitProbe = async (profile: AuthProfileEntity): Promise<ProfileLimitProbe> => {
    try {
      const limits = await authProfileRateLimitsReader.readByProfileId(profile.id);
      if (!limits) {
        return {
          profile,
          fiveHourRemainingPct: null,
          weeklyRemainingPct: null,
          resetEtaHours: null,
          source: "missing",
          error: "limits_not_found"
        };
      }

      const fiveHourRemainingPct =
        asFiniteNumber(limits.rate_limits.primary?.remaining_percent ?? null) ?? null;
      const weeklyRemainingPct =
        asFiniteNumber(limits.rate_limits.secondary?.remaining_percent ?? null) ?? null;
      const resetAfterSecondsCandidates = [
        asFiniteNumber(limits.rate_limits.primary?.reset_after_seconds ?? null),
        asFiniteNumber(limits.rate_limits.secondary?.reset_after_seconds ?? null)
      ].filter((value): value is number => value != null && value >= 0);
      const resetEtaHours =
        resetAfterSecondsCandidates.length > 0
          ? Math.min(...resetAfterSecondsCandidates) / 3600
          : null;

      return {
        profile,
        fiveHourRemainingPct,
        weeklyRemainingPct,
        resetEtaHours,
        source: limits.rate_limits.source,
        error: null
      };
    } catch (error) {
      return {
        profile,
        fiveHourRemainingPct: null,
        weeklyRemainingPct: null,
        resetEtaHours: null,
        source: "error",
        error: getErrorMessage(error)
      };
    }
  };

  const selectBestSwitchCandidate = (
    probes: ProfileLimitProbe[],
    currentActiveProfileId: string | null
  ): ProfileLimitProbe | null => {
    const candidates = probes
      .filter((probe) => probe.error == null)
      .filter((probe) => probe.fiveHourRemainingPct != null && probe.weeklyRemainingPct != null)
      .filter((probe) => probe.profile.id !== currentActiveProfileId)
      .sort((left, right) => {
        const fiveHourDelta = (right.fiveHourRemainingPct ?? -1) - (left.fiveHourRemainingPct ?? -1);
        if (fiveHourDelta !== 0) {
          return fiveHourDelta;
        }

        const weekDelta = (right.weeklyRemainingPct ?? -1) - (left.weeklyRemainingPct ?? -1);
        if (weekDelta !== 0) {
          return weekDelta;
        }

        return left.profile.id.localeCompare(right.profile.id);
      });

    return candidates[0] ?? null;
  };

  const runAuthSwitchTick = async (): Promise<void> => {
    if (authSwitchRunnerStopped || authSwitchRunnerInFlight) {
      return;
    }

    authSwitchRunnerInFlight = true;
    try {
      const moduleConfig = await ensureCustomModuleConfig(persistence, config, SWITCH_MODULE_KEY);
      if (!moduleConfig) {
        return;
      }

      const runtimeConfig = normalizeSwitchModuleRuntimeConfig(config, moduleConfig.config_json);
      const nowMs = Date.now();
      if (nowMs - authSwitchLastProbeAt < runtimeConfig.probe_interval_sec * 1000) {
        return;
      }
      authSwitchLastProbeAt = nowMs;

      if (!moduleConfig.is_enabled) {
        return;
      }

      const activeProfile = await persistence.getActiveAuthProfile();
      const allProfiles = await persistence.listAuthProfiles();
      const eligibleProfiles = allProfiles.filter(
        (profile) =>
          runtimeConfig.eligible_profile_ids.includes(profile.id) && profile.status !== "blocked"
      );
      const traceId = `auth-switch-runner:${Date.now()}`;
      const cooldownMs = runtimeConfig.switch_cooldown_sec * 1000;
      const withinCooldown =
        cooldownMs > 0 && nowMs - authSwitchLastDecisionAt < cooldownMs;

      const noEligibleConfigured =
        runtimeConfig.eligible_profile_ids.length === 0 || eligibleProfiles.length === 0;
      if (noEligibleConfigured) {
        if (withinCooldown) {
          return;
        }
        authSwitchLastDecisionAt = nowMs;

        await holdQueueForSwitch(traceId, "auto_switch_no_valid_profile");
        const skippedEvent = await persistence.createAuthSwitchEvent({
          module_key: SWITCH_MODULE_KEY,
          from_auth_profile_id: activeProfile?.id ?? null,
          to_auth_profile_id: null,
          reason: "auto_switch_no_valid_profile",
          status: "skipped",
          switch_scope: "global",
          details_json: {
            source: "runner",
            reason: "no_valid_profile",
            eligible_profile_ids: runtimeConfig.eligible_profile_ids
          },
          started_at: new Date(),
          ended_at: new Date()
        });

        await publishEventBestEffort({
          app,
          publisher,
          event: {
            eventType: "auth_profile.switch.skipped",
            traceId,
            idempotencyKey: `${skippedEvent.id}:${traceId}`,
            payload: {
              profile_id: activeProfile?.id ?? null,
              from_profile_id: activeProfile?.id ?? null,
              to_profile_id: null,
              reason: "auto_switch_no_valid_profile"
            }
          },
          logMessage: "Failed to publish auth_profile.switch.skipped",
          logContext: {
            module_key: SWITCH_MODULE_KEY
          }
        });
        return;
      }

      const probes = await Promise.all(eligibleProfiles.map((profile) => readProfileLimitProbe(profile)));
      const activeProbe =
        activeProfile == null
          ? null
          : probes.find((probe) => probe.profile.id === activeProfile.id) ?? null;

      let switchReason: string | null = null;
      if (!activeProfile) {
        switchReason = "auto_switch_no_active_profile";
      } else if (!runtimeConfig.eligible_profile_ids.includes(activeProfile.id)) {
        switchReason = "auto_switch_active_not_eligible";
      } else if (!activeProbe || activeProbe.error) {
        switchReason = "auto_switch_active_limits_unavailable";
      } else {
        const fiveHourBreached =
          activeProbe.fiveHourRemainingPct != null &&
          activeProbe.fiveHourRemainingPct < runtimeConfig.five_hour_remaining_percent_lt;
        const weeklyBreached =
          activeProbe.weeklyRemainingPct != null &&
          activeProbe.weeklyRemainingPct < runtimeConfig.weekly_remaining_percent_lt;
        if (fiveHourBreached || weeklyBreached) {
          const resetGuardTriggered =
            activeProbe.resetEtaHours != null &&
            activeProbe.resetEtaHours <= runtimeConfig.reset_guard_hours;
          if (!resetGuardTriggered) {
            switchReason = "auto_switch_limit_threshold";
          }
        }
      }

      if (!switchReason) {
        if (activeProfile) {
          await releaseQueueAfterSwitch(traceId, "auto_switch_active_profile_ok");
        }
        return;
      }

      if (withinCooldown) {
        return;
      }

      const candidate = selectBestSwitchCandidate(probes, activeProfile?.id ?? null);
      if (!candidate) {
        authSwitchLastDecisionAt = nowMs;
        await holdQueueForSwitch(traceId, "auto_switch_no_valid_profile");
        const skippedEvent = await persistence.createAuthSwitchEvent({
          module_key: SWITCH_MODULE_KEY,
          from_auth_profile_id: activeProfile?.id ?? null,
          to_auth_profile_id: null,
          reason: "auto_switch_no_valid_profile",
          status: "skipped",
          switch_scope: "global",
          details_json: {
            source: "runner",
            reason: "no_valid_profile",
            switch_reason: switchReason,
            eligible_profile_ids: runtimeConfig.eligible_profile_ids
          },
          started_at: new Date(),
          ended_at: new Date()
        });

        await publishEventBestEffort({
          app,
          publisher,
          event: {
            eventType: "auth_profile.switch.skipped",
            traceId,
            idempotencyKey: `${skippedEvent.id}:${traceId}`,
            payload: {
              profile_id: activeProfile?.id ?? null,
              from_profile_id: activeProfile?.id ?? null,
              to_profile_id: null,
              reason: "auto_switch_no_valid_profile"
            }
          },
          logMessage: "Failed to publish auth_profile.switch.skipped",
          logContext: {
            module_key: SWITCH_MODULE_KEY
          }
        });
        return;
      }

      authSwitchLastDecisionAt = nowMs;
      await holdQueueForSwitch(traceId, "auto_switch_hold_started");

      const startedAt = new Date();
      const startedSwitchEvent = await persistence.createAuthSwitchEvent({
        module_key: SWITCH_MODULE_KEY,
        from_auth_profile_id: activeProfile?.id ?? null,
        to_auth_profile_id: candidate.profile.id,
        reason: switchReason,
        status: "started",
        switch_scope: "global",
        details_json: {
          source: "runner",
          selected_profile_id: candidate.profile.id,
          selected_five_hour_remaining_pct: candidate.fiveHourRemainingPct,
          selected_weekly_remaining_pct: candidate.weeklyRemainingPct
        },
        started_at: startedAt,
        ended_at: null
      });

      await publishEventBestEffort({
        app,
        publisher,
        event: {
          eventType: "auth_profile.switch.started",
          traceId,
          idempotencyKey: `${startedSwitchEvent.id}:${traceId}`,
          payload: {
            profile_id: candidate.profile.id,
            from_profile_id: activeProfile?.id ?? null,
            to_profile_id: candidate.profile.id,
            reason: switchReason
          }
        },
        logMessage: "Failed to publish auth_profile.switch.started",
        logContext: {
          profile_id: candidate.profile.id
        }
      });

      let activated: AuthProfileEntity | null = null;
      try {
        activated = await withRetry({
          operationName: "auto_auth_profile_activate",
          maxAttempts: DEFAULT_AUTH_SWITCH_RETRY_LIMIT,
          initialDelayMs: 50,
          fn: async () => persistence.activateAuthProfile(candidate.profile.id, "system"),
          onRetry: async ({ attempt, error, nextDelayMs }) => {
            app.log.warn(
              {
                err: error,
                operation: "auto_auth_profile_activate",
                attempt,
                nextDelayMs,
                profile_id: candidate.profile.id
              },
              "Retrying automatic auth profile activate"
            );
          }
        });
      } catch (error) {
        await persistence.createAuthSwitchEvent({
          module_key: SWITCH_MODULE_KEY,
          from_auth_profile_id: activeProfile?.id ?? null,
          to_auth_profile_id: candidate.profile.id,
          reason: switchReason,
          status: "failed",
          switch_scope: "global",
          details_json: {
            source: "runner",
            reason: "activate_failed",
            error: getErrorMessage(error)
          },
          started_at: startedAt,
          ended_at: new Date()
        });

        await publishEventBestEffort({
          app,
          publisher,
          event: {
            eventType: "auth_profile.switch.failed",
            traceId,
            idempotencyKey: `${candidate.profile.id}:auto_failed:${traceId}`,
            payload: {
              profile_id: candidate.profile.id,
              from_profile_id: activeProfile?.id ?? null,
              to_profile_id: candidate.profile.id,
              reason: switchReason
            }
          },
          logMessage: "Failed to publish auth_profile.switch.failed",
          logContext: {
            profile_id: candidate.profile.id
          }
        });
        return;
      }

      if (!activated) {
        return;
      }

      await persistence.createAuthSwitchEvent({
        module_key: SWITCH_MODULE_KEY,
        from_auth_profile_id: activeProfile?.id ?? null,
        to_auth_profile_id: activated.id,
        reason: switchReason,
        status: "completed",
        switch_scope: "global",
        details_json: {
          source: "runner"
        },
        started_at: startedAt,
        ended_at: new Date()
      });

      await publishEventBestEffort({
        app,
        publisher,
        event: {
          eventType: "auth_profile.switch.completed",
          traceId,
          idempotencyKey: `${activated.id}:auto_completed:${traceId}`,
          payload: {
            profile_id: activated.id,
            from_profile_id: activeProfile?.id ?? null,
            to_profile_id: activated.id,
            reason: switchReason
          }
        },
        logMessage: "Failed to publish auth_profile.switch.completed",
        logContext: {
          profile_id: activated.id
        }
      });

      await releaseQueueAfterSwitch(traceId, "auto_switch_release_completed");
      await publishEventBestEffort({
        app,
        publisher,
        event: {
          eventType: "auth_profile.activated",
          traceId,
          idempotencyKey: `${activated.id}:auto_activate:${traceId}`,
          payload: {
            profile_id: activated.id,
            status: activated.status,
            label: activated.label
          }
        },
        logMessage: "Failed to publish auth_profile.activated",
        logContext: {
          profile_id: activated.id
        }
      });
    } catch (error) {
      app.log.error({ err: error }, "Auth switch runner tick failed");
    } finally {
      authSwitchRunnerInFlight = false;
    }
  };

  const toScheduleBucketMinute = (value: Date): string => {
    const yyyy = value.getUTCFullYear();
    const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(value.getUTCDate()).padStart(2, "0");
    const hh = String(value.getUTCHours()).padStart(2, "0");
    const min = String(value.getUTCMinutes()).padStart(2, "0");
    return `${yyyy}${mm}${dd}${hh}${min}`;
  };

  const runScheduleTrigger = async (options: {
    rule: ScheduledRuleEntity;
    traceId: string;
    dryRunContext?: Record<string, unknown>;
    triggerSource: "api" | "runner" | "startup_recovery";
  }): Promise<ScheduledRunEntity> => {
    const now = new Date();
    const idempotencyKey = `${options.rule.id}:${options.traceId}`;
    const existingRun = await persistence.getScheduledRunByIdempotency(
      options.rule.id,
      idempotencyKey
    );
    if (existingRun) {
      return existingRun;
    }

    if (!options.rule.is_enabled) {
      const failedRun = await persistence.createScheduledRun({
        rule_id: options.rule.id,
        status: "failed",
        started_at: now,
        ended_at: now,
        skip_reason: "rule_disabled",
        trace_id: options.traceId,
        idempotency_key: idempotencyKey,
        result_json: { reason: "rule_disabled", trigger_source: options.triggerSource }
      });

      await publisher.publish({
        eventType: "schedule.run.failed",
        traceId: options.traceId,
        idempotencyKey: `${failedRun.id}:${options.traceId}`,
        payload: {
          rule_id: options.rule.id,
          run_id: failedRun.id,
          scope: options.rule.scope,
          status: failedRun.status,
          reason: failedRun.skip_reason
        }
      });
      return failedRun;
    }

    const activeRun = await persistence.getActiveScheduledRun(options.rule.id);
    if (activeRun) {
      const skippedRun = await persistence.createScheduledRun({
        rule_id: options.rule.id,
        status: "skipped_due_to_overlap",
        started_at: now,
        ended_at: now,
        skip_reason: "active_run_exists",
        trace_id: options.traceId,
        idempotency_key: idempotencyKey,
        result_json: {
          active_run_id: activeRun.id,
          trigger_source: options.triggerSource
        }
      });

      await publisher.publish({
        eventType: "schedule.run.skipped_due_to_overlap",
        traceId: options.traceId,
        idempotencyKey: `${skippedRun.id}:${options.traceId}`,
        payload: {
          rule_id: options.rule.id,
          run_id: skippedRun.id,
          scope: options.rule.scope,
          status: skippedRun.status,
          reason: skippedRun.skip_reason
        }
      });
      return skippedRun;
    }

    const startedRun = await persistence.createScheduledRun({
      rule_id: options.rule.id,
      status: "started",
      started_at: now,
      ended_at: null,
      skip_reason: null,
      trace_id: options.traceId,
      idempotency_key: idempotencyKey,
      result_json: {
        trigger_source: options.triggerSource
      }
    });

    await publisher.publish({
      eventType: "schedule.run.started",
      traceId: options.traceId,
      idempotencyKey: `${startedRun.id}:${options.traceId}`,
      payload: {
        rule_id: options.rule.id,
        run_id: startedRun.id,
        scope: options.rule.scope,
        status: startedRun.status,
        reason: null
      }
    });

    try {
      const dryRunContext = options.dryRunContext ?? {};
      const { context, warnings } = parseScheduleEvaluationContext(dryRunContext);
      const evaluation = evaluateScheduleRuleAst(options.rule.rule_ast, context);
      const reasons = [...warnings, ...evaluation.reasons];
      let matched = evaluation.matched;
      if (dryRunContext["force_match"] === true) {
        matched = true;
        reasons.push("forced_by_dry_run_context");
      }

      if (!matched) {
        const completedRun =
          (await persistence.updateScheduledRun(startedRun.id, {
            status: "completed",
            ended_at: new Date(),
            skip_reason: "rule_not_matched",
            result_json: {
              matched: false,
              reasons,
              trigger_source: options.triggerSource
            }
          })) ?? startedRun;
        await publisher.publish({
          eventType: "schedule.run.completed",
          traceId: options.traceId,
          idempotencyKey: `${completedRun.id}:not_matched:${options.traceId}`,
          payload: {
            rule_id: options.rule.id,
            run_id: completedRun.id,
            scope: options.rule.scope,
            status: completedRun.status,
            reason: "not_matched"
          }
        });
        return completedRun;
      }

      if (options.rule.scope !== "project" || !options.rule.project_id) {
        const failedRun =
          (await persistence.updateScheduledRun(startedRun.id, {
            status: "failed",
            ended_at: new Date(),
            skip_reason: "project_scope_required",
            result_json: {
              matched: true,
              reasons,
              trigger_source: options.triggerSource
            }
          })) ?? startedRun;
        await publisher.publish({
          eventType: "schedule.run.failed",
          traceId: options.traceId,
          idempotencyKey: `${failedRun.id}:scope_failed:${options.traceId}`,
          payload: {
            rule_id: options.rule.id,
            run_id: failedRun.id,
            scope: options.rule.scope,
            status: failedRun.status,
            reason: "project_scope_required"
          }
        });
        return failedRun;
      }

      if (
        !options.rule.task_title ||
        !options.rule.task_description ||
        !options.rule.task_agent_profile_id
      ) {
        const failedRun =
          (await persistence.updateScheduledRun(startedRun.id, {
            status: "failed",
            ended_at: new Date(),
            skip_reason: "task_template_incomplete",
            result_json: {
              matched: true,
              reasons,
              trigger_source: options.triggerSource
            }
          })) ?? startedRun;
        await publisher.publish({
          eventType: "schedule.run.failed",
          traceId: options.traceId,
          idempotencyKey: `${failedRun.id}:task_template_incomplete:${options.traceId}`,
          payload: {
            rule_id: options.rule.id,
            run_id: failedRun.id,
            scope: options.rule.scope,
            status: failedRun.status,
            reason: "task_template_incomplete"
          }
        });
        return failedRun;
      }

      const project = await persistence.getProjectByKey(options.rule.project_id);
      if (!project) {
        const failedRun =
          (await persistence.updateScheduledRun(startedRun.id, {
            status: "failed",
            ended_at: new Date(),
            skip_reason: "project_not_found",
            result_json: {
              matched: true,
              reasons,
              trigger_source: options.triggerSource
            }
          })) ?? startedRun;
        await publisher.publish({
          eventType: "schedule.run.failed",
          traceId: options.traceId,
          idempotencyKey: `${failedRun.id}:project_not_found:${options.traceId}`,
          payload: {
            rule_id: options.rule.id,
            run_id: failedRun.id,
            scope: options.rule.scope,
            status: failedRun.status,
            reason: "project_not_found"
          }
        });
        return failedRun;
      }
      if (!project.is_active) {
        const failedRun =
          (await persistence.updateScheduledRun(startedRun.id, {
            status: "failed",
            ended_at: new Date(),
            skip_reason: "project_inactive",
            result_json: {
              matched: true,
              reasons,
              trigger_source: options.triggerSource
            }
          })) ?? startedRun;
        await publisher.publish({
          eventType: "schedule.run.failed",
          traceId: options.traceId,
          idempotencyKey: `${failedRun.id}:project_inactive:${options.traceId}`,
          payload: {
            rule_id: options.rule.id,
            run_id: failedRun.id,
            scope: options.rule.scope,
            status: failedRun.status,
            reason: "project_inactive"
          }
        });
        return failedRun;
      }

      const profile = await persistence.getAgentProfileById(options.rule.task_agent_profile_id);
      if (!profile) {
        const failedRun =
          (await persistence.updateScheduledRun(startedRun.id, {
            status: "failed",
            ended_at: new Date(),
            skip_reason: "agent_selector_not_found",
            result_json: {
              matched: true,
              reasons,
              trigger_source: options.triggerSource
            }
          })) ?? startedRun;
        await publisher.publish({
          eventType: "schedule.run.failed",
          traceId: options.traceId,
          idempotencyKey: `${failedRun.id}:agent_selector_not_found:${options.traceId}`,
          payload: {
            rule_id: options.rule.id,
            run_id: failedRun.id,
            scope: options.rule.scope,
            status: failedRun.status,
            reason: "agent_selector_not_found"
          }
        });
        return failedRun;
      }
      if (!profile.is_enabled) {
        const failedRun =
          (await persistence.updateScheduledRun(startedRun.id, {
            status: "failed",
            ended_at: new Date(),
            skip_reason: "agent_selector_disabled",
            result_json: {
              matched: true,
              reasons,
              trigger_source: options.triggerSource
            }
          })) ?? startedRun;
        await publisher.publish({
          eventType: "schedule.run.failed",
          traceId: options.traceId,
          idempotencyKey: `${failedRun.id}:agent_selector_disabled:${options.traceId}`,
          payload: {
            rule_id: options.rule.id,
            run_id: failedRun.id,
            scope: options.rule.scope,
            status: failedRun.status,
            reason: "agent_selector_disabled"
          }
        });
        return failedRun;
      }

      const createdTask = await persistence.createTask({
        title: options.rule.task_title,
        description: options.rule.task_description,
        project_id: options.rule.project_id,
        agent_profile_id: options.rule.task_agent_profile_id,
        priority: options.rule.task_priority,
        status: "NEW",
        source: "schedule",
        created_by: "scheduler"
      });

      const completedRun =
        (await persistence.updateScheduledRun(startedRun.id, {
          status: "completed",
          ended_at: new Date(),
          skip_reason: null,
          created_task_id: createdTask.id,
          result_json: {
            matched: true,
            reasons,
            task_id: createdTask.id,
            trigger_source: options.triggerSource
          }
        })) ?? startedRun;

      await publisher.publish({
        eventType: "schedule.run.completed",
        traceId: options.traceId,
        idempotencyKey: `${completedRun.id}:completed:${options.traceId}`,
        payload: {
          rule_id: options.rule.id,
          run_id: completedRun.id,
          scope: options.rule.scope,
          status: completedRun.status,
          reason: "task_created"
        }
      });
      return completedRun;
    } catch (error) {
      const failedRun =
        (await persistence.updateScheduledRun(startedRun.id, {
          status: "failed",
          ended_at: new Date(),
          skip_reason: "trigger_execution_failed",
          result_json: {
            trigger_source: options.triggerSource,
            error: getErrorMessage(error)
          }
        })) ?? startedRun;

      await publisher.publish({
        eventType: "schedule.run.failed",
        traceId: options.traceId,
        idempotencyKey: `${failedRun.id}:failed:${options.traceId}`,
        payload: {
          rule_id: options.rule.id,
          run_id: failedRun.id,
          scope: options.rule.scope,
          status: failedRun.status,
          reason: "trigger_execution_failed"
        }
      });
      return failedRun;
    }
  };

  const runScheduleRunnerTick = async (): Promise<void> => {
    if (!config.scheduleRunnerEnabled || scheduleRunnerStopped || scheduleRunnerInFlight) {
      return;
    }

    scheduleRunnerInFlight = true;
    try {
      const rules = await persistence.listScheduledRules();
      const now = new Date();
      const bucket = toScheduleBucketMinute(now);
      for (const rule of rules) {
        if (!rule.is_enabled || rule.scope !== "project") {
          continue;
        }

        const traceId = `schedule-runner:${rule.id}:${bucket}`;
        await runScheduleTrigger({
          rule,
          traceId,
          triggerSource: "runner",
          dryRunContext: {
            now_utc: now.toISOString(),
            event_type: "schedule.runner"
          }
        });
      }
    } catch (error) {
      app.log.error({ err: error }, "Schedule runner tick failed");
    } finally {
      scheduleRunnerInFlight = false;
    }
  };

  app.addHook("onReady", async () => {
    if (config.taskAutoDispatchEnabled) {
      taskAutoDispatchTimer = setInterval(() => {
        void runTaskAutoDispatchTick();
      }, config.taskAutoDispatchIntervalMs);
      taskAutoDispatchTimer.unref?.();
      app.log.info(
        {
          interval_ms: config.taskAutoDispatchIntervalMs
        },
        "Task auto-dispatch runner started"
      );
    } else {
      app.log.info("Task auto-dispatch runner disabled");
    }

    if (config.scheduleRunnerEnabled) {
      scheduleRunnerTimer = setInterval(() => {
        void runScheduleRunnerTick();
      }, config.scheduleRunnerIntervalMs);
      scheduleRunnerTimer.unref?.();
      app.log.info(
        { interval_ms: config.scheduleRunnerIntervalMs },
        "Schedule runner started"
      );
    } else {
      app.log.info("Schedule runner disabled");
    }

    authSwitchRunnerTimer = setInterval(() => {
      void runAuthSwitchTick();
    }, 5_000);
    authSwitchRunnerTimer.unref?.();
    app.log.info("Auth switch runner started");
  });

  app.addHook("onClose", async () => {
    taskAutoDispatchStopped = true;
    scheduleRunnerStopped = true;
    authSwitchRunnerStopped = true;

    if (taskAutoDispatchTimer) {
      clearInterval(taskAutoDispatchTimer);
      taskAutoDispatchTimer = null;
    }
    if (scheduleRunnerTimer) {
      clearInterval(scheduleRunnerTimer);
      scheduleRunnerTimer = null;
    }
    if (authSwitchRunnerTimer) {
      clearInterval(authSwitchRunnerTimer);
      authSwitchRunnerTimer = null;
    }
  });

  app.get("/health/live", async (_request, reply) => {
    return reply.send({ ok: true, service: config.serviceName });
  });

  app.get("/health/ready", async (_request, reply) => {
    try {
      await persistence.pingDb();
      await publisher.ping();
      await storage.checkReady();
      return reply.send({ ok: true, service: config.serviceName });
    } catch (error) {
      app.log.error({ err: error }, "Readiness check failed");
      return sendError(reply, 503, "Dependencies are not ready", "DEPENDENCIES_NOT_READY");
    }
  });

  app.post("/api/projects", async (request, reply) => {
    const body = request.body as ProjectCreateRequest;
    const legacyProjectFields = detectLegacyFields(body, ["github_repo", "default_branch"]);
    if (legacyProjectFields.length > 0) {
      return sendError(
        reply,
        400,
        `Legacy fields are not supported: ${legacyProjectFields.join(", ")}`,
        "VALIDATION_ERROR"
      );
    }
    const key = asProjectKey(body?.key);
    const name = asNonEmptyString(body?.name);

    if (!key || !name) {
      return sendError(
        reply,
        400,
        "key and name are required; key must match ^[a-z0-9][a-z0-9_-]{0,63}$",
        "VALIDATION_ERROR"
      );
    }

    const parseNullableField = (fieldValue: unknown, fieldName: string): string | null | undefined => {
      if (fieldValue === undefined) {
        return undefined;
      }
      if (fieldValue === null) {
        return null;
      }
      const value = asNonEmptyString(fieldValue);
      if (!value) {
        throw new Error(`${fieldName} must be a non-empty string or null`);
      }
      return value;
    };

    let description: string | null | undefined;
    let githubUrl: string | null | undefined;
    let workspacePath: string | null | undefined;
    try {
      description = parseNullableField(body.description, "description");
      githubUrl = parseNullableField(body.github_url, "github_url");
      workspacePath = parseNullableField(body.workspace_path, "workspace_path");
    } catch (error) {
      return sendError(reply, 400, getErrorMessage(error), "VALIDATION_ERROR");
    }

    let metaJson: Record<string, unknown> | null | undefined;
    if (body.meta_json !== undefined) {
      if (body.meta_json === null) {
        metaJson = null;
      } else if (!isPlainObject(body.meta_json)) {
        return sendError(reply, 400, "meta_json must be an object or null", "VALIDATION_ERROR");
      } else {
        metaJson = body.meta_json;
      }
    }

    let isActive: boolean | undefined;
    if (body.is_active !== undefined) {
      if (typeof body.is_active !== "boolean") {
        return sendError(reply, 400, "is_active must be a boolean", "VALIDATION_ERROR");
      }
      isActive = body.is_active;
    }

    try {
      const created = await persistence.createProject({
        key,
        name,
        description,
        github_url: githubUrl,
        workspace_path: workspacePath,
        meta_json: metaJson,
        is_active: isActive
      });
      return reply.code(201).send(projectToResponse(created));
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        return sendError(reply, 409, "Project key already exists", "PROJECT_KEY_EXISTS");
      }
      throw error;
    }
  });

  app.get("/api/projects", async (request, reply) => {
    const query = request.query as { include_inactive?: unknown };
    let includeInactive = true;
    if (query.include_inactive !== undefined) {
      const parsed = parseBooleanLike(query.include_inactive);
      if (parsed === null) {
        return sendError(reply, 400, "include_inactive must be boolean", "VALIDATION_ERROR");
      }
      includeInactive = parsed;
    }

    const items = await persistence.listProjects({ include_inactive: includeInactive });
    return reply.send({ items: items.map((project) => projectToResponse(project)) });
  });

  app.get("/api/projects/:key", async (request, reply) => {
    const { key: keyParam } = request.params as { key: string };
    const key = asProjectKey(keyParam);
    if (!key) {
      return sendError(reply, 400, "Invalid project key", "VALIDATION_ERROR");
    }

    const project = await persistence.getProjectByKey(key);
    if (!project) {
      return sendError(reply, 404, "Project not found", "NOT_FOUND");
    }

    return reply.send(projectToResponse(project));
  });

  app.patch("/api/projects/:key", async (request, reply) => {
    const { key: keyParam } = request.params as { key: string };
    const key = asProjectKey(keyParam);
    if (!key) {
      return sendError(reply, 400, "Invalid project key", "VALIDATION_ERROR");
    }

    const body = request.body as ProjectPatchRequest;
    const legacyProjectFields = detectLegacyFields(body, ["github_repo", "default_branch"]);
    if (legacyProjectFields.length > 0) {
      return sendError(
        reply,
        400,
        `Legacy fields are not supported: ${legacyProjectFields.join(", ")}`,
        "VALIDATION_ERROR"
      );
    }
    const patch: Parameters<Persistence["patchProject"]>[1] = {};

    if (body.name !== undefined) {
      const name = asNonEmptyString(body.name);
      if (!name) {
        return sendError(reply, 400, "name must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.name = name;
    }

    const parseNullablePatchField = (
      fieldValue: unknown,
      fieldName: string
    ): string | null | undefined => {
      if (fieldValue === undefined) {
        return undefined;
      }
      if (fieldValue === null) {
        return null;
      }
      const value = asNonEmptyString(fieldValue);
      if (!value) {
        throw new Error(`${fieldName} must be a non-empty string or null`);
      }
      return value;
    };

    try {
      if (body.description !== undefined) {
        patch.description = parseNullablePatchField(body.description, "description");
      }
      if (body.github_url !== undefined) {
        patch.github_url = parseNullablePatchField(body.github_url, "github_url");
      }
      if (body.workspace_path !== undefined) {
        patch.workspace_path = parseNullablePatchField(body.workspace_path, "workspace_path");
      }
    } catch (error) {
      return sendError(reply, 400, getErrorMessage(error), "VALIDATION_ERROR");
    }

    if (body.meta_json !== undefined) {
      if (body.meta_json === null) {
        patch.meta_json = null;
      } else if (!isPlainObject(body.meta_json)) {
        return sendError(reply, 400, "meta_json must be an object or null", "VALIDATION_ERROR");
      } else {
        patch.meta_json = body.meta_json;
      }
    }

    if (body.is_active !== undefined) {
      if (typeof body.is_active !== "boolean") {
        return sendError(reply, 400, "is_active must be a boolean", "VALIDATION_ERROR");
      }
      patch.is_active = body.is_active;
    }

    if (Object.keys(patch).length === 0) {
      return sendError(reply, 400, "No fields to update", "VALIDATION_ERROR");
    }

    const updated = await persistence.patchProject(key, patch);
    if (!updated) {
      return sendError(reply, 404, "Project not found", "NOT_FOUND");
    }

    return reply.send(projectToResponse(updated));
  });

  app.get("/api/projects/:key/summary", async (request, reply) => {
    const { key: keyParam } = request.params as { key: string };
    const key = asProjectKey(keyParam);
    if (!key) {
      return sendError(reply, 400, "Invalid project key", "VALIDATION_ERROR");
    }

    const query = request.query as { switch_events_window_hours?: unknown };
    let switchEventsWindowHours = DEFAULT_PROJECT_SUMMARY_WINDOW_HOURS;
    if (query.switch_events_window_hours !== undefined) {
      const parsed = asNonNegativeInteger(query.switch_events_window_hours);
      if (!parsed || parsed < 1 || parsed > MAX_PROJECT_SUMMARY_WINDOW_HOURS) {
        return sendError(
          reply,
          400,
          `switch_events_window_hours must be between 1 and ${MAX_PROJECT_SUMMARY_WINDOW_HOURS}`,
          "VALIDATION_ERROR"
        );
      }
      switchEventsWindowHours = parsed;
    }

    const summary = await persistence.getProjectSummaryByKey(key, {
      switch_events_window_hours: switchEventsWindowHours
    });
    if (!summary) {
      return sendError(reply, 404, "Project not found", "NOT_FOUND");
    }

    return reply.send(projectSummaryToResponse(summary));
  });

  app.post("/api/projects/:key/secrets", async (request, reply) => {
    const { key: keyParam } = request.params as { key: string };
    const projectKey = asProjectKey(keyParam);
    if (!projectKey) {
      return sendError(reply, 400, "Invalid project key", "VALIDATION_ERROR");
    }

    const project = await persistence.getProjectByKey(projectKey);
    if (!project) {
      return sendError(reply, 404, "Project not found", "PROJECT_NOT_FOUND");
    }

    const body = request.body as ProjectSecretCreateRequest;
    const secretKey = asProjectSecretKey(body?.key);
    const secretValue = asNonEmptyString(body?.value);
    if (!secretKey || !secretValue) {
      return sendError(
        reply,
        400,
        "key and value are required; key must match ^[A-Z][A-Z0-9_]{1,127}$",
        "VALIDATION_ERROR"
      );
    }
    if (secretValue.length > MAX_PROJECT_SECRET_VALUE_LENGTH) {
      return sendError(
        reply,
        400,
        `value is too large (max ${MAX_PROJECT_SECRET_VALUE_LENGTH} chars)`,
        "VALIDATION_ERROR"
      );
    }

    const description =
      body.description === undefined
        ? undefined
        : body.description === null
          ? null
          : asNonEmptyString(body.description);
    if (body.description !== undefined && body.description !== null && !description) {
      return sendError(reply, 400, "description must be a non-empty string or null", "VALIDATION_ERROR");
    }

    let isActive = true;
    if (body.is_active !== undefined) {
      if (typeof body.is_active !== "boolean") {
        return sendError(reply, 400, "is_active must be a boolean", "VALIDATION_ERROR");
      }
      isActive = body.is_active;
    }

    let templateIds: string[] = [];
    let bindRoles: string[] = [];
    try {
      templateIds = parseOptionalStringArray(body.bind_template_ids, "bind_template_ids", {
        maxItems: MAX_PROJECT_SECRET_BINDINGS
      }) ?? [];
      const rawRoles = parseOptionalStringArray(body.bind_roles, "bind_roles", {
        maxItems: MAX_PROJECT_SECRET_BINDINGS
      }) ?? [];
      const seenRoles = new Set<string>();
      bindRoles = rawRoles
        .map((role) => normalizeAgentRole(role))
        .filter((role) => {
          if (seenRoles.has(role)) {
            return false;
          }
          seenRoles.add(role);
          return true;
        });
    } catch (error) {
      return sendError(reply, 400, getErrorMessage(error), "VALIDATION_ERROR");
    }

    if (templateIds.length > 0) {
      const templates = await persistence.listAgentTemplates();
      const availableTemplateIds = new Set(templates.map((item) => item.id));
      const missingTemplateId = templateIds.find((templateId) => !availableTemplateIds.has(templateId));
      if (missingTemplateId) {
        return sendError(
          reply,
          404,
          `Agent template not found: ${missingTemplateId}`,
          "AGENT_TEMPLATE_NOT_FOUND"
        );
      }
    }

    const encrypted = encryptProjectSecretValue(secretValue, config.secretsMasterKey);
    const maskedPreview = buildSecretMaskedPreview(secretValue);

    let createdSecret: ProjectSecretEntity;
    try {
      createdSecret = await persistence.createProjectSecret({
        project_id: projectKey,
        key: secretKey,
        description,
        masked_preview: maskedPreview,
        is_active: isActive,
        ciphertext: encrypted.ciphertext,
        dek_encrypted: encrypted.dek_encrypted,
        dek_kms_key_id: encrypted.dek_kms_key_id,
        algo: encrypted.algo,
        created_by: "admin",
        updated_by: "admin"
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        return sendError(reply, 409, "Secret key already exists in project", "PROJECT_SECRET_EXISTS");
      }
      throw error;
    }

    for (const templateId of templateIds) {
      await persistence.bindProjectSecretToTemplate(createdSecret.id, templateId, "admin");
    }
    for (const role of bindRoles) {
      await persistence.bindProjectSecretToRole(createdSecret.id, role, "admin");
    }

    await writeSecretAuditEventBestEffort(
      persistence,
      {
        secret_id: createdSecret.id,
        project_id: projectKey,
        event_type: "created",
        actor: "admin",
        trace_id: getTraceId(request),
        metadata_json: {
          key: createdSecret.key,
          template_bindings_count: templateIds.length,
          role_bindings_count: bindRoles.length
        }
      },
      request.log
    );

    const response = await buildProjectSecretResponse(persistence, createdSecret);
    return reply.code(201).send(response);
  });

  app.get("/api/projects/:key/secrets", async (request, reply) => {
    const { key: keyParam } = request.params as { key: string };
    const projectKey = asProjectKey(keyParam);
    if (!projectKey) {
      return sendError(reply, 400, "Invalid project key", "VALIDATION_ERROR");
    }

    const project = await persistence.getProjectByKey(projectKey);
    if (!project) {
      return sendError(reply, 404, "Project not found", "PROJECT_NOT_FOUND");
    }

    const query = request.query as { include_inactive?: unknown; limit?: unknown };
    let includeInactive = true;
    if (query.include_inactive !== undefined) {
      const parsed = parseBooleanLike(query.include_inactive);
      if (parsed === null) {
        return sendError(reply, 400, "include_inactive must be boolean", "VALIDATION_ERROR");
      }
      includeInactive = parsed;
    }

    const parsedLimit = asNonNegativeInteger(query.limit);
    const limit = parsedLimit && parsedLimit > 0 ? parsedLimit : 100;

    const items = await persistence.listProjectSecrets(projectKey, {
      include_inactive: includeInactive,
      limit
    });
    const responseItems = await Promise.all(
      items.map((item) => buildProjectSecretResponse(persistence, item))
    );
    return reply.send({ items: responseItems });
  });

  app.patch("/api/projects/:key/secrets/:id", async (request, reply) => {
    const { key: keyParam, id: secretId } = request.params as { key: string; id: string };
    const projectKey = asProjectKey(keyParam);
    if (!projectKey || !asNonEmptyString(secretId)) {
      return sendError(reply, 400, "Invalid project key or secret id", "VALIDATION_ERROR");
    }

    const body = request.body as ProjectSecretPatchRequest;
    const patch: {
      description?: string | null;
      is_active?: boolean;
      updated_by?: string | null;
    } = { updated_by: "admin" };

    if (body.description !== undefined) {
      if (body.description === null) {
        patch.description = null;
      } else {
        const description = asNonEmptyString(body.description);
        if (!description) {
          return sendError(reply, 400, "description must be a non-empty string or null", "VALIDATION_ERROR");
        }
        patch.description = description;
      }
    }

    if (body.is_active !== undefined) {
      if (typeof body.is_active !== "boolean") {
        return sendError(reply, 400, "is_active must be a boolean", "VALIDATION_ERROR");
      }
      patch.is_active = body.is_active;
    }

    if (patch.description === undefined && patch.is_active === undefined) {
      return sendError(reply, 400, "No fields to update", "VALIDATION_ERROR");
    }

    const updated = await persistence.patchProjectSecret(projectKey, secretId, patch);
    if (!updated) {
      return sendError(reply, 404, "Project secret not found", "NOT_FOUND");
    }

    await writeSecretAuditEventBestEffort(
      persistence,
      {
        secret_id: updated.id,
        project_id: projectKey,
        event_type: "updated",
        actor: "admin",
        trace_id: getTraceId(request),
        metadata_json: {
          description_updated: patch.description !== undefined,
          is_active_updated: patch.is_active !== undefined
        }
      },
      request.log
    );

    return reply.send(await buildProjectSecretResponse(persistence, updated));
  });

  app.post("/api/projects/:key/secrets/:id/rotate", async (request, reply) => {
    const { key: keyParam, id: secretId } = request.params as { key: string; id: string };
    const projectKey = asProjectKey(keyParam);
    if (!projectKey || !asNonEmptyString(secretId)) {
      return sendError(reply, 400, "Invalid project key or secret id", "VALIDATION_ERROR");
    }

    const body = request.body as ProjectSecretRotateRequest;
    const value = asNonEmptyString(body?.value);
    if (!value) {
      return sendError(reply, 400, "value is required", "VALIDATION_ERROR");
    }
    if (value.length > MAX_PROJECT_SECRET_VALUE_LENGTH) {
      return sendError(
        reply,
        400,
        `value is too large (max ${MAX_PROJECT_SECRET_VALUE_LENGTH} chars)`,
        "VALIDATION_ERROR"
      );
    }

    const existing = await persistence.getProjectSecretById(projectKey, secretId);
    if (!existing) {
      return sendError(reply, 404, "Project secret not found", "NOT_FOUND");
    }

    const encrypted = encryptProjectSecretValue(value, config.secretsMasterKey);
    const rotated = await persistence.rotateProjectSecret(projectKey, secretId, {
      ciphertext: encrypted.ciphertext,
      dek_encrypted: encrypted.dek_encrypted,
      dek_kms_key_id: encrypted.dek_kms_key_id,
      algo: encrypted.algo,
      masked_preview: buildSecretMaskedPreview(value),
      updated_by: "admin",
      rotated_at: new Date()
    });
    if (!rotated) {
      return sendError(reply, 404, "Project secret not found", "NOT_FOUND");
    }

    await writeSecretAuditEventBestEffort(
      persistence,
      {
        secret_id: rotated.id,
        project_id: projectKey,
        event_type: "rotated",
        actor: "admin",
        trace_id: getTraceId(request),
        metadata_json: {
          previous_version: existing.version,
          new_version: rotated.version
        }
      },
      request.log
    );

    return reply.send(await buildProjectSecretResponse(persistence, rotated));
  });

  app.post("/api/projects/:key/secrets/:id/revoke", async (request, reply) => {
    const { key: keyParam, id: secretId } = request.params as { key: string; id: string };
    const projectKey = asProjectKey(keyParam);
    if (!projectKey || !asNonEmptyString(secretId)) {
      return sendError(reply, 400, "Invalid project key or secret id", "VALIDATION_ERROR");
    }

    const revoked = await persistence.revokeProjectSecret(projectKey, secretId, {
      updated_by: "admin",
      revoked_at: new Date()
    });
    if (!revoked) {
      return sendError(reply, 404, "Project secret not found", "NOT_FOUND");
    }

    await writeSecretAuditEventBestEffort(
      persistence,
      {
        secret_id: revoked.id,
        project_id: projectKey,
        event_type: "revoked",
        actor: "admin",
        trace_id: getTraceId(request),
        metadata_json: { key: revoked.key }
      },
      request.log
    );

    return reply.send(await buildProjectSecretResponse(persistence, revoked));
  });

  app.post("/api/projects/:key/secrets/:id/bindings/templates/:templateId", async (request, reply) => {
    const { key: keyParam, id: secretId, templateId } = request.params as {
      key: string;
      id: string;
      templateId: string;
    };
    const projectKey = asProjectKey(keyParam);
    if (!projectKey || !asNonEmptyString(secretId) || !asNonEmptyString(templateId)) {
      return sendError(reply, 400, "Invalid project key, secret id or template id", "VALIDATION_ERROR");
    }

    const secret = await persistence.getProjectSecretById(projectKey, secretId);
    if (!secret) {
      return sendError(reply, 404, "Project secret not found", "NOT_FOUND");
    }

    const binding = await persistence.bindProjectSecretToTemplate(secret.id, templateId, "admin");
    if (!binding) {
      return sendError(reply, 404, "Secret or template not found", "NOT_FOUND");
    }

    await writeSecretAuditEventBestEffort(
      persistence,
      {
        secret_id: secret.id,
        project_id: projectKey,
        event_type: "binding_added",
        actor: "admin",
        trace_id: getTraceId(request),
        metadata_json: {
          binding_type: "template",
          template_id: templateId
        }
      },
      request.log
    );

    return reply.send(projectSecretTemplateBindingToResponse(binding));
  });

  app.delete(
    "/api/projects/:key/secrets/:id/bindings/templates/:templateId",
    async (request, reply) => {
      const { key: keyParam, id: secretId, templateId } = request.params as {
        key: string;
        id: string;
        templateId: string;
      };
      const projectKey = asProjectKey(keyParam);
      if (!projectKey || !asNonEmptyString(secretId) || !asNonEmptyString(templateId)) {
        return sendError(
          reply,
          400,
          "Invalid project key, secret id or template id",
          "VALIDATION_ERROR"
        );
      }

      const secret = await persistence.getProjectSecretById(projectKey, secretId);
      if (!secret) {
        return sendError(reply, 404, "Project secret not found", "NOT_FOUND");
      }

      const deleted = await persistence.unbindProjectSecretFromTemplate(secret.id, templateId);
      if (!deleted) {
        return sendError(reply, 404, "Secret template binding not found", "NOT_FOUND");
      }

      await writeSecretAuditEventBestEffort(
        persistence,
        {
          secret_id: secret.id,
          project_id: projectKey,
          event_type: "binding_removed",
          actor: "admin",
          trace_id: getTraceId(request),
          metadata_json: {
            binding_type: "template",
            template_id: templateId
          }
        },
        request.log
      );

      return reply.send({ ok: true });
    }
  );

  app.post("/api/projects/:key/secrets/:id/bindings/roles/:role", async (request, reply) => {
    const { key: keyParam, id: secretId, role } = request.params as {
      key: string;
      id: string;
      role: string;
    };
    const projectKey = asProjectKey(keyParam);
    const normalizedRole = asNonEmptyString(role) ? normalizeAgentRole(role) : null;
    if (!projectKey || !asNonEmptyString(secretId) || !normalizedRole) {
      return sendError(reply, 400, "Invalid project key, secret id or role", "VALIDATION_ERROR");
    }

    const secret = await persistence.getProjectSecretById(projectKey, secretId);
    if (!secret) {
      return sendError(reply, 404, "Project secret not found", "NOT_FOUND");
    }

    const binding = await persistence.bindProjectSecretToRole(secret.id, normalizedRole, "admin");
    if (!binding) {
      return sendError(reply, 404, "Project secret not found", "NOT_FOUND");
    }

    await writeSecretAuditEventBestEffort(
      persistence,
      {
        secret_id: secret.id,
        project_id: projectKey,
        event_type: "binding_added",
        actor: "admin",
        trace_id: getTraceId(request),
        metadata_json: {
          binding_type: "role",
          role: normalizedRole
        }
      },
      request.log
    );

    return reply.send(projectSecretRoleBindingToResponse(binding));
  });

  app.delete("/api/projects/:key/secrets/:id/bindings/roles/:role", async (request, reply) => {
    const { key: keyParam, id: secretId, role } = request.params as {
      key: string;
      id: string;
      role: string;
    };
    const projectKey = asProjectKey(keyParam);
    const normalizedRole = asNonEmptyString(role) ? normalizeAgentRole(role) : null;
    if (!projectKey || !asNonEmptyString(secretId) || !normalizedRole) {
      return sendError(reply, 400, "Invalid project key, secret id or role", "VALIDATION_ERROR");
    }

    const secret = await persistence.getProjectSecretById(projectKey, secretId);
    if (!secret) {
      return sendError(reply, 404, "Project secret not found", "NOT_FOUND");
    }

    const deleted = await persistence.unbindProjectSecretFromRole(secret.id, normalizedRole);
    if (!deleted) {
      return sendError(reply, 404, "Secret role binding not found", "NOT_FOUND");
    }

    await writeSecretAuditEventBestEffort(
      persistence,
      {
        secret_id: secret.id,
        project_id: projectKey,
        event_type: "binding_removed",
        actor: "admin",
        trace_id: getTraceId(request),
        metadata_json: {
          binding_type: "role",
          role: normalizedRole
        }
      },
      request.log
    );

    return reply.send({ ok: true });
  });

  app.post("/api/tasks", async (request, reply) => {
    const body = request.body as TaskCreateRequest;
    const legacyTaskFields = detectLegacyFields(body, ["repo_id", "branch"]);
    if (legacyTaskFields.length > 0) {
      return sendError(
        reply,
        400,
        `Legacy fields are not supported: ${legacyTaskFields.join(", ")}`,
        "VALIDATION_ERROR"
      );
    }

    const title = asNonEmptyString(body?.title);
    const description = asNonEmptyString(body?.description);
    const projectId = asNonEmptyString(body?.project_id);
    const agentProfileId = asNonEmptyString(body?.agent_profile_id);

    if (!title || !description || !projectId || !agentProfileId) {
      return sendError(
        reply,
        400,
        "title, description, project_id and agent_profile_id are required",
        "VALIDATION_ERROR"
      );
    }

    const [project, profile] = await Promise.all([
      persistence.getProjectByKey(projectId),
      persistence.getAgentProfileById(agentProfileId)
    ]);
    if (!project) {
      return sendError(reply, 404, "Project not found", "PROJECT_NOT_FOUND");
    }
    if (!project.is_active) {
      return sendError(reply, 409, "Project is inactive", "PROJECT_INACTIVE");
    }
    if (!profile) {
      return sendError(reply, 404, "Agent profile not found", "AGENT_PROFILE_NOT_FOUND");
    }
    if (!profile.is_enabled) {
      return sendError(reply, 409, "Agent profile is disabled", "AGENT_PROFILE_DISABLED");
    }

    const priority = typeof body.priority === "number" ? body.priority : 100;

    const createdTask = await persistence.createTask({
      title,
      description,
      project_id: projectId,
      agent_profile_id: agentProfileId,
      priority,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });

    return reply.code(201).send(taskToResponse(createdTask));
  });

  app.get("/api/tasks", async (request, reply) => {
    const query = request.query as { status?: string };
    const statusCandidate = query.status;
    const status = statusCandidate && isTaskStatus(statusCandidate) ? statusCandidate : undefined;

    if (statusCandidate && !status) {
      return sendError(reply, 400, "Invalid task status", "VALIDATION_ERROR");
    }

    const tasks = await persistence.listTasks(status);
    return reply.send({ items: tasks.map((task) => taskToResponse(task)) });
  });

  app.get("/api/tasks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = await persistence.getTaskById(id);
    if (!task) {
      return sendError(reply, 404, "Task not found", "NOT_FOUND");
    }

    return reply.send(taskToResponse(task));
  });

  app.post("/api/tasks/:id/pause", async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = await persistence.updateTaskStatus(id, "INTERRUPTED");
    if (!task) {
      return sendError(reply, 404, "Task not found", "NOT_FOUND");
    }

    return reply.send(taskToResponse(task));
  });

  app.post("/api/tasks/:id/resume", async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = await persistence.updateTaskStatus(id, "QUEUED");
    if (!task) {
      return sendError(reply, 404, "Task not found", "NOT_FOUND");
    }

    return reply.send(taskToResponse(task));
  });

  app.post("/api/tasks/:id/cancel", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as TaskCancelRequest;
    const reason =
      body?.reason === undefined || body.reason === null
        ? null
        : asNonEmptyString(body.reason);
    if (body?.reason !== undefined && body.reason !== null && !reason) {
      return sendError(reply, 400, "reason must be a non-empty string or null", "VALIDATION_ERROR");
    }

    const task = await persistence.getTaskById(id);
    if (!task) {
      return sendError(reply, 404, "Task not found", "NOT_FOUND");
    }

    const waitingStatuses = new Set<TaskStatus>([
      "NEW",
      "QUEUED",
      "WAITING_APPROVAL",
      "WAITING_LIMIT",
      "WAITING_USER",
      "REPLANNING",
      "BLOCKED",
      "FAILED_RETRYABLE"
    ]);
    const activeStatuses = new Set<TaskStatus>([
      "ASSIGNED",
      "STARTING",
      "RUNNING",
      "INTERRUPTING",
      "DRAINING_ACTIVE",
      "SWITCHING_AUTH"
    ]);
    const terminalStatuses = new Set<TaskStatus>([
      "DONE",
      "FAILED_TERMINAL",
      "INTERRUPTED",
      "ARCHIVED",
      "CANCELLED"
    ]);

    if (terminalStatuses.has(task.status)) {
      if (task.status === "CANCELLED") {
        return reply.send(taskToResponse(task));
      }
      return sendError(reply, 409, `Task cannot be cancelled from status ${task.status}`, "TASK_CANCEL_INVALID_STATUS");
    }

    if (waitingStatuses.has(task.status)) {
      const cancelled = await persistence.updateTask(task.id, {
        status: "CANCELLED",
        cancelled_at: new Date(),
        cancel_reason: reason
      });
      if (!cancelled) {
        return sendError(reply, 500, "Failed to cancel task", "INTERNAL_ERROR");
      }
      return reply.send(taskToResponse(cancelled));
    }

    if (activeStatuses.has(task.status)) {
      await persistence.updateTaskStatus(task.id, "INTERRUPTING");
      const runningDelegations = (await persistence.listDelegationRequests({
        statuses: ["requested", "accepted", "running"],
        limit: 200
      })).filter((item) => item.requester_task_id === task.id);

      for (const delegation of runningDelegations) {
        try {
          if (delegationExecutor?.cancel) {
            await delegationExecutor.cancel(delegation.id);
          }
        } catch (error) {
          request.log.warn(
            { err: error, delegation_id: delegation.id, task_id: task.id },
            "Failed to cancel delegation child process"
          );
        }

        await persistence.updateDelegationRequest(delegation.id, {
          status: "cancelled",
          result_summary: reason ? `Task cancelled: ${reason}` : "Task cancelled by operator",
          ended_at: new Date()
        });
      }

      const cancelled = await persistence.updateTask(task.id, {
        status: "CANCELLED",
        cancelled_at: new Date(),
        cancel_reason: reason
      });
      if (!cancelled) {
        return sendError(reply, 500, "Failed to cancel task", "INTERNAL_ERROR");
      }
      return reply.send(taskToResponse(cancelled));
    }

    return sendError(
      reply,
      409,
      `Task cannot be cancelled from status ${task.status}`,
      "TASK_CANCEL_INVALID_STATUS"
    );
  });

  app.post("/api/tasks/:id/replan", async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = await persistence.updateTaskStatus(id, "REPLANNING");
    if (!task) {
      return sendError(reply, 404, "Task not found", "NOT_FOUND");
    }

    return reply.code(202).send({ accepted: true });
  });

  app.post("/api/tasks/:id/say", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as TaskSayRequest;
    const message = asNonEmptyString(body?.message);
    if (!message) {
      return sendError(reply, 400, "message is required", "VALIDATION_ERROR");
    }

    const created = await persistence.createIntervention({
      task_id: id,
      source: "admin",
      type: "steer",
      payload: { message },
      created_by: "admin"
    });
    if (!created) {
      return sendError(reply, 404, "Task not found", "NOT_FOUND");
    }

    return reply.code(202).send({ accepted: true });
  });

  app.post("/api/tasks/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = await persistence.updateTaskStatus(id, "RUNNING");
    if (!task) {
      return sendError(reply, 404, "Task not found", "NOT_FOUND");
    }

    return reply.send(taskToResponse(task));
  });

  app.post("/api/tasks/:id/reject", async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = await persistence.updateTaskStatus(id, "BLOCKED");
    if (!task) {
      return sendError(reply, 404, "Task not found", "NOT_FOUND");
    }

    return reply.send(taskToResponse(task));
  });

  app.post("/api/agents/templates", async (request, reply) => {
    const body = request.body as AgentTemplateCreateRequest;
    const name = asNonEmptyString(body.name);
    const role = asNonEmptyString(body.role);
    const model = asNonEmptyString(body.model);
    const systemPrompt = asNonEmptyString(body.system_prompt);
    const sandboxPolicy = asNonEmptyString(body.sandbox_policy);
    const approvalPolicy = asNonEmptyString(body.approval_policy);

    if (!name || !role || !model || !systemPrompt || !sandboxPolicy || !approvalPolicy) {
      return sendError(
        reply,
        400,
        "name, role, model, system_prompt, sandbox_policy and approval_policy are required",
        "VALIDATION_ERROR"
      );
    }

    if (body.output_schema != null && !isPlainObject(body.output_schema)) {
      return sendError(reply, 400, "output_schema must be an object", "VALIDATION_ERROR");
    }

    const created = await persistence.createAgentTemplate({
      name,
      role,
      description: asNonEmptyString(body.description) ?? undefined,
      model,
      auth_context_id: asNonEmptyString(body.auth_context_id) ?? undefined,
      pack_registry_entry_id:
        body.pack_registry_entry_id == null
          ? undefined
          : asNonEmptyString(body.pack_registry_entry_id),
      system_prompt: systemPrompt,
      instructions_md: asNonEmptyString(body.instructions_md) ?? undefined,
      sandbox_policy: sandboxPolicy,
      approval_policy: approvalPolicy,
      output_schema: isPlainObject(body.output_schema) ? body.output_schema : undefined
    });

    return reply.code(201).send(agentTemplateToResponse(created));
  });

  app.get("/api/agents/templates", async (_request, reply) => {
    const templates = await persistence.listAgentTemplates();
    return reply.send({ items: templates.map((template) => agentTemplateToResponse(template)) });
  });

  app.patch("/api/agents/templates/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as AgentTemplatePatchRequest;

    const patch: Parameters<Persistence["patchAgentTemplate"]>[1] = {};

    if (body.name != null) {
      const value = asNonEmptyString(body.name);
      if (!value) {
        return sendError(reply, 400, "name must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.name = value;
    }

    if (body.role != null) {
      const value = asNonEmptyString(body.role);
      if (!value) {
        return sendError(reply, 400, "role must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.role = value;
    }

    if (body.description != null) {
      const value = asNonEmptyString(body.description);
      if (!value) {
        return sendError(reply, 400, "description must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.description = value;
    }

    if (body.model != null) {
      const value = asNonEmptyString(body.model);
      if (!value) {
        return sendError(reply, 400, "model must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.model = value;
    }

    if (body.auth_context_id != null) {
      const value = asNonEmptyString(body.auth_context_id);
      if (!value) {
        return sendError(reply, 400, "auth_context_id must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.auth_context_id = value;
    }

    if (body.pack_registry_entry_id !== undefined) {
      if (body.pack_registry_entry_id === null) {
        patch.pack_registry_entry_id = null;
      } else {
        const value = asNonEmptyString(body.pack_registry_entry_id);
        if (!value) {
          return sendError(reply, 400, "pack_registry_entry_id must be a non-empty string or null", "VALIDATION_ERROR");
        }
        patch.pack_registry_entry_id = value;
      }
    }

    if (body.system_prompt != null) {
      const value = asNonEmptyString(body.system_prompt);
      if (!value) {
        return sendError(reply, 400, "system_prompt must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.system_prompt = value;
    }

    if (body.instructions_md != null) {
      const value = asNonEmptyString(body.instructions_md);
      if (!value) {
        return sendError(reply, 400, "instructions_md must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.instructions_md = value;
    }

    if (body.sandbox_policy != null) {
      const value = asNonEmptyString(body.sandbox_policy);
      if (!value) {
        return sendError(reply, 400, "sandbox_policy must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.sandbox_policy = value;
    }

    if (body.approval_policy != null) {
      const value = asNonEmptyString(body.approval_policy);
      if (!value) {
        return sendError(reply, 400, "approval_policy must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.approval_policy = value;
    }

    if (body.output_schema != null) {
      if (!isPlainObject(body.output_schema)) {
        return sendError(reply, 400, "output_schema must be an object", "VALIDATION_ERROR");
      }
      patch.output_schema = body.output_schema;
    }

    if (body.is_enabled != null) {
      if (typeof body.is_enabled !== "boolean") {
        return sendError(reply, 400, "is_enabled must be a boolean", "VALIDATION_ERROR");
      }
      patch.is_enabled = body.is_enabled;
    }

    const updated = await persistence.patchAgentTemplate(id, patch);
    if (!updated) {
      return sendError(reply, 404, "Agent template not found", "NOT_FOUND");
    }

    return reply.send(agentTemplateToResponse(updated));
  });

  app.delete("/api/agents/templates/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await persistence.deleteAgentTemplate(id);
    if (!deleted) {
      return sendError(reply, 404, "Agent template not found", "NOT_FOUND");
    }

    return reply.code(204).send();
  });

  app.get("/api/workers", async (_request, reply) => {
    const workers = await persistence.listWorkers();
    return reply.send({ items: workers.map((worker) => workerToResponse(worker)) });
  });

  app.post("/api/workers/:id/restart", async (request, reply) => {
    const { id } = request.params as { id: string };
    const exists = await persistence.workerExists(id);
    if (!exists) {
      return sendError(reply, 404, "Worker not found", "NOT_FOUND");
    }

    await persistence.setWorkerStatus(id, "READY");
    return reply.code(202).send({ accepted: true });
  });

  app.post("/api/workers/:id/disable", async (request, reply) => {
    const { id } = request.params as { id: string };
    const changed = await persistence.setWorkerStatus(id, "DISABLED");
    if (!changed) {
      return sendError(reply, 404, "Worker not found", "NOT_FOUND");
    }

    return reply.code(202).send({ accepted: true });
  });

  app.get("/api/workers/:id/logs", async (request, reply) => {
    const { id } = request.params as { id: string };
    const exists = await persistence.workerExists(id);
    if (!exists) {
      return sendError(reply, 404, "Worker not found", "NOT_FOUND");
    }

    const lines = await persistence.getWorkerLogs(id);
    return reply.send({ lines });
  });

  app.post("/api/auth-contexts", async (request, reply) => {
    const body = request.body as AuthContextCreateRequest;
    const label = asNonEmptyString(body.label);
    const typeValue = asNonEmptyString(body.type);
    const provider = asNonEmptyString(body.provider);

    if (!label || !typeValue || !provider) {
      return sendError(reply, 400, "label, type and provider are required", "VALIDATION_ERROR");
    }

    if (!isAuthContextType(typeValue)) {
      return sendError(reply, 400, "Invalid auth context type", "VALIDATION_ERROR");
    }

    if (body.usage_policy != null && !isPlainObject(body.usage_policy)) {
      return sendError(reply, 400, "usage_policy must be an object", "VALIDATION_ERROR");
    }

    if (body.limit_policy != null && !isPlainObject(body.limit_policy)) {
      return sendError(reply, 400, "limit_policy must be an object", "VALIDATION_ERROR");
    }

    const created = await persistence.createAuthContext({
      label,
      type: typeValue,
      provider,
      usage_policy: isPlainObject(body.usage_policy) ? body.usage_policy : undefined,
      limit_policy: isPlainObject(body.limit_policy) ? body.limit_policy : undefined
    });

    return reply.code(201).send(authContextToResponse(created));
  });

  app.get("/api/auth-contexts", async (_request, reply) => {
    const authContexts = await persistence.listAuthContexts();
    return reply.send({ items: authContexts.map((authContext) => authContextToResponse(authContext)) });
  });

  app.patch("/api/auth-contexts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as AuthContextPatchRequest;

    const patch: Parameters<Persistence["patchAuthContext"]>[1] = {};

    if (body.label != null) {
      const label = asNonEmptyString(body.label);
      if (!label) {
        return sendError(reply, 400, "label must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.label = label;
    }

    if (body.type != null) {
      const typeValue = asNonEmptyString(body.type);
      if (!typeValue || !isAuthContextType(typeValue)) {
        return sendError(reply, 400, "Invalid auth context type", "VALIDATION_ERROR");
      }
      patch.type = typeValue;
    }

    if (body.provider != null) {
      const provider = asNonEmptyString(body.provider);
      if (!provider) {
        return sendError(reply, 400, "provider must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.provider = provider;
    }

    if (body.usage_policy != null) {
      if (!isPlainObject(body.usage_policy)) {
        return sendError(reply, 400, "usage_policy must be an object", "VALIDATION_ERROR");
      }
      patch.usage_policy = body.usage_policy;
    }

    if (body.limit_policy != null) {
      if (!isPlainObject(body.limit_policy)) {
        return sendError(reply, 400, "limit_policy must be an object", "VALIDATION_ERROR");
      }
      patch.limit_policy = body.limit_policy;
    }

    if (body.is_enabled != null) {
      if (typeof body.is_enabled !== "boolean") {
        return sendError(reply, 400, "is_enabled must be a boolean", "VALIDATION_ERROR");
      }
      patch.is_enabled = body.is_enabled;
    }

    if (body.notes != null) {
      const notes = asNonEmptyString(body.notes);
      if (!notes) {
        return sendError(reply, 400, "notes must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.notes = notes;
    }

    const updated = await persistence.patchAuthContext(id, patch);
    if (!updated) {
      return sendError(reply, 404, "Auth context not found", "NOT_FOUND");
    }

    return reply.send(authContextToResponse(updated));
  });

  app.post("/api/auth-contexts/:id/disable", async (request, reply) => {
    const { id } = request.params as { id: string };
    const disabled = await persistence.disableAuthContext(id);
    if (!disabled) {
      return sendError(reply, 404, "Auth context not found", "NOT_FOUND");
    }

    return reply.code(202).send({ accepted: true });
  });

  app.get("/api/tasks/:id/artifacts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const artifacts = await persistence.listTaskArtifacts(id);
    return reply.send({ items: artifacts.map((artifact) => artifactToResponse(artifact)) });
  });

  app.get("/api/artifacts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const artifact = await persistence.getArtifactById(id);
    if (!artifact) {
      return sendError(reply, 404, "Artifact not found", "NOT_FOUND");
    }

    return reply.send(artifactToResponse(artifact));
  });

  app.post("/api/auth-profiles/chatgpt/upload", async (request, reply) => {
    const traceId = getTraceId(request);
    const multipartFile = await request.file();

    if (!multipartFile) {
      return sendError(reply, 400, "Multipart file is required", "VALIDATION_ERROR");
    }

    const label = extractMultipartFieldValue(
      (multipartFile.fields as Record<string, unknown>)["label"]
    );
    if (!label) {
      return sendError(reply, 400, "Field label is required", "VALIDATION_ERROR");
    }

    const fileBuffer = await multipartFile.toBuffer();
    if (fileBuffer.length === 0 || fileBuffer.length > config.maxAuthJsonBytes) {
      return sendError(reply, 400, "Invalid auth.json file size", "VALIDATION_ERROR");
    }

    if (!isAuthJsonUpload(multipartFile.filename, multipartFile.mimetype)) {
      return sendError(
        reply,
        400,
        "File must be auth.json with JSON content type",
        "VALIDATION_ERROR"
      );
    }

    let authJson: Record<string, unknown>;
    try {
      authJson = parseAuthJsonBuffer(fileBuffer);
    } catch (error) {
      request.log.warn(
        { err: error, filename: multipartFile.filename, trace_id: traceId },
        "Invalid auth.json payload"
      );
      return sendError(reply, 400, "auth.json must contain valid JSON object", "VALIDATION_ERROR");
    }

    const checksum = createHash("sha256").update(fileBuffer).digest("hex");
    const objectKey = `auth-profiles/${Date.now()}-${checksum}.auth.json`;

    await storage.putObject(objectKey, fileBuffer, "application/json");

    const createdProfile = await persistence.createAuthProfile({
      label,
      status: "inactive",
      checksum,
      storage_path: objectKey,
      uploaded_by: "admin",
      meta_json: {
        filename: multipartFile.filename,
        upload_content_type: multipartFile.mimetype,
        auth_json_size_bytes: fileBuffer.length,
        auth_mode: typeof authJson["auth_mode"] === "string" ? authJson["auth_mode"] : null,
        stored_object_type: "auth.json"
      }
    });

    await publisher.publish({
      eventType: "auth_profile.uploaded",
      traceId,
      idempotencyKey: checksum,
      payload: {
        profile_id: createdProfile.id,
        label: createdProfile.label,
        checksum: createdProfile.checksum,
        status: createdProfile.status
      }
    });

    return reply.code(201).send(authProfileToResponse(createdProfile));
  });

  app.get("/api/auth-profiles/chatgpt", async (_request, reply) => {
    const profiles = await persistence.listAuthProfiles();
    return reply.send({ items: profiles.map((profile) => authProfileToResponse(profile)) });
  });

  app.delete("/api/auth-profiles/chatgpt/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await persistence.deleteAuthProfile(id);
    if (!deleted) {
      return sendError(reply, 404, "Profile not found", "NOT_FOUND");
    }

    return reply.code(204).send();
  });

  app.post("/api/auth-profiles/chatgpt/:id/activate", async (request, reply) => {
    const traceId = getTraceId(request);
    const { id } = request.params as { id: string };
    const previousActive = await persistence.getActiveAuthProfile();

    let activated: AuthProfileEntity | null;
    try {
      activated = await withRetry({
        operationName: "auth_profile_activate",
        maxAttempts: DEFAULT_AUTH_SWITCH_RETRY_LIMIT,
        initialDelayMs: 50,
        fn: async () => persistence.activateAuthProfile(id, "admin"),
        onRetry: async ({ attempt, error, nextDelayMs }) => {
          const nextAttempt = attempt + 1;
          const now = new Date();
          const errorMessage = getErrorMessage(error);
          app.log.warn(
            {
              operation: "auth_profile_activate",
              attempt,
              nextDelayMs,
              err: error,
              profile_id: id,
              trace_id: traceId
            },
            "Retrying auth profile activate"
          );
          try {
            await persistence.createAuthSwitchEvent({
              module_key: SWITCH_MODULE_KEY,
              from_auth_profile_id: previousActive?.id ?? null,
              to_auth_profile_id: id,
              reason: "manual_activate_retry",
              status: "failed",
              switch_scope: "global",
              details_json: {
                source: "api",
                failed_attempt: attempt,
                next_attempt: nextAttempt,
                next_delay_ms: nextDelayMs,
                error: errorMessage
              },
              started_at: now,
              ended_at: now
            });
          } catch (persistError) {
            app.log.error(
              { err: persistError, profile_id: id, trace_id: traceId },
              "Failed to persist auth_profile.switch.retried"
            );
          }
          try {
            await publisher.publish({
              eventType: "auth_profile.switch.retried",
              traceId,
              idempotencyKey: `${id}:activate_retry:${nextAttempt}:${traceId}`,
              payload: {
                profile_id: id,
                from_profile_id: previousActive?.id ?? null,
                to_profile_id: id,
                reason: "manual_activate_retry",
                failed_attempt: attempt,
                next_attempt: nextAttempt,
                next_delay_ms: nextDelayMs
              }
            });
          } catch (publishError) {
            app.log.error(
              { err: publishError, profile_id: id, trace_id: traceId },
              "Failed to publish auth_profile.switch.retried"
            );
          }
        }
      });
    } catch (error) {
      const now = new Date();
      const errorMessage = getErrorMessage(error);
      try {
        await persistence.createAuthSwitchEvent({
          module_key: SWITCH_MODULE_KEY,
          from_auth_profile_id: previousActive?.id ?? null,
          to_auth_profile_id: id,
          reason: "manual_activate_failed",
          status: "failed",
          switch_scope: "global",
          details_json: {
            source: "api",
            attempts: DEFAULT_AUTH_SWITCH_RETRY_LIMIT,
            error: errorMessage
          },
          started_at: now,
          ended_at: now
        });
      } catch (persistError) {
        app.log.error(
          { err: persistError, profile_id: id, trace_id: traceId },
          "Failed to persist auth_profile.switch.failed"
        );
      }
      try {
        await publisher.publish({
          eventType: "auth_profile.switch.failed",
          traceId,
          idempotencyKey: `${id}:activate_failed:${traceId}`,
          payload: {
            profile_id: id,
            from_profile_id: previousActive?.id ?? null,
            to_profile_id: id,
            reason: "manual_activate_failed",
            attempts: DEFAULT_AUTH_SWITCH_RETRY_LIMIT
          }
        });
      } catch (publishError) {
        app.log.error(
          { err: publishError, profile_id: id, trace_id: traceId },
          "Failed to publish auth_profile.switch.failed"
        );
      }
      app.log.error({ err: error, profile_id: id, trace_id: traceId }, "Auth profile activate failed");
      return sendError(reply, 500, "Auth profile activate failed", "AUTH_SWITCH_FAILED");
    }
    if (!activated) {
      return sendError(reply, 404, "Profile not found", "NOT_FOUND");
    }

    if (previousActive?.id === activated.id) {
      const skippedSwitchEvent = await persistence.createAuthSwitchEvent({
        module_key: SWITCH_MODULE_KEY,
        from_auth_profile_id: activated.id,
        to_auth_profile_id: activated.id,
        reason: "manual_activate_noop",
        status: "skipped",
        switch_scope: "global",
        details_json: { source: "api", reason: "already_active" },
        started_at: new Date(),
        ended_at: new Date()
      });

      await publishEventBestEffort({
        app,
        publisher,
        event: {
          eventType: "auth_profile.switch.skipped",
          traceId,
          idempotencyKey: `${skippedSwitchEvent.id}:${traceId}`,
          payload: {
            profile_id: activated.id,
            from_profile_id: activated.id,
            to_profile_id: activated.id,
            reason: "manual_activate_noop"
          }
        },
        logMessage: "Failed to publish auth_profile.switch.skipped",
        logContext: { profile_id: activated.id }
      });
    } else {
      const holdTransitions = await holdNewAndQueuedTasksForAuthSwitch(persistence);
      if (holdTransitions.length > 0) {
        await publishEventBestEffort({
          app,
          publisher,
          event: {
            eventType: "queue.hold_started",
            traceId,
            idempotencyKey: `queue_hold_start:${traceId}`,
            payload: {
              reason: "auth_switch_started",
              held_count: holdTransitions.length
            }
          },
          logMessage: "Failed to publish queue.hold_started"
        });
        await publishTaskAuthSwitchingEvents({
          app,
          publisher,
          traceId,
          transitions: holdTransitions,
          reason: "auth_switch_hold_started"
        });
      }

      const startedAt = new Date();
      const startedSwitchEvent = await persistence.createAuthSwitchEvent({
        module_key: SWITCH_MODULE_KEY,
        from_auth_profile_id: previousActive?.id ?? null,
        to_auth_profile_id: activated.id,
        reason: "manual_activate",
        status: "started",
        switch_scope: "global",
        details_json: { source: "api" },
        started_at: startedAt,
        ended_at: null
      });

      await publishEventBestEffort({
        app,
        publisher,
        event: {
          eventType: "auth_profile.switch.started",
          traceId,
          idempotencyKey: `${startedSwitchEvent.id}:${traceId}`,
          payload: {
            profile_id: activated.id,
            from_profile_id: previousActive?.id ?? null,
            to_profile_id: activated.id,
            reason: "manual_activate"
          }
        },
        logMessage: "Failed to publish auth_profile.switch.started",
        logContext: { profile_id: activated.id }
      });

      const completedSwitchEvent = await persistence.createAuthSwitchEvent({
        module_key: SWITCH_MODULE_KEY,
        from_auth_profile_id: previousActive?.id ?? null,
        to_auth_profile_id: activated.id,
        reason: "manual_activate",
        status: "completed",
        switch_scope: "global",
        details_json: { source: "api" },
        started_at: startedAt,
        ended_at: new Date()
      });

      await publishEventBestEffort({
        app,
        publisher,
        event: {
          eventType: "auth_profile.switch.completed",
          traceId,
          idempotencyKey: `${completedSwitchEvent.id}:${traceId}`,
          payload: {
            profile_id: activated.id,
            from_profile_id: previousActive?.id ?? null,
            to_profile_id: activated.id,
            reason: "manual_activate"
          }
        },
        logMessage: "Failed to publish auth_profile.switch.completed",
        logContext: { profile_id: activated.id }
      });

      const releaseTransitions = await releaseHeldTasksForAuthSwitch(persistence);
      if (releaseTransitions.length > 0) {
        await publishEventBestEffort({
          app,
          publisher,
          event: {
            eventType: "queue.hold_released",
            traceId,
            idempotencyKey: `queue_hold_release:${traceId}`,
            payload: {
              reason: "auth_switch_completed",
              held_count: releaseTransitions.length
            }
          },
          logMessage: "Failed to publish queue.hold_released"
        });
        await publishTaskAuthSwitchingEvents({
          app,
          publisher,
          traceId,
          transitions: releaseTransitions,
          reason: "auth_switch_release_completed"
        });
      }
    }

    await publishEventBestEffort({
      app,
      publisher,
      event: {
        eventType: "auth_profile.activated",
        traceId,
        idempotencyKey: `${id}:activate`,
        payload: {
          profile_id: activated.id,
          status: activated.status,
          label: activated.label
        }
      },
      logMessage: "Failed to publish auth_profile.activated",
      logContext: { profile_id: activated.id }
    });

    return reply.code(202).send({ accepted: true });
  });

  app.post("/api/auth-profiles/chatgpt/:id/deactivate", async (request, reply) => {
    const traceId = getTraceId(request);
    const { id } = request.params as { id: string };
    const activeBeforeDeactivate = await persistence.getActiveAuthProfile();

    let deactivated: boolean;
    try {
      deactivated = await withRetry({
        operationName: "auth_profile_deactivate",
        maxAttempts: DEFAULT_AUTH_SWITCH_RETRY_LIMIT,
        initialDelayMs: 50,
        fn: async () => persistence.deactivateAuthProfile(id),
        onRetry: async ({ attempt, error, nextDelayMs }) => {
          const nextAttempt = attempt + 1;
          const now = new Date();
          const errorMessage = getErrorMessage(error);
          app.log.warn(
            {
              operation: "auth_profile_deactivate",
              attempt,
              nextDelayMs,
              err: error,
              profile_id: id,
              trace_id: traceId
            },
            "Retrying auth profile deactivate"
          );
          try {
            await persistence.createAuthSwitchEvent({
              module_key: SWITCH_MODULE_KEY,
              from_auth_profile_id: id,
              to_auth_profile_id: null,
              reason: "manual_deactivate_retry",
              status: "failed",
              switch_scope: "global",
              details_json: {
                source: "api",
                failed_attempt: attempt,
                next_attempt: nextAttempt,
                next_delay_ms: nextDelayMs,
                error: errorMessage
              },
              started_at: now,
              ended_at: now
            });
          } catch (persistError) {
            app.log.error(
              { err: persistError, profile_id: id, trace_id: traceId },
              "Failed to persist auth_profile.switch.retried"
            );
          }
          try {
            await publisher.publish({
              eventType: "auth_profile.switch.retried",
              traceId,
              idempotencyKey: `${id}:deactivate_retry:${nextAttempt}:${traceId}`,
              payload: {
                profile_id: null,
                from_profile_id: id,
                to_profile_id: null,
                reason: "manual_deactivate_retry",
                failed_attempt: attempt,
                next_attempt: nextAttempt,
                next_delay_ms: nextDelayMs
              }
            });
          } catch (publishError) {
            app.log.error(
              { err: publishError, profile_id: id, trace_id: traceId },
              "Failed to publish auth_profile.switch.retried"
            );
          }
        }
      });
    } catch (error) {
      const now = new Date();
      const errorMessage = getErrorMessage(error);
      try {
        await persistence.createAuthSwitchEvent({
          module_key: SWITCH_MODULE_KEY,
          from_auth_profile_id: id,
          to_auth_profile_id: null,
          reason: "manual_deactivate_failed",
          status: "failed",
          switch_scope: "global",
          details_json: {
            source: "api",
            attempts: DEFAULT_AUTH_SWITCH_RETRY_LIMIT,
            error: errorMessage
          },
          started_at: now,
          ended_at: now
        });
      } catch (persistError) {
        app.log.error(
          { err: persistError, profile_id: id, trace_id: traceId },
          "Failed to persist auth_profile.switch.failed"
        );
      }
      try {
        await publisher.publish({
          eventType: "auth_profile.switch.failed",
          traceId,
          idempotencyKey: `${id}:deactivate_failed:${traceId}`,
          payload: {
            profile_id: null,
            from_profile_id: id,
            to_profile_id: null,
            reason: "manual_deactivate_failed",
            attempts: DEFAULT_AUTH_SWITCH_RETRY_LIMIT
          }
        });
      } catch (publishError) {
        app.log.error(
          { err: publishError, profile_id: id, trace_id: traceId },
          "Failed to publish auth_profile.switch.failed"
        );
      }
      app.log.error({ err: error, profile_id: id, trace_id: traceId }, "Auth profile deactivate failed");
      return sendError(reply, 500, "Auth profile deactivate failed", "AUTH_SWITCH_FAILED");
    }
    if (!deactivated) {
      return sendError(reply, 404, "Profile not found", "NOT_FOUND");
    }

    if (activeBeforeDeactivate?.id === id) {
      const holdTransitions = await holdNewAndQueuedTasksForAuthSwitch(persistence);
      if (holdTransitions.length > 0) {
        await publishEventBestEffort({
          app,
          publisher,
          event: {
            eventType: "queue.hold_started",
            traceId,
            idempotencyKey: `queue_hold_start:${traceId}`,
            payload: {
              reason: "auth_switch_started",
              held_count: holdTransitions.length
            }
          },
          logMessage: "Failed to publish queue.hold_started"
        });
        await publishTaskAuthSwitchingEvents({
          app,
          publisher,
          traceId,
          transitions: holdTransitions,
          reason: "auth_switch_hold_started"
        });
      }

      const startedAt = new Date();
      const startedSwitchEvent = await persistence.createAuthSwitchEvent({
        module_key: SWITCH_MODULE_KEY,
        from_auth_profile_id: id,
        to_auth_profile_id: null,
        reason: "manual_deactivate",
        status: "started",
        switch_scope: "global",
        details_json: { source: "api" },
        started_at: startedAt,
        ended_at: null
      });

      await publishEventBestEffort({
        app,
        publisher,
        event: {
          eventType: "auth_profile.switch.started",
          traceId,
          idempotencyKey: `${startedSwitchEvent.id}:${traceId}`,
          payload: {
            profile_id: null,
            from_profile_id: id,
            to_profile_id: null,
            reason: "manual_deactivate"
          }
        },
        logMessage: "Failed to publish auth_profile.switch.started",
        logContext: { profile_id: id }
      });

      const completedSwitchEvent = await persistence.createAuthSwitchEvent({
        module_key: SWITCH_MODULE_KEY,
        from_auth_profile_id: id,
        to_auth_profile_id: null,
        reason: "manual_deactivate",
        status: "completed",
        switch_scope: "global",
        details_json: { source: "api" },
        started_at: startedAt,
        ended_at: new Date()
      });

      await publishEventBestEffort({
        app,
        publisher,
        event: {
          eventType: "auth_profile.switch.completed",
          traceId,
          idempotencyKey: `${completedSwitchEvent.id}:${traceId}`,
          payload: {
            profile_id: null,
            from_profile_id: id,
            to_profile_id: null,
            reason: "manual_deactivate"
          }
        },
        logMessage: "Failed to publish auth_profile.switch.completed",
        logContext: { profile_id: id }
      });

      const releaseTransitions = await releaseHeldTasksForAuthSwitch(persistence);
      if (releaseTransitions.length > 0) {
        await publishEventBestEffort({
          app,
          publisher,
          event: {
            eventType: "queue.hold_released",
            traceId,
            idempotencyKey: `queue_hold_release:${traceId}`,
            payload: {
              reason: "auth_switch_completed",
              held_count: releaseTransitions.length
            }
          },
          logMessage: "Failed to publish queue.hold_released"
        });
        await publishTaskAuthSwitchingEvents({
          app,
          publisher,
          traceId,
          transitions: releaseTransitions,
          reason: "auth_switch_release_completed"
        });
      }
    } else {
      const skippedSwitchEvent = await persistence.createAuthSwitchEvent({
        module_key: SWITCH_MODULE_KEY,
        from_auth_profile_id: id,
        to_auth_profile_id: null,
        reason: "manual_deactivate_noop",
        status: "skipped",
        switch_scope: "global",
        details_json: { source: "api", reason: "profile_not_active" },
        started_at: new Date(),
        ended_at: new Date()
      });

      await publishEventBestEffort({
        app,
        publisher,
        event: {
          eventType: "auth_profile.switch.skipped",
          traceId,
          idempotencyKey: `${skippedSwitchEvent.id}:${traceId}`,
          payload: {
            profile_id: null,
            from_profile_id: id,
            to_profile_id: null,
            reason: "manual_deactivate_noop"
          }
        },
        logMessage: "Failed to publish auth_profile.switch.skipped",
        logContext: { profile_id: id }
      });
    }

    return reply.code(202).send({ accepted: true });
  });

  app.get("/api/auth-profiles/chatgpt/:id/limits", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const limits = await authProfileRateLimitsReader.readByProfileId(id);
      if (!limits) {
        return sendError(reply, 404, "Profile not found", "NOT_FOUND");
      }

      return reply.send({
        ...limits,
        profile: {
          ...limits.profile,
          display_id: toAuthProfileDisplayId(limits.profile.label, limits.profile.id)
        }
      });
    } catch (error) {
      if (error instanceof AuthProfileRateLimitsError && error.code === "PROFILE_PAYLOAD_INVALID") {
        request.log.error({ err: error, profile_id: id }, "Stored auth profile payload is invalid");
        return sendError(
          reply,
          500,
          "Stored auth profile payload is invalid",
          "AUTH_PROFILE_PAYLOAD_INVALID"
        );
      }

      request.log.error({ err: error, profile_id: id }, "Failed to fetch live limits");
      return sendError(
        reply,
        502,
        "Failed to fetch live limits via codex app-server",
        "RATE_LIMITS_UNAVAILABLE"
      );
    }
  });

  app.get("/api/auth-profiles/chatgpt/active", async (_request, reply) => {
    const activeProfile = await persistence.getActiveAuthProfile();
    if (!activeProfile) {
      return sendError(reply, 404, "Active profile not found", "NOT_FOUND");
    }

    return reply.send(authProfileToResponse(activeProfile));
  });

  app.get("/api/auth-profiles/chatgpt/switch-events", async (request, reply) => {
    const query = request.query as {
      profile_id?: unknown;
      status?: unknown;
      reason?: unknown;
      limit?: unknown;
    };

    const profileId = asNonEmptyString(query.profile_id) ?? undefined;
    const reason = asNonEmptyString(query.reason) ?? undefined;

    const rawStatus = asNonEmptyString(query.status);
    const status =
      rawStatus === "started" ||
      rawStatus === "completed" ||
      rawStatus === "failed" ||
      rawStatus === "skipped"
        ? rawStatus
        : undefined;

    if (rawStatus && status === undefined) {
      return sendError(
        reply,
        400,
        "status must be one of: started, completed, failed, skipped",
        "VALIDATION_ERROR"
      );
    }

    const parsedLimit = asNonNegativeInteger(query.limit);
    const limit = parsedLimit == null ? undefined : parsedLimit;

    if (query.limit !== undefined && (limit == null || limit < 1)) {
      return sendError(reply, 400, "limit must be a positive integer", "VALIDATION_ERROR");
    }

    const events = await persistence.listAuthSwitchEvents({
      profile_id: profileId,
      status,
      reason,
      limit
    });
    return reply.send({
      items: events.map((event) => ({
        id: event.id,
        module_key: event.module_key,
        from_auth_profile_id: event.from_auth_profile_id,
        to_auth_profile_id: event.to_auth_profile_id,
        reason: event.reason,
        status: event.status,
        started_at: event.started_at,
        ended_at: event.ended_at
      }))
    });
  });

  app.post("/api/packs", async (request, reply) => {
    const traceId = getTraceId(request);
    const body = request.body as PackCreateRequest;
    const packId = asNonEmptyString(body.pack_id);
    const role = asNonEmptyString(body.role);
    const sourceType = asNonEmptyString(body.source_type);
    const sourceRef = asNonEmptyString(body.source_ref);
    const pinnedVersion = asNonEmptyString(body.pinned_version);

    if (!packId || !role || !sourceType || !sourceRef || !pinnedVersion) {
      return sendError(
        reply,
        400,
        "pack_id, role, source_type, source_ref and pinned_version are required",
        "VALIDATION_ERROR"
      );
    }

    if (sourceType !== "git" && sourceType !== "zip") {
      return sendError(reply, 400, "source_type must be git or zip", "VALIDATION_ERROR");
    }

    if (!isPlainObject(body.capabilities_json) || !isPlainObject(body.manifest_json)) {
      return sendError(
        reply,
        400,
        "capabilities_json and manifest_json must be objects",
        "VALIDATION_ERROR"
      );
    }

    const created = await persistence.createPack(
      {
        pack_id: packId,
        role,
        capabilities_json: body.capabilities_json,
        source_type: sourceType,
        source_ref: sourceRef,
        pinned_version: pinnedVersion,
        manifest_json: body.manifest_json
      },
      "admin"
    );

    await publishEventBestEffort({
      app,
      publisher,
      event: {
        eventType: "pack.registered",
        traceId,
        idempotencyKey: `${created.id}:pack_registered:${traceId}`,
        payload: {
          pack_id: created.pack_id,
          source_type: created.source_type,
          pinned_version: created.pinned_version,
          materialize_status: created.materialize_status,
          reason: "pack_registered"
        }
      },
      logMessage: "Failed to publish pack.registered",
      logContext: { pack_id: created.pack_id }
    });

    await publishEventBestEffort({
      app,
      publisher,
      event: {
        eventType: "pack.validated",
        traceId,
        idempotencyKey: `${created.id}:pack_validated:${traceId}`,
        payload: {
          pack_id: created.pack_id,
          source_type: created.source_type,
          pinned_version: created.pinned_version,
          materialize_status: created.materialize_status,
          reason: "schema_valid"
        }
      },
      logMessage: "Failed to publish pack.validated",
      logContext: { pack_id: created.pack_id }
    });

    return reply.code(201).send(packToResponse(created));
  });

  app.get("/api/packs", async (_request, reply) => {
    const packs = await persistence.listPacks();
    return reply.send({ items: packs.map((pack) => packToResponse(pack)) });
  });

  app.get("/api/packs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const pack = await persistence.getPackById(id);
    if (!pack) {
      return sendError(reply, 404, "Pack not found", "NOT_FOUND");
    }

    return reply.send(packToResponse(pack));
  });

  app.patch("/api/packs/:id", async (request, reply) => {
    const traceId = getTraceId(request);
    const { id } = request.params as { id: string };
    const body = request.body as PackPatchRequest;
    const existingPack = await persistence.getPackById(id);
    if (!existingPack) {
      return sendError(reply, 404, "Pack not found", "NOT_FOUND");
    }
    const previousPinnedVersion = existingPack.pinned_version;
    const previousSourceRef = existingPack.source_ref;

    const patch: Parameters<Persistence["patchPack"]>[1] = {};

    if (body.pinned_version != null) {
      const pinnedVersion = asNonEmptyString(body.pinned_version);
      if (!pinnedVersion) {
        return sendError(reply, 400, "pinned_version must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.pinned_version = pinnedVersion;
    }

    if (body.source_ref != null) {
      const sourceRef = asNonEmptyString(body.source_ref);
      if (!sourceRef) {
        return sendError(reply, 400, "source_ref must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.source_ref = sourceRef;
    }

    if (body.is_enabled != null) {
      if (typeof body.is_enabled !== "boolean") {
        return sendError(reply, 400, "is_enabled must be a boolean", "VALIDATION_ERROR");
      }
      patch.is_enabled = body.is_enabled;
    }

    const updated = await persistence.patchPack(id, patch);
    if (!updated) {
      return sendError(reply, 404, "Pack not found", "NOT_FOUND");
    }

    const rotated =
      (patch.pinned_version != null && patch.pinned_version !== previousPinnedVersion) ||
      (patch.source_ref != null && patch.source_ref !== previousSourceRef);
    if (rotated) {
      await publishEventBestEffort({
        app,
        publisher,
        event: {
          eventType: "pack.rotated",
          traceId,
          idempotencyKey: `${updated.id}:pack_rotated:${traceId}`,
          payload: {
            pack_id: updated.pack_id,
            source_type: updated.source_type,
            pinned_version: updated.pinned_version,
            materialize_status: updated.materialize_status,
            reason: "pack_version_or_source_rotated"
          }
        },
        logMessage: "Failed to publish pack.rotated",
        logContext: { pack_id: updated.pack_id }
      });
    }

    return reply.send(packToResponse(updated));
  });

  app.post("/api/packs/:id/materialize", async (request, reply) => {
    const traceId = getTraceId(request);
    const { id } = request.params as { id: string };
    const materialized = await persistence.materializePack(id);
    if (!materialized) {
      return sendError(reply, 404, "Pack not found", "NOT_FOUND");
    }

    const materializedPack = await persistence.getPackById(id);
    if (materializedPack) {
      await publishEventBestEffort({
        app,
        publisher,
        event: {
          eventType: "pack.materialized",
          traceId,
          idempotencyKey: `${materializedPack.id}:pack_materialized:${traceId}`,
          payload: {
            pack_id: materializedPack.pack_id,
            source_type: materializedPack.source_type,
            pinned_version: materializedPack.pinned_version,
            materialize_status: materializedPack.materialize_status,
            reason: "manual_materialize"
          }
        },
        logMessage: "Failed to publish pack.materialized",
        logContext: { pack_id: materializedPack.pack_id }
      });
    }

    return reply.code(202).send({ accepted: true });
  });

  app.post("/api/memory/entries", async (request, reply) => {
    const body = request.body as MemoryEntryCreateRequest;
    const projectId = asNonEmptyString(body.project_id);
    const rawAgentRole = asNonEmptyString(body.agent_role);
    const title = asNonEmptyString(body.title);
    const content = asNonEmptyString(body.content);

    if (!projectId || !rawAgentRole || !title || !content) {
      return sendError(
        reply,
        400,
        "project_id, agent_role, title and content are required",
        "VALIDATION_ERROR"
      );
    }

    const project = await persistence.getProjectByKey(projectId);
    if (!project) {
      return sendError(reply, 404, "Project not found", "PROJECT_NOT_FOUND");
    }
    if (!project.is_active) {
      return sendError(reply, 409, "Project is inactive", "PROJECT_INACTIVE");
    }

    if (content.length > MAX_MEMORY_CONTENT_LENGTH) {
      return sendError(
        reply,
        400,
        `content must be <= ${MAX_MEMORY_CONTENT_LENGTH} chars`,
        "VALIDATION_ERROR"
      );
    }

    let isActive = true;
    if (body.is_active !== undefined && body.is_active !== null) {
      if (typeof body.is_active !== "boolean") {
        return sendError(reply, 400, "is_active must be a boolean", "VALIDATION_ERROR");
      }
      isActive = body.is_active;
    }

    const created = await persistence.createAgentMemoryEntry({
      project_id: projectId,
      agent_role: normalizeAgentRole(rawAgentRole),
      title,
      content,
      is_active: isActive,
      created_by: "admin"
    });

    return reply.code(201).send(memoryEntryToResponse(created));
  });

  app.get("/api/memory/entries", async (request, reply) => {
    const query = request.query as {
      project_id?: unknown;
      agent_role?: unknown;
      is_active?: unknown;
      limit?: unknown;
    };
    const projectId = asNonEmptyString(query.project_id) ?? undefined;
    const role = asNonEmptyString(query.agent_role);
    const parsedLimit = asNonNegativeInteger(query.limit);
    const limit = parsedLimit && parsedLimit > 0 ? parsedLimit : 100;
    if (query.limit != null && (!parsedLimit || parsedLimit <= 0)) {
      return sendError(reply, 400, "limit must be a positive integer", "VALIDATION_ERROR");
    }

    let isActive: boolean | undefined;
    if (query.is_active !== undefined && query.is_active !== null) {
      if (typeof query.is_active === "boolean") {
        isActive = query.is_active;
      } else if (typeof query.is_active === "string") {
        const normalized = query.is_active.trim().toLowerCase();
        if (normalized === "true" || normalized === "1") {
          isActive = true;
        } else if (normalized === "false" || normalized === "0") {
          isActive = false;
        } else {
          return sendError(reply, 400, "is_active must be boolean", "VALIDATION_ERROR");
        }
      } else {
        return sendError(reply, 400, "is_active must be boolean", "VALIDATION_ERROR");
      }
    }

    const items = await persistence.listAgentMemoryEntries({
      project_id: projectId,
      agent_role: role ? normalizeAgentRole(role) : undefined,
      is_active: isActive,
      limit
    });

    return reply.send({
      items: items.map((entry) => memoryEntryToResponse(entry))
    });
  });

  app.patch("/api/memory/entries/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as MemoryEntryPatchRequest;
    const patch: Parameters<Persistence["patchAgentMemoryEntry"]>[1] = {
      updated_by: "admin"
    };

    if (body.title !== undefined) {
      const title = asNonEmptyString(body.title);
      if (!title) {
        return sendError(reply, 400, "title must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.title = title;
    }

    if (body.content !== undefined) {
      const content = asNonEmptyString(body.content);
      if (!content) {
        return sendError(reply, 400, "content must be a non-empty string", "VALIDATION_ERROR");
      }
      if (content.length > MAX_MEMORY_CONTENT_LENGTH) {
        return sendError(
          reply,
          400,
          `content must be <= ${MAX_MEMORY_CONTENT_LENGTH} chars`,
          "VALIDATION_ERROR"
        );
      }
      patch.content = content;
    }

    if (body.is_active !== undefined) {
      if (typeof body.is_active !== "boolean") {
        return sendError(reply, 400, "is_active must be a boolean", "VALIDATION_ERROR");
      }
      patch.is_active = body.is_active;
    }

    if (
      patch.title === undefined &&
      patch.content === undefined &&
      patch.is_active === undefined
    ) {
      return sendError(reply, 400, "No fields to update", "VALIDATION_ERROR");
    }

    const updated = await persistence.patchAgentMemoryEntry(id, patch);
    if (!updated) {
      return sendError(reply, 404, "Memory entry not found", "NOT_FOUND");
    }

    return reply.send(memoryEntryToResponse(updated));
  });

  app.post("/api/agent-requests", async (request, reply) => {
    const body = request.body as AgentRequestCreateRequest;
    const traceId = getTraceId(request);
    const typeValue = asNonEmptyString(body.type);
    const projectId = asProjectKey(body.project_id);
    const taskId = asNonEmptyString(body.task_id);
    const title = asNonEmptyString(body.title);
    const reason = asNonEmptyString(body.reason);

    if (!typeValue || !projectId || !taskId || !title || !reason) {
      return sendError(
        reply,
        400,
        "type, project_id, task_id, title and reason are required",
        "REQUEST_VALIDATION_FAILED"
      );
    }

    if (!isAgentRequestType(typeValue)) {
      return sendError(reply, 400, "Invalid agent request type", "REQUEST_VALIDATION_FAILED");
    }

    let priority = 100;
    if (body.priority !== undefined) {
      if (
        typeof body.priority !== "number" ||
        !Number.isInteger(body.priority) ||
        body.priority < 0 ||
        body.priority > 1_000
      ) {
        return sendError(
          reply,
          400,
          "priority must be an integer between 0 and 1000",
          "REQUEST_VALIDATION_FAILED"
        );
      }
      priority = body.priority;
    }

    const parseOptionalField = (value: unknown, fieldName: string): string | null | undefined => {
      if (value === undefined) {
        return undefined;
      }
      if (value === null) {
        return null;
      }

      const parsed = asNonEmptyString(value);
      if (!parsed) {
        throw new Error(`${fieldName} must be a non-empty string or null`);
      }
      return parsed;
    };

    let agentRunId: string | null | undefined;
    let agentProfileId: string | null | undefined;
    let requestedByAgentId: string | null | undefined;
    try {
      agentRunId = parseOptionalField(body.agent_run_id, "agent_run_id");
      agentProfileId = parseOptionalField(body.agent_profile_id, "agent_profile_id");
      requestedByAgentId = parseOptionalField(body.requested_by_agent_id, "requested_by_agent_id");
    } catch (error) {
      return sendError(reply, 400, getErrorMessage(error), "REQUEST_VALIDATION_FAILED");
    }

    let requestPayload: Record<string, unknown> | null | undefined;
    if (body.request_payload !== undefined) {
      if (body.request_payload === null) {
        requestPayload = null;
      } else if (!isPlainObject(body.request_payload)) {
        return sendError(
          reply,
          400,
          "request_payload must be an object or null",
          "REQUEST_VALIDATION_FAILED"
        );
      } else {
        requestPayload = body.request_payload;
      }
    }

    const project = await persistence.getProjectByKey(projectId);
    if (!project) {
      return sendError(reply, 404, "Project not found", "PROJECT_NOT_FOUND");
    }
    if (!project.is_active) {
      return sendError(reply, 409, "Project is inactive", "PROJECT_INACTIVE");
    }

    const task = await persistence.getTaskById(taskId);
    if (!task) {
      return sendError(reply, 404, "Task not found", "TASK_NOT_FOUND");
    }
    if (task.project_id !== projectId) {
      return sendError(
        reply,
        409,
        "Task belongs to another project",
        "REQUEST_VALIDATION_FAILED"
      );
    }

    const created = await persistence.createAgentRequest({
      type: typeValue,
      priority,
      project_id: projectId,
      task_id: taskId,
      agent_run_id: agentRunId,
      agent_profile_id: agentProfileId,
      requested_by_agent_id: requestedByAgentId,
      title,
      reason,
      request_payload_json: requestPayload,
      created_by: "admin"
    });

    await persistence.createAgentRequestAuditEvent({
      request_id: created.id,
      event_type: "request_created",
      from_status: null,
      to_status: created.status,
      actor_type: "admin_api",
      actor_id: "admin",
      trace_id: traceId,
      metadata_json: {
        type: created.type,
        project_id: created.project_id,
        task_id: created.task_id,
        priority: created.priority
      }
    });

    return reply.code(201).send(agentRequestToResponse(created));
  });

  app.get("/api/agent-requests", async (request, reply) => {
    const query = request.query as {
      project_id?: unknown;
      task_id?: unknown;
      agent_profile_id?: unknown;
      type?: unknown;
      status?: unknown;
      limit?: unknown;
      open_pool?: unknown;
      include_in_progress?: unknown;
    };

    const projectId = asProjectKey(query.project_id) ?? undefined;
    const taskId = asNonEmptyString(query.task_id) ?? undefined;
    const agentProfileId = asNonEmptyString(query.agent_profile_id) ?? undefined;

    const typeCandidate = asNonEmptyString(query.type);
    let type: AgentRequestType | undefined;
    if (typeCandidate) {
      if (!isAgentRequestType(typeCandidate)) {
        return sendError(reply, 400, "Invalid type filter", "REQUEST_VALIDATION_FAILED");
      }
      type = typeCandidate;
    }

    const statusCandidate = asNonEmptyString(query.status);
    let status: AgentRequestStatus | undefined;
    if (statusCandidate) {
      if (!isAgentRequestStatus(statusCandidate)) {
        return sendError(reply, 400, "Invalid status filter", "REQUEST_VALIDATION_FAILED");
      }
      status = statusCandidate;
    }
    const parsedLimit = asNonNegativeInteger(query.limit);
    if (query.limit !== undefined && (!parsedLimit || parsedLimit < 1)) {
      return sendError(reply, 400, "limit must be a positive integer", "REQUEST_VALIDATION_FAILED");
    }
    const limit = parsedLimit && parsedLimit > 0 ? parsedLimit : 100;

    let openPool = false;
    if (query.open_pool !== undefined) {
      const parsed = parseBooleanLike(query.open_pool);
      if (parsed === null) {
        return sendError(reply, 400, "open_pool must be boolean", "REQUEST_VALIDATION_FAILED");
      }
      openPool = parsed;
    }

    let includeInProgress = false;
    if (query.include_in_progress !== undefined) {
      const parsed = parseBooleanLike(query.include_in_progress);
      if (parsed === null) {
        return sendError(
          reply,
          400,
          "include_in_progress must be boolean",
          "REQUEST_VALIDATION_FAILED"
        );
      }
      includeInProgress = parsed;
    }

    if (openPool && status) {
      return sendError(
        reply,
        400,
        "status filter cannot be combined with open_pool",
        "REQUEST_VALIDATION_FAILED"
      );
    }

    const statuses = openPool
      ? ([
          "open",
          "blocked_agent",
          ...(includeInProgress ? (["in_progress"] as const) : [])
        ] as AgentRequestStatus[])
      : status
        ? ([status] as AgentRequestStatus[])
        : undefined;

    const items = await persistence.listAgentRequests({
      project_id: projectId,
      task_id: taskId,
      agent_profile_id: agentProfileId,
      type,
      statuses,
      limit
    });

    return reply.send({
      items: items.map((item) => agentRequestToResponse(item))
    });
  });

  app.get("/api/agent-requests/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await persistence.getAgentRequestById(id);
    if (!item) {
      return sendError(reply, 404, "Agent request not found", "REQUEST_NOT_FOUND");
    }

    return reply.send(agentRequestToResponse(item));
  });

  app.get("/api/agent-requests/:id/audit", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { limit?: unknown };
    const parsedLimit = asNonNegativeInteger(query.limit);
    if (query.limit !== undefined && (!parsedLimit || parsedLimit < 1)) {
      return sendError(reply, 400, "limit must be a positive integer", "REQUEST_VALIDATION_FAILED");
    }
    const limit = parsedLimit && parsedLimit > 0 ? parsedLimit : 100;

    const item = await persistence.getAgentRequestById(id);
    if (!item) {
      return sendError(reply, 404, "Agent request not found", "REQUEST_NOT_FOUND");
    }

    const events = await persistence.listAgentRequestAuditEvents(id, { limit });
    return reply.send({
      items: events.map((event) => agentRequestAuditEventToResponse(event))
    });
  });

  app.post("/api/agent-requests/:id/resolve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const traceId = getTraceId(request);
    const body = request.body as AgentRequestResolveRequest;
    const statusValue = asNonEmptyString(body.status);
    if (!statusValue || !isAgentRequestStatus(statusValue)) {
      return sendError(reply, 400, "Invalid status", "REQUEST_VALIDATION_FAILED");
    }
    if (!AGENT_REQUEST_RESOLVE_ALLOWED_STATUSES.has(statusValue)) {
      return sendError(
        reply,
        400,
        "status is not allowed for resolve flow",
        "REQUEST_VALIDATION_FAILED"
      );
    }

    let resolutionPayload: Record<string, unknown> | null | undefined;
    if (body.resolution_payload !== undefined) {
      if (body.resolution_payload === null) {
        resolutionPayload = null;
      } else if (!isPlainObject(body.resolution_payload)) {
        return sendError(
          reply,
          400,
          "resolution_payload must be an object or null",
          "REQUEST_VALIDATION_FAILED"
        );
      } else {
        resolutionPayload = body.resolution_payload;
      }
    }

    const parseNullableActor = (
      value: unknown,
      fieldName: string
    ): string | null | undefined => {
      if (value === undefined) {
        return undefined;
      }
      if (value === null) {
        return null;
      }
      const parsed = asNonEmptyString(value);
      if (!parsed) {
        throw new Error(`${fieldName} must be a non-empty string or null`);
      }
      return parsed;
    };

    let claimedByGovernorId: string | null | undefined;
    let resolvedBy: string | null | undefined;
    try {
      claimedByGovernorId = parseNullableActor(body.claimed_by_governor_id, "claimed_by_governor_id");
      resolvedBy = parseNullableActor(body.resolved_by, "resolved_by");
    } catch (error) {
      return sendError(reply, 400, getErrorMessage(error), "REQUEST_VALIDATION_FAILED");
    }

    const existing = await persistence.getAgentRequestById(id);
    if (!existing) {
      return sendError(reply, 404, "Agent request not found", "REQUEST_NOT_FOUND");
    }
    const previousStatus = existing.status;

    if (
      AGENT_REQUEST_TERMINAL_STATUSES.has(existing.status) &&
      existing.status !== statusValue
    ) {
      return sendError(
        reply,
        409,
        `Terminal request cannot transition from ${existing.status} to ${statusValue}`,
        "REQUEST_STATE_CONFLICT"
      );
    }

    const isTerminalStatus = AGENT_REQUEST_TERMINAL_STATUSES.has(statusValue);
    const resolvedAt = isTerminalStatus
      ? existing.status === statusValue
        ? (existing.resolved_at ?? new Date())
        : new Date()
      : null;

    const updated = await persistence.resolveAgentRequest(id, {
      status: statusValue,
      resolution_payload_json: resolutionPayload,
      claimed_by_governor_id:
        claimedByGovernorId === undefined ? existing.claimed_by_governor_id : claimedByGovernorId,
      resolved_by: isTerminalStatus
        ? (resolvedBy ?? existing.resolved_by ?? "admin")
        : null,
      resolved_at: resolvedAt
    });
    if (!updated) {
      return sendError(reply, 404, "Agent request not found", "REQUEST_NOT_FOUND");
    }

    await persistence.createAgentRequestAuditEvent({
      request_id: updated.id,
      event_type: getAgentRequestStatusEventType(statusValue),
      from_status: previousStatus,
      to_status: updated.status,
      actor_type: claimedByGovernorId ? "governor" : "admin_api",
      actor_id: claimedByGovernorId ?? resolvedBy ?? "admin",
      trace_id: traceId,
      metadata_json: {
        requested_status: statusValue,
        previous_status: previousStatus,
        current_status: updated.status,
        resolution_payload: updated.resolution_payload_json
      }
    });

    return reply.send(agentRequestToResponse(updated));
  });

  app.post("/api/agent-profiles", async (request, reply) => {
    const body = request.body as AgentProfileCreateRequest;
    const name = asNonEmptyString(body.name);
    const roleValue = asNonEmptyString(body.role);
    if (!name || !roleValue) {
      return sendError(
        reply,
        400,
        "name and role are required",
        "REQUEST_VALIDATION_FAILED"
      );
    }

    const sourcePolicyCandidate = asNonEmptyString(body.source_policy);
    if (body.source_policy !== undefined && !sourcePolicyCandidate) {
      return sendError(
        reply,
        400,
        "source_policy must be a non-empty string",
        "REQUEST_VALIDATION_FAILED"
      );
    }
    let sourcePolicy: AgentProfileSourcePolicy = "catalog_only";
    if (sourcePolicyCandidate) {
      if (!isAgentProfileSourcePolicy(sourcePolicyCandidate)) {
        return sendError(reply, 400, "Invalid source_policy", "REQUEST_VALIDATION_FAILED");
      }
      sourcePolicy = sourcePolicyCandidate;
    }

    let description: string | null | undefined;
    if (body.description !== undefined) {
      if (body.description === null) {
        description = null;
      } else {
        const parsed = asNonEmptyString(body.description);
        if (!parsed) {
          return sendError(
            reply,
            400,
            "description must be a non-empty string or null",
            "REQUEST_VALIDATION_FAILED"
          );
        }
        description = parsed;
      }
    }

    let isEnabled = true;
    if (body.is_enabled !== undefined) {
      if (typeof body.is_enabled !== "boolean") {
        return sendError(reply, 400, "is_enabled must be a boolean", "REQUEST_VALIDATION_FAILED");
      }
      isEnabled = body.is_enabled;
    }

    const created = await persistence.createAgentProfile({
      name,
      role: normalizeAgentRole(roleValue),
      description,
      source_policy: sourcePolicy,
      is_enabled: isEnabled
    });

    const orchestratorServer = await persistence.ensureOrchestratorMcpServer();
    await persistence.bindMcpServerToAgentProfile(created.id, orchestratorServer.id, {
      is_required: true,
      priority: 0,
      config_json: null
    });

    return reply.code(201).send(agentProfileToResponse(created));
  });

  app.get("/api/agent-profiles", async (request, reply) => {
    const query = request.query as {
      include_disabled?: unknown;
      role?: unknown;
      limit?: unknown;
    };

    let includeDisabled = true;
    if (query.include_disabled !== undefined) {
      const parsed = parseBooleanLike(query.include_disabled);
      if (parsed === null) {
        return sendError(
          reply,
          400,
          "include_disabled must be boolean",
          "REQUEST_VALIDATION_FAILED"
        );
      }
      includeDisabled = parsed;
    }

    const roleCandidate = asNonEmptyString(query.role);
    const parsedLimit = asNonNegativeInteger(query.limit);
    if (query.limit !== undefined && (!parsedLimit || parsedLimit < 1)) {
      return sendError(reply, 400, "limit must be a positive integer", "REQUEST_VALIDATION_FAILED");
    }
    const limit = parsedLimit && parsedLimit > 0 ? parsedLimit : 100;

    const items = await persistence.listAgentProfiles({
      include_disabled: includeDisabled,
      role: roleCandidate ? normalizeAgentRole(roleCandidate) : undefined,
      limit
    });

    return reply.send({
      items: items.map((item) => agentProfileToResponse(item))
    });
  });

  app.get("/api/agent-profiles/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await persistence.getAgentProfileById(id);
    if (!profile) {
      return sendError(reply, 404, "Agent profile not found", "AGENT_PROFILE_NOT_FOUND");
    }

    return reply.send(agentProfileToResponse(profile));
  });

  app.patch("/api/agent-profiles/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as AgentProfilePatchRequest;
    const patch: Parameters<Persistence["patchAgentProfile"]>[1] = {};

    if (body.name !== undefined) {
      const name = asNonEmptyString(body.name);
      if (!name) {
        return sendError(reply, 400, "name must be a non-empty string", "REQUEST_VALIDATION_FAILED");
      }
      patch.name = name;
    }

    if (body.role !== undefined) {
      const roleValue = asNonEmptyString(body.role);
      if (!roleValue) {
        return sendError(reply, 400, "role must be a non-empty string", "REQUEST_VALIDATION_FAILED");
      }
      patch.role = normalizeAgentRole(roleValue);
    }

    if (body.description !== undefined) {
      if (body.description === null) {
        patch.description = null;
      } else {
        const description = asNonEmptyString(body.description);
        if (!description) {
          return sendError(
            reply,
            400,
            "description must be a non-empty string or null",
            "REQUEST_VALIDATION_FAILED"
          );
        }
        patch.description = description;
      }
    }

    if (body.source_policy !== undefined) {
      const sourcePolicy = asNonEmptyString(body.source_policy);
      if (!sourcePolicy) {
        return sendError(
          reply,
          400,
          "source_policy must be a non-empty string",
          "REQUEST_VALIDATION_FAILED"
        );
      }
      if (!isAgentProfileSourcePolicy(sourcePolicy)) {
        return sendError(reply, 400, "Invalid source_policy", "REQUEST_VALIDATION_FAILED");
      }
      patch.source_policy = sourcePolicy;
    }

    if (body.is_enabled !== undefined) {
      if (typeof body.is_enabled !== "boolean") {
        return sendError(reply, 400, "is_enabled must be a boolean", "REQUEST_VALIDATION_FAILED");
      }
      patch.is_enabled = body.is_enabled;
    }

    if (
      patch.name === undefined &&
      patch.role === undefined &&
      patch.description === undefined &&
      patch.source_policy === undefined &&
      patch.is_enabled === undefined
    ) {
      return sendError(reply, 400, "No fields to update", "REQUEST_VALIDATION_FAILED");
    }

    const updated = await persistence.patchAgentProfile(id, patch);
    if (!updated) {
      return sendError(reply, 404, "Agent profile not found", "AGENT_PROFILE_NOT_FOUND");
    }

    return reply.send(agentProfileToResponse(updated));
  });

  app.get("/api/agent-profiles/:id/mcp-servers", async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await persistence.getAgentProfileById(id);
    if (!profile) {
      return sendError(reply, 404, "Agent profile not found", "AGENT_PROFILE_NOT_FOUND");
    }

    const [bindings, servers] = await Promise.all([
      persistence.listAgentProfileMcpBindings(id),
      persistence.listMcpServerRegistry({ include_unapproved: true })
    ]);
    const serverById = new Map(servers.map((server) => [server.id, server]));

    return reply.send({
      items: bindings.map((binding) =>
        agentProfileMcpBindingToResponse(binding, serverById.get(binding.mcp_server_id) ?? null)
      )
    });
  });

  app.post("/api/agent-profiles/:id/mcp-servers/:serverId", async (request, reply) => {
    const { id, serverId } = request.params as { id: string; serverId: string };
    const body = request.body as AgentProfileMcpBindingRequest;
    const profile = await persistence.getAgentProfileById(id);
    if (!profile) {
      return sendError(reply, 404, "Agent profile not found", "AGENT_PROFILE_NOT_FOUND");
    }

    const server = await persistence.getMcpServerRegistryById(serverId);
    if (!server) {
      return sendError(reply, 404, "MCP server not found", "MCP_SERVER_NOT_FOUND");
    }

    let isRequired: boolean | undefined;
    if (body.is_required !== undefined) {
      if (typeof body.is_required !== "boolean") {
        return sendError(
          reply,
          400,
          "is_required must be a boolean",
          "REQUEST_VALIDATION_FAILED"
        );
      }
      isRequired = body.is_required;
    }
    if (server.name === ORCHESTRATOR_MCP_SERVER_NAME && isRequired === false) {
      return sendError(
        reply,
        409,
        "orchestrator MCP binding is mandatory",
        "MCP_SERVER_REQUIRED"
      );
    }

    let priority: number | undefined;
    if (body.priority !== undefined) {
      if (
        typeof body.priority !== "number" ||
        !Number.isInteger(body.priority) ||
        body.priority < 0 ||
        body.priority > 1_000
      ) {
        return sendError(
          reply,
          400,
          "priority must be an integer between 0 and 1000",
          "REQUEST_VALIDATION_FAILED"
        );
      }
      priority = body.priority;
    }

    let configJson: Record<string, unknown> | null | undefined;
    if (body.config_json !== undefined) {
      if (body.config_json === null) {
        configJson = null;
      } else if (!isPlainObject(body.config_json)) {
        return sendError(
          reply,
          400,
          "config_json must be an object or null",
          "REQUEST_VALIDATION_FAILED"
        );
      } else {
        configJson = body.config_json;
      }
    }

    const bound = await persistence.bindMcpServerToAgentProfile(id, serverId, {
      is_required:
        server.name === ORCHESTRATOR_MCP_SERVER_NAME
          ? true
          : isRequired,
      priority:
        server.name === ORCHESTRATOR_MCP_SERVER_NAME && priority === undefined
          ? 0
          : priority,
      config_json: configJson
    });
    if (!bound) {
      return sendError(reply, 404, "Profile or MCP server not found", "REQUEST_VALIDATION_FAILED");
    }

    return reply.send(agentProfileMcpBindingToResponse(bound, server));
  });

  app.delete("/api/agent-profiles/:id/mcp-servers/:serverId", async (request, reply) => {
    const { id, serverId } = request.params as { id: string; serverId: string };
    const profile = await persistence.getAgentProfileById(id);
    if (!profile) {
      return sendError(reply, 404, "Agent profile not found", "AGENT_PROFILE_NOT_FOUND");
    }

    const server = await persistence.getMcpServerRegistryById(serverId);
    if (!server) {
      return sendError(reply, 404, "MCP server not found", "MCP_SERVER_NOT_FOUND");
    }
    if (server.name === ORCHESTRATOR_MCP_SERVER_NAME) {
      return sendError(
        reply,
        409,
        "orchestrator MCP binding cannot be removed",
        "MCP_SERVER_REQUIRED"
      );
    }

    const deleted = await persistence.unbindMcpServerFromAgentProfile(id, serverId);
    if (!deleted) {
      return sendError(reply, 404, "MCP binding not found", "NOT_FOUND");
    }

    return reply.code(204).send();
  });

  app.get("/api/agent-profiles/:id/scripts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await persistence.getAgentProfileById(id);
    if (!profile) {
      return sendError(reply, 404, "Agent profile not found", "AGENT_PROFILE_NOT_FOUND");
    }

    const items = await persistence.listAgentProfileScriptSets(id);
    return reply.send({
      items: items.map((item) => agentProfileScriptSetToResponse(item))
    });
  });

  app.put("/api/agent-profiles/:id/scripts/:os", async (request, reply) => {
    const { id, os } = request.params as { id: string; os: string };
    if (!isAgentProfileScriptOs(os)) {
      return sendError(reply, 400, "Invalid script os", "REQUEST_VALIDATION_FAILED");
    }

    const body = request.body as AgentProfileScriptUpsertRequest;
    const content = asNonEmptyString(body.content);
    if (!content) {
      return sendError(reply, 400, "content must be a non-empty string", "REQUEST_VALIDATION_FAILED");
    }
    if (content.length > MAX_AGENT_PROFILE_SCRIPT_CONTENT_LENGTH) {
      return sendError(
        reply,
        400,
        `content must be <= ${MAX_AGENT_PROFILE_SCRIPT_CONTENT_LENGTH} chars`,
        "REQUEST_VALIDATION_FAILED"
      );
    }

    const scriptTypeCandidate = asNonEmptyString(body.script_type);
    if (body.script_type !== undefined && !scriptTypeCandidate) {
      return sendError(
        reply,
        400,
        "script_type must be a non-empty string",
        "REQUEST_VALIDATION_FAILED"
      );
    }
    let scriptType: AgentProfileScriptType = "instruction";
    if (scriptTypeCandidate) {
      if (!isAgentProfileScriptType(scriptTypeCandidate)) {
        return sendError(reply, 400, "Invalid script_type", "REQUEST_VALIDATION_FAILED");
      }
      scriptType = scriptTypeCandidate;
    }

    const upserted = await persistence.upsertAgentProfileScriptSet(id, {
      os,
      script_type: scriptType,
      content
    });
    if (!upserted) {
      return sendError(reply, 404, "Agent profile not found", "AGENT_PROFILE_NOT_FOUND");
    }

    return reply.send(agentProfileScriptSetToResponse(upserted));
  });

  app.post("/api/mcp/servers", async (request, reply) => {
    const body = request.body as McpServerCreateRequest;
    const name = asNonEmptyString(body.name);
    const transport = asNonEmptyString(body.transport);
    const endpointOrCommand = asNonEmptyString(body.endpoint_or_command);
    const originType = asNonEmptyString(body.origin_type);

    if (!name || !transport || !endpointOrCommand || !originType) {
      return sendError(
        reply,
        400,
        "name, transport, endpoint_or_command and origin_type are required",
        "REQUEST_VALIDATION_FAILED"
      );
    }
    if (!isMcpServerTransport(transport)) {
      return sendError(reply, 400, "Invalid transport", "REQUEST_VALIDATION_FAILED");
    }
    if (!isMcpServerOriginType(originType)) {
      return sendError(reply, 400, "Invalid origin_type", "REQUEST_VALIDATION_FAILED");
    }

    let isApproved: boolean | undefined;
    if (body.is_approved !== undefined) {
      if (typeof body.is_approved !== "boolean") {
        return sendError(
          reply,
          400,
          "is_approved must be a boolean",
          "REQUEST_VALIDATION_FAILED"
        );
      }
      isApproved = body.is_approved;
    }

    let metaJson: Record<string, unknown> | null | undefined;
    if (body.meta_json !== undefined) {
      if (body.meta_json === null) {
        metaJson = null;
      } else if (!isPlainObject(body.meta_json)) {
        return sendError(
          reply,
          400,
          "meta_json must be an object or null",
          "REQUEST_VALIDATION_FAILED"
        );
      } else {
        metaJson = body.meta_json;
      }
    }

    try {
      const created = await persistence.createMcpServerRegistryEntry({
        name,
        transport,
        endpoint_or_command: endpointOrCommand,
        origin_type: originType,
        is_approved: isApproved,
        meta_json: metaJson
      });

      return reply.code(201).send(mcpServerRegistryToResponse(created));
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        return sendError(reply, 409, "MCP server name already exists", "MCP_SERVER_NAME_EXISTS");
      }
      throw error;
    }
  });

  app.get("/api/mcp/servers", async (request, reply) => {
    const query = request.query as {
      include_unapproved?: unknown;
    };

    let includeUnapproved = false;
    if (query.include_unapproved !== undefined) {
      const parsed = parseBooleanLike(query.include_unapproved);
      if (parsed === null) {
        return sendError(
          reply,
          400,
          "include_unapproved must be boolean",
          "REQUEST_VALIDATION_FAILED"
        );
      }
      includeUnapproved = parsed;
    }

    await persistence.ensureOrchestratorMcpServer();
    const items = await persistence.listMcpServerRegistry({
      include_unapproved: includeUnapproved
    });

    return reply.send({
      items: items.map((item) => mcpServerRegistryToResponse(item))
    });
  });

  app.post("/api/mcp/keys", async (request, reply) => {
    const body = request.body as McpApiKeyCreateRequest;
    const name = asNonEmptyString(body.name);
    if (!name) {
      return sendError(reply, 400, "name is required", "REQUEST_VALIDATION_FAILED");
    }

    let expiresAt: Date | null | undefined;
    try {
      expiresAt = parseOptionalIsoDate(body.expires_at, "expires_at");
    } catch (error) {
      return sendError(reply, 400, getErrorMessage(error), "REQUEST_VALIDATION_FAILED");
    }

    let metaJson: Record<string, unknown> | null | undefined;
    if (body.meta_json !== undefined) {
      if (body.meta_json === null) {
        metaJson = null;
      } else if (!isPlainObject(body.meta_json)) {
        return sendError(
          reply,
          400,
          "meta_json must be an object or null",
          "REQUEST_VALIDATION_FAILED"
        );
      } else {
        metaJson = body.meta_json;
      }
    }

    let aclTools: string[] | undefined;
    let profileIds: string[] | undefined;
    try {
      aclTools = parseOptionalStringArray(body.acl_tools, "acl_tools", {
        maxItems: MAX_MCP_KEY_ACL_TOOLS
      });
      profileIds = parseOptionalStringArray(body.profile_ids, "profile_ids", {
        maxItems: MAX_MCP_KEY_PROFILE_BINDINGS
      });
    } catch (error) {
      return sendError(reply, 400, getErrorMessage(error), "REQUEST_VALIDATION_FAILED");
    }

    if (profileIds?.length) {
      const profileChecks = await Promise.all(
        profileIds.map(async (profileId) => ({
          profileId,
          profile: await persistence.getAgentProfileById(profileId)
        }))
      );
      const missingProfile = profileChecks.find((item) => !item.profile);
      if (missingProfile) {
        return sendError(
          reply,
          404,
          `Agent profile not found: ${missingProfile.profileId}`,
          "AGENT_PROFILE_NOT_FOUND"
        );
      }
    }

    let created: McpApiKeyEntity | null = null;
    let issuedSecret: string | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const generated = generateMcpApiKeySecret();
      try {
        created = await persistence.createMcpApiKey({
          name,
          key_prefix: generated.key_prefix,
          key_hash: generated.key_hash,
          status: "active",
          expires_at: expiresAt,
          created_by: "admin",
          updated_by: "admin",
          meta_json: metaJson
        });
        issuedSecret = generated.secret;
        break;
      } catch (error) {
        if (isPrismaUniqueConstraintError(error) && attempt < 2) {
          continue;
        }
        throw error;
      }
    }

    if (!created || !issuedSecret) {
      return sendError(reply, 500, "Failed to generate MCP API key", "INTERNAL_ERROR");
    }

    if (aclTools !== undefined) {
      await persistence.replaceMcpKeyAclRules(created.id, {
        tool_names: aclTools,
        created_by: "admin"
      });
    }
    if (profileIds?.length) {
      for (const profileId of profileIds) {
        await persistence.bindMcpKeyToProfile(created.id, profileId, "admin");
      }
    }

    const responseBody = await buildMcpApiKeyResponse(persistence, created);
    return reply.code(201).send({
      ...responseBody,
      secret: issuedSecret
    });
  });

  app.get("/api/mcp/keys", async (request, reply) => {
    const query = request.query as {
      status?: unknown;
      include_revoked?: unknown;
      limit?: unknown;
    };

    let status: McpApiKeyStatus | undefined;
    if (query.status !== undefined) {
      const parsedStatus = asNonEmptyString(query.status);
      if (!parsedStatus || !isMcpApiKeyStatus(parsedStatus)) {
        return sendError(reply, 400, "Invalid status filter", "REQUEST_VALIDATION_FAILED");
      }
      status = parsedStatus;
    }

    let includeRevoked = false;
    if (query.include_revoked !== undefined) {
      const parsed = parseBooleanLike(query.include_revoked);
      if (parsed === null) {
        return sendError(
          reply,
          400,
          "include_revoked must be boolean",
          "REQUEST_VALIDATION_FAILED"
        );
      }
      includeRevoked = parsed;
    }

    const parsedLimit = asNonNegativeInteger(query.limit);
    if (query.limit !== undefined && (!parsedLimit || parsedLimit < 1)) {
      return sendError(reply, 400, "limit must be a positive integer", "REQUEST_VALIDATION_FAILED");
    }
    const limit = parsedLimit && parsedLimit > 0 ? parsedLimit : 100;

    const keys = await persistence.listMcpApiKeys({
      status,
      include_revoked: includeRevoked,
      limit
    });

    const items = await Promise.all(keys.map((item) => buildMcpApiKeyResponse(persistence, item)));
    return reply.send({ items });
  });

  app.patch("/api/mcp/keys/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as McpApiKeyPatchRequest;
    const existing = await persistence.getMcpApiKeyById(id);
    if (!existing) {
      return sendError(reply, 404, "MCP key not found", "MCP_KEY_NOT_FOUND");
    }

    const patch: Parameters<Persistence["patchMcpApiKey"]>[1] = {};

    if (body.name !== undefined) {
      const name = asNonEmptyString(body.name);
      if (!name) {
        return sendError(reply, 400, "name must be a non-empty string", "REQUEST_VALIDATION_FAILED");
      }
      patch.name = name;
    }

    if (body.status !== undefined) {
      const statusValue = asNonEmptyString(body.status);
      if (!statusValue || !isMcpApiKeyStatus(statusValue)) {
        return sendError(reply, 400, "Invalid status", "REQUEST_VALIDATION_FAILED");
      }
      if (!MCP_API_KEY_PATCH_STATUSES.has(statusValue)) {
        return sendError(
          reply,
          400,
          "Use revoke endpoint for revoked status",
          "REQUEST_VALIDATION_FAILED"
        );
      }
      patch.status = statusValue;
    }

    if (body.expires_at !== undefined) {
      try {
        patch.expires_at = parseOptionalIsoDate(body.expires_at, "expires_at");
      } catch (error) {
        return sendError(reply, 400, getErrorMessage(error), "REQUEST_VALIDATION_FAILED");
      }
    }

    if (body.meta_json !== undefined) {
      if (body.meta_json === null) {
        patch.meta_json = null;
      } else if (!isPlainObject(body.meta_json)) {
        return sendError(
          reply,
          400,
          "meta_json must be an object or null",
          "REQUEST_VALIDATION_FAILED"
        );
      } else {
        patch.meta_json = body.meta_json;
      }
    }

    let aclTools: string[] | undefined;
    try {
      aclTools = parseOptionalStringArray(body.acl_tools, "acl_tools", {
        maxItems: MAX_MCP_KEY_ACL_TOOLS
      });
    } catch (error) {
      return sendError(reply, 400, getErrorMessage(error), "REQUEST_VALIDATION_FAILED");
    }

    if (
      patch.name === undefined &&
      patch.status === undefined &&
      patch.expires_at === undefined &&
      patch.meta_json === undefined &&
      aclTools === undefined
    ) {
      return sendError(reply, 400, "No fields to update", "REQUEST_VALIDATION_FAILED");
    }

    let updated = existing;
    if (
      patch.name !== undefined ||
      patch.status !== undefined ||
      patch.expires_at !== undefined ||
      patch.meta_json !== undefined
    ) {
      const patched = await persistence.patchMcpApiKey(id, {
        ...patch,
        updated_by: "admin"
      });
      if (!patched) {
        return sendError(reply, 404, "MCP key not found", "MCP_KEY_NOT_FOUND");
      }
      updated = patched;
    }

    if (aclTools !== undefined) {
      await persistence.replaceMcpKeyAclRules(id, {
        tool_names: aclTools,
        created_by: "admin"
      });
    }

    return reply.send(await buildMcpApiKeyResponse(persistence, updated));
  });

  app.post("/api/mcp/keys/:id/rotate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await persistence.getMcpApiKeyById(id);
    if (!existing) {
      return sendError(reply, 404, "MCP key not found", "MCP_KEY_NOT_FOUND");
    }

    let updated: McpApiKeyEntity | null = null;
    let issuedSecret: string | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const generated = generateMcpApiKeySecret();
      try {
        updated = await persistence.rotateMcpApiKey(id, {
          key_prefix: generated.key_prefix,
          key_hash: generated.key_hash,
          rotated_at: new Date(),
          updated_by: "admin"
        });
        issuedSecret = generated.secret;
        break;
      } catch (error) {
        if (isPrismaUniqueConstraintError(error) && attempt < 2) {
          continue;
        }
        throw error;
      }
    }

    if (!updated || !issuedSecret) {
      return sendError(reply, 500, "Failed to rotate MCP API key", "INTERNAL_ERROR");
    }

    const responseBody = await buildMcpApiKeyResponse(persistence, updated);
    return reply.send({
      ...responseBody,
      secret: issuedSecret
    });
  });

  app.post("/api/mcp/keys/:id/revoke", async (request, reply) => {
    const { id } = request.params as { id: string };
    const revoked = await persistence.revokeMcpApiKey(id, {
      revoked_at: new Date(),
      updated_by: "admin"
    });
    if (!revoked) {
      return sendError(reply, 404, "MCP key not found", "MCP_KEY_NOT_FOUND");
    }

    return reply.send(await buildMcpApiKeyResponse(persistence, revoked));
  });

  app.post("/api/mcp/keys/:id/bindings/profiles/:profileId", async (request, reply) => {
    const { id, profileId } = request.params as { id: string; profileId: string };

    const key = await persistence.getMcpApiKeyById(id);
    if (!key) {
      return sendError(reply, 404, "MCP key not found", "MCP_KEY_NOT_FOUND");
    }

    const profile = await persistence.getAgentProfileById(profileId);
    if (!profile) {
      return sendError(reply, 404, "Agent profile not found", "AGENT_PROFILE_NOT_FOUND");
    }

    const binding = await persistence.bindMcpKeyToProfile(id, profileId, "admin");
    if (!binding) {
      return sendError(
        reply,
        404,
        "MCP key or agent profile not found",
        "REQUEST_VALIDATION_FAILED"
      );
    }

    return reply.send(mcpKeyProfileBindingToResponse(binding));
  });

  app.delete("/api/mcp/keys/:id/bindings/profiles/:profileId", async (request, reply) => {
    const { id, profileId } = request.params as { id: string; profileId: string };

    const key = await persistence.getMcpApiKeyById(id);
    if (!key) {
      return sendError(reply, 404, "MCP key not found", "MCP_KEY_NOT_FOUND");
    }

    const profile = await persistence.getAgentProfileById(profileId);
    if (!profile) {
      return sendError(reply, 404, "Agent profile not found", "AGENT_PROFILE_NOT_FOUND");
    }

    const deleted = await persistence.unbindMcpKeyFromProfile(id, profileId);
    if (!deleted) {
      return sendError(reply, 404, "MCP key binding not found", "NOT_FOUND");
    }

    return reply.code(204).send();
  });

  app.post("/api/mcp/keys/:id/constraints/templates/:templateId", async (request, reply) => {
    const { id, templateId } = request.params as { id: string; templateId: string };

    const key = await persistence.getMcpApiKeyById(id);
    if (!key) {
      return sendError(reply, 404, "MCP key not found", "MCP_KEY_NOT_FOUND");
    }

    const templates = await persistence.listAgentTemplates();
    const template = templates.find((item) => item.id === templateId) ?? null;
    if (!template) {
      return sendError(reply, 404, "Agent template not found", "NOT_FOUND");
    }

    const constraint = await persistence.bindMcpKeyTemplateConstraint(id, templateId, "admin");
    if (!constraint) {
      return sendError(
        reply,
        404,
        "MCP key or agent template not found",
        "REQUEST_VALIDATION_FAILED"
      );
    }

    return reply.send(mcpKeyTemplateConstraintToResponse(constraint));
  });

  app.delete("/api/mcp/keys/:id/constraints/templates/:templateId", async (request, reply) => {
    const { id, templateId } = request.params as { id: string; templateId: string };

    const key = await persistence.getMcpApiKeyById(id);
    if (!key) {
      return sendError(reply, 404, "MCP key not found", "MCP_KEY_NOT_FOUND");
    }

    const templates = await persistence.listAgentTemplates();
    const template = templates.find((item) => item.id === templateId) ?? null;
    if (!template) {
      return sendError(reply, 404, "Agent template not found", "NOT_FOUND");
    }

    const deleted = await persistence.unbindMcpKeyTemplateConstraint(id, templateId);
    if (!deleted) {
      return sendError(reply, 404, "MCP key template constraint not found", "NOT_FOUND");
    }

    return reply.code(204).send();
  });

  app.post("/api/mcp/authz/evaluate", async (request, reply) => {
    const body = request.body as McpAuthzEvaluateRequest;
    const traceId = getTraceId(request);
    const apiKeySecret = asNonEmptyString(body.api_key);
    const toolName = asNonEmptyString(body.tool_name);
    const actor = asNonEmptyString(body.actor) ?? "mcp_bridge";
    const agentProfileId = asNonEmptyString(body.agent_profile_id);

    if (!apiKeySecret) {
      await writeMcpAuthAuditEventBestEffort(
        persistence,
        {
          event_type: "denied",
          actor,
          trace_id: traceId,
          request_meta_json: {
            code: "MCP_KEY_REQUIRED",
            tool_name: toolName ?? null,
            agent_profile_id: agentProfileId ?? null
          }
        },
        request.log
      );
      return sendError(reply, 401, "MCP API key is required", "MCP_KEY_REQUIRED");
    }

    if (!toolName) {
      return sendError(reply, 400, "tool_name is required", "REQUEST_VALIDATION_FAILED");
    }

    const keyHash = createHash("sha256").update(apiKeySecret).digest("hex");
    const key = await persistence.getMcpApiKeyByHash(keyHash);
    if (!key) {
      await writeMcpAuthAuditEventBestEffort(
        persistence,
        {
          event_type: "denied",
          actor,
          trace_id: traceId,
          request_meta_json: {
            code: "MCP_KEY_INVALID",
            tool_name: toolName,
            agent_profile_id: agentProfileId ?? null
          }
        },
        request.log
      );
      return sendError(reply, 401, "MCP API key is invalid", "MCP_KEY_INVALID");
    }

    const denyWithAudit = async (statusCode: number, error: string, code: string): Promise<FastifyReply> => {
      await writeMcpAuthAuditEventBestEffort(
        persistence,
        {
          key_id: key.id,
          event_type: "denied",
          actor,
          trace_id: traceId,
          request_meta_json: {
            code,
            tool_name: toolName,
            key_status: key.status,
            agent_profile_id: agentProfileId ?? null
          }
        },
        request.log
      );
      return sendError(reply, statusCode, error, code);
    };

    if (key.status === "revoked") {
      return denyWithAudit(401, "MCP API key is revoked", "MCP_KEY_REVOKED");
    }
    if (key.status === "disabled") {
      return denyWithAudit(401, "MCP API key is disabled", "MCP_KEY_DISABLED");
    }
    if (key.expires_at && key.expires_at.getTime() <= Date.now()) {
      return denyWithAudit(401, "MCP API key is expired", "MCP_KEY_EXPIRED");
    }

    const aclRules = await persistence.listMcpKeyAclRules(key.id);
    const allowedByAcl = aclRules.some(
      (rule) => rule.effect === "allow" && rule.tool_name === toolName
    );
    if (!allowedByAcl) {
      return denyWithAudit(403, "MCP tool is forbidden for this key", "MCP_TOOL_FORBIDDEN");
    }

    const profileBindings = await persistence.listMcpKeyProfileBindings(key.id);
    if (profileBindings.length > 0) {
      if (!agentProfileId) {
        return denyWithAudit(
          403,
          "MCP key is restricted to specific agent profiles",
          "MCP_PROFILE_FORBIDDEN"
        );
      }

      const isProfileAllowed = profileBindings.some(
        (binding) => binding.agent_profile_id === agentProfileId
      );
      if (!isProfileAllowed) {
        return denyWithAudit(
          403,
          "MCP key is forbidden for this agent profile",
          "MCP_PROFILE_FORBIDDEN"
        );
      }
    }

    const profileConstraints = await persistence.listMcpKeyTemplateConstraints(key.id);
    if (profileConstraints.length > 0) {
      if (!agentProfileId) {
        return denyWithAudit(
          403,
          "MCP key is restricted to specific agent profiles",
          "MCP_PROFILE_FORBIDDEN"
        );
      }

      const isProfileAllowedByConstraint = profileConstraints.some(
        (constraint) => constraint.agent_template_id === agentProfileId
      );
      if (!isProfileAllowedByConstraint) {
        return denyWithAudit(
          403,
          "MCP key is forbidden for this agent profile",
          "MCP_PROFILE_FORBIDDEN"
        );
      }
    }

    await persistence.markMcpApiKeyLastUsed(key.id, new Date());
    await writeMcpAuthAuditEventBestEffort(
      persistence,
      {
        key_id: key.id,
        event_type: "allowed",
        actor,
        trace_id: traceId,
        request_meta_json: {
          tool_name: toolName,
          agent_profile_id: agentProfileId ?? null
        }
      },
      request.log
    );

    return reply.send({
      allowed: true,
      key_id: key.id,
      tool_name: toolName,
      agent_profile_id: agentProfileId ?? null
    });
  });

  app.get("/api/delegation/capabilities", async (_request, reply) => {
    const profiles = await persistence.listAgentProfiles({ include_disabled: false, limit: 500 });
    const capabilityMap = new Map<
      string,
      { roles: Set<string>; agent_profile_ids: string[] }
    >();

    for (const profile of profiles) {
      const capability = profile.role;
      const existing = capabilityMap.get(capability);
      if (!existing) {
        capabilityMap.set(capability, {
          roles: new Set([profile.role]),
          agent_profile_ids: [profile.id]
        });
        continue;
      }

      existing.roles.add(profile.role);
      existing.agent_profile_ids.push(profile.id);
    }

    const items = Array.from(capabilityMap.entries()).map(([capability, value]) => ({
      capability,
      roles: Array.from(value.roles),
      agent_profile_ids: value.agent_profile_ids
    }));

    return reply.send({ items });
  });

  app.post("/api/delegation/dispatch", async (request, reply) => {
    const body = request.body as DelegationDispatchRequest;
    const requesterTaskId = asNonEmptyString(body.requester_task_id);
    const capability = asNonEmptyString(body.capability);
    const requesterTaskRunId = asNonEmptyString(body.requester_task_run_id);
    const traceId = getTraceId(request);

    if (!requesterTaskId || !capability) {
      return sendError(
        reply,
        400,
        "requester_task_id and capability are required",
        "VALIDATION_ERROR"
      );
    }

    if (!isPlainObject(body.target_selector) || !isPlainObject(body.payload)) {
      return sendError(
        reply,
        400,
        "target_selector and payload must be objects",
        "VALIDATION_ERROR"
      );
    }

    const priority = typeof body.priority === "number" ? body.priority : 100;
    const targetSelector = body.target_selector;
    const payload = body.payload;
    const payloadSandboxPolicyRaw = asNonEmptyString(payload["sandbox_policy"]);
    const payloadApprovalPolicyRaw = asNonEmptyString(payload["approval_policy"]);
    const payloadSandboxPolicy = payloadSandboxPolicyRaw?.toLowerCase();
    const payloadApprovalPolicy = payloadApprovalPolicyRaw?.toLowerCase();
    if (payloadSandboxPolicy && !isDelegationSandboxPolicy(payloadSandboxPolicy)) {
      return sendError(
        reply,
        400,
        "payload.sandbox_policy must be one of read-only|workspace-write|danger-full-access",
        "VALIDATION_ERROR"
      );
    }
    if (payloadApprovalPolicy && !isDelegationApprovalPolicy(payloadApprovalPolicy)) {
      return sendError(
        reply,
        400,
        "payload.approval_policy must be one of never|on-request|on-failure|untrusted",
        "VALIDATION_ERROR"
      );
    }
    const inputPrompt = extractDelegationPrompt(payload);
    if (!inputPrompt) {
      return sendError(
        reply,
        400,
        "payload.prompt or payload.task is required and must be non-empty",
        "VALIDATION_ERROR"
      );
    }

    const delegation = await persistence.createDelegationRequest({
      requester_task_id: requesterTaskId,
      requester_task_run_id: requesterTaskRunId,
      capability,
      target_selector: targetSelector,
      payload,
      priority,
      input_prompt: inputPrompt,
      trace_id: traceId
    });

    await publisher.publish({
      eventType: "agent.delegation.requested",
      traceId,
      idempotencyKey: `${delegation.id}:requested`,
      payload: {
        delegation_id: delegation.id,
        requester_task_id: delegation.requester_task_id,
        capability: delegation.capability,
        status: delegation.status,
        target_agent_profile_id: delegation.target_agent_profile_id,
        target_worker_instance_id: delegation.target_worker_instance_id,
        reason: null
      }
    });

    const selectorAgentProfileId = asNonEmptyString(targetSelector["agent_profile_id"]);
    let selectedAgentProfile: AgentProfileEntity | null = null;

    if (selectorAgentProfileId) {
      const selectedBySelector = await persistence.getAgentProfileById(selectorAgentProfileId);
      if (!selectedBySelector) {
        return sendError(reply, 404, "Agent profile not found", "AGENT_PROFILE_NOT_FOUND");
      }
      if (!selectedBySelector.is_enabled) {
        return sendError(reply, 409, "Agent profile is disabled", "AGENT_PROFILE_DISABLED");
      }
      if (normalizeAgentRole(selectedBySelector.role) !== capability) {
        return sendError(
          reply,
          409,
          "Agent profile role does not match capability",
          "AGENT_PROFILE_ROLE_MISMATCH"
        );
      }
      selectedAgentProfile = selectedBySelector;
    } else {
      const candidates = await persistence.listAgentProfiles({
        include_disabled: false,
        role: capability,
        limit: 50
      });
      selectedAgentProfile = candidates[0] ?? null;
    }

    if (!selectedAgentProfile) {
      const failedSummary = "No enabled agent profile found for capability";
      const failedDelegation = await persistence.updateDelegationRequest(delegation.id, {
        status: "failed",
        result_summary: failedSummary,
        execution_log: failedSummary,
        execution_mode: "none",
        execution_meta_json: { reason: "no_capability_target" },
        ended_at: new Date()
      });
      if (!failedDelegation) {
        return sendError(reply, 500, "Failed to update delegation status", "INTERNAL_ERROR");
      }

      await publisher.publish({
        eventType: "agent.delegation.failed",
        traceId,
        idempotencyKey: `${delegation.id}:failed:no_target`,
        payload: {
          delegation_id: failedDelegation.id,
          requester_task_id: failedDelegation.requester_task_id,
          capability: failedDelegation.capability,
          status: failedDelegation.status,
          target_agent_profile_id: failedDelegation.target_agent_profile_id,
          target_worker_instance_id: failedDelegation.target_worker_instance_id,
          reason: "no_capability_target"
        }
      });

      return reply.code(202).send(delegationToResponse(failedDelegation));
    }

    const requesterTask = await persistence.getTaskById(requesterTaskId);
    const memoryProjectId = requesterTask?.project_id ?? null;
    const requesterProject = memoryProjectId
      ? await persistence.getProjectByKey(memoryProjectId)
      : null;
    const payloadCwd = asNonEmptyString(payload["cwd"]);
    const projectWorkspacePath = asNonEmptyString(requesterProject?.workspace_path ?? null);
    const resolvedExecutionCwd = payloadCwd ?? projectWorkspacePath;
    const executionCwdSource: "payload" | "project_workspace_path" | "process_cwd" = payloadCwd
      ? "payload"
      : projectWorkspacePath
        ? "project_workspace_path"
        : "process_cwd";
    const memoryAgentRole = normalizeAgentRole(selectedAgentProfile.role);

    const runtimeScriptOs = runtimeScriptOsFromPlatform();
    let selectedAgentProfileRuntimeScript: AgentProfileScriptSetEntity | null = null;
    const selectedAgentProfileMcpServers: Array<{
      id: string;
      name: string;
      transport: McpServerTransport;
      origin_type: McpServerOriginType;
      endpoint_or_command: string;
      is_required: boolean;
      priority: number;
      config_json: Record<string, unknown> | null;
    }> = [];
    if (selectedAgentProfile) {
      const [bindings, servers, scriptSets] = await Promise.all([
        persistence.listAgentProfileMcpBindings(selectedAgentProfile.id),
        persistence.listMcpServerRegistry({ include_unapproved: true }),
        persistence.listAgentProfileScriptSets(selectedAgentProfile.id)
      ]);
      const serverById = new Map(servers.map((item) => [item.id, item]));
      const runtimeScript =
        scriptSets.find((item) => item.os === runtimeScriptOs) ??
        null;
      selectedAgentProfileRuntimeScript = runtimeScript;

      for (const binding of bindings) {
        const server = serverById.get(binding.mcp_server_id);
        if (!server) {
          continue;
        }
        if (!isMcpServerAllowedForAgentProfile(selectedAgentProfile, server)) {
          continue;
        }
        selectedAgentProfileMcpServers.push({
          id: server.id,
          name: server.name,
          transport: server.transport,
          origin_type: server.origin_type,
          endpoint_or_command: server.endpoint_or_command,
          is_required: binding.is_required,
          priority: binding.priority,
          config_json: binding.config_json
        });
      }

      selectedAgentProfileMcpServers.sort((a, b) => {
        if (a.priority === b.priority) {
          return a.name.localeCompare(b.name);
        }
        return a.priority - b.priority;
      });
    }

    let runtimeSecretEnv: Record<string, string> = {};
    let runtimeSecretKeys: string[] = [];
    if (memoryProjectId) {
      try {
        const resolved = await resolveRuntimeSecretEnvironment({
          persistence,
          projectId: memoryProjectId,
          agentRole: memoryAgentRole,
          agentProfileId: selectedAgentProfile.id,
          secretsMasterKey: config.secretsMasterKey
        });
        runtimeSecretEnv = resolved.env;
        runtimeSecretKeys = resolved.keys;
      } catch (error) {
        request.log.error(
          { err: error, project_id: memoryProjectId, agent_profile_id: selectedAgentProfile.id },
          "Failed to resolve runtime project secrets"
        );
        return sendError(reply, 500, "Failed to resolve project secrets", "SECRET_RESOLVE_FAILED");
      }
    }
    const secretContext = {
      project_id: memoryProjectId,
      injected_keys: runtimeSecretKeys,
      injected_count: runtimeSecretKeys.length
    };

    const memoryDisabled = payload["memory_disabled"] === true;
    const memoryEntries =
      memoryDisabled || !memoryProjectId
        ? []
        : await persistence.listAgentMemoryEntries({
            project_id: memoryProjectId,
            agent_role: memoryAgentRole,
            is_active: true,
            limit: MAX_MEMORY_CONTEXT_ENTRIES
          });
    const memoryAwarePrompt = buildMemoryAwarePrompt({
      basePrompt: inputPrompt,
      projectId: memoryProjectId ?? "unknown_project",
      agentRole: memoryAgentRole,
      memoryEntries
    });
    const executionPrompt = buildAgentProfileAwarePrompt({
      basePrompt: memoryAwarePrompt,
      profile: selectedAgentProfile,
      runtimeScript: selectedAgentProfileRuntimeScript,
      mcpServers: selectedAgentProfileMcpServers
    });
    const agentProfileExecutionContext = selectedAgentProfile
      ? {
          profile_id: selectedAgentProfile.id,
          profile_name: selectedAgentProfile.name,
          profile_role: selectedAgentProfile.role,
          source_policy: selectedAgentProfile.source_policy,
          runtime_os: runtimeScriptOs,
          runtime_script: selectedAgentProfileRuntimeScript
            ? {
                os: selectedAgentProfileRuntimeScript.os,
                script_type: selectedAgentProfileRuntimeScript.script_type,
                version: selectedAgentProfileRuntimeScript.version
              }
            : null,
          mcp_servers: selectedAgentProfileMcpServers.map((server) => ({
            id: server.id,
            name: server.name,
            transport: server.transport,
            origin_type: server.origin_type,
            is_required: server.is_required,
            priority: server.priority
          }))
        }
      : {
          profile_id: null,
          profile_name: null,
          profile_role: null,
          source_policy: null,
          runtime_os: runtimeScriptOs,
          runtime_script: null,
          mcp_servers: []
        };
    const executionPayload: Record<string, unknown> = {
      ...payload,
      prompt: executionPrompt,
      memory_context: {
        project_id: memoryProjectId,
        agent_role: memoryAgentRole,
        entries_used: memoryEntries.length,
        disabled: memoryDisabled
      },
      secrets_context: secretContext,
      agent_profile_context: {
        ...agentProfileExecutionContext,
        mcp_servers: selectedAgentProfileMcpServers.map((server) => ({
          id: server.id,
          name: server.name,
          transport: server.transport,
          origin_type: server.origin_type,
          endpoint_or_command: server.endpoint_or_command,
          is_required: server.is_required,
          priority: server.priority,
          config_json: server.config_json
        })),
        runtime_script_content: selectedAgentProfileRuntimeScript?.content ?? null
      }
    };
    if (runtimeSecretKeys.length > 0) {
      executionPayload["runtime_env"] = runtimeSecretEnv;
    }
    const runtimeSecretRedactionValues = buildRuntimeSecretRedactionValues(runtimeSecretEnv);
    if (selectedAgentProfile) {
      executionPayload["agent_profile_id"] = selectedAgentProfile.id;
    }
    if (!payloadCwd && resolvedExecutionCwd) {
      executionPayload["cwd"] = resolvedExecutionCwd;
    }

    const selectedAuthProfile = await persistence.getActiveAuthProfile();
    const acceptedAt = new Date();
    const acceptedDelegation = await persistence.updateDelegationRequest(delegation.id, {
      status: "accepted",
      target_agent_profile_id: selectedAgentProfile.id,
      selected_auth_profile_id: selectedAuthProfile?.id ?? null,
      started_at: acceptedAt,
      ended_at: null
    });
    if (!acceptedDelegation) {
      return sendError(reply, 500, "Failed to update delegation status", "INTERNAL_ERROR");
    }

    await publisher.publish({
      eventType: "agent.delegation.accepted",
      traceId,
      idempotencyKey: `${delegation.id}:accepted:${traceId}`,
      payload: {
        delegation_id: acceptedDelegation.id,
        requester_task_id: acceptedDelegation.requester_task_id,
        capability: acceptedDelegation.capability,
        status: acceptedDelegation.status,
        target_agent_profile_id: acceptedDelegation.target_agent_profile_id,
        target_worker_instance_id: acceptedDelegation.target_worker_instance_id,
        agent_profile_id: selectedAgentProfile?.id ?? null,
        reason: null
      }
    });

    const runningDelegation = await persistence.updateDelegationRequest(delegation.id, {
      status: "running",
      ended_at: null
    });
    if (!runningDelegation) {
      return sendError(reply, 500, "Failed to update delegation status", "INTERNAL_ERROR");
    }

    let timeoutAttemptsRemaining =
      asNonNegativeInteger(executionPayload["simulate_timeout_attempts"]) ?? 0;

    for (let attempt = 1; attempt <= DEFAULT_DELEGATION_TIMEOUT_RETRY_LIMIT; attempt += 1) {
      let executionResult:
        | Awaited<ReturnType<DelegationExecutor["execute"]>>
        | null = null;
      let executionError: DelegationExecutionError | null = null;

      if (timeoutAttemptsRemaining > 0) {
        timeoutAttemptsRemaining -= 1;
        executionError = {
          name: "DelegationExecutionFailure",
          message: "Delegation timed out",
          code: "TIMEOUT"
        };
      } else {
        try {
          executionResult = await delegationExecutor.execute({
            delegation_id: delegation.id,
            trace_id: traceId,
            requester_task_id: requesterTaskId,
            capability,
            payload: executionPayload,
            target_template: {
              id: selectedAgentProfile.id,
              role: selectedAgentProfile.role,
              model: selectedAgentProfile.model,
              sandbox_policy: payloadSandboxPolicy ?? selectedAgentProfile.sandbox_policy,
              approval_policy: payloadApprovalPolicy ?? selectedAgentProfile.approval_policy
            }
          });
        } catch (error) {
          if (isDelegationExecutionError(error)) {
            executionError = error;
          } else {
            executionError = {
              name: "DelegationExecutionFailure",
              message: getErrorMessage(error),
              code: "EXECUTION_FAILED"
            };
          }
        }
      }

      if (executionError) {
        const isTerminalAttempt =
          executionError.code !== "TIMEOUT" || attempt === DEFAULT_DELEGATION_TIMEOUT_RETRY_LIMIT;
        const failureReason = delegationFailureReasonFromCode(executionError.code, isTerminalAttempt);

        await publisher.publish({
          eventType: "agent.delegation.failed",
          traceId,
          idempotencyKey: `${delegation.id}:failed:${traceId}:${attempt}:${failureReason}`,
          payload: {
            delegation_id: runningDelegation.id,
            requester_task_id: runningDelegation.requester_task_id,
            capability: runningDelegation.capability,
            status: isTerminalAttempt ? "failed" : "running",
            target_agent_profile_id: runningDelegation.target_agent_profile_id,
            target_worker_instance_id: runningDelegation.target_worker_instance_id,
            agent_profile_id: selectedAgentProfile?.id ?? null,
            reason: failureReason,
            retry_attempt: attempt
          }
        });

        if (!isTerminalAttempt) {
          continue;
        }

        const redactedExecutionErrorMessage = redactSecretsInText(
          executionError.message,
          runtimeSecretRedactionValues
        );
        const failedSummary =
          executionError.code === "TIMEOUT"
            ? `Delegation timed out after ${DEFAULT_DELEGATION_TIMEOUT_RETRY_LIMIT} attempts`
            : redactedExecutionErrorMessage;

        const failedDelegation = await persistence.updateDelegationRequest(delegation.id, {
          status: "failed",
          result_summary: failedSummary,
          execution_log: trimToLimit(redactedExecutionErrorMessage, MAX_DELEGATION_LOG_LENGTH),
          execution_mode: "failed",
          execution_meta_json: {
            code: executionError.code,
            attempt,
            reason: failureReason,
            execution_context: {
              cwd: resolvedExecutionCwd,
              cwd_source: executionCwdSource
            },
            memory_context: {
              project_id: memoryProjectId,
              agent_role: memoryAgentRole,
              entries_used: memoryEntries.length,
              disabled: memoryDisabled
            },
            secrets_context: secretContext,
            agent_profile_context: agentProfileExecutionContext
          },
          ended_at: new Date()
        });
        if (!failedDelegation) {
          return sendError(reply, 500, "Failed to update delegation status", "INTERNAL_ERROR");
        }

        return reply.code(202).send(delegationToResponse(failedDelegation));
      }

      if (!executionResult) {
        continue;
      }

      const redactedResultSummary = redactSecretsInText(
        executionResult.result_summary,
        runtimeSecretRedactionValues
      );
      const redactedOutputText = redactSecretsInText(
        executionResult.output_text,
        runtimeSecretRedactionValues
      );
      const redactedMetadataCandidate = redactSecretsInUnknown(
        executionResult.metadata ?? {},
        runtimeSecretRedactionValues
      );
      const redactedMetadata = isPlainObject(redactedMetadataCandidate)
        ? redactedMetadataCandidate
        : {};
      const completedDelegation = await persistence.updateDelegationRequest(delegation.id, {
        status: "completed",
        result_summary: redactedResultSummary,
        execution_mode: executionResult.execution_mode,
        execution_log: trimToLimit(redactedOutputText, MAX_DELEGATION_LOG_LENGTH),
        execution_meta_json: {
          ...redactedMetadata,
          execution_context: {
            cwd: resolvedExecutionCwd,
            cwd_source: executionCwdSource
          },
          memory_context: {
            project_id: memoryProjectId,
            agent_role: memoryAgentRole,
            entries_used: memoryEntries.length,
            disabled: memoryDisabled
          },
          secrets_context: secretContext,
          agent_profile_context: agentProfileExecutionContext
        },
        ended_at: new Date()
      });
      if (!completedDelegation) {
        return sendError(reply, 500, "Failed to update delegation status", "INTERNAL_ERROR");
      }

      await publisher.publish({
        eventType: "agent.delegation.completed",
        traceId,
        idempotencyKey: `${delegation.id}:completed:${traceId}`,
        payload: {
          delegation_id: completedDelegation.id,
          requester_task_id: completedDelegation.requester_task_id,
          capability: completedDelegation.capability,
          status: completedDelegation.status,
          target_agent_profile_id: completedDelegation.target_agent_profile_id,
          target_worker_instance_id: completedDelegation.target_worker_instance_id,
          agent_profile_id: selectedAgentProfile?.id ?? null,
          reason: null,
          execution_mode: executionResult.execution_mode
        }
      });

      return reply.code(202).send(delegationToResponse(completedDelegation));
    }

    return sendError(reply, 500, "Delegation execution failed", "DELEGATION_EXECUTION_FAILED");
  });

  app.get("/api/delegation/cards", async (request, reply) => {
    const query = request.query as { limit?: unknown };
    const parsedLimit = asNonNegativeInteger(query.limit);
    const limit = parsedLimit && parsedLimit > 0 ? parsedLimit : 50;

    const cards = await buildDelegationCardsResponse({
      persistence,
      limit
    });

    return reply.send(cards);
  });

  app.get("/api/delegation/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const delegation = await persistence.getDelegationRequest(id);
    if (!delegation) {
      return sendError(reply, 404, "Delegation not found", "NOT_FOUND");
    }

    return reply.send(delegationToResponse(delegation));
  });

  app.get("/api/delegation/:id/result", async (request, reply) => {
    const { id } = request.params as { id: string };
    const delegation = await persistence.getDelegationRequest(id);
    if (!delegation) {
      return sendError(reply, 404, "Delegation not found", "NOT_FOUND");
    }

    return reply.send({
      id: delegation.id,
      status: delegation.status,
      result_summary: delegation.result_summary,
      artifacts: []
    });
  });

  app.post("/api/schedules", async (request, reply) => {
    const traceId = getTraceId(request);
    const body = request.body as ScheduleCreateRequest;
    const legacyScheduleFields = detectLegacyFields(body, [
      "task_repo_id",
      "task_branch",
      "task_agent_template_id",
      "target_agent_template_id",
      "fallback_role"
    ]);
    if (legacyScheduleFields.length > 0) {
      return sendError(
        reply,
        400,
        `Legacy fields are not supported: ${legacyScheduleFields.join(", ")}`,
        "VALIDATION_ERROR"
      );
    }

    const name = asNonEmptyString(body.name);
    const scopeValue = asNonEmptyString(body.scope);
    const overlapPolicyValue = asNonEmptyString(body.overlap_policy);
    const misfirePolicyValue = asNonEmptyString(body.misfire_policy);
    const projectId = asNonEmptyString(body.project_id);
    const taskAgentProfileId = asNonEmptyString(body.task_agent_profile_id);
    const taskTitle = asNonEmptyString(body.task_title);
    const taskDescription = asNonEmptyString(body.task_description);
    const parsedTaskPriority = asNonNegativeInteger(body.task_priority);
    const taskPriority = parsedTaskPriority == null ? 100 : parsedTaskPriority;

    if (
      !name ||
      !scopeValue ||
      !overlapPolicyValue ||
      !misfirePolicyValue ||
      !isPlainObject(body.rule_ast)
    ) {
      return sendError(
        reply,
        400,
        "name, scope, rule_ast, overlap_policy and misfire_policy are required",
        "VALIDATION_ERROR"
      );
    }

    if (scopeValue !== "project" || !isScheduleScope(scopeValue)) {
      return sendError(reply, 400, "Only scope=project is supported in schedules v1", "VALIDATION_ERROR");
    }

    if (!isScheduleOverlapPolicy(overlapPolicyValue)) {
      return sendError(reply, 400, "Invalid overlap_policy", "VALIDATION_ERROR");
    }

    if (!isScheduleMisfirePolicy(misfirePolicyValue)) {
      return sendError(reply, 400, "Invalid misfire_policy", "VALIDATION_ERROR");
    }

    if (!projectId) {
      return sendError(reply, 400, "project_id is required when scope=project", "VALIDATION_ERROR");
    }

    if (!taskTitle || !taskDescription || !taskAgentProfileId) {
      return sendError(
        reply,
        400,
        "task_title, task_description and task_agent_profile_id are required",
        "VALIDATION_ERROR"
      );
    }

    if (body.task_priority !== undefined && (parsedTaskPriority == null || parsedTaskPriority < 1)) {
      return sendError(reply, 400, "task_priority must be a positive integer", "VALIDATION_ERROR");
    }

    const [project, profile] = await Promise.all([
      persistence.getProjectByKey(projectId),
      persistence.getAgentProfileById(taskAgentProfileId)
    ]);
    if (!project) {
      return sendError(reply, 404, "Project not found", "PROJECT_NOT_FOUND");
    }
    if (!project.is_active) {
      return sendError(reply, 409, "Project is inactive", "PROJECT_INACTIVE");
    }
    if (!profile) {
      return sendError(reply, 404, "Agent profile not found", "AGENT_PROFILE_NOT_FOUND");
    }
    if (!profile.is_enabled) {
      return sendError(reply, 409, "Agent profile is disabled", "AGENT_PROFILE_DISABLED");
    }

    const created = await persistence.createScheduledRule({
      name,
      scope: scopeValue,
      project_id: projectId,
      rule_ast: body.rule_ast,
      task_agent_profile_id: taskAgentProfileId,
      task_title: taskTitle,
      task_description: taskDescription,
      task_priority: taskPriority,
      overlap_policy: overlapPolicyValue,
      misfire_policy: misfirePolicyValue,
      created_by: "admin"
    });

    await publisher.publish({
      eventType: "schedule.rule.created",
      traceId,
      idempotencyKey: `${created.id}:created`,
      payload: {
        rule_id: created.id,
        scope: created.scope,
        status: created.is_enabled ? "enabled" : "disabled",
        reason: "rule_created"
      }
    });

    return reply.code(201).send(scheduledRuleToResponse(created));
  });

  app.get("/api/schedules", async (_request, reply) => {
    const rules = await persistence.listScheduledRules();
    return reply.send({ items: rules.map((rule) => scheduledRuleToResponse(rule)) });
  });

  app.get("/api/schedules/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const rule = await persistence.getScheduledRuleById(id);
    if (!rule) {
      return sendError(reply, 404, "Schedule rule not found", "NOT_FOUND");
    }

    return reply.send(scheduledRuleToResponse(rule));
  });

  app.patch("/api/schedules/:id", async (request, reply) => {
    const traceId = getTraceId(request);
    const { id } = request.params as { id: string };
    const body = request.body as SchedulePatchRequest;
    const legacyScheduleFields = detectLegacyFields(body, [
      "task_repo_id",
      "task_branch",
      "task_agent_template_id",
      "target_agent_template_id",
      "fallback_role"
    ]);
    if (legacyScheduleFields.length > 0) {
      return sendError(
        reply,
        400,
        `Legacy fields are not supported: ${legacyScheduleFields.join(", ")}`,
        "VALIDATION_ERROR"
      );
    }

    const patch: Parameters<Persistence["patchScheduledRule"]>[1] = {};

    if (body.name != null) {
      const name = asNonEmptyString(body.name);
      if (!name) {
        return sendError(reply, 400, "name must be a non-empty string", "VALIDATION_ERROR");
      }
      patch.name = name;
    }

    if (body.is_enabled != null) {
      if (typeof body.is_enabled !== "boolean") {
        return sendError(reply, 400, "is_enabled must be a boolean", "VALIDATION_ERROR");
      }
      patch.is_enabled = body.is_enabled;
    }

    if (body.rule_ast != null) {
      if (!isPlainObject(body.rule_ast)) {
        return sendError(reply, 400, "rule_ast must be an object", "VALIDATION_ERROR");
      }
      patch.rule_ast = body.rule_ast;
    }

    if (body.task_agent_profile_id !== undefined) {
      const value = asNonEmptyString(body.task_agent_profile_id);
      if (!value) {
        return sendError(
          reply,
          400,
          "task_agent_profile_id must be a non-empty string",
          "VALIDATION_ERROR"
        );
      }
      patch.task_agent_profile_id = value;
    }

    if (body.task_title !== undefined) {
      if (body.task_title === null) {
        patch.task_title = null;
      } else {
        const value = asNonEmptyString(body.task_title);
        if (!value) {
          return sendError(reply, 400, "task_title must be a non-empty string or null", "VALIDATION_ERROR");
        }
        patch.task_title = value;
      }
    }

    if (body.task_description !== undefined) {
      if (body.task_description === null) {
        patch.task_description = null;
      } else {
        const value = asNonEmptyString(body.task_description);
        if (!value) {
          return sendError(
            reply,
            400,
            "task_description must be a non-empty string or null",
            "VALIDATION_ERROR"
          );
        }
        patch.task_description = value;
      }
    }

    if (body.task_priority !== undefined) {
      const value = asNonNegativeInteger(body.task_priority);
      if (value == null || value < 1) {
        return sendError(reply, 400, "task_priority must be a positive integer", "VALIDATION_ERROR");
      }
      patch.task_priority = value;
    }

    if (body.overlap_policy != null) {
      const value = asNonEmptyString(body.overlap_policy);
      if (!value || !isScheduleOverlapPolicy(value)) {
        return sendError(reply, 400, "Invalid overlap_policy", "VALIDATION_ERROR");
      }
      patch.overlap_policy = value;
    }

    if (body.misfire_policy != null) {
      const value = asNonEmptyString(body.misfire_policy);
      if (!value || !isScheduleMisfirePolicy(value)) {
        return sendError(reply, 400, "Invalid misfire_policy", "VALIDATION_ERROR");
      }
      patch.misfire_policy = value;
    }

    if (patch.task_agent_profile_id) {
      const current = await persistence.getScheduledRuleById(id);
      if (!current) {
        return sendError(reply, 404, "Schedule rule not found", "NOT_FOUND");
      }
      const effectiveProfileId = patch.task_agent_profile_id ?? current.task_agent_profile_id;
      const profile = await persistence.getAgentProfileById(effectiveProfileId);
      if (!profile) {
        return sendError(reply, 404, "Agent profile not found", "AGENT_PROFILE_NOT_FOUND");
      }
      if (!profile.is_enabled) {
        return sendError(reply, 409, "Agent profile is disabled", "AGENT_PROFILE_DISABLED");
      }
    }

    const updated = await persistence.patchScheduledRule(id, patch);
    if (!updated) {
      return sendError(reply, 404, "Schedule rule not found", "NOT_FOUND");
    }

    await publisher.publish({
      eventType: "schedule.rule.updated",
      traceId,
      idempotencyKey: `${updated.id}:updated:${traceId}`,
      payload: {
        rule_id: updated.id,
        scope: updated.scope,
        status: updated.is_enabled ? "enabled" : "disabled",
        reason: "rule_updated"
      }
    });

    return reply.send(scheduledRuleToResponse(updated));
  });

  app.delete("/api/schedules/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await persistence.deleteScheduledRule(id);
    if (!deleted) {
      return sendError(reply, 404, "Schedule rule not found", "NOT_FOUND");
    }

    return reply.code(204).send();
  });

  app.post("/api/schedules/:id/enable", async (request, reply) => {
    const traceId = getTraceId(request);
    const { id } = request.params as { id: string };
    const rule = await persistence.getScheduledRuleById(id);
    if (!rule) {
      return sendError(reply, 404, "Schedule rule not found", "NOT_FOUND");
    }

    await persistence.setScheduledRuleEnabled(id, true);
    await publisher.publish({
      eventType: "schedule.rule.enabled",
      traceId,
      idempotencyKey: `${id}:enabled:${traceId}`,
      payload: {
        rule_id: id,
        scope: rule.scope,
        status: "enabled",
        reason: "manual_enable"
      }
    });

    return reply.code(202).send({ accepted: true });
  });

  app.post("/api/schedules/:id/disable", async (request, reply) => {
    const traceId = getTraceId(request);
    const { id } = request.params as { id: string };
    const rule = await persistence.getScheduledRuleById(id);
    if (!rule) {
      return sendError(reply, 404, "Schedule rule not found", "NOT_FOUND");
    }

    await persistence.setScheduledRuleEnabled(id, false);
    await publisher.publish({
      eventType: "schedule.rule.disabled",
      traceId,
      idempotencyKey: `${id}:disabled:${traceId}`,
      payload: {
        rule_id: id,
        scope: rule.scope,
        status: "disabled",
        reason: "manual_disable"
      }
    });

    return reply.code(202).send({ accepted: true });
  });

  app.post("/api/schedules/:id/evaluate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { dry_run_context?: unknown } | undefined;
    const rule = await persistence.getScheduledRuleById(id);
    if (!rule) {
      return sendError(reply, 404, "Schedule rule not found", "NOT_FOUND");
    }

    if (body?.dry_run_context != null && !isPlainObject(body.dry_run_context)) {
      return sendError(reply, 400, "dry_run_context must be an object", "VALIDATION_ERROR");
    }

    const dryRunContext = isPlainObject(body?.dry_run_context)
      ? body?.dry_run_context
      : {};

    const reasons: string[] = [];
    let matched = false;
    const { context, warnings } = parseScheduleEvaluationContext(dryRunContext);
    reasons.push(...warnings);

    if (!rule.is_enabled) {
      reasons.push("rule_disabled");
    } else {
      reasons.push("rule_enabled");
      const evaluation = evaluateScheduleRuleAst(rule.rule_ast, context);
      matched = evaluation.matched;
      reasons.push(...evaluation.reasons);
    }

    if (dryRunContext["force_match"] === true) {
      matched = true;
      reasons.push("forced_by_dry_run_context");
    }

    return reply.send({
      rule_id: id,
      matched,
      reasons
    });
  });

  app.post("/api/schedules/:id/trigger", async (request, reply) => {
    const traceId = getTraceId(request);
    const { id } = request.params as { id: string };
    const body = request.body as ScheduleTriggerRequest | undefined;
    const rule = await persistence.getScheduledRuleById(id);
    if (!rule) {
      return sendError(reply, 404, "Schedule rule not found", "NOT_FOUND");
    }
    if (body?.dry_run_context != null && !isPlainObject(body.dry_run_context)) {
      return sendError(reply, 400, "dry_run_context must be an object", "VALIDATION_ERROR");
    }

    const dryRunContext = isPlainObject(body?.dry_run_context)
      ? body.dry_run_context
      : {};
    const run = await runScheduleTrigger({
      rule,
      traceId,
      dryRunContext,
      triggerSource: "api"
    });

    return reply.code(202).send(scheduledRunToResponse(run));
  });

  app.get("/api/schedules/:id/runs", async (request, reply) => {
    const { id } = request.params as { id: string };
    const rule = await persistence.getScheduledRuleById(id);
    if (!rule) {
      return sendError(reply, 404, "Schedule rule not found", "NOT_FOUND");
    }

    const runs = await persistence.listScheduledRuns(id);
    return reply.send({
      items: runs.map((run) => scheduledRunToResponse(run))
    });
  });

  app.get("/api/custom-modules", async (_request, reply) => {
    const moduleConfigs = await persistence.listCustomModuleConfigs();
    return reply.send({
      items: moduleConfigs.map((moduleConfig) => {
        const normalizedConfigJson =
          moduleConfig.module_key === SWITCH_MODULE_KEY
            ? normalizeSwitchModuleRuntimeConfig(config, moduleConfig.config_json)
            : moduleConfig.config_json;
        return {
          id: moduleConfig.id,
          module_key: moduleConfig.module_key,
          is_enabled: moduleConfig.is_enabled,
          scope: moduleConfig.scope,
          config_json: normalizedConfigJson
        };
      })
    });
  });

  app.get("/api/queue/held", async (_request, reply) => {
    const heldTasks = await persistence.listHeldTasks();
    return reply.send({
      items: heldTasks.map((task) => taskToResponse(task))
    });
  });

  app.post("/api/queue/held/release", async (request, reply) => {
    const traceId = getTraceId(request);
    const heldTasksBeforeRelease = await persistence.listHeldTasks();
    const releasedCount = await persistence.releaseHeldQueue();

    if (heldTasksBeforeRelease.length > 0) {
      await publishTaskAuthSwitchingEvents({
        app,
        publisher,
        traceId,
        transitions: heldTasksBeforeRelease.map((task) => ({
          task_id: task.id,
          status_before: "WAITING_LIMIT",
          status_after: "QUEUED"
        })),
        reason: "manual_queue_release"
      });
    }

    await publishEventBestEffort({
      app,
      publisher,
      event: {
        eventType: "queue.hold_released",
        traceId,
        idempotencyKey: `queue_hold_release:${traceId}`,
        payload: {
          reason: "manual_release",
          held_count: releasedCount
        }
      },
      logMessage: "Failed to publish queue.hold_released"
    });

    return reply.code(202).send({ accepted: true });
  });

  app.get("/api/custom-modules/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const moduleConfig = await ensureCustomModuleConfig(persistence, config, key);

    if (!moduleConfig) {
      return sendError(reply, 404, "Module config not found", "NOT_FOUND");
    }

    const normalizedConfigJson =
      key === SWITCH_MODULE_KEY
        ? normalizeSwitchModuleRuntimeConfig(config, moduleConfig.config_json)
        : moduleConfig.config_json;
    return reply.send({
      ...moduleConfig,
      config_json: normalizedConfigJson
    });
  });

  app.get("/api/custom-modules/:key/executions", async (request, reply) => {
    const { key } = request.params as { key: string };
    const moduleConfig = await ensureCustomModuleConfig(persistence, config, key);
    if (!moduleConfig) {
      return sendError(reply, 404, "Module config not found", "NOT_FOUND");
    }

    const executions = await persistence.listModuleExecutions(key);
    return reply.send({
      items: executions.map((execution) => moduleExecutionToResponse(execution))
    });
  });

  app.patch("/api/custom-modules/:key", async (request, reply) => {
    const traceId = getTraceId(request);
    const { key } = request.params as { key: string };
    const body = request.body as ModulePatchRequest;
    const startedAt = new Date();
    const startedIdempotencyKey = `${key}:${traceId}:started`;
    const completedIdempotencyKey = `${key}:${traceId}:completed`;
    const failedIdempotencyKey = `${key}:${traceId}:failed`;

    const moduleConfig = await ensureCustomModuleConfig(persistence, config, key);
    if (!moduleConfig) {
      return sendError(reply, 404, "Module config not found", "NOT_FOUND");
    }

    if (body.config_json != null && !isPlainObject(body.config_json)) {
      return sendError(reply, 400, "config_json must be an object", "VALIDATION_ERROR");
    }

    if (body.is_enabled != null && typeof body.is_enabled !== "boolean") {
      return sendError(reply, 400, "is_enabled must be a boolean", "VALIDATION_ERROR");
    }

    let normalizedSwitchConfigPatch: Record<string, unknown> | undefined;
    if (key === SWITCH_MODULE_KEY) {
      const currentConfig = isPlainObject(moduleConfig.config_json) ? moduleConfig.config_json : {};
      const patchConfig = isPlainObject(body.config_json) ? body.config_json : undefined;
      const validation = validateSwitchModulePatch({
        appConfig: config,
        currentConfig,
        currentEnabled: moduleConfig.is_enabled,
        patchConfig,
        patchEnabled: typeof body.is_enabled === "boolean" ? body.is_enabled : undefined
      });
      if (validation.error) {
        return sendError(reply, 400, validation.error, "VALIDATION_ERROR");
      }

      normalizedSwitchConfigPatch = {
        eligible_profile_ids: validation.mergedConfig.eligible_profile_ids,
        weekly_remaining_percent_lt: validation.mergedConfig.weekly_remaining_percent_lt,
        five_hour_remaining_percent_lt: validation.mergedConfig.five_hour_remaining_percent_lt,
        reset_guard_hours: validation.mergedConfig.reset_guard_hours,
        probe_interval_sec: validation.mergedConfig.probe_interval_sec,
        switch_cooldown_sec: validation.mergedConfig.switch_cooldown_sec
      };
    }

    const existingCompletedExecution = await persistence.getModuleExecutionByIdempotency(
      key,
      completedIdempotencyKey
    );
    if (existingCompletedExecution) {
      const currentConfig = await persistence.getCustomModuleConfig(key);
      if (!currentConfig) {
        return sendError(reply, 404, "Module config not found", "NOT_FOUND");
      }

      return reply.send(currentConfig);
    }

    await publisher.publish({
      eventType: "module.execution.started",
      traceId,
      idempotencyKey: startedIdempotencyKey,
      payload: {
        module_key: key,
        status: "started",
        reason: "config_update_started"
      }
    });

    await persistence.createModuleExecution({
      module_key: key,
      event_type: "module.execution.started",
      status: "started",
      trace_id: traceId,
      idempotency_key: startedIdempotencyKey,
      details_json: {
        reason: "config_update_started"
      },
      started_at: startedAt,
      ended_at: null
    });

    let updated: Awaited<ReturnType<Persistence["updateCustomModuleConfig"]>>;
    try {
      updated = await withRetry({
        operationName: "module_config_update",
        maxAttempts: 3,
        initialDelayMs: 50,
        onRetry: ({ operationName, attempt, error, nextDelayMs }) => {
          app.log.warn(
            {
              operation: operationName,
              attempt,
              nextDelayMs,
              err: error,
              module_key: key,
              trace_id: traceId
            },
            "Retrying module config update"
          );
        },
        fn: async () =>
          persistence.updateCustomModuleConfig(key, {
            is_enabled: typeof body.is_enabled === "boolean" ? body.is_enabled : undefined,
            config_json:
              normalizedSwitchConfigPatch ??
              (isPlainObject(body.config_json) ? body.config_json : undefined),
            updated_by: "admin"
          })
      });
    } catch (error) {
      app.log.error(
        { err: error, module_key: key, trace_id: traceId },
        "Module config update failed after retries"
      );

      try {
        await publisher.publish({
          eventType: "module.execution.failed",
          traceId,
          idempotencyKey: failedIdempotencyKey,
          payload: {
            module_key: key,
            status: "failed",
            reason: "config_update_failed"
          }
        });
      } catch (publishError) {
        app.log.error(
          { err: publishError, module_key: key, trace_id: traceId },
          "Failed to publish module.execution.failed event"
        );
      }

      try {
        await persistence.createModuleExecution({
          module_key: key,
          event_type: "module.execution.failed",
          status: "failed",
          trace_id: traceId,
          idempotency_key: failedIdempotencyKey,
          details_json: {
            reason: "config_update_failed"
          },
          started_at: startedAt,
          ended_at: new Date()
        });
      } catch (persistError) {
        app.log.error(
          { err: persistError, module_key: key, trace_id: traceId },
          "Failed to persist module.execution.failed"
        );
      }

      return sendError(reply, 500, "Module execution failed", "MODULE_EXECUTION_FAILED");
    }

    if (!updated) {
      return sendError(reply, 404, "Module config not found", "NOT_FOUND");
    }

    await publisher.publish({
      eventType: "module.execution.completed",
      traceId,
      idempotencyKey: completedIdempotencyKey,
      payload: {
        module_key: key,
        status: "completed",
        reason: "config_update_completed"
      }
    });

    await persistence.createModuleExecution({
      module_key: key,
      event_type: "module.execution.completed",
      status: "completed",
      trace_id: traceId,
      idempotency_key: completedIdempotencyKey,
      details_json: {
        reason: "config_update_completed"
      },
      started_at: startedAt,
      ended_at: new Date()
    });

    return reply.send(updated);
  });

  await registerOpenApiStubs(app, config.openApiPath, IMPLEMENTED_ROUTES);
  await runScheduleRecoveryOnStartup({
    app,
    persistence,
    publisher
  });

  return app;
}
