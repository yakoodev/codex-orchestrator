import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp, SWITCH_MODULE_KEY } from "../src/app";
import type { AppConfig } from "../src/config";
import type {
  AgentTemplateEntity,
  ArtifactEntity,
  AuthContextEntity,
  AuthProfileEntity,
  AuthContextType,
  AuthSwitchEventEntity,
  CreateDelegationRequestInput,
  CreateModuleExecutionInput,
  CreateScheduledRuleInput,
  CreateScheduledRunInput,
  CustomModuleConfigEntity,
  DelegationRequestEntity,
  EventPublishInput,
  EventPublisher,
  ModuleExecutionEntity,
  PackRegistryEntity,
  Persistence,
  ScheduledRuleEntity,
  ScheduledRunEntity,
  ScheduleMisfirePolicy,
  ScheduleOverlapPolicy,
  StorageService,
  TaskEntity,
  WorkerEntity
} from "../src/runtime/contracts";
import type { TaskStatus } from "../src/types";

class FakePersistence implements Persistence {
  public readonly tasks: TaskEntity[] = [];
  public readonly agentTemplates: AgentTemplateEntity[] = [];
  public readonly packs: PackRegistryEntity[] = [];
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
  public readonly moduleExecutions: ModuleExecutionEntity[] = [];
  public readonly delegations: DelegationRequestEntity[] = [];
  public readonly schedules: ScheduledRuleEntity[] = [];
  public readonly scheduledRuns: ScheduledRunEntity[] = [];

  private taskCounter = 1;
  private agentTemplateCounter = 1;
  private packCounter = 1;
  private workerCounter = 1;
  private authContextCounter = 1;
  private artifactCounter = 1;
  private profileCounter = 1;
  private moduleCounter = 1;
  private moduleExecutionCounter = 1;
  private delegationCounter = 1;
  private scheduleCounter = 1;
  private scheduleRunCounter = 1;

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

  public async getTaskById(id: string): Promise<TaskEntity | null> {
    return this.tasks.find((task) => task.id === id) ?? null;
  }

  public async updateTaskStatus(id: string, status: TaskStatus): Promise<TaskEntity | null> {
    const task = this.tasks.find((item) => item.id === id);
    if (!task) {
      return null;
    }

    task.status = status;
    return task;
  }

  public async releaseHeldQueue(): Promise<number> {
    let changed = 0;
    for (const task of this.tasks) {
      if (task.status === "WAITING_LIMIT") {
        task.status = "QUEUED";
        changed += 1;
      }
    }
    return changed;
  }

  public async createAgentTemplate(input: {
    name: string;
    role: string;
    description?: string;
    model: string;
    auth_context_id?: string;
    pack_registry_entry_id?: string | null;
    system_prompt: string;
    instructions_md?: string;
    sandbox_policy: string;
    approval_policy: string;
    output_schema?: Record<string, unknown>;
  }): Promise<AgentTemplateEntity> {
    void input.description;
    void input.system_prompt;
    void input.instructions_md;
    void input.output_schema;

    const template: AgentTemplateEntity = {
      id: `agent-template-${this.agentTemplateCounter++}`,
      name: input.name,
      role: input.role,
      model: input.model,
      auth_context_id: input.auth_context_id ?? null,
      pack_registry_entry_id: input.pack_registry_entry_id ?? null,
      sandbox_policy: input.sandbox_policy,
      approval_policy: input.approval_policy,
      is_enabled: true
    };

    this.agentTemplates.push(template);
    return template;
  }

  public async listAgentTemplates(): Promise<AgentTemplateEntity[]> {
    return [...this.agentTemplates];
  }

  public async patchAgentTemplate(
    id: string,
    patch: {
      name?: string;
      role?: string;
      description?: string;
      model?: string;
      auth_context_id?: string;
      pack_registry_entry_id?: string | null;
      system_prompt?: string;
      instructions_md?: string;
      sandbox_policy?: string;
      approval_policy?: string;
      output_schema?: Record<string, unknown>;
      is_enabled?: boolean;
    }
  ): Promise<AgentTemplateEntity | null> {
    void patch.description;
    void patch.system_prompt;
    void patch.instructions_md;
    void patch.output_schema;

    const template = this.agentTemplates.find((item) => item.id === id);
    if (!template) {
      return null;
    }

    if (patch.name) {
      template.name = patch.name;
    }
    if (patch.role) {
      template.role = patch.role;
    }
    if (patch.model) {
      template.model = patch.model;
    }
    if (patch.auth_context_id) {
      template.auth_context_id = patch.auth_context_id;
    }
    if (patch.pack_registry_entry_id !== undefined) {
      template.pack_registry_entry_id = patch.pack_registry_entry_id;
    }
    if (patch.sandbox_policy) {
      template.sandbox_policy = patch.sandbox_policy;
    }
    if (patch.approval_policy) {
      template.approval_policy = patch.approval_policy;
    }
    if (typeof patch.is_enabled === "boolean") {
      template.is_enabled = patch.is_enabled;
    }

    return template;
  }

