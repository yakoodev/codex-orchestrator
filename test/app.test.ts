import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp, SWITCH_MODULE_KEY } from "../src/app";
import type { AppConfig } from "../src/config";
import type {
  ArtifactEntity,
  AuthContextEntity,
  AuthProfileEntity,
  AuthContextType,
  AuthSwitchEventEntity,
  CustomModuleConfigEntity,
  EventPublishInput,
  EventPublisher,
  Persistence,
  StorageService,
  TaskEntity,
  WorkerEntity
} from "../src/runtime/contracts";
import type { TaskStatus } from "../src/types";

class FakePersistence implements Persistence {
  public readonly tasks: TaskEntity[] = [];
  public readonly workers: WorkerEntity[] = [];
  public readonly authContexts: (AuthContextEntity & {
    provider: string;
    usage_policy: Record<string, unknown> | null;
    limit_policy: Record<string, unknown> | null;
    notes: string | null;
  })[] = [];
  public readonly artifacts: ArtifactEntity[] = [];
  public readonly profiles: (AuthProfileEntity & {
    storage_path: string;
    uploaded_by: string;
    activated_by: string | null;
    meta_json: Record<string, unknown>;
  })[] = [];
  public readonly switchEvents: AuthSwitchEventEntity[] = [];
  public readonly modules: CustomModuleConfigEntity[] = [];

  private taskCounter = 1;
  private workerCounter = 1;
  private authContextCounter = 1;
  private artifactCounter = 1;
  private profileCounter = 1;
  private moduleCounter = 1;

  public dbReady = true;

  public async pingDb(): Promise<void> {
    if (!this.dbReady) {
      throw new Error("db not ready");
    }
  }

  public async createTask(input: {
    title: string;
    description: string;
    project_id: string;
    repo_id: string;
    branch: string | null;
    priority: number;
    status: TaskStatus;
    source: string;
    created_by: string;
  }): Promise<TaskEntity> {
    const task: TaskEntity = {
      id: `task-${this.taskCounter++}`,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      project_id: input.project_id,
      repo_id: input.repo_id,
      branch: input.branch
    };
    this.tasks.push(task);
    return task;
  }

  public async listTasks(status?: TaskStatus): Promise<TaskEntity[]> {
    return status ? this.tasks.filter((task) => task.status === status) : [...this.tasks];
  }

  public async listWorkers(): Promise<WorkerEntity[]> {
    return [...this.workers];
  }

  public async setWorkerStatus(id: string, status: "READY" | "DISABLED"): Promise<boolean> {
    const worker = this.workers.find((item) => item.id === id);
    if (!worker) {
      return false;
    }

    worker.status = status;
    return true;
  }

  public async workerExists(id: string): Promise<boolean> {
    return this.workers.some((worker) => worker.id === id);
  }

  public async getWorkerLogs(_id: string): Promise<string[]> {
    void _id;
    return ["worker started", "worker heartbeat"];
  }

  public async createAuthContext(input: {
    label: string;
    type: AuthContextType;
    provider: string;
    usage_policy?: Record<string, unknown>;
    limit_policy?: Record<string, unknown>;
  }): Promise<AuthContextEntity> {
    const authContext = {
      id: `auth-context-${this.authContextCounter++}`,
      label: input.label,
      type: input.type,
      provider: input.provider,
      usage_policy: input.usage_policy ?? null,
      limit_policy: input.limit_policy ?? null,
      notes: null,
      is_enabled: true
    };

    this.authContexts.push(authContext);
    return authContext;
  }

  public async listAuthContexts(): Promise<AuthContextEntity[]> {
    return this.authContexts.map((authContext) => ({
      id: authContext.id,
      label: authContext.label,
      type: authContext.type,
      is_enabled: authContext.is_enabled
    }));
  }

  public async patchAuthContext(
    id: string,
    patch: {
      label?: string;
      type?: AuthContextType;
      provider?: string;
      usage_policy?: Record<string, unknown>;
      limit_policy?: Record<string, unknown>;
      is_enabled?: boolean;
      notes?: string;
    }
  ): Promise<AuthContextEntity | null> {
    const authContext = this.authContexts.find((item) => item.id === id);
    if (!authContext) {
      return null;
    }

    if (patch.label) {
      authContext.label = patch.label;
    }
    if (patch.type) {
      authContext.type = patch.type;
    }
    if (patch.provider) {
      authContext.provider = patch.provider;
    }
    if (patch.usage_policy) {
      authContext.usage_policy = patch.usage_policy;
    }
    if (patch.limit_policy) {
      authContext.limit_policy = patch.limit_policy;
    }
    if (typeof patch.is_enabled === "boolean") {
      authContext.is_enabled = patch.is_enabled;
    }
    if (patch.notes) {
      authContext.notes = patch.notes;
    }

    return {
      id: authContext.id,
      label: authContext.label,
      type: authContext.type,
      is_enabled: authContext.is_enabled
    };
  }

