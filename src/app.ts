import { createHash, randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import multipart from "@fastify/multipart";
import type { AppConfig } from "./config";
import { registerOpenApiStubs } from "./lib/openapi-stubs";
import type {
  ArtifactEntity,
  AuthContextEntity,
  AuthContextType,
  AuthProfileEntity,
  EventPublisher,
  Persistence,
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
  "GET /api/queue/held",
  "GET /api/custom-modules/{key}",
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

interface ModulePatchRequest {
  is_enabled?: unknown;
  config_json?: unknown;
}

const AUTH_CONTEXT_TYPES = new Set<AuthContextType>(["apikey", "chatgpt", "chatgptAuthTokens"]);

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

  app.get("/api/queue/held", async (_request, reply) => {
    const heldTasks = await persistence.listHeldTasks();
    return reply.send({
      items: heldTasks.map((task) => taskToResponse(task))
    });
  });

  app.get("/api/custom-modules/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const moduleConfig = await ensureCustomModuleConfig(persistence, config, key);

    if (!moduleConfig) {
      return sendError(reply, 404, "Module config not found", "NOT_FOUND");
    }

    return reply.send(moduleConfig);
  });

  app.patch("/api/custom-modules/:key", async (request, reply) => {
    const traceId = getTraceId(request);
    const { key } = request.params as { key: string };
    const body = request.body as ModulePatchRequest;

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

    return reply.send(updated);
  });

  await registerOpenApiStubs(app, config.openApiPath, IMPLEMENTED_ROUTES);

  return app;
}
