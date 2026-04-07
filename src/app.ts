import { createHash, randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import multipart from "@fastify/multipart";
import type { AppConfig } from "./config";
import { registerOpenApiStubs } from "./lib/openapi-stubs";
import type {
  AgentTemplateEntity,
  ArtifactEntity,
  AuthContextEntity,
  AuthContextType,
  AuthProfileEntity,
  DelegationRequestEntity,
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
import { isTaskStatus } from "./types";

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
  "GET /api/auth-profiles/chatgpt/active",
  "GET /api/auth-profiles/chatgpt/switch-events",
  "POST /api/packs",
  "GET /api/packs",
  "GET /api/packs/{id}",
  "PATCH /api/packs/{id}",
  "POST /api/packs/{id}/materialize",
  "GET /api/delegation/capabilities",
  "POST /api/delegation/dispatch",
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
}

interface TaskCreateRequest {
  title?: unknown;
  description?: unknown;
  project_id?: unknown;
  repo_id?: unknown;
  branch?: unknown;
  priority?: unknown;
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
    trace_id: delegation.trace_id,
    created_at: delegation.created_at,
    started_at: delegation.started_at,
    ended_at: delegation.ended_at
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

function isZipFile(mimeType: string, buffer: Buffer): boolean {
  const knownMime = new Set([
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream"
  ]);
  const hasZipMime = knownMime.has(mimeType);
  const hasZipMagic = buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  return hasZipMime && hasZipMagic;
}

export async function createApp(deps: AppDependencies): Promise<FastifyInstance> {
  const { config, persistence, publisher, storage } = deps;

  const app = Fastify({ logger: true });

  await app.register(multipart, {
    limits: {
      fileSize: config.maxZipBytes,
      files: 1
    }
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
    if (fileBuffer.length === 0 || fileBuffer.length > config.maxZipBytes) {
      return sendError(reply, 400, "Invalid ZIP file size", "VALIDATION_ERROR");
    }

    if (!isZipFile(multipartFile.mimetype, fileBuffer)) {
      return sendError(reply, 400, "File must be a ZIP archive", "VALIDATION_ERROR");
    }

    const checksum = createHash("sha256").update(fileBuffer).digest("hex");
    const objectKey = `auth-profiles/${Date.now()}-${checksum}.zip`;

    await storage.putObject(objectKey, fileBuffer, multipartFile.mimetype);

    const createdProfile = await persistence.createAuthProfile({
      label,
      status: "inactive",
      checksum,
      storage_path: objectKey,
      uploaded_by: "admin",
      meta_json: {
        filename: multipartFile.filename,
        content_type: multipartFile.mimetype,
        size_bytes: fileBuffer.length
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

    const activated = await persistence.activateAuthProfile(id, "admin");
    if (!activated) {
      return sendError(reply, 404, "Profile not found", "NOT_FOUND");
    }

    await publisher.publish({
      eventType: "auth_profile.activated",
      traceId,
      idempotencyKey: `${id}:activate`,
      payload: {
        profile_id: activated.id,
        status: activated.status,
        label: activated.label
      }
    });

    return reply.code(202).send({ accepted: true });
  });

  app.post("/api/auth-profiles/chatgpt/:id/deactivate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const deactivated = await persistence.deactivateAuthProfile(id);
    if (!deactivated) {
      return sendError(reply, 404, "Profile not found", "NOT_FOUND");
    }

    return reply.code(202).send({ accepted: true });
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
    const { id } = request.params as { id: string };
    const body = request.body as PackPatchRequest;

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

    return reply.send(packToResponse(updated));
  });

  app.post("/api/packs/:id/materialize", async (request, reply) => {
    const { id } = request.params as { id: string };
    const materialized = await persistence.materializePack(id);
    if (!materialized) {
      return sendError(reply, 404, "Pack not found", "NOT_FOUND");
    }

    return reply.code(202).send({ accepted: true });
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

    const delegation = await persistence.createDelegationRequest({
      requester_task_id: requesterTaskId,
      requester_task_run_id: requesterTaskRunId,
      capability,
      target_selector: body.target_selector,
      payload: body.payload,
      priority,
      trace_id: traceId
    });

    return reply.code(202).send(delegationToResponse(delegation));
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

    let matched = rule.is_enabled;
    const reasons: string[] = [];

    if (!rule.is_enabled) {
      reasons.push("rule_disabled");
    } else {
      reasons.push("rule_enabled");
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

    const isEnabled = rule.is_enabled;
    const run = await persistence.createScheduledRun({
      rule_id: id,
      status: isEnabled ? "started" : "skipped_due_to_overlap",
      started_at: new Date(),
      ended_at: isEnabled ? null : new Date(),
      skip_reason: isEnabled ? null : "rule_disabled",
      trace_id: traceId,
      idempotency_key: `${id}:${traceId}`,
      result_json: isEnabled ? null : { reason: "rule_disabled" }
    });

    await publisher.publish({
      eventType: isEnabled ? "schedule.run.started" : "schedule.run.skipped_due_to_overlap",
      traceId,
      idempotencyKey: `${run.id}:${traceId}`,
      payload: {
        rule_id: id,
        run_id: run.id,
        scope: rule.scope,
        status: run.status,
        reason: run.skip_reason
      }
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

  app.post("/api/queue/held/release", async (_request, reply) => {
    await persistence.releaseHeldQueue();
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

    await publisher.publish({
      eventType: "module.execution.started",
      traceId,
      idempotencyKey: `${key}:${traceId}:started`,
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
      started_at: startedAt,
      ended_at: null
    });

    const updated = await persistence.updateCustomModuleConfig(key, {
      is_enabled: typeof body.is_enabled === "boolean" ? body.is_enabled : undefined,
      config_json: isPlainObject(body.config_json) ? body.config_json : undefined,
      updated_by: "admin"
    });

    if (!updated) {
      return sendError(reply, 404, "Module config not found", "NOT_FOUND");
    }

    await publisher.publish({
      eventType: "module.execution.completed",
      traceId,
      idempotencyKey: `${key}:${traceId}:completed`,
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
      started_at: startedAt,
      ended_at: new Date()
    });

    return reply.send(updated);
  });

  await registerOpenApiStubs(app, config.openApiPath, IMPLEMENTED_ROUTES);

  return app;
}
