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
  private switchEventCounter = 1;
  private moduleCounter = 1;
  private moduleExecutionCounter = 1;
  private delegationCounter = 1;
  private scheduleCounter = 1;
  private scheduleRunCounter = 1;

  public dbReady = true;
  public moduleUpdateFailuresRemaining = 0;
  public moduleUpdateAttempts = 0;
  public failListScheduledRules = false;
  public activateFailuresRemaining = 0;
  public deactivateFailuresRemaining = 0;
  public activateAttempts = 0;
  public deactivateAttempts = 0;
  public switchEventFailuresRemaining = 0;

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

  public async updateDelegationRequest(
    id: string,
    patch: {
      status?: DelegationRequestEntity["status"];
      target_agent_template_id?: string | null;
      target_worker_instance_id?: string | null;
      result_summary?: string | null;
      started_at?: Date | null;
      ended_at?: Date | null;
    }
  ): Promise<DelegationRequestEntity | null> {
    const delegation = this.delegations.find((item) => item.id === id);
    if (!delegation) {
      return null;
    }

    if (patch.status) {
      delegation.status = patch.status;
    }
    if (patch.target_agent_template_id !== undefined) {
      delegation.target_agent_template_id = patch.target_agent_template_id;
    }
    if (patch.target_worker_instance_id !== undefined) {
      delegation.target_worker_instance_id = patch.target_worker_instance_id;
    }
    if (patch.result_summary !== undefined) {
      delegation.result_summary = patch.result_summary;
    }
    if (patch.started_at !== undefined) {
      delegation.started_at = patch.started_at;
    }
    if (patch.ended_at !== undefined) {
      delegation.ended_at = patch.ended_at;
    }

    return delegation;
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
    if (this.failListScheduledRules) {
      throw new Error("scheduled rules list failed");
    }
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

  public async getScheduledRunByIdempotency(
    ruleId: string,
    idempotencyKey: string
  ): Promise<ScheduledRunEntity | null> {
    return (
      this.scheduledRuns.find(
        (run) => run.rule_id === ruleId && run.idempotency_key === idempotencyKey
      ) ?? null
    );
  }

  public async getActiveScheduledRun(ruleId: string): Promise<ScheduledRunEntity | null> {
    return (
      this.scheduledRuns.find(
        (run) => run.rule_id === ruleId && run.status === "started" && run.ended_at === null
      ) ?? null
    );
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
    this.activateAttempts += 1;
    if (this.activateFailuresRemaining > 0) {
      this.activateFailuresRemaining -= 1;
      throw new Error("auth profile activate transient failure");
    }

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
    this.deactivateAttempts += 1;
    if (this.deactivateFailuresRemaining > 0) {
      this.deactivateFailuresRemaining -= 1;
      throw new Error("auth profile deactivate transient failure");
    }

    const target = this.profiles.find((profile) => profile.id === id);
    if (!target) {
      return false;
    }

    target.status = "inactive";
    target.activated_by = null;
    return true;
  }

  public async createAuthSwitchEvent(input: {
    module_key: string;
    from_auth_profile_id?: string | null;
    to_auth_profile_id?: string | null;
    reason: string;
    status: AuthSwitchEventEntity["status"];
    switch_scope?: string;
    details_json?: Record<string, unknown> | null;
    started_at?: Date;
    ended_at?: Date | null;
  }): Promise<AuthSwitchEventEntity> {
    void input.switch_scope;
    void input.details_json;
    if (this.switchEventFailuresRemaining > 0) {
      this.switchEventFailuresRemaining -= 1;
      throw new Error("switch event persistence failure");
    }

    const event: AuthSwitchEventEntity = {
      id: `switch-${this.switchEventCounter++}`,
      module_key: input.module_key,
      from_auth_profile_id: input.from_auth_profile_id ?? null,
      to_auth_profile_id: input.to_auth_profile_id ?? null,
      reason: input.reason,
      status: input.status,
      started_at: input.started_at ?? new Date(),
      ended_at: input.ended_at ?? null
    };

    this.switchEvents.push(event);
    return event;
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

  public async getModuleExecutionByIdempotency(
    moduleKey: string,
    idempotencyKey: string
  ): Promise<ModuleExecutionEntity | null> {
    return (
      this.moduleExecutions.find(
        (execution) =>
          execution.module_key === moduleKey && execution.idempotency_key === idempotencyKey
      ) ?? null
    );
  }

  public async createModuleExecution(input: CreateModuleExecutionInput): Promise<ModuleExecutionEntity> {
    const execution: ModuleExecutionEntity = {
      id: `module-execution-${this.moduleExecutionCounter++}`,
      module_key: input.module_key,
      event_type: input.event_type,
      status: input.status,
      trace_id: input.trace_id,
      idempotency_key: input.idempotency_key ?? null,
      details_json: input.details_json ?? null,
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
    this.moduleUpdateAttempts += 1;
    if (this.moduleUpdateFailuresRemaining > 0) {
      this.moduleUpdateFailuresRemaining -= 1;
      throw new Error("module config update transient failure");
    }

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
  public readonly publishFailuresByEventType = new Map<string, number>();

  public async ping(): Promise<void> {
    if (!this.ready) {
      throw new Error("redis not ready");
    }
  }

  public async publish(event: EventPublishInput): Promise<void> {
    const failuresRemaining = this.publishFailuresByEventType.get(event.eventType) ?? 0;
    if (failuresRemaining > 0) {
      this.publishFailuresByEventType.set(event.eventType, failuresRemaining - 1);
      throw new Error(`publish failure for ${event.eventType}`);
    }
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
    expect(
      publisher.events.some((event) => event.eventType === "auth_profile.switch.started")
    ).toBe(true);
    expect(
      publisher.events.some((event) => event.eventType === "auth_profile.switch.completed")
    ).toBe(true);
    expect(persistence.switchEvents).toHaveLength(2);
    const activationStartedEvent = persistence.switchEvents.find(
      (event) => event.reason === "manual_activate" && event.status === "started"
    );
    const activationCompletedEvent = persistence.switchEvents.find(
      (event) => event.reason === "manual_activate" && event.status === "completed"
    );
    expect(activationStartedEvent).toBeDefined();
    expect(activationCompletedEvent).toBeDefined();
    if (!activationStartedEvent || !activationCompletedEvent) {
      throw new Error("Expected manual activate started/completed switch events");
    }
    expect(activationStartedEvent).toMatchObject({
      module_key: SWITCH_MODULE_KEY,
      from_auth_profile_id: null,
      to_auth_profile_id: profile.id,
      reason: "manual_activate",
      status: "started"
    });
    expect(activationCompletedEvent).toMatchObject({
      module_key: SWITCH_MODULE_KEY,
      from_auth_profile_id: null,
      to_auth_profile_id: profile.id,
      reason: "manual_activate",
      status: "completed"
    });
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
    expect(persistence.switchEvents).toHaveLength(2);
    const deactivationStartedEvent = persistence.switchEvents.find(
      (event) => event.reason === "manual_deactivate" && event.status === "started"
    );
    const deactivationCompletedEvent = persistence.switchEvents.find(
      (event) => event.reason === "manual_deactivate" && event.status === "completed"
    );
    expect(deactivationStartedEvent).toBeDefined();
    expect(deactivationCompletedEvent).toBeDefined();
    if (!deactivationStartedEvent || !deactivationCompletedEvent) {
      throw new Error("Expected manual deactivate started/completed switch events");
    }
    expect(deactivationStartedEvent).toMatchObject({
      module_key: SWITCH_MODULE_KEY,
      from_auth_profile_id: profile.id,
      to_auth_profile_id: null,
      reason: "manual_deactivate",
      status: "started"
    });
    expect(deactivationCompletedEvent).toMatchObject({
      module_key: SWITCH_MODULE_KEY,
      from_auth_profile_id: profile.id,
      to_auth_profile_id: null,
      reason: "manual_deactivate",
      status: "completed"
    });
    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "auth_profile.switch.started" &&
          event.payload["reason"] === "manual_deactivate"
      )
    ).toBe(true);
    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "auth_profile.switch.completed" &&
          event.payload["reason"] === "manual_deactivate"
      )
    ).toBe(true);
  });

  it("emits skipped switch event for activate noop when profile is already active", async () => {
    const profile = await persistence.createAuthProfile({
      label: "already-active",
      status: "active",
      checksum: "checksum-active-noop",
      storage_path: "auth-profiles/already-active.zip",
      meta_json: {},
      uploaded_by: "admin"
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/auth-profiles/chatgpt/${profile.id}/activate`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-activate-noop" }
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
    expect(persistence.switchEvents).toHaveLength(1);
    const activateNoopEvent = persistence.switchEvents[0];
    expect(activateNoopEvent).toBeDefined();
    if (!activateNoopEvent) {
      throw new Error("Expected activate noop switch event");
    }
    expect(activateNoopEvent).toMatchObject({
      module_key: SWITCH_MODULE_KEY,
      from_auth_profile_id: profile.id,
      to_auth_profile_id: profile.id,
      reason: "manual_activate_noop",
      status: "skipped"
    });
    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "auth_profile.switch.skipped" &&
          event.payload["reason"] === "manual_activate_noop"
      )
    ).toBe(true);
  });

  it("emits skipped switch event for deactivate noop when profile is not active", async () => {
    const profile = await persistence.createAuthProfile({
      label: "inactive-profile",
      status: "inactive",
      checksum: "checksum-inactive-noop",
      storage_path: "auth-profiles/inactive-noop.zip",
      meta_json: {},
      uploaded_by: "admin"
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/auth-profiles/chatgpt/${profile.id}/deactivate`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-deactivate-noop" },
      payload: {}
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
    expect(persistence.switchEvents).toHaveLength(1);
    const deactivateNoopEvent = persistence.switchEvents[0];
    expect(deactivateNoopEvent).toBeDefined();
    if (!deactivateNoopEvent) {
      throw new Error("Expected deactivate noop switch event");
    }
    expect(deactivateNoopEvent).toMatchObject({
      module_key: SWITCH_MODULE_KEY,
      from_auth_profile_id: profile.id,
      to_auth_profile_id: null,
      reason: "manual_deactivate_noop",
      status: "skipped"
    });
    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "auth_profile.switch.skipped" &&
          event.payload["reason"] === "manual_deactivate_noop"
      )
    ).toBe(true);
  });

  it("runs hold-switch-release workflow for manual activate", async () => {
    await persistence.createTask({
      title: "queued-before-switch",
      description: "queued task before auth switch",
      project_id: "project",
      repo_id: "repo",
      branch: null,
      priority: 100,
      status: "QUEUED",
      source: "api",
      created_by: "admin"
    });

    const targetProfile = await persistence.createAuthProfile({
      label: "activate-with-workflow",
      status: "inactive",
      checksum: "checksum-activate-with-workflow",
      storage_path: "auth-profiles/activate-with-workflow.zip",
      meta_json: {},
      uploaded_by: "admin"
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/auth-profiles/chatgpt/${targetProfile.id}/activate`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-activate-workflow-1" }
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });

    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "queue.hold_started" &&
          event.payload["reason"] === "auth_switch_started" &&
          event.payload["held_count"] === 1
      )
    ).toBe(true);
    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "queue.hold_released" &&
          event.payload["reason"] === "auth_switch_completed" &&
          event.payload["held_count"] === 1
      )
    ).toBe(true);

    const taskSwitchEvents = publisher.events.filter(
      (event) =>
        event.eventType === "task.auth_switching" && event.payload["task_id"] === "task-1"
    );
    expect(taskSwitchEvents).toHaveLength(2);
    expect(
      taskSwitchEvents.some(
        (event) =>
          event.payload["status_before"] === "QUEUED" &&
          event.payload["status_after"] === "WAITING_LIMIT" &&
          event.payload["reason"] === "auth_switch_hold_started"
      )
    ).toBe(true);
    expect(
      taskSwitchEvents.some(
        (event) =>
          event.payload["status_before"] === "WAITING_LIMIT" &&
          event.payload["status_after"] === "QUEUED" &&
          event.payload["reason"] === "auth_switch_release_completed"
      )
    ).toBe(true);
  });

  it("retries activate on transient failure and emits auth_profile.switch.retried", async () => {
    const profile = await persistence.createAuthProfile({
      label: "retry-activate",
      status: "inactive",
      checksum: "checksum-retry-activate",
      storage_path: "auth-profiles/retry-activate.zip",
      meta_json: {},
      uploaded_by: "admin"
    });
    persistence.activateFailuresRemaining = 1;

    const response = await app.inject({
      method: "POST",
      url: `/api/auth-profiles/chatgpt/${profile.id}/activate`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-activate-retry" }
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
    expect(persistence.activateAttempts).toBe(2);

    const retriedEvents = publisher.events.filter(
      (event) =>
        event.eventType === "auth_profile.switch.retried" &&
        event.payload["reason"] === "manual_activate_retry"
    );
    expect(retriedEvents).toHaveLength(1);

    const switchStatuses = persistence.switchEvents.map((event) => event.status);
    expect(switchStatuses).toContain("failed");
    expect(switchStatuses).toContain("started");
    expect(switchStatuses).toContain("completed");
    expect(
      persistence.switchEvents.some(
        (event) => event.reason === "manual_activate_retry" && event.status === "failed"
      )
    ).toBe(true);
  });

  it("keeps activate retry flow healthy when retried side-effects fail", async () => {
    const profile = await persistence.createAuthProfile({
      label: "retry-side-effect-failure",
      status: "inactive",
      checksum: "checksum-retry-side-effect-failure",
      storage_path: "auth-profiles/retry-side-effect-failure.zip",
      meta_json: {},
      uploaded_by: "admin"
    });
    persistence.activateFailuresRemaining = 1;
    persistence.switchEventFailuresRemaining = 1;
    publisher.publishFailuresByEventType.set("auth_profile.switch.retried", 1);

    const response = await app.inject({
      method: "POST",
      url: `/api/auth-profiles/chatgpt/${profile.id}/activate`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-activate-side-effect-fail" }
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
    expect(persistence.activateAttempts).toBe(2);
    expect(persistence.switchEvents).toHaveLength(2);
    expect(
      publisher.events.some((event) => event.eventType === "auth_profile.activated")
    ).toBe(true);
  });

  it("keeps activate success response when final publish fails", async () => {
    const profile = await persistence.createAuthProfile({
      label: "activate-final-publish-failure",
      status: "inactive",
      checksum: "checksum-activate-final-publish-failure",
      storage_path: "auth-profiles/activate-final-publish-failure.zip",
      meta_json: {},
      uploaded_by: "admin"
    });
    publisher.publishFailuresByEventType.set("auth_profile.activated", 1);

    const response = await app.inject({
      method: "POST",
      url: `/api/auth-profiles/chatgpt/${profile.id}/activate`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-activate-final-publish-fail" }
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
    expect((await persistence.getActiveAuthProfile())?.id).toBe(profile.id);
    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "auth_profile.switch.completed" &&
          event.payload["reason"] === "manual_activate"
      )
    ).toBe(true);
    expect(
      publisher.events.some((event) => event.eventType === "auth_profile.activated")
    ).toBe(false);
  });

  it("returns 500 when activate keeps failing after retries", async () => {
    const currentActive = await persistence.createAuthProfile({
      label: "current-active",
      status: "active",
      checksum: "checksum-current-active",
      storage_path: "auth-profiles/current-active.zip",
      meta_json: {},
      uploaded_by: "admin"
    });
    const targetProfile = await persistence.createAuthProfile({
      label: "retry-activate-fail",
      status: "inactive",
      checksum: "checksum-retry-activate-fail",
      storage_path: "auth-profiles/retry-activate-fail.zip",
      meta_json: {},
      uploaded_by: "admin"
    });
    persistence.activateFailuresRemaining = 5;

    const response = await app.inject({
      method: "POST",
      url: `/api/auth-profiles/chatgpt/${targetProfile.id}/activate`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-activate-retry-fail" }
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe("AUTH_SWITCH_FAILED");
    expect(persistence.activateAttempts).toBe(3);

    const retriedEvents = publisher.events.filter(
      (event) =>
        event.eventType === "auth_profile.switch.retried" &&
        event.payload["reason"] === "manual_activate_retry"
    );
    expect(retriedEvents).toHaveLength(2);
    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "auth_profile.switch.failed" &&
          event.payload["reason"] === "manual_activate_failed" &&
          event.payload["from_profile_id"] === currentActive.id &&
          event.payload["to_profile_id"] === targetProfile.id
      )
    ).toBe(true);
    expect(persistence.switchEvents).toHaveLength(3);
    expect(
      persistence.switchEvents.filter(
        (event) => event.reason === "manual_activate_retry" && event.status === "failed"
      )
    ).toHaveLength(2);
    expect(
      persistence.switchEvents.some(
        (event) => event.reason === "manual_activate_failed" && event.status === "failed"
      )
    ).toBe(true);
  });

  it("keeps AUTH_SWITCH_FAILED response when terminal failure side-effects fail", async () => {
    const profile = await persistence.createAuthProfile({
      label: "retry-deactivate-side-effect-failure",
      status: "inactive",
      checksum: "checksum-retry-deactivate-side-effect-failure",
      storage_path: "auth-profiles/retry-deactivate-side-effect-failure.zip",
      meta_json: {},
      uploaded_by: "admin"
    });
    await persistence.activateAuthProfile(profile.id, "admin");
    persistence.deactivateFailuresRemaining = 5;
    persistence.switchEventFailuresRemaining = 3;
    publisher.publishFailuresByEventType.set("auth_profile.switch.failed", 1);

    const response = await app.inject({
      method: "POST",
      url: `/api/auth-profiles/chatgpt/${profile.id}/deactivate`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-deactivate-side-effect-fail" },
      payload: {}
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe("AUTH_SWITCH_FAILED");
    expect(persistence.deactivateAttempts).toBe(3);
    expect(persistence.switchEvents).toHaveLength(0);
    expect(
      publisher.events.filter((event) => event.eventType === "auth_profile.switch.retried")
    ).toHaveLength(2);
    expect(
      publisher.events.some((event) => event.eventType === "auth_profile.switch.failed")
    ).toBe(false);
  });

  it("returns 500 when deactivate keeps failing after retries", async () => {
    const profile = await persistence.createAuthProfile({
      label: "retry-deactivate",
      status: "inactive",
      checksum: "checksum-retry-deactivate",
      storage_path: "auth-profiles/retry-deactivate.zip",
      meta_json: {},
      uploaded_by: "admin"
    });
    await persistence.activateAuthProfile(profile.id, "admin");
    persistence.deactivateFailuresRemaining = 5;

    const response = await app.inject({
      method: "POST",
      url: `/api/auth-profiles/chatgpt/${profile.id}/deactivate`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-deactivate-retry-fail" },
      payload: {}
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe("AUTH_SWITCH_FAILED");
    expect(persistence.deactivateAttempts).toBe(3);

    const retriedEvents = publisher.events.filter(
      (event) =>
        event.eventType === "auth_profile.switch.retried" &&
        event.payload["reason"] === "manual_deactivate_retry"
    );
    expect(retriedEvents).toHaveLength(2);
    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "auth_profile.switch.failed" &&
          event.payload["reason"] === "manual_deactivate_failed" &&
          event.payload["from_profile_id"] === profile.id
      )
    ).toBe(true);
    expect(persistence.switchEvents).toHaveLength(3);
    expect(
      persistence.switchEvents.filter(
        (event) => event.reason === "manual_deactivate_retry" && event.status === "failed"
      )
    ).toHaveLength(2);
    expect(
      persistence.switchEvents.some(
        (event) => event.reason === "manual_deactivate_failed" && event.status === "failed"
      )
    ).toBe(true);
  });

  it("manages packs endpoints", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/packs",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-pack-create-1" },
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
    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "pack.registered" &&
          event.payload["pack_id"] === "backend-pack" &&
          event.payload["pinned_version"] === "v1.0.0"
      )
    ).toBe(true);
    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "pack.validated" &&
          event.payload["pack_id"] === "backend-pack" &&
          event.payload["reason"] === "schema_valid"
      )
    ).toBe(true);

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
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-pack-rotate-1" },
      payload: {
        pinned_version: "v1.1.0",
        is_enabled: false
      }
    });
    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().pinned_version).toBe("v1.1.0");
    expect(patchResponse.json().is_enabled).toBe(false);
    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "pack.rotated" &&
          event.payload["pack_id"] === "backend-pack" &&
          event.payload["pinned_version"] === "v1.1.0"
      )
    ).toBe(true);

    const materializeResponse = await app.inject({
      method: "POST",
      url: `/api/packs/${packId}/materialize`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-pack-materialize-1" }
    });
    expect(materializeResponse.statusCode).toBe(202);
    expect(materializeResponse.json()).toEqual({ accepted: true });
    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "pack.materialized" &&
          event.payload["pack_id"] === "backend-pack" &&
          event.payload["materialize_status"] === "materialized"
      )
    ).toBe(true);
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
    expect(dispatchResponse.json().status).toBe("completed");
    expect(dispatchResponse.json().trace_id).toBe("trace-delegation-1");
    expect(dispatchResponse.json().target_agent_template_id).toBe("agent-template-1");
    const delegationId = dispatchResponse.json().id as string;

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/delegation/${delegationId}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json().id).toBe(delegationId);
    expect(getResponse.json().capability).toBe("reviewer");
    expect(getResponse.json().status).toBe("completed");

    const resultResponse = await app.inject({
      method: "GET",
      url: `/api/delegation/${delegationId}/result`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(resultResponse.statusCode).toBe(200);
    expect(resultResponse.json()).toEqual({
      id: delegationId,
      status: "completed",
      result_summary: "Delegation completed by template agent-template-1",
      artifacts: []
    });
    expect(
      publisher.events.some((event) => event.eventType === "agent.delegation.requested")
    ).toBe(true);
    expect(
      publisher.events.some((event) => event.eventType === "agent.delegation.accepted")
    ).toBe(true);
    expect(
      publisher.events.some((event) => event.eventType === "agent.delegation.completed")
    ).toBe(true);
  });

  it("marks delegation failed after timeout retries are exhausted", async () => {
    await persistence.createAgentTemplate({
      name: "helper-template",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "You are helper",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });

    const dispatchResponse = await app.inject({
      method: "POST",
      url: "/api/delegation/dispatch",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-delegation-timeout-1" },
      payload: {
        requester_task_id: "task-1",
        requester_task_run_id: "run-1",
        capability: "reviewer",
        target_selector: { role: "reviewer" },
        payload: { task: "slow operation", simulate_timeout_attempts: 5 },
        priority: 77
      }
    });

    expect(dispatchResponse.statusCode).toBe(202);
    expect(dispatchResponse.json().status).toBe("failed");
    expect(dispatchResponse.json().result_summary).toContain("timed out");

    const failedEvents = publisher.events.filter(
      (event) => event.eventType === "agent.delegation.failed"
    );
    expect(failedEvents.length).toBe(3);
    expect(
      failedEvents.some(
        (event) =>
          event.payload["reason"] === "timeout_exhausted" &&
          event.payload["retry_attempt"] === 3
      )
    ).toBe(true);
  });

  it("marks delegation failed when no capability target is available", async () => {
    const dispatchResponse = await app.inject({
      method: "POST",
      url: "/api/delegation/dispatch",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-delegation-no-target-1" },
      payload: {
        requester_task_id: "task-1",
        requester_task_run_id: "run-1",
        capability: "architect",
        target_selector: { role: "architect" },
        payload: { task: "missing target" },
        priority: 50
      }
    });

    expect(dispatchResponse.statusCode).toBe(202);
    expect(dispatchResponse.json().status).toBe("failed");
    expect(dispatchResponse.json().result_summary).toContain("No enabled template found");

    const failedEvent = publisher.events.find(
      (event) =>
        event.eventType === "agent.delegation.failed" &&
        event.payload["reason"] === "no_capability_target"
    );
    expect(failedEvent).toBeDefined();
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
    expect(triggerResponse.json().status).toBe("failed");

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

    const overlapTriggerResponse = await app.inject({
      method: "POST",
      url: `/api/schedules/${ruleId}/trigger`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-schedule-5" }
    });
    expect(overlapTriggerResponse.statusCode).toBe(202);
    expect(overlapTriggerResponse.json().status).toBe("skipped_due_to_overlap");

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
    expect(
      publisher.events.some((event) => event.eventType === "schedule.run.failed")
    ).toBe(true);
    expect(
      publisher.events.some((event) => event.eventType === "schedule.run.skipped_due_to_overlap")
    ).toBe(true);
  });

  it("evaluates schedule AST with all/any/not predicates", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/schedules",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        name: "limit-aware rule",
        scope: "global",
        project_id: null,
        rule_ast: {
          all: [
            { predicate: "event.type", value: "limit.snapshot.captured" },
            {
              any: [
                { predicate: "limit.weekly_remaining_lt", value: 5 },
                { predicate: "limit.five_hour_remaining_lt", value: 10 }
              ]
            },
            { not: { predicate: "state.module_enabled", value: false } }
          ]
        },
        overlap_policy: "one_active_skip",
        misfire_policy: "recompute_due_on_restart"
      }
    });
    expect(createResponse.statusCode).toBe(201);
    const ruleId = createResponse.json().id as string;

    const matchedResponse = await app.inject({
      method: "POST",
      url: `/api/schedules/${ruleId}/evaluate`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        dry_run_context: {
          event_type: "limit.snapshot.captured",
          weekly_remaining_pct: 4,
          five_hour_remaining_pct: 20,
          module_enabled: true
        }
      }
    });
    expect(matchedResponse.statusCode).toBe(200);
    expect(matchedResponse.json().matched).toBe(true);

    const notMatchedResponse = await app.inject({
      method: "POST",
      url: `/api/schedules/${ruleId}/evaluate`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        dry_run_context: {
          event_type: "limit.snapshot.captured",
          weekly_remaining_pct: 40,
          five_hour_remaining_pct: 20,
          module_enabled: true
        }
      }
    });
    expect(notMatchedResponse.statusCode).toBe(200);
    expect(notMatchedResponse.json().matched).toBe(false);
  });

  it("evaluates time.cron predicate in UTC", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/schedules",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        name: "utc cron rule",
        scope: "global",
        project_id: null,
        rule_ast: {
          predicate: "time.cron",
          value: "30 12 * * *"
        },
        overlap_policy: "one_active_skip",
        misfire_policy: "recompute_due_on_restart"
      }
    });
    expect(createResponse.statusCode).toBe(201);
    const ruleId = createResponse.json().id as string;

    const matchedResponse = await app.inject({
      method: "POST",
      url: `/api/schedules/${ruleId}/evaluate`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        dry_run_context: {
          now_utc: "2026-01-02T12:30:00.000Z"
        }
      }
    });
    expect(matchedResponse.statusCode).toBe(200);
    expect(matchedResponse.json().matched).toBe(true);

    const notMatchedResponse = await app.inject({
      method: "POST",
      url: `/api/schedules/${ruleId}/evaluate`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        dry_run_context: {
          now_utc: "2026-01-02T12:31:00.000Z"
        }
      }
    });
    expect(notMatchedResponse.statusCode).toBe(200);
    expect(notMatchedResponse.json().matched).toBe(false);
  });

  it("supports legacy rule_ast.conditions format in schedule evaluation", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/schedules",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        name: "legacy conditions rule",
        scope: "global",
        project_id: null,
        rule_ast: {
          conditions: [{ predicate: "state.module_enabled", value: true }]
        },
        overlap_policy: "one_active_skip",
        misfire_policy: "recompute_due_on_restart"
      }
    });
    expect(createResponse.statusCode).toBe(201);
    const ruleId = createResponse.json().id as string;

    const response = await app.inject({
      method: "POST",
      url: `/api/schedules/${ruleId}/evaluate`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        dry_run_context: {
          module_enabled: true
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().matched).toBe(true);
  });

  it("returns existing scheduled run on trigger retry with same trace id", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/schedules",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        name: "idempotent trigger",
        scope: "global",
        project_id: null,
        rule_ast: {
          predicate: "event.type",
          value: "manual.trigger"
        },
        overlap_policy: "one_active_skip",
        misfire_policy: "recompute_due_on_restart"
      }
    });
    expect(createResponse.statusCode).toBe(201);
    const ruleId = createResponse.json().id as string;

    const firstTrigger = await app.inject({
      method: "POST",
      url: `/api/schedules/${ruleId}/trigger`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-schedule-idem-1" }
    });
    expect(firstTrigger.statusCode).toBe(202);
    expect(firstTrigger.json().status).toBe("started");
    const firstRunId = firstTrigger.json().id as string;

    const secondTrigger = await app.inject({
      method: "POST",
      url: `/api/schedules/${ruleId}/trigger`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-schedule-idem-1" }
    });
    expect(secondTrigger.statusCode).toBe(202);
    expect(secondTrigger.json().id).toBe(firstRunId);
    expect(secondTrigger.json().status).toBe("started");

    const runsResponse = await app.inject({
      method: "GET",
      url: `/api/schedules/${ruleId}/runs`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(runsResponse.statusCode).toBe(200);
    expect(runsResponse.json().items).toHaveLength(1);
  });

  it("recovers due schedule run on app startup for restart event", async () => {
    await app.close();
    publisher.events.splice(0, publisher.events.length);

    const rule = await persistence.createScheduledRule({
      name: "startup recovery rule",
      scope: "global",
      project_id: null,
      rule_ast: {
        predicate: "event.type",
        value: "system.restart"
      },
      overlap_policy: "one_active_skip",
      misfire_policy: "recompute_due_on_restart",
      created_by: "admin"
    });

    app = await createApp({
      config,
      persistence,
      publisher,
      storage
    });

    const runs = await persistence.listScheduledRuns(rule.id);
    expect(runs).toHaveLength(1);
    const recoveredRun = runs[0];
    expect(recoveredRun).toBeDefined();
    if (!recoveredRun) {
      throw new Error("Expected startup recovery run to exist");
    }
    expect(recoveredRun.status).toBe("started");
    expect(recoveredRun.idempotency_key).toContain("startup_recovery");

    const recoveryEvent = publisher.events.find(
      (event) =>
        event.eventType === "schedule.run.started" &&
        event.payload["rule_id"] === rule.id &&
        event.payload["reason"] === "startup_recovery"
    );
    expect(recoveryEvent).toBeDefined();
  });

  it("records skipped startup recovery when active run already exists", async () => {
    await app.close();
    publisher.events.splice(0, publisher.events.length);

    const rule = await persistence.createScheduledRule({
      name: "startup overlap rule",
      scope: "global",
      project_id: null,
      rule_ast: {
        predicate: "event.type",
        value: "system.restart"
      },
      overlap_policy: "one_active_skip",
      misfire_policy: "recompute_due_on_restart",
      created_by: "admin"
    });

    const activeRun = await persistence.createScheduledRun({
      rule_id: rule.id,
      status: "started",
      started_at: new Date(),
      ended_at: null,
      skip_reason: null,
      trace_id: "manual-active-run",
      idempotency_key: "manual-active-run",
      result_json: { source: "seed" }
    });

    app = await createApp({
      config,
      persistence,
      publisher,
      storage
    });

    const runs = await persistence.listScheduledRuns(rule.id);
    expect(runs).toHaveLength(2);
    const recoveryRuns = runs.filter((run) => run.idempotency_key?.includes("startup_recovery"));
    expect(recoveryRuns).toHaveLength(1);

    const recoveryRun = recoveryRuns[0];
    expect(recoveryRun).toBeDefined();
    if (!recoveryRun) {
      throw new Error("Expected startup overlap recovery run to exist");
    }

    expect(recoveryRun.status).toBe("skipped_due_to_overlap");
    expect(recoveryRun.skip_reason).toBe("active_run_exists_on_recovery");
    expect(recoveryRun.result_json).toEqual({ active_run_id: activeRun.id, recovery: true });

    const skippedEvent = publisher.events.find(
      (event) =>
        event.eventType === "schedule.run.skipped_due_to_overlap" &&
        event.payload["rule_id"] === rule.id &&
        event.payload["reason"] === "startup_recovery_overlap"
    );
    expect(skippedEvent).toBeDefined();
  });

  it("does not fail app startup when schedule listing fails during recovery", async () => {
    await app.close();
    persistence.failListScheduledRules = true;

    app = await createApp({
      config,
      persistence,
      publisher,
      storage
    });

    const liveResponse = await app.inject({ method: "GET", url: "/health/live" });
    expect(liveResponse.statusCode).toBe(200);
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
      headers: {
        "x-admin-token": config.adminToken,
        "x-trace-id": "trace-queue-release-1"
      }
    });

    expect(releaseResponse.statusCode).toBe(202);
    expect(releaseResponse.json()).toEqual({ accepted: true });
    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "queue.hold_released" &&
          event.payload["reason"] === "manual_release" &&
          event.payload["held_count"] === 1
      )
    ).toBe(true);
    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "task.auth_switching" &&
          event.payload["task_id"] === "task-1" &&
          event.payload["status_before"] === "WAITING_LIMIT" &&
          event.payload["status_after"] === "QUEUED" &&
          event.payload["reason"] === "manual_queue_release"
      )
    ).toBe(true);

    const heldAfterRelease = await app.inject({
      method: "GET",
      url: "/api/queue/held",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(heldAfterRelease.statusCode).toBe(200);
    expect(heldAfterRelease.json().items).toHaveLength(0);
  });

  it("releases held queue even when hold_released publish fails", async () => {
    await persistence.createTask({
      title: "held-publish-failure",
      description: "held task",
      project_id: "project",
      repo_id: "repo",
      branch: null,
      priority: 100,
      status: "WAITING_LIMIT",
      source: "api",
      created_by: "admin"
    });
    publisher.publishFailuresByEventType.set("queue.hold_released", 1);

    const releaseResponse = await app.inject({
      method: "POST",
      url: "/api/queue/held/release",
      headers: {
        "x-admin-token": config.adminToken,
        "x-trace-id": "trace-queue-release-publish-fail"
      }
    });

    expect(releaseResponse.statusCode).toBe(202);
    expect(releaseResponse.json()).toEqual({ accepted: true });
    expect(
      publisher.events.some((event) => event.eventType === "queue.hold_released")
    ).toBe(false);

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
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-module-1" },
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

    const secondPatchSameTraceResponse = await app.inject({
      method: "PATCH",
      url: `/api/custom-modules/${SWITCH_MODULE_KEY}`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-module-1" },
      payload: {
        is_enabled: false,
        config_json: { threshold: 42 }
      }
    });
    expect(secondPatchSameTraceResponse.statusCode).toBe(200);

    const executionsResponse = await app.inject({
      method: "GET",
      url: `/api/custom-modules/${SWITCH_MODULE_KEY}/executions`,
      headers: { "x-admin-token": config.adminToken }
    });

    expect(executionsResponse.statusCode).toBe(200);
    expect(executionsResponse.json().items).toHaveLength(2);
    expect(executionsResponse.json().items[0].module_key).toBe(SWITCH_MODULE_KEY);
    expect(
      publisher.events.filter((event) => event.eventType === "module.execution.completed")
    ).toHaveLength(1);
  });

  it("retries module patch after transient failure", async () => {
    await app.inject({
      method: "GET",
      url: `/api/custom-modules/${SWITCH_MODULE_KEY}`,
      headers: { "x-admin-token": config.adminToken }
    });

    persistence.moduleUpdateFailuresRemaining = 1;

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/api/custom-modules/${SWITCH_MODULE_KEY}`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-module-retry-1" },
      payload: {
        is_enabled: false,
        config_json: { threshold: 55 }
      }
    });

    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().config_json).toEqual({ threshold: 55 });
    expect(persistence.moduleUpdateAttempts).toBe(2);
    expect(
      publisher.events.filter((event) => event.eventType === "module.execution.completed")
    ).toHaveLength(1);
  });

  it("returns 500 and records failed execution when module patch retries exhausted", async () => {
    await app.inject({
      method: "GET",
      url: `/api/custom-modules/${SWITCH_MODULE_KEY}`,
      headers: { "x-admin-token": config.adminToken }
    });

    persistence.moduleUpdateFailuresRemaining = 5;

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/api/custom-modules/${SWITCH_MODULE_KEY}`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-module-fail-1" },
      payload: {
        is_enabled: false,
        config_json: { threshold: 99 }
      }
    });

    expect(patchResponse.statusCode).toBe(500);
    expect(patchResponse.json().code).toBe("MODULE_EXECUTION_FAILED");
    expect(persistence.moduleUpdateAttempts).toBe(3);
    expect(
      publisher.events.filter((event) => event.eventType === "module.execution.failed")
    ).toHaveLength(1);

    const executionsResponse = await app.inject({
      method: "GET",
      url: `/api/custom-modules/${SWITCH_MODULE_KEY}/executions`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(executionsResponse.statusCode).toBe(200);
    expect(executionsResponse.json().items).toHaveLength(2);
    expect(
      executionsResponse
        .json()
        .items.some((item: { status: string }) => item.status === "failed")
    ).toBe(true);
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