  public async disableAuthContext(id: string): Promise<boolean> {
    const authContext = this.authContexts.find((item) => item.id === id);
    if (!authContext) {
      return false;
    }

    authContext.is_enabled = false;
    return true;
  }

  public async listTaskArtifacts(taskId: string): Promise<ArtifactEntity[]> {
    return this.artifacts.filter((artifact) => artifact.task_id === taskId);
  }

  public async getArtifactById(id: string): Promise<ArtifactEntity | null> {
    return this.artifacts.find((artifact) => artifact.id === id) ?? null;
  }

  public async seedWorker(input?: Partial<WorkerEntity>): Promise<WorkerEntity> {
    const worker: WorkerEntity = {
      id: input?.id ?? `worker-${this.workerCounter++}`,
      status: input?.status ?? "READY",
      runtime_mode: input?.runtime_mode ?? "ondemand",
      current_task_id: input?.current_task_id ?? null
    };
    this.workers.push(worker);
    return worker;
  }

  public async seedArtifact(input: { task_id: string; type?: ArtifactEntity["type"]; path?: string }): Promise<ArtifactEntity> {
    const artifact: ArtifactEntity = {
      id: `artifact-${this.artifactCounter++}`,
      task_id: input.task_id,
      type: input.type ?? "log",
      path: input.path ?? `/artifacts/${this.artifactCounter}.log`
    };
    this.artifacts.push(artifact);
    return artifact;
  }

  public async createAuthProfile(input: {
    label: string;
    status: "active" | "inactive" | "blocked";
    checksum: string;
    storage_path: string;
    meta_json: Record<string, unknown>;
    uploaded_by: string;
  }): Promise<AuthProfileEntity> {
    const profile = {
      id: `profile-${this.profileCounter++}`,
      label: input.label,
      status: input.status,
      checksum: input.checksum,
      storage_path: input.storage_path,
      meta_json: input.meta_json,
      uploaded_by: input.uploaded_by,
      activated_by: null,
      created_at: new Date()
    };

    this.profiles.push(profile);
    return profile;
  }

  public async listAuthProfiles(): Promise<AuthProfileEntity[]> {
    return [...this.profiles];
  }

  public async getActiveAuthProfile(): Promise<AuthProfileEntity | null> {
    return this.profiles.find((profile) => profile.status === "active") ?? null;
  }

  public async activateAuthProfile(id: string, activatedBy: string): Promise<AuthProfileEntity | null> {
    const target = this.profiles.find((profile) => profile.id === id);
    if (!target) {
      return null;
    }

    for (const profile of this.profiles) {
      if (profile.status === "active" && profile.id !== id) {
        profile.status = "inactive";
      }
    }

    target.status = "active";
    target.activated_by = activatedBy;
    return target;
  }

  public async deactivateAuthProfile(id: string): Promise<boolean> {
    const target = this.profiles.find((profile) => profile.id === id);
    if (!target) {
      return false;
    }

    target.status = "inactive";
    target.activated_by = null;
    return true;
  }

  public async listAuthSwitchEvents(): Promise<AuthSwitchEventEntity[]> {
    return [...this.switchEvents];
  }

  public async listHeldTasks(): Promise<TaskEntity[]> {
    return this.tasks.filter((task) => task.status === "WAITING_LIMIT");
  }

  public async getCustomModuleConfig(key: string): Promise<CustomModuleConfigEntity | null> {
    return this.modules.find((module) => module.module_key === key) ?? null;
  }

  public async createCustomModuleConfig(input: {
    module_key: string;
    is_enabled: boolean;
    scope: string;
    config_json: Record<string, unknown>;
    updated_by: string;
  }): Promise<CustomModuleConfigEntity> {
    const moduleConfig: CustomModuleConfigEntity = {
      id: `module-${this.moduleCounter++}`,
      module_key: input.module_key,
      is_enabled: input.is_enabled,
      scope: input.scope,
      config_json: input.config_json
    };

    this.modules.push(moduleConfig);
    return moduleConfig;
  }

  public async updateCustomModuleConfig(
    key: string,
    patch: {
      is_enabled?: boolean;
      config_json?: Record<string, unknown>;
      updated_by: string;
    }
  ): Promise<CustomModuleConfigEntity | null> {
    const moduleConfig = this.modules.find((module) => module.module_key === key);
    if (!moduleConfig) {
      return null;
    }

    if (typeof patch.is_enabled === "boolean") {
      moduleConfig.is_enabled = patch.is_enabled;
    }

    if (patch.config_json) {
      moduleConfig.config_json = patch.config_json;
    }

    return moduleConfig;
  }
}