  public async deleteAgentTemplate(id: string): Promise<boolean> {
    const index = this.agentTemplates.findIndex((item) => item.id === id);
    if (index < 0) {
      return false;
    }

    this.agentTemplates.splice(index, 1);
    return true;
  }

  public async createPack(
    input: {
      pack_id: string;
      role: string;
      capabilities_json: Record<string, unknown>;
      source_type: "git" | "zip";
      source_ref: string;
      pinned_version: string;
      manifest_json: Record<string, unknown>;
    },
    registeredBy: string
  ): Promise<PackRegistryEntity> {
    const now = new Date();
    const pack: PackRegistryEntity = {
      id: `pack-${this.packCounter++}`,
      pack_id: input.pack_id,
      role: input.role,
      capabilities_json: input.capabilities_json,
      source_type: input.source_type,
      source_ref: input.source_ref,
      pinned_version: input.pinned_version,
      manifest_json: input.manifest_json,
      materialize_status: "registered",
      cached_path: null,
      is_enabled: true,
      registered_by: registeredBy,
      created_at: now,
      updated_at: now
    };
    this.packs.push(pack);
    return pack;
  }

  public async listPacks(): Promise<PackRegistryEntity[]> {
    return [...this.packs];
  }

  public async getPackById(id: string): Promise<PackRegistryEntity | null> {
    return this.packs.find((pack) => pack.id === id) ?? null;
  }

  public async patchPack(
    id: string,
    patch: {
      pinned_version?: string;
      is_enabled?: boolean;
      source_ref?: string;
    }
  ): Promise<PackRegistryEntity | null> {
    const pack = this.packs.find((item) => item.id === id);
    if (!pack) {
      return null;
    }

    if (patch.pinned_version) {
      pack.pinned_version = patch.pinned_version;
    }
    if (patch.source_ref) {
      pack.source_ref = patch.source_ref;
    }
    if (typeof patch.is_enabled === "boolean") {
      pack.is_enabled = patch.is_enabled;
    }
    pack.updated_at = new Date();
    return pack;
  }

  public async materializePack(id: string): Promise<boolean> {
    const pack = this.packs.find((item) => item.id === id);
    if (!pack) {
      return false;
    }

    pack.materialize_status = "materialized";
    pack.cached_path = `/packs/cache/${id}`;
    pack.updated_at = new Date();
    return true;
  }

  public async createDelegationRequest(
    input: CreateDelegationRequestInput
  ): Promise<DelegationRequestEntity> {
    const now = new Date();
    const delegation: DelegationRequestEntity = {
      id: `delegation-${this.delegationCounter++}`,
      requester_task_id: input.requester_task_id,
      requester_task_run_id: input.requester_task_run_id ?? null,
      capability: input.capability,
      target_selector: input.target_selector,
      payload: input.payload,
      priority: input.priority ?? 100,
      status: "requested",
      target_agent_template_id: null,
      target_worker_instance_id: null,
      result_summary: null,
      trace_id: input.trace_id,
      created_at: now,
      started_at: null,
      ended_at: null
    };

    this.delegations.push(delegation);
    return delegation;
  }

  public async getDelegationRequest(id: string): Promise<DelegationRequestEntity | null> {
    return this.delegations.find((delegation) => delegation.id === id) ?? null;
  }

  public async createScheduledRule(input: CreateScheduledRuleInput): Promise<ScheduledRuleEntity> {
    const now = new Date();
    const rule: ScheduledRuleEntity = {
      id: `schedule-${this.scheduleCounter++}`,
      name: input.name,
      scope: input.scope,
      project_id: input.project_id ?? null,
      is_enabled: true,
      rule_ast: input.rule_ast,
      target_agent_template_id: input.target_agent_template_id ?? null,
      fallback_role: input.fallback_role ?? null,
      overlap_policy: input.overlap_policy,
      misfire_policy: input.misfire_policy,
      created_by: input.created_by,
      created_at: now,
      updated_at: now
    };

    this.schedules.push(rule);
    return rule;
  }

  public async listScheduledRules(): Promise<ScheduledRuleEntity[]> {
    return [...this.schedules];
  }

