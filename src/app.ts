import { createHash, randomUUID } from "node:crypto";
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
import { registerOpenApiStubs } from "./lib/openapi-stubs";
import {
  AuthProfileRateLimitsError,
  createAuthProfileRateLimitsReader
} from "./runtime/auth-profile-rate-limits";
import type {
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
  ModuleExecutionEntity,
  PackRegistryEntity,
  Persistence,
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
  "POST /api/tasks",
  "GET /api/tasks",
  "GET /api/tasks/{id}",
  "POST /api/tasks/{id}/pause",
  "POST /api/tasks/{id}/resume",
  "POST /api/tasks/{id}/stop",
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
  repo_id?: unknown;
  branch?: unknown;
  priority?: unknown;
}

interface TaskSayRequest {
  message?: unknown;
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

interface ModulePatchRequest {
  is_enabled?: unknown;
  config_json?: unknown;
}

interface ScheduleCreateRequest {
  name?: unknown;
  scope?: unknown;
  project_id?: unknown;
  rule_ast?: unknown;
  target_agent_template_id?: unknown;
  fallback_role?: unknown;
  overlap_policy?: unknown;
  misfire_policy?: unknown;
}

interface SchedulePatchRequest {
  name?: unknown;
  is_enabled?: unknown;
  rule_ast?: unknown;
  target_agent_template_id?: unknown;
  fallback_role?: unknown;
  overlap_policy?: unknown;
  misfire_policy?: unknown;
}

const AUTH_CONTEXT_TYPES = new Set<AuthContextType>(["apikey", "chatgpt", "chatgptAuthTokens"]);
const SCHEDULE_SCOPES = new Set<ScheduleScope>(["global", "project"]);
const SCHEDULE_OVERLAP_POLICIES = new Set<ScheduleOverlapPolicy>(["one_active_skip"]);
const SCHEDULE_MISFIRE_POLICIES = new Set<ScheduleMisfirePolicy>(["recompute_due_on_restart"]);
const DEFAULT_DELEGATION_TIMEOUT_RETRY_LIMIT = 3;
const DEFAULT_AUTH_SWITCH_RETRY_LIMIT = 3;
const MAX_DELEGATION_PROMPT_LENGTH = 4_000;
const MAX_DELEGATION_EXECUTION_PROMPT_LENGTH = 12_000;
const MAX_DELEGATION_LOG_LENGTH = 12_000;
const MAX_MEMORY_CONTENT_LENGTH = 8_000;
const MAX_MEMORY_CONTEXT_ENTRIES = 6;
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
      const summary = `Delegation completed by template ${input.target_template.id}`;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAuthContextType(value: string): value is AuthContextType {
  return AUTH_CONTEXT_TYPES.has(value as AuthContextType);
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

function taskToResponse(task: TaskEntity): Record<string, unknown> {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    project_id: task.project_id,
    repo_id: task.repo_id,
    branch: task.branch
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
    target_agent_template_id: delegation.target_agent_template_id,
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

async function buildDelegationCardsResponse(options: {
  persistence: Persistence;
  limit: number;
}): Promise<{
  preparing: Record<string, unknown>[];
  running: Record<string, unknown>[];
  recent: Record<string, unknown>[];
}> {
  const [delegations, templates, fallbackActiveProfile] = await Promise.all([
    options.persistence.listDelegationRequests({ limit: options.limit }),
    options.persistence.listAgentTemplates(),
    options.persistence.getActiveAuthProfile()
  ]);

  const templateMap = new Map(templates.map((template) => [template.id, template]));

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
    const targetTemplate = delegation.target_agent_template_id
      ? templateMap.get(delegation.target_agent_template_id) ?? null
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
      target_template: targetTemplate
        ? {
            id: targetTemplate.id,
            name: targetTemplate.name,
            role: targetTemplate.role,
            model: targetTemplate.model
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
    target_agent_template_id: rule.target_agent_template_id,
    fallback_role: rule.fallback_role,
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

function authProfileToResponse(profile: AuthProfileEntity): Record<string, unknown> {
  return {
    id: profile.id,
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
    weekly_remaining_percent_lt: config.switchWeeklyRemainingPercentLt,
    five_hour_remaining_percent_lt: config.switchFiveHourRemainingPercentLt,
    reset_guard_hours: config.switchResetGuardHours
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

  return persistence.createCustomModuleConfig({
    module_key: SWITCH_MODULE_KEY,
    is_enabled: config.switchModuleDefaultEnabled,
    scope: "global",
    config_json: buildSwitchModuleDefaultConfig(config),
    updated_by: "system"
  });
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

  app.post("/api/tasks", async (request, reply) => {
    const body = request.body as TaskCreateRequest;

    const title = asNonEmptyString(body?.title);
    const description = asNonEmptyString(body?.description);
    const projectId = asNonEmptyString(body?.project_id);
    const repoId = asNonEmptyString(body?.repo_id);

    if (!title || !description || !projectId || !repoId) {
      return sendError(reply, 400, "title, description, project_id and repo_id are required", "VALIDATION_ERROR");
    }

    const branch = body.branch == null ? null : asNonEmptyString(body.branch);
    const priority = typeof body.priority === "number" ? body.priority : 100;

    const createdTask = await persistence.createTask({
      title,
      description,
      project_id: projectId,
      repo_id: repoId,
      branch,
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

  app.post("/api/tasks/:id/stop", async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = await persistence.updateTaskStatus(id, "FAILED_TERMINAL");
    if (!task) {
      return sendError(reply, 404, "Task not found", "NOT_FOUND");
    }

    return reply.send(taskToResponse(task));
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

      return reply.send(limits);
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

  app.get("/api/auth-profiles/chatgpt/switch-events", async (_request, reply) => {
    const events = await persistence.listAuthSwitchEvents();
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

  app.get("/api/delegation/capabilities", async (_request, reply) => {
    const templates = await persistence.listAgentTemplates();
    const capabilityMap = new Map<
      string,
      { roles: Set<string>; agent_template_ids: string[] }
    >();

    for (const template of templates) {
      const capability = template.role;
      const existing = capabilityMap.get(capability);
      if (!existing) {
        capabilityMap.set(capability, {
          roles: new Set([template.role]),
          agent_template_ids: [template.id]
        });
        continue;
      }

      existing.roles.add(template.role);
      existing.agent_template_ids.push(template.id);
    }

    const items = Array.from(capabilityMap.entries()).map(([capability, value]) => ({
      capability,
      roles: Array.from(value.roles),
      agent_template_ids: value.agent_template_ids
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
    const inputPrompt = extractDelegationPrompt(payload);

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
        target_agent_template_id: delegation.target_agent_template_id,
        target_worker_instance_id: delegation.target_worker_instance_id,
        reason: null
      }
    });

    const selectorTemplateId = asNonEmptyString(targetSelector["agent_template_id"]);
    const templates = await persistence.listAgentTemplates();
    const eligibleTemplates = templates.filter(
      (template) => template.is_enabled && template.role === capability
    );

    let targetTemplate =
      selectorTemplateId == null
        ? null
        : eligibleTemplates.find((template) => template.id === selectorTemplateId) ?? null;
    if (!targetTemplate) {
      targetTemplate = eligibleTemplates[0] ?? null;
    }

    if (!targetTemplate) {
      const failedSummary = "No enabled template found for capability";
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
          target_agent_template_id: failedDelegation.target_agent_template_id,
          target_worker_instance_id: failedDelegation.target_worker_instance_id,
          reason: "no_capability_target"
        }
      });

      return reply.code(202).send(delegationToResponse(failedDelegation));
    }

    const requesterTask = await persistence.getTaskById(requesterTaskId);
    const memoryProjectId = requesterTask?.project_id ?? null;
    const memoryAgentRole = normalizeAgentRole(targetTemplate.role);
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
    const executionPrompt = buildMemoryAwarePrompt({
      basePrompt: inputPrompt,
      projectId: memoryProjectId ?? "unknown_project",
      agentRole: memoryAgentRole,
      memoryEntries
    });
    const executionPayload: Record<string, unknown> = {
      ...payload,
      prompt: executionPrompt,
      memory_context: {
        project_id: memoryProjectId,
        agent_role: memoryAgentRole,
        entries_used: memoryEntries.length,
        disabled: memoryDisabled
      }
    };

    const selectedAuthProfile = await persistence.getActiveAuthProfile();
    const acceptedAt = new Date();
    const acceptedDelegation = await persistence.updateDelegationRequest(delegation.id, {
      status: "accepted",
      target_agent_template_id: targetTemplate.id,
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
        target_agent_template_id: acceptedDelegation.target_agent_template_id,
        target_worker_instance_id: acceptedDelegation.target_worker_instance_id,
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
              id: targetTemplate.id,
              role: targetTemplate.role,
              model: targetTemplate.model
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
            target_agent_template_id: runningDelegation.target_agent_template_id,
            target_worker_instance_id: runningDelegation.target_worker_instance_id,
            reason: failureReason,
            retry_attempt: attempt
          }
        });

        if (!isTerminalAttempt) {
          continue;
        }

        const failedSummary =
          executionError.code === "TIMEOUT"
            ? `Delegation timed out after ${DEFAULT_DELEGATION_TIMEOUT_RETRY_LIMIT} attempts`
            : executionError.message;

        const failedDelegation = await persistence.updateDelegationRequest(delegation.id, {
          status: "failed",
          result_summary: failedSummary,
          execution_log: trimToLimit(executionError.message, MAX_DELEGATION_LOG_LENGTH),
          execution_mode: "failed",
          execution_meta_json: {
            code: executionError.code,
            attempt,
            reason: failureReason,
            memory_context: {
              project_id: memoryProjectId,
              agent_role: memoryAgentRole,
              entries_used: memoryEntries.length,
              disabled: memoryDisabled
            }
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

      const completedDelegation = await persistence.updateDelegationRequest(delegation.id, {
        status: "completed",
        result_summary: executionResult.result_summary,
        execution_mode: executionResult.execution_mode,
        execution_log: trimToLimit(executionResult.output_text, MAX_DELEGATION_LOG_LENGTH),
        execution_meta_json: {
          ...(executionResult.metadata ?? {}),
          memory_context: {
            project_id: memoryProjectId,
            agent_role: memoryAgentRole,
            entries_used: memoryEntries.length,
            disabled: memoryDisabled
          }
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
          target_agent_template_id: completedDelegation.target_agent_template_id,
          target_worker_instance_id: completedDelegation.target_worker_instance_id,
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

    const name = asNonEmptyString(body.name);
    const scopeValue = asNonEmptyString(body.scope);
    const overlapPolicyValue = asNonEmptyString(body.overlap_policy);
    const misfirePolicyValue = asNonEmptyString(body.misfire_policy);

    if (!name || !scopeValue || !overlapPolicyValue || !misfirePolicyValue || !isPlainObject(body.rule_ast)) {
      return sendError(
        reply,
        400,
        "name, scope, rule_ast, overlap_policy and misfire_policy are required",
        "VALIDATION_ERROR"
      );
    }

    if (!isScheduleScope(scopeValue)) {
      return sendError(reply, 400, "Invalid scope", "VALIDATION_ERROR");
    }

    if (!isScheduleOverlapPolicy(overlapPolicyValue)) {
      return sendError(reply, 400, "Invalid overlap_policy", "VALIDATION_ERROR");
    }

    if (!isScheduleMisfirePolicy(misfirePolicyValue)) {
      return sendError(reply, 400, "Invalid misfire_policy", "VALIDATION_ERROR");
    }

    let projectId: string | null = null;
    if (body.project_id !== undefined && body.project_id !== null) {
      projectId = asNonEmptyString(body.project_id);
      if (!projectId) {
        return sendError(reply, 400, "project_id must be a non-empty string or null", "VALIDATION_ERROR");
      }
    }

    if (scopeValue === "project" && !projectId) {
      return sendError(reply, 400, "project_id is required when scope=project", "VALIDATION_ERROR");
    }

    if (scopeValue === "global" && projectId) {
      return sendError(reply, 400, "project_id must be null when scope=global", "VALIDATION_ERROR");
    }

    let targetAgentTemplateId: string | null = null;
    if (body.target_agent_template_id !== undefined && body.target_agent_template_id !== null) {
      targetAgentTemplateId = asNonEmptyString(body.target_agent_template_id);
      if (!targetAgentTemplateId) {
        return sendError(
          reply,
          400,
          "target_agent_template_id must be a non-empty string or null",
          "VALIDATION_ERROR"
        );
      }
    }

    let fallbackRole: string | null = null;
    if (body.fallback_role !== undefined && body.fallback_role !== null) {
      fallbackRole = asNonEmptyString(body.fallback_role);
      if (!fallbackRole) {
        return sendError(reply, 400, "fallback_role must be a non-empty string or null", "VALIDATION_ERROR");
      }
    }

    const created = await persistence.createScheduledRule({
      name,
      scope: scopeValue,
      project_id: projectId,
      rule_ast: body.rule_ast,
      target_agent_template_id: targetAgentTemplateId,
      fallback_role: fallbackRole,
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

    if (body.target_agent_template_id !== undefined) {
      if (body.target_agent_template_id === null) {
        patch.target_agent_template_id = null;
      } else {
        const value = asNonEmptyString(body.target_agent_template_id);
        if (!value) {
          return sendError(
            reply,
            400,
            "target_agent_template_id must be a non-empty string or null",
            "VALIDATION_ERROR"
          );
        }
        patch.target_agent_template_id = value;
      }
    }

    if (body.fallback_role !== undefined) {
      if (body.fallback_role === null) {
        patch.fallback_role = null;
      } else {
        const value = asNonEmptyString(body.fallback_role);
        if (!value) {
          return sendError(reply, 400, "fallback_role must be a non-empty string or null", "VALIDATION_ERROR");
        }
        patch.fallback_role = value;
      }
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
    const rule = await persistence.getScheduledRuleById(id);
    if (!rule) {
      return sendError(reply, 404, "Schedule rule not found", "NOT_FOUND");
    }

    const now = new Date();
    const idempotencyKey = `${id}:${traceId}`;
    const existingRun = await persistence.getScheduledRunByIdempotency(id, idempotencyKey);
    if (existingRun) {
      return reply.code(202).send(scheduledRunToResponse(existingRun));
    }

    if (!rule.is_enabled) {
      const failedRun = await persistence.createScheduledRun({
        rule_id: id,
        status: "failed",
        started_at: now,
        ended_at: now,
        skip_reason: "rule_disabled",
        trace_id: traceId,
        idempotency_key: idempotencyKey,
        result_json: { reason: "rule_disabled" }
      });

      await publisher.publish({
        eventType: "schedule.run.failed",
        traceId,
        idempotencyKey: `${failedRun.id}:${traceId}`,
        payload: {
          rule_id: id,
          run_id: failedRun.id,
          scope: rule.scope,
          status: failedRun.status,
          reason: failedRun.skip_reason
        }
      });

      return reply.code(202).send(scheduledRunToResponse(failedRun));
    }

    const activeRun = await persistence.getActiveScheduledRun(id);
    if (activeRun) {
      const skippedRun = await persistence.createScheduledRun({
        rule_id: id,
        status: "skipped_due_to_overlap",
        started_at: now,
        ended_at: now,
        skip_reason: "active_run_exists",
        trace_id: traceId,
        idempotency_key: idempotencyKey,
        result_json: { active_run_id: activeRun.id }
      });

      await publisher.publish({
        eventType: "schedule.run.skipped_due_to_overlap",
        traceId,
        idempotencyKey: `${skippedRun.id}:${traceId}`,
        payload: {
          rule_id: id,
          run_id: skippedRun.id,
          scope: rule.scope,
          status: skippedRun.status,
          reason: skippedRun.skip_reason
        }
      });

      return reply.code(202).send(scheduledRunToResponse(skippedRun));
    }

    const startedRun = await persistence.createScheduledRun({
      rule_id: id,
      status: "started",
      started_at: now,
      ended_at: null,
      skip_reason: null,
      trace_id: traceId,
      idempotency_key: idempotencyKey,
      result_json: null
    });

    await publisher.publish({
      eventType: "schedule.run.started",
      traceId,
      idempotencyKey: `${startedRun.id}:${traceId}`,
      payload: {
        rule_id: id,
        run_id: startedRun.id,
        scope: rule.scope,
        status: startedRun.status,
        reason: null
      }
    });

    return reply.code(202).send(scheduledRunToResponse(startedRun));
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
      items: moduleConfigs.map((moduleConfig) => ({
        id: moduleConfig.id,
        module_key: moduleConfig.module_key,
        is_enabled: moduleConfig.is_enabled,
        scope: moduleConfig.scope,
        config_json: moduleConfig.config_json
      }))
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

    return reply.send(moduleConfig);
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
            config_json: isPlainObject(body.config_json) ? body.config_json : undefined,
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