class FakeStorage implements StorageService {
  public readonly objects = new Map<string, Buffer>();
  public ready = true;

  public async putObject(key: string, body: Buffer, _contentType: string): Promise<void> {
    void _contentType;
    this.objects.set(key, body);
  }

  public async checkReady(): Promise<void> {
    if (!this.ready) {
      throw new Error("storage not ready");
    }
  }

  public async ensureBucket(): Promise<void> {
    return;
  }
}

class FakePublisher implements EventPublisher {
  public readonly events: EventPublishInput[] = [];
  public ready = true;

  public async ping(): Promise<void> {
    if (!this.ready) {
      throw new Error("redis not ready");
    }
  }

  public async publish(event: EventPublishInput): Promise<void> {
    this.events.push(event);
  }
}

describe("smoke-core API", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let persistence: FakePersistence;
  let storage: FakeStorage;
  let publisher: FakePublisher;

  const config: AppConfig = {
    nodeEnv: "test",
    serviceName: "bus",
    port: 8080,
    adminToken: "test-token",
    databaseUrl: "postgres://test",
    redisUrl: "redis://127.0.0.1:6379",
    redisStreamKey: "orchestrator.events",
    s3Endpoint: "http://127.0.0.1:9000",
    s3Region: "us-east-1",
    s3Bucket: "orchestrator-artifacts",
    s3AccessKey: "test",
    s3SecretKey: "test",
    maxZipBytes: 2 * 1024 * 1024,
    switchModuleDefaultEnabled: true,
    switchWeeklyRemainingPercentLt: 5,
    switchFiveHourRemainingPercentLt: 10,
    switchResetGuardHours: 3,
    openApiPath: path.resolve(process.cwd(), "docs", "contracts", "openapi.yaml")
  };

  beforeEach(async () => {
    persistence = new FakePersistence();
    storage = new FakeStorage();
    publisher = new FakePublisher();

    app = await createApp({
      config,
      persistence,
      storage,
      publisher
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns live health without token", async () => {
    const response = await app.inject({ method: "GET", url: "/health/live" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, service: "bus" });
  });

  it("returns readiness 200 when dependencies are ready", async () => {
    const response = await app.inject({ method: "GET", url: "/health/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, service: "bus" });
  });

  it("returns readiness 503 when at least one dependency is down", async () => {
    storage.ready = false;

    const response = await app.inject({ method: "GET", url: "/health/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json().code).toBe("DEPENDENCIES_NOT_READY");
  });

  it("enforces X-Admin-Token for /api routes", async () => {
    const response = await app.inject({ method: "GET", url: "/api/tasks" });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe("MISSING_ADMIN_TOKEN");
  });

  it("creates and lists tasks", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        title: "Test task",
        description: "Do something",
        project_id: "project-1",
        repo_id: "repo-1",
        priority: 10
      }
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json().title).toBe("Test task");

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/tasks",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items).toHaveLength(1);
  });

  it("manages auth contexts lifecycle", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/auth-contexts",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        label: "Main context",
        type: "chatgpt",
        provider: "openai",
        usage_policy: { mode: "default" }
      }
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json().type).toBe("chatgpt");

    const contextId = createResponse.json().id as string;

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/api/auth-contexts/${contextId}`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        label: "Updated context",
        is_enabled: false
      }
    });

    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().label).toBe("Updated context");
    expect(patchResponse.json().is_enabled).toBe(false);

    const disableResponse = await app.inject({
      method: "POST",
      url: `/api/auth-contexts/${contextId}/disable`,
      headers: { "x-admin-token": config.adminToken }
    });

    expect(disableResponse.statusCode).toBe(202);
    expect(disableResponse.json()).toEqual({ accepted: true });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/auth-contexts",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items).toHaveLength(1);
    expect(listResponse.json().items[0].label).toBe("Updated context");
  });

  it("manages workers endpoints", async () => {
    const worker = await persistence.seedWorker({ runtime_mode: "warm_pool", status: "BUSY" });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/workers",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items).toHaveLength(1);

    const restartResponse = await app.inject({
      method: "POST",
      url: `/api/workers/${worker.id}/restart`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(restartResponse.statusCode).toBe(202);

    const logsResponse = await app.inject({
      method: "GET",
      url: `/api/workers/${worker.id}/logs`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(logsResponse.statusCode).toBe(200);
    expect(logsResponse.json().lines.length).toBeGreaterThan(0);

    const disableResponse = await app.inject({
      method: "POST",
      url: `/api/workers/${worker.id}/disable`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(disableResponse.statusCode).toBe(202);
  });

  it("returns task artifacts and single artifact", async () => {
    const task = await persistence.createTask({
      title: "artifact task",
      description: "task with artifacts",
      project_id: "project",
      repo_id: "repo",
      branch: null,
      priority: 100,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });

    const artifact = await persistence.seedArtifact({ task_id: task.id, type: "log", path: "/tmp/a.log" });

    const listResponse = await app.inject({
      method: "GET",
      url: `/api/tasks/${task.id}/artifacts`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items).toHaveLength(1);

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/artifacts/${artifact.id}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json().id).toBe(artifact.id);
  });

  it("uploads ZIP auth profile to storage and emits event", async () => {
    const zipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);

    const response = await request(app.server)
      .post("/api/auth-profiles/chatgpt/upload")
      .set("x-admin-token", config.adminToken)
      .field("label", "profile-a")
      .attach("file", zipBuffer, {
        filename: "profile.zip",
        contentType: "application/zip"
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.label).toBe("profile-a");
    expect(storage.objects.size).toBe(1);
    expect(publisher.events.some((event) => event.eventType === "auth_profile.uploaded")).toBe(true);
  });

  it("activates auth profile and emits activation event", async () => {
    const profile = await persistence.createAuthProfile({
      label: "p1",
      status: "inactive",
      checksum: "abc",
      storage_path: "auth-profiles/p1.zip",
      meta_json: {},
      uploaded_by: "admin"
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/auth-profiles/chatgpt/${profile.id}/activate`,
      headers: { "x-admin-token": config.adminToken }
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
    expect(publisher.events.some((event) => event.eventType === "auth_profile.activated")).toBe(true);
  });

  it("lists auth profiles and resolves active profile", async () => {
    const profile = await persistence.createAuthProfile({
      label: "active-profile",
      status: "inactive",
      checksum: "checksum-active",
      storage_path: "auth-profiles/active.zip",
      meta_json: {},
      uploaded_by: "admin"
    });
    await persistence.activateAuthProfile(profile.id, "admin");

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/auth-profiles/chatgpt",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items.length).toBeGreaterThan(0);

    const activeResponse = await app.inject({
      method: "GET",
      url: "/api/auth-profiles/chatgpt/active",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(activeResponse.statusCode).toBe(200);
    expect(activeResponse.json().id).toBe(profile.id);

    const deactivateResponse = await app.inject({
      method: "POST",
      url: `/api/auth-profiles/chatgpt/${profile.id}/deactivate`,
      headers: { "x-admin-token": config.adminToken },
      payload: {}
    });
    expect(deactivateResponse.statusCode).toBe(202);
    expect(deactivateResponse.json()).toEqual({ accepted: true });
  });

  it("returns held queue tasks from WAITING_LIMIT", async () => {
    await persistence.createTask({
      title: "held",
      description: "held task",
      project_id: "project",
      repo_id: "repo",
      branch: null,
      priority: 100,
      status: "WAITING_LIMIT",
      source: "api",
      created_by: "admin"
    });

    await persistence.createTask({
      title: "new",
      description: "new task",
      project_id: "project",
      repo_id: "repo",
      branch: null,
      priority: 100,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/queue/held",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items).toHaveLength(1);
    expect(response.json().items[0].status).toBe("WAITING_LIMIT");
  });

  it("auto-seeds default module config and allows patch", async () => {
    const getResponse = await app.inject({
      method: "GET",
      url: `/api/custom-modules/${SWITCH_MODULE_KEY}`,
      headers: { "x-admin-token": config.adminToken }
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json().module_key).toBe(SWITCH_MODULE_KEY);

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/api/custom-modules/${SWITCH_MODULE_KEY}`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        is_enabled: false,
        config_json: { threshold: 42 }
      }
    });

    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().is_enabled).toBe(false);
    expect(patchResponse.json().config_json).toEqual({ threshold: 42 });
    expect(
      publisher.events.some((event) => event.eventType === "module.execution.completed")
    ).toBe(true);
  });

  it("returns switch-events from persistence", async () => {
    persistence.switchEvents.push({
      id: "switch-1",
      module_key: SWITCH_MODULE_KEY,
      from_auth_profile_id: "profile-1",
      to_auth_profile_id: "profile-2",
      reason: "limit_pressure",
      status: "completed",
      started_at: new Date("2026-01-01T00:00:00.000Z"),
      ended_at: new Date("2026-01-01T00:01:00.000Z")
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/auth-profiles/chatgpt/switch-events",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items).toHaveLength(1);
    expect(response.json().items[0].id).toBe("switch-1");
  });

  it("returns 501 for non-implemented OpenAPI endpoint", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/packs",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(response.statusCode).toBe(501);
    expect(response.json()).toEqual({
      error: "Not implemented in PR1",
      code: "NOT_IMPLEMENTED"
    });
  });
});