  public async getScheduledRuleById(id: string): Promise<ScheduledRuleEntity | null> {
    return this.schedules.find((rule) => rule.id === id) ?? null;
  }

  public async patchScheduledRule(
    id: string,
    patch: {
      name?: string;
      is_enabled?: boolean;
      rule_ast?: Record<string, unknown>;
      target_agent_template_id?: string | null;
      fallback_role?: string | null;
      overlap_policy?: ScheduleOverlapPolicy;
      misfire_policy?: ScheduleMisfirePolicy;
    }
  ): Promise<ScheduledRuleEntity | null> {
    const rule = this.schedules.find((item) => item.id === id);
    if (!rule) {
      return null;
    }

    if (patch.name) {
      rule.name = patch.name;
    }
    if (typeof patch.is_enabled === "boolean") {
      rule.is_enabled = patch.is_enabled;
    }
    if (patch.rule_ast) {
      rule.rule_ast = patch.rule_ast;
    }
    if (patch.target_agent_template_id !== undefined) {
      rule.target_agent_template_id = patch.target_agent_template_id;
    }
    if (patch.fallback_role !== undefined) {
      rule.fallback_role = patch.fallback_role;
    }
    if (patch.overlap_policy) {
      rule.overlap_policy = patch.overlap_policy;
    }
    if (patch.misfire_policy) {
      rule.misfire_policy = patch.misfire_policy;
    }
    rule.updated_at = new Date();
    return rule;
  }

  public async deleteScheduledRule(id: string): Promise<boolean> {
    const index = this.schedules.findIndex((rule) => rule.id === id);
    if (index < 0) {
      return false;
    }

    this.schedules.splice(index, 1);
    this.scheduledRuns.splice(0, this.scheduledRuns.length, ...this.scheduledRuns.filter((run) => run.rule_id !== id));
    return true;
  }

  public async setScheduledRuleEnabled(id: string, isEnabled: boolean): Promise<boolean> {
    const rule = this.schedules.find((item) => item.id === id);
    if (!rule) {
      return false;
    }

    rule.is_enabled = isEnabled;
    rule.updated_at = new Date();
    return true;
  }

  public async createScheduledRun(input: CreateScheduledRunInput): Promise<ScheduledRunEntity> {
    const run: ScheduledRunEntity = {
      id: `schedule-run-${this.scheduleRunCounter++}`,
      rule_id: input.rule_id,
      created_task_id: input.created_task_id ?? null,
      status: input.status,
      started_at: input.started_at ?? new Date(),
      ended_at: input.ended_at ?? null,
      skip_reason: input.skip_reason ?? null,
      trace_id: input.trace_id,
      idempotency_key: input.idempotency_key ?? null,
      result_json: input.result_json ?? null
    };

    this.scheduledRuns.push(run);
    return run;
  }

  public async listScheduledRuns(ruleId: string): Promise<ScheduledRunEntity[]> {
    return this.scheduledRuns.filter((run) => run.rule_id === ruleId);
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

  public async listCustomModuleConfigs(): Promise<CustomModuleConfigEntity[]> {
    return [...this.modules];
  }

  public async getCustomModuleConfig(key: string): Promise<CustomModuleConfigEntity | null> {
    return this.modules.find((module) => module.module_key === key) ?? null;
  }

  public async listModuleExecutions(moduleKey: string): Promise<ModuleExecutionEntity[]> {
    return this.moduleExecutions
      .filter((execution) => execution.module_key === moduleKey)
      .sort((left, right) => right.started_at.getTime() - left.started_at.getTime());
  }

  public async createModuleExecution(input: CreateModuleExecutionInput): Promise<ModuleExecutionEntity> {
    const execution: ModuleExecutionEntity = {
      id: `module-execution-${this.moduleExecutionCounter++}`,
      module_key: input.module_key,
      event_type: input.event_type,
      status: input.status,
      started_at: input.started_at ?? new Date(),
      ended_at: input.ended_at ?? null
    };

    this.moduleExecutions.push(execution);
    return execution;
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

  it("handles task lifecycle endpoints", async () => {
    const task = await persistence.createTask({
      title: "Lifecycle task",
      description: "task lifecycle",
      project_id: "project",
      repo_id: "repo",
      branch: null,
      priority: 100,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/tasks/${task.id}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json().id).toBe(task.id);

    const pauseResponse = await app.inject({
      method: "POST",
      url: `/api/tasks/${task.id}/pause`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(pauseResponse.statusCode).toBe(200);
    expect(pauseResponse.json().status).toBe("INTERRUPTED");

    const resumeResponse = await app.inject({
      method: "POST",
      url: `/api/tasks/${task.id}/resume`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(resumeResponse.statusCode).toBe(200);
    expect(resumeResponse.json().status).toBe("QUEUED");

    const approveResponse = await app.inject({
      method: "POST",
      url: `/api/tasks/${task.id}/approve`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(approveResponse.statusCode).toBe(200);
    expect(approveResponse.json().status).toBe("RUNNING");

    const rejectResponse = await app.inject({
      method: "POST",
      url: `/api/tasks/${task.id}/reject`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(rejectResponse.statusCode).toBe(200);
    expect(rejectResponse.json().status).toBe("BLOCKED");

    const replanResponse = await app.inject({
      method: "POST",
      url: `/api/tasks/${task.id}/replan`,
      headers: { "x-admin-token": config.adminToken },
      payload: { reason: "new plan" }
    });
    expect(replanResponse.statusCode).toBe(202);
    expect(replanResponse.json()).toEqual({ accepted: true });

    const stopResponse = await app.inject({
      method: "POST",
      url: `/api/tasks/${task.id}/stop`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(stopResponse.statusCode).toBe(200);
    expect(stopResponse.json().status).toBe("FAILED_TERMINAL");
  });

  it("manages agent templates CRUD", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/agents/templates",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        name: "Backend Dev",
        role: "developer",
        model: "gpt-5.4",
        system_prompt: "You are a backend developer.",
        sandbox_policy: "workspace_write",
        approval_policy: "never"
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const templateId = createResponse.json().id as string;

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/agents/templates",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items).toHaveLength(1);

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/api/agents/templates/${templateId}`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        name: "Backend Dev Updated",
        is_enabled: false
      }
    });
    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().name).toBe("Backend Dev Updated");
    expect(patchResponse.json().is_enabled).toBe(false);

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/agents/templates/${templateId}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(deleteResponse.statusCode).toBe(204);
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

  it("manages packs endpoints", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/packs",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        pack_id: "backend-pack",
        role: "developer",
        capabilities_json: { code: true },
        source_type: "git",
        source_ref: "https://example.com/repo.git",
        pinned_version: "v1.0.0",
        manifest_json: { name: "backend-pack" }
      }
    });
    expect(createResponse.statusCode).toBe(201);
    const packId = createResponse.json().id as string;

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/packs",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items).toHaveLength(1);

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/packs/${packId}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json().id).toBe(packId);

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/api/packs/${packId}`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        pinned_version: "v1.1.0",
        is_enabled: false
      }
    });
    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().pinned_version).toBe("v1.1.0");
    expect(patchResponse.json().is_enabled).toBe(false);

    const materializeResponse = await app.inject({
      method: "POST",
      url: `/api/packs/${packId}/materialize`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(materializeResponse.statusCode).toBe(202);
    expect(materializeResponse.json()).toEqual({ accepted: true });
  });

  it("handles delegation capabilities dispatch and result", async () => {
    await persistence.createAgentTemplate({
      name: "helper-template",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "You are helper",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });

    const capabilitiesResponse = await app.inject({
      method: "GET",
      url: "/api/delegation/capabilities",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(capabilitiesResponse.statusCode).toBe(200);
    expect(capabilitiesResponse.json().items).toHaveLength(1);
    expect(capabilitiesResponse.json().items[0].capability).toBe("reviewer");

    const dispatchResponse = await app.inject({
      method: "POST",
      url: "/api/delegation/dispatch",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-delegation-1" },
      payload: {
        requester_task_id: "task-1",
        requester_task_run_id: "run-1",
        capability: "reviewer",
        target_selector: { role: "reviewer" },
        payload: { task: "check patch" },
        priority: 77
      }
    });
    expect(dispatchResponse.statusCode).toBe(202);
    expect(dispatchResponse.json().status).toBe("requested");
    expect(dispatchResponse.json().trace_id).toBe("trace-delegation-1");
    const delegationId = dispatchResponse.json().id as string;

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/delegation/${delegationId}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json().id).toBe(delegationId);
    expect(getResponse.json().capability).toBe("reviewer");

    const resultResponse = await app.inject({
      method: "GET",
      url: `/api/delegation/${delegationId}/result`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(resultResponse.statusCode).toBe(200);
    expect(resultResponse.json()).toEqual({
      id: delegationId,
      status: "requested",
      result_summary: null,
      artifacts: []
    });
  });

  it("manages schedules endpoints", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/schedules",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-schedule-1" },
      payload: {
        name: "Nightly check",
        scope: "global",
        project_id: null,
        rule_ast: {
          conditions: [{ predicate: "time.cron", operator: "eq", value: "0 3 * * *" }]
        },
        overlap_policy: "one_active_skip",
        misfire_policy: "recompute_due_on_restart"
      }
    });
    expect(createResponse.statusCode).toBe(201);
    const ruleId = createResponse.json().id as string;
    expect(createResponse.json().name).toBe("Nightly check");

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/schedules",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items).toHaveLength(1);

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/schedules/${ruleId}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json().id).toBe(ruleId);

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/api/schedules/${ruleId}`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-schedule-2" },
      payload: {
        name: "Nightly check updated",
        is_enabled: false,
        fallback_role: "reviewer"
      }
    });
    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().is_enabled).toBe(false);
    expect(patchResponse.json().fallback_role).toBe("reviewer");

    const evaluateResponse = await app.inject({
      method: "POST",
      url: `/api/schedules/${ruleId}/evaluate`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        dry_run_context: {
          force_match: true
        }
      }
    });
    expect(evaluateResponse.statusCode).toBe(200);
    expect(evaluateResponse.json().rule_id).toBe(ruleId);
    expect(evaluateResponse.json().matched).toBe(true);

    const triggerResponse = await app.inject({
      method: "POST",
      url: `/api/schedules/${ruleId}/trigger`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-schedule-3" }
    });
    expect(triggerResponse.statusCode).toBe(202);
    expect(triggerResponse.json().status).toBe("skipped_due_to_overlap");

    const runsResponse = await app.inject({
      method: "GET",
      url: `/api/schedules/${ruleId}/runs`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(runsResponse.statusCode).toBe(200);
    expect(runsResponse.json().items).toHaveLength(1);

    const enableResponse = await app.inject({
      method: "POST",
      url: `/api/schedules/${ruleId}/enable`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(enableResponse.statusCode).toBe(202);

    const secondTriggerResponse = await app.inject({
      method: "POST",
      url: `/api/schedules/${ruleId}/trigger`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-schedule-4" }
    });
    expect(secondTriggerResponse.statusCode).toBe(202);
    expect(secondTriggerResponse.json().status).toBe("started");

    const disableResponse = await app.inject({
      method: "POST",
      url: `/api/schedules/${ruleId}/disable`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(disableResponse.statusCode).toBe(202);
    expect(disableResponse.json()).toEqual({ accepted: true });

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/schedules/${ruleId}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(deleteResponse.statusCode).toBe(204);

    const getAfterDelete = await app.inject({
      method: "GET",
      url: `/api/schedules/${ruleId}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(getAfterDelete.statusCode).toBe(404);

    expect(
      publisher.events.some((event) => event.eventType === "schedule.rule.created")
    ).toBe(true);
    expect(
      publisher.events.some((event) => event.eventType === "schedule.run.started")
    ).toBe(true);
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

  it("releases held queue", async () => {
    await persistence.createTask({
      title: "held-1",
      description: "held task",
      project_id: "project",
      repo_id: "repo",
      branch: null,
      priority: 100,
      status: "WAITING_LIMIT",
      source: "api",
      created_by: "admin"
    });

    const releaseResponse = await app.inject({
      method: "POST",
      url: "/api/queue/held/release",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(releaseResponse.statusCode).toBe(202);
    expect(releaseResponse.json()).toEqual({ accepted: true });

    const heldAfterRelease = await app.inject({
      method: "GET",
      url: "/api/queue/held",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(heldAfterRelease.statusCode).toBe(200);
    expect(heldAfterRelease.json().items).toHaveLength(0);
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

    const executionsResponse = await app.inject({
      method: "GET",
      url: `/api/custom-modules/${SWITCH_MODULE_KEY}/executions`,
      headers: { "x-admin-token": config.adminToken }
    });

    expect(executionsResponse.statusCode).toBe(200);
    expect(executionsResponse.json().items).toHaveLength(2);
    expect(executionsResponse.json().items[0].module_key).toBe(SWITCH_MODULE_KEY);
  });

  it("lists custom modules", async () => {
    await app.inject({
      method: "GET",
      url: `/api/custom-modules/${SWITCH_MODULE_KEY}`,
      headers: { "x-admin-token": config.adminToken }
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/custom-modules",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items.length).toBeGreaterThan(0);
    expect(response.json().items[0].module_key).toBe(SWITCH_MODULE_KEY);
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

  it("returns 404 for unknown route", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/non-existent-route",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(response.statusCode).toBe(404);
  });
});
