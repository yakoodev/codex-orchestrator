import { createHash } from "node:crypto";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp, SWITCH_MODULE_KEY } from "../src/app";
import type { AppConfig } from "../src/config";
import type {
  ActiveAuthProfileRuntimeEntity,
  AgentProfileEntity,
  AgentProfileMcpServerBindingEntity,
  AgentProfileScriptSetEntity,
  AgentMemoryEntryEntity,
  AgentRequestAuditEventEntity,
  AgentRequestEntity,
  AgentRequestStatus,
  AgentProfileScriptOs,
  AgentProfileScriptType,
  AgentProfileSourcePolicy,
  AgentTemplateEntity,
  ArtifactEntity,
  AuthContextEntity,
  AuthProfileRateLimitsReadResult,
  AuthProfileRateLimitsReader,
  AuthProfileEntity,
  AuthProfileRuntimeEntity,
  AuthContextType,
  AuthSwitchEventEntity,
  CreateAgentProfileInput,
  CreateAgentRequestAuditEventInput,
  CreateAgentRequestInput,
  CreateAgentMemoryEntryInput,
  CreateMcpAuthAuditEventInput,
  CreateMcpApiKeyInput,
  CreateDelegationRequestInput,
  DelegationExecutionInput,
  CreateMcpServerRegistryInput,
  CreateProjectInput,
  CreateProjectSecretInput,
  CreateSecretAuditEventInput,
  DelegationExecutor,
  CreateModuleExecutionInput,
  CreateScheduledRuleInput,
  CreateScheduledRunInput,
  CustomModuleConfigEntity,
  DelegationRequestEntity,
  EventPublishInput,
  EventPublisher,
  ListAuthSwitchEventsOptions,
  McpApiKeyEntity,
  McpAuthAuditEventEntity,
  McpApiKeyStatus,
  McpKeyAclRuleEntity,
  McpKeyProfileBindingEntity,
  McpKeyTemplateConstraintEntity,
  McpServerRegistryEntity,
  ModuleExecutionEntity,
  PackRegistryEntity,
  Persistence,
  ProjectEntity,
  ProjectSecretEntity,
  ProjectSecretRoleBindingEntity,
  ProjectSecretTemplateBindingEntity,
  ProjectSummaryEntity,
  ScheduledRuleEntity,
  ScheduledRunEntity,
  ScheduleMisfirePolicy,
  ScheduleOverlapPolicy,
  SecretAuditEventEntity,
  StorageService,
  TaskEntity,
  WorkerEntity
} from "../src/runtime/contracts";
import type { TaskStatus } from "../src/types";

class FakePersistence implements Persistence {
  private static readonly ORCHESTRATOR_MCP_SERVER_NAME = "orchestrator-core";
  private static readonly ORCHESTRATOR_MCP_SERVER_COMMAND = "orchestrator://core";

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
  public readonly interventions: Array<{
    task_id: string;
    task_run_id: string | null;
    source: string;
    type: "steer" | "interrupt" | "pause" | "resume" | "replan" | "approve" | "reject";
    payload: Record<string, unknown> | null;
    created_by: string;
  }> = [];
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
  public readonly memoryEntries: AgentMemoryEntryEntity[] = [];
  public readonly agentRequests: AgentRequestEntity[] = [];
  public readonly agentRequestAuditEvents: AgentRequestAuditEventEntity[] = [];
  public readonly agentProfiles: AgentProfileEntity[] = [];
  public readonly mcpServerRegistryEntries: McpServerRegistryEntity[] = [];
  public readonly agentProfileMcpBindings: AgentProfileMcpServerBindingEntity[] = [];
  public readonly agentProfileScriptSets: AgentProfileScriptSetEntity[] = [];
  public readonly mcpApiKeys: McpApiKeyEntity[] = [];
  public readonly mcpKeyAclRules: McpKeyAclRuleEntity[] = [];
  public readonly mcpKeyProfileBindings: McpKeyProfileBindingEntity[] = [];
  public readonly mcpKeyTemplateConstraints: McpKeyTemplateConstraintEntity[] = [];
  public readonly mcpAuthAuditEvents: McpAuthAuditEventEntity[] = [];
  public readonly projectSecrets: ProjectSecretEntity[] = [];
  public readonly projectSecretTemplateBindings: ProjectSecretTemplateBindingEntity[] = [];
  public readonly projectSecretRoleBindings: ProjectSecretRoleBindingEntity[] = [];
  public readonly secretAuditEvents: SecretAuditEventEntity[] = [];
  public readonly projects: ProjectEntity[] = [];
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
  private memoryEntryCounter = 1;
  private agentRequestCounter = 1;
  private agentRequestAuditEventCounter = 1;
  private agentProfileCounter = 1;
  private mcpServerCounter = 1;
  private agentProfileMcpBindingCounter = 1;
  private agentProfileScriptSetCounter = 1;
  private mcpApiKeyCounter = 1;
  private mcpKeyAclRuleCounter = 1;
  private mcpKeyProfileBindingCounter = 1;
  private mcpKeyTemplateConstraintCounter = 1;
  private mcpAuthAuditEventCounter = 1;
  private projectSecretCounter = 1;
  private projectSecretTemplateBindingCounter = 1;
  private projectSecretRoleBindingCounter = 1;
  private secretAuditEventCounter = 1;
  private projectCounter = 1;
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

  public async createProject(input: CreateProjectInput): Promise<ProjectEntity> {
    const existing = this.projects.find((project) => project.key === input.key);
    if (existing) {
      const duplicateError = new Error("Project key already exists") as Error & { code?: string };
      duplicateError.code = "P2002";
      throw duplicateError;
    }

    const now = new Date();
    const project: ProjectEntity = {
      id: `project-${this.projectCounter++}`,
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      github_url: input.github_url ?? null,
      github_repo: input.github_repo ?? null,
      default_branch: input.default_branch ?? null,
      workspace_path: input.workspace_path ?? null,
      meta_json: input.meta_json ?? null,
      is_active: input.is_active ?? true,
      created_at: now,
      updated_at: now
    };

    this.projects.push(project);
    return project;
  }

  public async listProjects(options?: { include_inactive?: boolean }): Promise<ProjectEntity[]> {
    const includeInactive = options?.include_inactive ?? true;
    const items = includeInactive
      ? this.projects
      : this.projects.filter((project) => project.is_active);

    return [...items].sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }

  public async getProjectByKey(key: string): Promise<ProjectEntity | null> {
    return this.projects.find((project) => project.key === key) ?? null;
  }

  public async patchProject(
    key: string,
    patch: {
      name?: string;
      description?: string | null;
      github_url?: string | null;
      github_repo?: string | null;
      default_branch?: string | null;
      workspace_path?: string | null;
      meta_json?: Record<string, unknown> | null;
      is_active?: boolean;
    }
  ): Promise<ProjectEntity | null> {
    const project = this.projects.find((item) => item.key === key);
    if (!project) {
      return null;
    }

    if (patch.name !== undefined) {
      project.name = patch.name;
    }
    if (patch.description !== undefined) {
      project.description = patch.description;
    }
    if (patch.github_url !== undefined) {
      project.github_url = patch.github_url;
    }
    if (patch.github_repo !== undefined) {
      project.github_repo = patch.github_repo;
    }
    if (patch.default_branch !== undefined) {
      project.default_branch = patch.default_branch;
    }
    if (patch.workspace_path !== undefined) {
      project.workspace_path = patch.workspace_path;
    }
    if (patch.meta_json !== undefined) {
      project.meta_json = patch.meta_json;
    }
    if (typeof patch.is_active === "boolean") {
      project.is_active = patch.is_active;
    }
    project.updated_at = new Date();

    return project;
  }

  public async getProjectSummaryByKey(
    key: string,
    options?: { switch_events_window_hours?: number }
  ): Promise<ProjectSummaryEntity | null> {
    const project = this.projects.find((item) => item.key === key) ?? null;
    if (!project) {
      return null;
    }

    const tasks = this.tasks.filter((task) => task.project_id === key);
    const tasksByStatus: Partial<Record<TaskStatus, number>> = {};
    for (const task of tasks) {
      tasksByStatus[task.status] = (tasksByStatus[task.status] ?? 0) + 1;
    }

    const activeMemoryEntries = this.memoryEntries.filter(
      (entry) => entry.project_id === key && entry.is_active
    ).length;

    const windowHours = Math.max(1, Math.min(options?.switch_events_window_hours ?? 24, 24 * 30));
    const windowStart = Date.now() - windowHours * 60 * 60 * 1_000;
    const recentSwitchEvents = this.switchEvents
      .filter((event) => event.started_at.getTime() >= windowStart)
      .sort((a, b) => b.started_at.getTime() - a.started_at.getTime());

    return {
      project,
      tasks_total: tasks.length,
      tasks_by_status: tasksByStatus,
      active_memory_entries: activeMemoryEntries,
      switch_events_recent: recentSwitchEvents.length,
      switch_events_window_hours: windowHours,
      last_switch_event_at: recentSwitchEvents[0]?.started_at ?? null
    };
  }

  public async createProjectSecret(input: CreateProjectSecretInput): Promise<ProjectSecretEntity> {
    const duplicate = this.projectSecrets.find(
      (item) => item.project_id === input.project_id && item.key === input.key
    );
    if (duplicate) {
      const duplicateError = new Error("Project secret key already exists") as Error & { code?: string };
      duplicateError.code = "P2002";
      throw duplicateError;
    }

    const now = new Date();
    const item: ProjectSecretEntity = {
      id: `project-secret-${this.projectSecretCounter++}`,
      project_id: input.project_id,
      key: input.key,
      description: input.description ?? null,
      masked_preview: input.masked_preview ?? null,
      is_active: input.is_active ?? true,
      ciphertext: input.ciphertext,
      dek_encrypted: input.dek_encrypted,
      dek_kms_key_id: input.dek_kms_key_id,
      algo: input.algo,
      version: 1,
      created_by: input.created_by,
      updated_by: input.updated_by ?? input.created_by,
      created_at: now,
      updated_at: now,
      rotated_at: null,
      revoked_at: null
    };
    this.projectSecrets.push(item);
    return item;
  }

  public async listProjectSecrets(
    projectId: string,
    options?: { include_inactive?: boolean; limit?: number }
  ): Promise<ProjectSecretEntity[]> {
    const includeInactive = options?.include_inactive ?? true;
    const limit = Math.max(1, Math.min(options?.limit ?? 100, 500));
    const filtered = this.projectSecrets
      .filter((item) => item.project_id === projectId)
      .filter((item) => (includeInactive ? true : item.is_active))
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());

    return filtered.slice(0, limit);
  }

  public async getProjectSecretById(
    projectId: string,
    secretId: string
  ): Promise<ProjectSecretEntity | null> {
    return (
      this.projectSecrets.find((item) => item.project_id === projectId && item.id === secretId) ??
      null
    );
  }

  public async patchProjectSecret(
    projectId: string,
    secretId: string,
    patch: {
      description?: string | null;
      is_active?: boolean;
      updated_by?: string | null;
    }
  ): Promise<ProjectSecretEntity | null> {
    const secret = this.projectSecrets.find(
      (item) => item.project_id === projectId && item.id === secretId
    );
    if (!secret) {
      return null;
    }

    if (patch.description !== undefined) {
      secret.description = patch.description;
    }
    if (patch.is_active !== undefined) {
      secret.is_active = patch.is_active;
    }
    if (patch.updated_by !== undefined) {
      secret.updated_by = patch.updated_by;
    }
    secret.updated_at = new Date();
    return secret;
  }

  public async rotateProjectSecret(
    projectId: string,
    secretId: string,
    input: {
      ciphertext: string;
      dek_encrypted: string;
      dek_kms_key_id: string;
      algo: string;
      masked_preview?: string | null;
      updated_by?: string | null;
      rotated_at?: Date | null;
    }
  ): Promise<ProjectSecretEntity | null> {
    const secret = this.projectSecrets.find(
      (item) => item.project_id === projectId && item.id === secretId
    );
    if (!secret) {
      return null;
    }

    secret.ciphertext = input.ciphertext;
    secret.dek_encrypted = input.dek_encrypted;
    secret.dek_kms_key_id = input.dek_kms_key_id;
    secret.algo = input.algo;
    if (input.masked_preview !== undefined) {
      secret.masked_preview = input.masked_preview;
    }
    secret.version += 1;
    secret.is_active = true;
    secret.revoked_at = null;
    secret.rotated_at = input.rotated_at ?? new Date();
    if (input.updated_by !== undefined) {
      secret.updated_by = input.updated_by;
    }
    secret.updated_at = new Date();
    return secret;
  }

  public async revokeProjectSecret(
    projectId: string,
    secretId: string,
    input: {
      updated_by?: string | null;
      revoked_at?: Date | null;
    }
  ): Promise<ProjectSecretEntity | null> {
    const secret = this.projectSecrets.find(
      (item) => item.project_id === projectId && item.id === secretId
    );
    if (!secret) {
      return null;
    }

    secret.is_active = false;
    secret.revoked_at = input.revoked_at ?? new Date();
    if (input.updated_by !== undefined) {
      secret.updated_by = input.updated_by;
    }
    secret.updated_at = new Date();
    return secret;
  }

  public async bindProjectSecretToTemplate(
    secretId: string,
    templateId: string,
    createdBy: string
  ): Promise<ProjectSecretTemplateBindingEntity | null> {
    const secret = this.projectSecrets.find((item) => item.id === secretId);
    const template = this.agentTemplates.find((item) => item.id === templateId);
    if (!secret || !template) {
      return null;
    }

    const existing = this.projectSecretTemplateBindings.find(
      (item) => item.secret_id === secretId && item.template_id === templateId
    );
    if (existing) {
      return existing;
    }

    const binding: ProjectSecretTemplateBindingEntity = {
      id: `project-secret-template-binding-${this.projectSecretTemplateBindingCounter++}`,
      secret_id: secretId,
      template_id: templateId,
      created_by: createdBy,
      created_at: new Date()
    };
    this.projectSecretTemplateBindings.push(binding);
    return binding;
  }

  public async unbindProjectSecretFromTemplate(secretId: string, templateId: string): Promise<boolean> {
    const index = this.projectSecretTemplateBindings.findIndex(
      (item) => item.secret_id === secretId && item.template_id === templateId
    );
    if (index < 0) {
      return false;
    }

    this.projectSecretTemplateBindings.splice(index, 1);
    return true;
  }

  public async listProjectSecretTemplateBindings(
    secretId: string
  ): Promise<ProjectSecretTemplateBindingEntity[]> {
    return this.projectSecretTemplateBindings
      .filter((item) => item.secret_id === secretId)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  public async bindProjectSecretToRole(
    secretId: string,
    role: string,
    createdBy: string
  ): Promise<ProjectSecretRoleBindingEntity | null> {
    const secret = this.projectSecrets.find((item) => item.id === secretId);
    if (!secret) {
      return null;
    }

    const existing = this.projectSecretRoleBindings.find(
      (item) => item.secret_id === secretId && item.role === role
    );
    if (existing) {
      return existing;
    }

    const binding: ProjectSecretRoleBindingEntity = {
      id: `project-secret-role-binding-${this.projectSecretRoleBindingCounter++}`,
      secret_id: secretId,
      role,
      created_by: createdBy,
      created_at: new Date()
    };
    this.projectSecretRoleBindings.push(binding);
    return binding;
  }

  public async unbindProjectSecretFromRole(secretId: string, role: string): Promise<boolean> {
    const index = this.projectSecretRoleBindings.findIndex(
      (item) => item.secret_id === secretId && item.role === role
    );
    if (index < 0) {
      return false;
    }

    this.projectSecretRoleBindings.splice(index, 1);
    return true;
  }

  public async listProjectSecretRoleBindings(secretId: string): Promise<ProjectSecretRoleBindingEntity[]> {
    return this.projectSecretRoleBindings
      .filter((item) => item.secret_id === secretId)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  public async createSecretAuditEvent(input: CreateSecretAuditEventInput): Promise<SecretAuditEventEntity> {
    const event: SecretAuditEventEntity = {
      id: `secret-audit-${this.secretAuditEventCounter++}`,
      secret_id: input.secret_id ?? null,
      project_id: input.project_id,
      event_type: input.event_type,
      actor: input.actor,
      trace_id: input.trace_id ?? null,
      metadata_json: input.metadata_json ?? null,
      created_at: new Date()
    };
    this.secretAuditEvents.push(event);
    return event;
  }

  public async listSecretAuditEvents(
    projectId: string,
    options?: { secret_id?: string; limit?: number }
  ): Promise<SecretAuditEventEntity[]> {
    const limit = Math.max(1, Math.min(options?.limit ?? 100, 500));
    const filtered = this.secretAuditEvents
      .filter((item) => item.project_id === projectId)
      .filter((item) => (options?.secret_id ? item.secret_id === options.secret_id : true))
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return filtered.slice(0, limit);
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

  public async createIntervention(input: {
    task_id: string;
    task_run_id?: string | null;
    source: string;
    type: "steer" | "interrupt" | "pause" | "resume" | "replan" | "approve" | "reject";
    payload?: Record<string, unknown> | null;
    created_by: string;
  }): Promise<boolean> {
    const task = this.tasks.find((item) => item.id === input.task_id);
    if (!task) {
      return false;
    }

    this.interventions.push({
      task_id: input.task_id,
      task_run_id: input.task_run_id ?? null,
      source: input.source,
      type: input.type,
      payload: input.payload ?? null,
      created_by: input.created_by
    });
    return true;
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
      input_prompt: input.input_prompt ?? null,
      selected_auth_profile_id: null,
      execution_mode: null,
      execution_log: null,
      execution_meta_json: null,
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

  public async listDelegationRequests(options?: {
    statuses?: DelegationRequestEntity["status"][];
    limit?: number;
  }): Promise<DelegationRequestEntity[]> {
    const statuses = options?.statuses;
    const limit = Math.max(1, Math.min(options?.limit ?? 50, 200));
    const sorted = [...this.delegations].sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime()
    );
    const filtered = statuses?.length
      ? sorted.filter((delegation) => statuses.includes(delegation.status))
      : sorted;
    return filtered.slice(0, limit);
  }

  public async createAgentMemoryEntry(
    input: CreateAgentMemoryEntryInput
  ): Promise<AgentMemoryEntryEntity> {
    const now = new Date();
    const entry: AgentMemoryEntryEntity = {
      id: `memory-${this.memoryEntryCounter++}`,
      project_id: input.project_id,
      agent_role: input.agent_role,
      title: input.title,
      content: input.content,
      is_active: input.is_active ?? true,
      created_by: input.created_by,
      updated_by: input.created_by,
      created_at: now,
      updated_at: now
    };
    this.memoryEntries.push(entry);
    return entry;
  }

  public async listAgentMemoryEntries(options?: {
    project_id?: string;
    agent_role?: string;
    is_active?: boolean;
    limit?: number;
  }): Promise<AgentMemoryEntryEntity[]> {
    const limit = Math.max(1, Math.min(options?.limit ?? 100, 500));
    const filtered = this.memoryEntries
      .filter((entry) => (options?.project_id ? entry.project_id === options.project_id : true))
      .filter((entry) => (options?.agent_role ? entry.agent_role === options.agent_role : true))
      .filter((entry) =>
        typeof options?.is_active === "boolean" ? entry.is_active === options.is_active : true
      )
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
    return filtered.slice(0, limit);
  }

  public async createAgentProfile(input: CreateAgentProfileInput): Promise<AgentProfileEntity> {
    const now = new Date();
    const profile: AgentProfileEntity = {
      id: `agent-profile-${this.agentProfileCounter++}`,
      project_id: input.project_id,
      name: input.name,
      role: input.role,
      description: input.description ?? null,
      source_policy: input.source_policy ?? "catalog_only",
      is_enabled: input.is_enabled ?? true,
      created_at: now,
      updated_at: now
    };
    this.agentProfiles.push(profile);
    return profile;
  }

  public async listAgentProfiles(options?: {
    project_id?: string;
    include_disabled?: boolean;
    role?: string;
    limit?: number;
  }): Promise<AgentProfileEntity[]> {
    const includeDisabled = options?.include_disabled ?? true;
    const limit = Math.max(1, Math.min(options?.limit ?? 100, 500));
    const filtered = this.agentProfiles
      .filter((item) => (options?.project_id ? item.project_id === options.project_id : true))
      .filter((item) => (options?.role ? item.role === options.role : true))
      .filter((item) => (includeDisabled ? true : item.is_enabled))
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
    return filtered.slice(0, limit);
  }

  public async getAgentProfileById(id: string): Promise<AgentProfileEntity | null> {
    return this.agentProfiles.find((item) => item.id === id) ?? null;
  }

  public async patchAgentProfile(
    id: string,
    patch: {
      name?: string;
      role?: string;
      description?: string | null;
      source_policy?: AgentProfileSourcePolicy;
      is_enabled?: boolean;
    }
  ): Promise<AgentProfileEntity | null> {
    const profile = this.agentProfiles.find((item) => item.id === id);
    if (!profile) {
      return null;
    }

    if (patch.name !== undefined) {
      profile.name = patch.name;
    }
    if (patch.role !== undefined) {
      profile.role = patch.role;
    }
    if (patch.description !== undefined) {
      profile.description = patch.description;
    }
    if (patch.source_policy !== undefined) {
      profile.source_policy = patch.source_policy;
    }
    if (patch.is_enabled !== undefined) {
      profile.is_enabled = patch.is_enabled;
    }
    profile.updated_at = new Date();

    return profile;
  }

  public async createMcpServerRegistryEntry(
    input: CreateMcpServerRegistryInput
  ): Promise<McpServerRegistryEntity> {
    const existing = this.mcpServerRegistryEntries.find((item) => item.name === input.name);
    if (existing) {
      const duplicateError = new Error("MCP server name already exists") as Error & { code?: string };
      duplicateError.code = "P2002";
      throw duplicateError;
    }

    const now = new Date();
    const server: McpServerRegistryEntity = {
      id: `mcp-server-${this.mcpServerCounter++}`,
      name: input.name,
      transport: input.transport,
      endpoint_or_command: input.endpoint_or_command,
      origin_type: input.origin_type,
      is_approved: input.is_approved ?? false,
      meta_json: input.meta_json ?? null,
      created_at: now,
      updated_at: now
    };
    this.mcpServerRegistryEntries.push(server);
    return server;
  }

  public async listMcpServerRegistry(options?: {
    include_unapproved?: boolean;
  }): Promise<McpServerRegistryEntity[]> {
    const includeUnapproved = options?.include_unapproved ?? false;
    const filtered = includeUnapproved
      ? this.mcpServerRegistryEntries
      : this.mcpServerRegistryEntries.filter((item) => item.is_approved);
    return [...filtered].sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }

  public async getMcpServerRegistryById(id: string): Promise<McpServerRegistryEntity | null> {
    return this.mcpServerRegistryEntries.find((item) => item.id === id) ?? null;
  }

  public async ensureOrchestratorMcpServer(): Promise<McpServerRegistryEntity> {
    const existing = this.mcpServerRegistryEntries.find(
      (item) => item.name === FakePersistence.ORCHESTRATOR_MCP_SERVER_NAME
    );
    if (existing) {
      return existing;
    }

    return this.createMcpServerRegistryEntry({
      name: FakePersistence.ORCHESTRATOR_MCP_SERVER_NAME,
      transport: "stdio",
      endpoint_or_command: FakePersistence.ORCHESTRATOR_MCP_SERVER_COMMAND,
      origin_type: "built_in",
      is_approved: true,
      meta_json: { builtin_key: "orchestrator_core" }
    });
  }

  public async bindMcpServerToAgentProfile(
    profileId: string,
    serverId: string,
    options?: {
      is_required?: boolean;
      priority?: number;
      config_json?: Record<string, unknown> | null;
    }
  ): Promise<AgentProfileMcpServerBindingEntity | null> {
    const profile = this.agentProfiles.find((item) => item.id === profileId);
    const server = this.mcpServerRegistryEntries.find((item) => item.id === serverId);
    if (!profile || !server) {
      return null;
    }

    const existing = this.agentProfileMcpBindings.find(
      (item) => item.agent_profile_id === profileId && item.mcp_server_id === serverId
    );
    if (existing) {
      if (options?.is_required !== undefined) {
        existing.is_required = options.is_required;
      }
      if (options?.priority !== undefined) {
        existing.priority = options.priority;
      }
      if (options?.config_json !== undefined) {
        existing.config_json = options.config_json;
      }
      existing.updated_at = new Date();
      return existing;
    }

    const now = new Date();
    const binding: AgentProfileMcpServerBindingEntity = {
      id: `agent-profile-mcp-binding-${this.agentProfileMcpBindingCounter++}`,
      agent_profile_id: profileId,
      mcp_server_id: serverId,
      is_required: options?.is_required ?? false,
      priority: options?.priority ?? 100,
      config_json: options?.config_json ?? null,
      created_at: now,
      updated_at: now
    };
    this.agentProfileMcpBindings.push(binding);
    return binding;
  }

  public async unbindMcpServerFromAgentProfile(profileId: string, serverId: string): Promise<boolean> {
    const index = this.agentProfileMcpBindings.findIndex(
      (item) => item.agent_profile_id === profileId && item.mcp_server_id === serverId
    );
    if (index < 0) {
      return false;
    }

    this.agentProfileMcpBindings.splice(index, 1);
    return true;
  }

  public async listAgentProfileMcpBindings(
    profileId: string
  ): Promise<AgentProfileMcpServerBindingEntity[]> {
    return this.agentProfileMcpBindings
      .filter((item) => item.agent_profile_id === profileId)
      .sort((a, b) => {
        if (a.priority === b.priority) {
          return b.updated_at.getTime() - a.updated_at.getTime();
        }
        return a.priority - b.priority;
      });
  }

  public async createMcpApiKey(input: CreateMcpApiKeyInput): Promise<McpApiKeyEntity> {
    const existing = this.mcpApiKeys.find((item) => item.key_hash === input.key_hash);
    if (existing) {
      const duplicateError = new Error("MCP key hash already exists") as Error & { code?: string };
      duplicateError.code = "P2002";
      throw duplicateError;
    }

    const now = new Date();
    const key: McpApiKeyEntity = {
      id: `mcp-key-${this.mcpApiKeyCounter++}`,
      name: input.name,
      key_prefix: input.key_prefix,
      key_hash: input.key_hash,
      status: input.status ?? "active",
      expires_at: input.expires_at ?? null,
      last_used_at: null,
      rotated_at: null,
      revoked_at: null,
      created_by: input.created_by,
      updated_by: input.updated_by ?? input.created_by,
      meta_json: input.meta_json ?? null,
      created_at: now,
      updated_at: now
    };
    this.mcpApiKeys.push(key);
    return key;
  }

  public async listMcpApiKeys(options?: {
    status?: McpApiKeyStatus;
    include_revoked?: boolean;
    limit?: number;
  }): Promise<McpApiKeyEntity[]> {
    const includeRevoked = options?.include_revoked ?? false;
    const limit = Math.max(1, Math.min(options?.limit ?? 100, 500));
    const filtered = this.mcpApiKeys
      .filter((item) => (options?.status ? item.status === options.status : true))
      .filter((item) => (options?.status ? true : includeRevoked || item.status !== "revoked"))
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
    return filtered.slice(0, limit);
  }

  public async getMcpApiKeyById(id: string): Promise<McpApiKeyEntity | null> {
    return this.mcpApiKeys.find((item) => item.id === id) ?? null;
  }

  public async getMcpApiKeyByHash(keyHash: string): Promise<McpApiKeyEntity | null> {
    return this.mcpApiKeys.find((item) => item.key_hash === keyHash) ?? null;
  }

  public async patchMcpApiKey(
    id: string,
    patch: {
      name?: string;
      status?: McpApiKeyStatus;
      expires_at?: Date | null;
      meta_json?: Record<string, unknown> | null;
      updated_by?: string | null;
    }
  ): Promise<McpApiKeyEntity | null> {
    const key = this.mcpApiKeys.find((item) => item.id === id);
    if (!key) {
      return null;
    }

    if (patch.name !== undefined) {
      key.name = patch.name;
    }
    if (patch.status !== undefined) {
      key.status = patch.status;
    }
    if (patch.expires_at !== undefined) {
      key.expires_at = patch.expires_at;
    }
    if (patch.meta_json !== undefined) {
      key.meta_json = patch.meta_json;
    }
    if (patch.updated_by !== undefined) {
      key.updated_by = patch.updated_by;
    }
    key.updated_at = new Date();
    return key;
  }

  public async markMcpApiKeyLastUsed(
    id: string,
    lastUsedAt?: Date
  ): Promise<McpApiKeyEntity | null> {
    const key = this.mcpApiKeys.find((item) => item.id === id);
    if (!key) {
      return null;
    }

    key.last_used_at = lastUsedAt ?? new Date();
    key.updated_at = new Date();
    return key;
  }

  public async rotateMcpApiKey(
    id: string,
    input: {
      key_prefix: string;
      key_hash: string;
      updated_by?: string | null;
      rotated_at?: Date;
    }
  ): Promise<McpApiKeyEntity | null> {
    const duplicate = this.mcpApiKeys.find((item) => item.key_hash === input.key_hash && item.id !== id);
    if (duplicate) {
      const duplicateError = new Error("MCP key hash already exists") as Error & { code?: string };
      duplicateError.code = "P2002";
      throw duplicateError;
    }

    const key = this.mcpApiKeys.find((item) => item.id === id);
    if (!key) {
      return null;
    }

    key.key_prefix = input.key_prefix;
    key.key_hash = input.key_hash;
    key.status = "active";
    key.rotated_at = input.rotated_at ?? new Date();
    key.revoked_at = null;
    if (input.updated_by !== undefined) {
      key.updated_by = input.updated_by;
    }
    key.updated_at = new Date();
    return key;
  }

  public async revokeMcpApiKey(
    id: string,
    input: {
      revoked_at?: Date;
      updated_by?: string | null;
    }
  ): Promise<McpApiKeyEntity | null> {
    const key = this.mcpApiKeys.find((item) => item.id === id);
    if (!key) {
      return null;
    }

    key.status = "revoked";
    key.revoked_at = input.revoked_at ?? new Date();
    if (input.updated_by !== undefined) {
      key.updated_by = input.updated_by;
    }
    key.updated_at = new Date();
    return key;
  }

  public async replaceMcpKeyAclRules(
    keyId: string,
    input: {
      tool_names: string[];
      created_by: string;
    }
  ): Promise<McpKeyAclRuleEntity[]> {
    for (let index = this.mcpKeyAclRules.length - 1; index >= 0; index -= 1) {
      const item = this.mcpKeyAclRules[index];
      if (item && item.key_id === keyId) {
        this.mcpKeyAclRules.splice(index, 1);
      }
    }

    const now = new Date();
    for (const toolName of input.tool_names) {
      this.mcpKeyAclRules.push({
        id: `mcp-key-acl-${this.mcpKeyAclRuleCounter++}`,
        key_id: keyId,
        tool_name: toolName,
        effect: "allow",
        created_by: input.created_by,
        created_at: now
      });
    }

    return this.listMcpKeyAclRules(keyId);
  }

  public async listMcpKeyAclRules(keyId: string): Promise<McpKeyAclRuleEntity[]> {
    return this.mcpKeyAclRules
      .filter((item) => item.key_id === keyId)
      .sort((a, b) => {
        if (a.tool_name === b.tool_name) {
          return b.created_at.getTime() - a.created_at.getTime();
        }
        return a.tool_name.localeCompare(b.tool_name);
      });
  }

  public async bindMcpKeyToProfile(
    keyId: string,
    profileId: string,
    createdBy: string
  ): Promise<McpKeyProfileBindingEntity | null> {
    const key = this.mcpApiKeys.find((item) => item.id === keyId);
    const profile = this.agentProfiles.find((item) => item.id === profileId);
    if (!key || !profile) {
      return null;
    }

    const existing = this.mcpKeyProfileBindings.find(
      (item) => item.key_id === keyId && item.agent_profile_id === profileId
    );
    if (existing) {
      return existing;
    }

    const binding: McpKeyProfileBindingEntity = {
      id: `mcp-key-profile-binding-${this.mcpKeyProfileBindingCounter++}`,
      key_id: keyId,
      agent_profile_id: profileId,
      created_by: createdBy,
      created_at: new Date()
    };
    this.mcpKeyProfileBindings.push(binding);
    return binding;
  }

  public async unbindMcpKeyFromProfile(keyId: string, profileId: string): Promise<boolean> {
    const index = this.mcpKeyProfileBindings.findIndex(
      (item) => item.key_id === keyId && item.agent_profile_id === profileId
    );
    if (index < 0) {
      return false;
    }

    this.mcpKeyProfileBindings.splice(index, 1);
    return true;
  }

  public async listMcpKeyProfileBindings(keyId: string): Promise<McpKeyProfileBindingEntity[]> {
    return this.mcpKeyProfileBindings
      .filter((item) => item.key_id === keyId)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  public async bindMcpKeyTemplateConstraint(
    keyId: string,
    templateId: string,
    createdBy: string
  ): Promise<McpKeyTemplateConstraintEntity | null> {
    const key = this.mcpApiKeys.find((item) => item.id === keyId);
    const template = this.agentTemplates.find((item) => item.id === templateId);
    if (!key || !template) {
      return null;
    }

    const existing = this.mcpKeyTemplateConstraints.find(
      (item) => item.key_id === keyId && item.agent_template_id === templateId
    );
    if (existing) {
      return existing;
    }

    const constraint: McpKeyTemplateConstraintEntity = {
      id: `mcp-key-template-constraint-${this.mcpKeyTemplateConstraintCounter++}`,
      key_id: keyId,
      agent_template_id: templateId,
      created_by: createdBy,
      created_at: new Date()
    };
    this.mcpKeyTemplateConstraints.push(constraint);
    return constraint;
  }

  public async unbindMcpKeyTemplateConstraint(keyId: string, templateId: string): Promise<boolean> {
    const index = this.mcpKeyTemplateConstraints.findIndex(
      (item) => item.key_id === keyId && item.agent_template_id === templateId
    );
    if (index < 0) {
      return false;
    }

    this.mcpKeyTemplateConstraints.splice(index, 1);
    return true;
  }

  public async listMcpKeyTemplateConstraints(
    keyId: string
  ): Promise<McpKeyTemplateConstraintEntity[]> {
    return this.mcpKeyTemplateConstraints
      .filter((item) => item.key_id === keyId)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  public async createMcpAuthAuditEvent(
    input: CreateMcpAuthAuditEventInput
  ): Promise<McpAuthAuditEventEntity> {
    const event: McpAuthAuditEventEntity = {
      id: `mcp-auth-audit-${this.mcpAuthAuditEventCounter++}`,
      key_id: input.key_id ?? null,
      event_type: input.event_type,
      actor: input.actor,
      trace_id: input.trace_id ?? null,
      request_meta_json: input.request_meta_json ?? null,
      created_at: new Date()
    };
    this.mcpAuthAuditEvents.push(event);
    return event;
  }

  public async upsertAgentProfileScriptSet(
    profileId: string,
    input: {
      os: AgentProfileScriptOs;
      script_type: AgentProfileScriptType;
      content: string;
    }
  ): Promise<AgentProfileScriptSetEntity | null> {
    const profile = this.agentProfiles.find((item) => item.id === profileId);
    if (!profile) {
      return null;
    }

    const existing = this.agentProfileScriptSets.find(
      (item) => item.agent_profile_id === profileId && item.os === input.os
    );
    if (existing) {
      existing.script_type = input.script_type;
      existing.content = input.content;
      existing.version += 1;
      existing.updated_at = new Date();
      return existing;
    }

    const now = new Date();
    const item: AgentProfileScriptSetEntity = {
      id: `agent-profile-script-set-${this.agentProfileScriptSetCounter++}`,
      agent_profile_id: profileId,
      os: input.os,
      script_type: input.script_type,
      content: input.content,
      version: 1,
      created_at: now,
      updated_at: now
    };
    this.agentProfileScriptSets.push(item);
    return item;
  }

  public async listAgentProfileScriptSets(profileId: string): Promise<AgentProfileScriptSetEntity[]> {
    return this.agentProfileScriptSets
      .filter((item) => item.agent_profile_id === profileId)
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }

  public async createAgentRequest(input: CreateAgentRequestInput): Promise<AgentRequestEntity> {
    const now = new Date();
    const item: AgentRequestEntity = {
      id: `agent-request-${this.agentRequestCounter++}`,
      type: input.type,
      status: "open",
      priority: input.priority ?? 100,
      project_id: input.project_id,
      task_id: input.task_id,
      agent_run_id: input.agent_run_id ?? null,
      agent_profile_id: input.agent_profile_id ?? null,
      agent_template_id: input.agent_template_id ?? null,
      requested_by_agent_id: input.requested_by_agent_id ?? null,
      title: input.title,
      reason: input.reason,
      request_payload_json: input.request_payload_json ?? null,
      resolution_payload_json: null,
      claimed_by_governor_id: null,
      resolved_by: null,
      resolved_at: null,
      created_by: input.created_by,
      created_at: now,
      updated_at: now
    };
    this.agentRequests.push(item);
    return item;
  }

  public async listAgentRequests(options?: {
    project_id?: string;
    task_id?: string;
    agent_profile_id?: string;
    agent_template_id?: string;
    type?: AgentRequestEntity["type"];
    statuses?: AgentRequestEntity["status"][];
    limit?: number;
  }): Promise<AgentRequestEntity[]> {
    const limit = Math.max(1, Math.min(options?.limit ?? 100, 500));
    const filtered = this.agentRequests
      .filter((item) => (options?.project_id ? item.project_id === options.project_id : true))
      .filter((item) => (options?.task_id ? item.task_id === options.task_id : true))
      .filter((item) =>
        options?.agent_profile_id ? item.agent_profile_id === options.agent_profile_id : true
      )
      .filter((item) =>
        options?.agent_template_id ? item.agent_template_id === options.agent_template_id : true
      )
      .filter((item) => (options?.type ? item.type === options.type : true))
      .filter((item) => (options?.statuses?.length ? options.statuses.includes(item.status) : true))
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return filtered.slice(0, limit);
  }

  public async getAgentRequestById(id: string): Promise<AgentRequestEntity | null> {
    return this.agentRequests.find((item) => item.id === id) ?? null;
  }

  public async createAgentRequestAuditEvent(
    input: CreateAgentRequestAuditEventInput
  ): Promise<AgentRequestAuditEventEntity> {
    const now = new Date();
    const item: AgentRequestAuditEventEntity = {
      id: `agent-request-audit-event-${this.agentRequestAuditEventCounter++}`,
      request_id: input.request_id,
      event_type: input.event_type,
      from_status: input.from_status ?? null,
      to_status: input.to_status ?? null,
      actor_type: input.actor_type,
      actor_id: input.actor_id ?? null,
      trace_id: input.trace_id ?? null,
      metadata_json: input.metadata_json ?? null,
      created_at: now
    };
    this.agentRequestAuditEvents.push(item);
    return item;
  }

  public async listAgentRequestAuditEvents(
    requestId: string,
    options?: { limit?: number }
  ): Promise<AgentRequestAuditEventEntity[]> {
    const limit = Math.max(1, Math.min(options?.limit ?? 100, 500));
    return this.agentRequestAuditEvents
      .filter((item) => item.request_id === requestId)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, limit);
  }

  public async resolveAgentRequest(
    id: string,
    input: {
      status: AgentRequestStatus;
      resolution_payload_json?: Record<string, unknown> | null;
      claimed_by_governor_id?: string | null;
      resolved_by?: string | null;
      resolved_at?: Date | null;
    }
  ): Promise<AgentRequestEntity | null> {
    const item = this.agentRequests.find((entry) => entry.id === id);
    if (!item) {
      return null;
    }

    item.status = input.status;
    if (input.resolution_payload_json !== undefined) {
      item.resolution_payload_json = input.resolution_payload_json;
    }
    if (input.claimed_by_governor_id !== undefined) {
      item.claimed_by_governor_id = input.claimed_by_governor_id;
    }
    if (input.resolved_by !== undefined) {
      item.resolved_by = input.resolved_by;
    }
    if (input.resolved_at !== undefined) {
      item.resolved_at = input.resolved_at;
    }
    item.updated_at = new Date();
    return item;
  }

  public async patchAgentMemoryEntry(
    id: string,
    patch: {
      title?: string;
      content?: string;
      is_active?: boolean;
      updated_by: string;
    }
  ): Promise<AgentMemoryEntryEntity | null> {
    const entry = this.memoryEntries.find((item) => item.id === id);
    if (!entry) {
      return null;
    }

    if (patch.title !== undefined) {
      entry.title = patch.title;
    }
    if (patch.content !== undefined) {
      entry.content = patch.content;
    }
    if (patch.is_active !== undefined) {
      entry.is_active = patch.is_active;
    }
    entry.updated_by = patch.updated_by;
    entry.updated_at = new Date();

    return entry;
  }

  public async updateDelegationRequest(
    id: string,
    patch: {
      status?: DelegationRequestEntity["status"];
      target_agent_template_id?: string | null;
      target_worker_instance_id?: string | null;
      result_summary?: string | null;
      input_prompt?: string | null;
      selected_auth_profile_id?: string | null;
      execution_mode?: string | null;
      execution_log?: string | null;
      execution_meta_json?: Record<string, unknown> | null;
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
    if (patch.input_prompt !== undefined) {
      delegation.input_prompt = patch.input_prompt;
    }
    if (patch.selected_auth_profile_id !== undefined) {
      delegation.selected_auth_profile_id = patch.selected_auth_profile_id;
    }
    if (patch.execution_mode !== undefined) {
      delegation.execution_mode = patch.execution_mode;
    }
    if (patch.execution_log !== undefined) {
      delegation.execution_log = patch.execution_log;
    }
    if (patch.execution_meta_json !== undefined) {
      delegation.execution_meta_json = patch.execution_meta_json;
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

  public async getActiveAuthProfileRuntime(): Promise<ActiveAuthProfileRuntimeEntity | null> {
    const profile = this.profiles.find((item) => item.status === "active") ?? null;
    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      label: profile.label,
      status: "active",
      checksum: profile.checksum,
      storage_path: profile.storage_path
    };
  }

  public async getAuthProfileRuntimeById(id: string): Promise<AuthProfileRuntimeEntity | null> {
    const profile = this.profiles.find((item) => item.id === id);
    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      label: profile.label,
      status: profile.status,
      checksum: profile.checksum,
      storage_path: profile.storage_path
    };
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

  public async deleteAuthProfile(id: string): Promise<boolean> {
    const index = this.profiles.findIndex((profile) => profile.id === id);
    if (index < 0) {
      return false;
    }

    this.profiles.splice(index, 1);
    for (const event of this.switchEvents) {
      if (event.from_auth_profile_id === id) {
        event.from_auth_profile_id = null;
      }
      if (event.to_auth_profile_id === id) {
        event.to_auth_profile_id = null;
      }
    }

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

  public async listAuthSwitchEvents(
    options?: ListAuthSwitchEventsOptions
  ): Promise<AuthSwitchEventEntity[]> {
    const limit = Math.max(1, Math.min(options?.limit ?? 200, 500));
    const filtered = [...this.switchEvents]
      .filter((event) => (options?.status ? event.status === options.status : true))
      .filter((event) => (options?.reason ? event.reason === options.reason : true))
      .filter((event) => {
        if (!options?.profile_id) {
          return true;
        }
        return (
          event.from_auth_profile_id === options.profile_id ||
          event.to_auth_profile_id === options.profile_id
        );
      })
      .sort((left, right) => right.started_at.getTime() - left.started_at.getTime());

    return filtered.slice(0, limit);
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
  public readonly contentTypes = new Map<string, string>();
  public ready = true;

  public async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    this.objects.set(key, body);
    this.contentTypes.set(key, contentType);
  }

  public async getObject(key: string): Promise<Buffer> {
    const object = this.objects.get(key);
    if (!object) {
      throw new Error(`object not found: ${key}`);
    }

    return object;
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

class FakeAuthProfileRateLimitsReader implements AuthProfileRateLimitsReader {
  public readonly responsesByProfileId = new Map<string, AuthProfileRateLimitsReadResult>();
  public readonly failuresByProfileId = new Map<string, Error>();

  public async readByProfileId(profileId: string): Promise<AuthProfileRateLimitsReadResult | null> {
    const failure = this.failuresByProfileId.get(profileId);
    if (failure) {
      throw failure;
    }

    return this.responsesByProfileId.get(profileId) ?? null;
  }
}

describe("smoke-core API", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let persistence: FakePersistence;
  let storage: FakeStorage;
  let publisher: FakePublisher;
  let authProfileRateLimitsReader: FakeAuthProfileRateLimitsReader;

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
    secretsMasterKey: "unit-test-secrets-key",
    maxAuthJsonBytes: 2 * 1024 * 1024,
    switchModuleDefaultEnabled: true,
    switchWeeklyRemainingPercentLt: 5,
    switchFiveHourRemainingPercentLt: 10,
    switchResetGuardHours: 3,
    openApiPath: path.resolve(process.cwd(), "docs", "contracts", "openapi.yaml"),
    delegationExecutorMode: "mock",
    codexCommand: "codex",
    workerRuntimeDir: path.resolve(process.cwd(), ".runtime", "workers-test"),
    delegationExecutionTimeoutMs: 60_000,
    taskAutoDispatchEnabled: false,
    taskAutoDispatchIntervalMs: 50,
    taskAutoDispatchCapability: "reviewer",
    taskAutoDispatchExecutionMode: "codex_exec",
    telegramEnabled: false,
    telegramBotToken: null,
    telegramProxyUrl: null,
    telegramApiBaseUrl: "https://api.telegram.org",
    telegramAllowedChatIds: [],
    telegramAllowedUserIds: [],
    telegramPollingTimeoutSec: 30,
    telegramBackoffMinMs: 1_000,
    telegramBackoffMaxMs: 30_000,
    telegramStateFilePath: path.resolve(process.cwd(), ".runtime", "telegram-test", "state.json")
  };

  beforeEach(async () => {
    persistence = new FakePersistence();
    storage = new FakeStorage();
    publisher = new FakePublisher();
    authProfileRateLimitsReader = new FakeAuthProfileRateLimitsReader();

    app = await createApp({
      config,
      persistence,
      storage,
      publisher,
      authProfileRateLimitsReader
    });

    await app.ready();

    await persistence.createProject({
      key: "project",
      name: "Default Project"
    });
    await persistence.createProject({
      key: "project-1",
      name: "Project 1"
    });
    await persistence.createProject({
      key: "proj-memory",
      name: "Project Memory"
    });
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

  it("serves built-in web UI", async () => {
    const rootResponse = await app.inject({ method: "GET", url: "/" });
    expect(rootResponse.statusCode).toBe(302);
    expect(rootResponse.headers.location).toBe("/ui/");

    const uiResponse = await app.inject({ method: "GET", url: "/ui/" });
    expect(uiResponse.statusCode).toBe(200);
    expect(uiResponse.headers["content-type"]).toContain("text/html");
    expect(uiResponse.body).toContain('data-i18n="entry_title"');
    expect(uiResponse.body).toContain('id="open-console"');

    const consoleResponse = await app.inject({ method: "GET", url: "/ui/console.html" });
    expect(consoleResponse.statusCode).toBe(200);
    expect(consoleResponse.headers["content-type"]).toContain("text/html");
    expect(consoleResponse.body).toContain('data-page="console"');

    const scriptResponse = await app.inject({ method: "GET", url: "/ui/app.js" });
    expect(scriptResponse.statusCode).toBe(200);
    expect(scriptResponse.headers["content-type"]).toContain("javascript");
    expect(scriptResponse.body).toContain("SWITCH_MODULE_KEY");
  });

  it("enforces X-Admin-Token for /api routes", async () => {
    const response = await app.inject({ method: "GET", url: "/api/tasks" });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe("MISSING_ADMIN_TOKEN");
  });

  it("creates, updates and lists projects", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        key: "web-ui",
        name: "Web UI",
        github_url: "https://github.com/example/web-ui",
        github_repo: "example/web-ui",
        default_branch: "main",
        workspace_path: "/workspace/web-ui",
        meta_json: { owner: "platform" }
      }
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json().key).toBe("web-ui");
    expect(createResponse.json().meta_json).toEqual({ owner: "platform" });

    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        key: "web-ui",
        name: "Duplicate"
      }
    });
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json().code).toBe("PROJECT_KEY_EXISTS");

    const patchResponse = await app.inject({
      method: "PATCH",
      url: "/api/projects/web-ui",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        description: "Project for UI",
        is_active: false
      }
    });
    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().description).toBe("Project for UI");
    expect(patchResponse.json().is_active).toBe(false);

    const listAllResponse = await app.inject({
      method: "GET",
      url: "/api/projects",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(listAllResponse.statusCode).toBe(200);
    expect(listAllResponse.json().items.some((item: { key: string }) => item.key === "web-ui")).toBe(true);

    const listActiveResponse = await app.inject({
      method: "GET",
      url: "/api/projects?include_inactive=false",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(listActiveResponse.statusCode).toBe(200);
    expect(listActiveResponse.json().items.some((item: { key: string }) => item.key === "web-ui")).toBe(false);

    const getResponse = await app.inject({
      method: "GET",
      url: "/api/projects/web-ui",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json().name).toBe("Web UI");
  });

  it("returns project summary", async () => {
    await persistence.createProject({
      key: "summary-proj",
      name: "Summary Project"
    });

    await persistence.createTask({
      title: "Summary task new",
      description: "summary",
      project_id: "summary-proj",
      repo_id: "repo-summary",
      branch: null,
      priority: 100,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });
    await persistence.createTask({
      title: "Summary task done",
      description: "summary",
      project_id: "summary-proj",
      repo_id: "repo-summary",
      branch: null,
      priority: 100,
      status: "DONE",
      source: "api",
      created_by: "admin"
    });

    await persistence.createAgentMemoryEntry({
      project_id: "summary-proj",
      agent_role: "reviewer",
      title: "Active memory",
      content: "Use dark theme checks",
      is_active: true,
      created_by: "admin"
    });
    await persistence.createAgentMemoryEntry({
      project_id: "summary-proj",
      agent_role: "reviewer",
      title: "Inactive memory",
      content: "Deprecated flow",
      is_active: false,
      created_by: "admin"
    });

    persistence.switchEvents.push({
      id: "switch-old",
      module_key: SWITCH_MODULE_KEY,
      from_auth_profile_id: null,
      to_auth_profile_id: null,
      reason: "manual_activate",
      status: "completed",
      started_at: new Date(Date.now() - 5 * 60 * 60 * 1_000),
      ended_at: new Date(Date.now() - 5 * 60 * 60 * 1_000 + 30_000)
    });
    persistence.switchEvents.push({
      id: "switch-recent",
      module_key: SWITCH_MODULE_KEY,
      from_auth_profile_id: null,
      to_auth_profile_id: null,
      reason: "manual_activate",
      status: "completed",
      started_at: new Date(),
      ended_at: new Date()
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/projects/summary-proj/summary?switch_events_window_hours=2",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().project.key).toBe("summary-proj");
    expect(response.json().tasks_total).toBe(2);
    expect(response.json().tasks_by_status.NEW).toBe(1);
    expect(response.json().tasks_by_status.DONE).toBe(1);
    expect(response.json().active_memory_entries).toBe(1);
    expect(response.json().switch_events_recent).toBe(1);
  });

  it("creates, rotates and revokes project secrets without returning raw value", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/projects/project/secrets",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        key: "OPENAI_API_KEY",
        value: "sk-test-1234567890",
        description: "Primary key"
      }
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json().key).toBe("OPENAI_API_KEY");
    expect(createResponse.json().description).toBe("Primary key");
    expect(createResponse.json().masked_preview).toContain("*");
    expect(createResponse.json().value).toBeUndefined();
    expect(persistence.projectSecrets).toHaveLength(1);
    expect(persistence.projectSecrets[0]?.ciphertext).not.toContain("sk-test-1234567890");

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/projects/project/secrets",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items).toHaveLength(1);
    expect(listResponse.json().items[0].value).toBeUndefined();
    expect(listResponse.json().items[0].template_bindings).toEqual([]);
    expect(listResponse.json().items[0].role_bindings).toEqual([]);

    const secretId = createResponse.json().id as string;
    const rotateResponse = await app.inject({
      method: "POST",
      url: `/api/projects/project/secrets/${secretId}/rotate`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        value: "sk-rotated-2222"
      }
    });
    expect(rotateResponse.statusCode).toBe(200);
    expect(rotateResponse.json().version).toBe(2);
    expect(rotateResponse.json().masked_preview).toContain("*");
    expect(rotateResponse.json().value).toBeUndefined();

    const revokeResponse = await app.inject({
      method: "POST",
      url: `/api/projects/project/secrets/${secretId}/revoke`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(revokeResponse.statusCode).toBe(200);
    expect(revokeResponse.json().is_active).toBe(false);
    expect(revokeResponse.json().revoked_at).not.toBeNull();

    expect(persistence.secretAuditEvents.map((event) => event.event_type)).toEqual([
      "created",
      "rotated",
      "revoked"
    ]);
  });

  it("manages project secret role/template bindings", async () => {
    const template = await persistence.createAgentTemplate({
      name: "secret-template",
      role: "reviewer",
      model: "gpt-5.4-mini",
      system_prompt: "test",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/projects/project/secrets",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        key: "BROWSER_TOKEN",
        value: "browser-secret-1",
        bind_template_ids: [template.id],
        bind_roles: ["Reviewer"]
      }
    });
    expect(createResponse.statusCode).toBe(201);
    const secretId = createResponse.json().id as string;
    expect(createResponse.json().template_bindings).toHaveLength(1);
    expect(createResponse.json().role_bindings).toHaveLength(1);
    expect(createResponse.json().role_bindings[0].role).toBe("reviewer");

    const addRoleResponse = await app.inject({
      method: "POST",
      url: `/api/projects/project/secrets/${secretId}/bindings/roles/tester`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(addRoleResponse.statusCode).toBe(200);
    expect(addRoleResponse.json().role).toBe("tester");

    const removeRoleResponse = await app.inject({
      method: "DELETE",
      url: `/api/projects/project/secrets/${secretId}/bindings/roles/tester`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(removeRoleResponse.statusCode).toBe(200);
    expect(removeRoleResponse.json().ok).toBe(true);

    const removeTemplateResponse = await app.inject({
      method: "DELETE",
      url: `/api/projects/project/secrets/${secretId}/bindings/templates/${template.id}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(removeTemplateResponse.statusCode).toBe(200);
    expect(removeTemplateResponse.json().ok).toBe(true);
  });

  it("validates project_id for task and memory create", async () => {
    const missingProjectTaskResponse = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        title: "Task with unknown project",
        description: "desc",
        project_id: "unknown-project",
        repo_id: "repo"
      }
    });

    expect(missingProjectTaskResponse.statusCode).toBe(404);
    expect(missingProjectTaskResponse.json().code).toBe("PROJECT_NOT_FOUND");

    await persistence.createProject({
      key: "inactive-proj",
      name: "Inactive project",
      is_active: false
    });

    const inactiveTaskResponse = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        title: "Task inactive project",
        description: "desc",
        project_id: "inactive-proj",
        repo_id: "repo"
      }
    });
    expect(inactiveTaskResponse.statusCode).toBe(409);
    expect(inactiveTaskResponse.json().code).toBe("PROJECT_INACTIVE");

    const missingProjectMemoryResponse = await app.inject({
      method: "POST",
      url: "/api/memory/entries",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        project_id: "unknown-project",
        agent_role: "reviewer",
        title: "Memory",
        content: "Content"
      }
    });
    expect(missingProjectMemoryResponse.statusCode).toBe(404);
    expect(missingProjectMemoryResponse.json().code).toBe("PROJECT_NOT_FOUND");

    const inactiveMemoryResponse = await app.inject({
      method: "POST",
      url: "/api/memory/entries",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        project_id: "inactive-proj",
        agent_role: "reviewer",
        title: "Memory",
        content: "Content"
      }
    });
    expect(inactiveMemoryResponse.statusCode).toBe(409);
    expect(inactiveMemoryResponse.json().code).toBe("PROJECT_INACTIVE");
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

  it("auto-dispatches queued tasks and marks them done", async () => {
    await app.close();

    app = await createApp({
      config: {
        ...config,
        taskAutoDispatchEnabled: true,
        taskAutoDispatchIntervalMs: 20,
        taskAutoDispatchCapability: "reviewer"
      },
      persistence,
      storage,
      publisher,
      authProfileRateLimitsReader
    });
    await app.ready();

    await persistence.createAgentTemplate({
      name: "auto-dispatch-reviewer",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "review task",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });
    await persistence.createAuthProfile({
      label: "auto-dispatch-profile",
      status: "active",
      checksum: "checksum-auto-dispatch-profile",
      storage_path: "auth-profiles/auto-dispatch-profile/auth.json",
      meta_json: {},
      uploaded_by: "admin"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        title: "Auto task",
        description: "Task should be dispatched automatically",
        project_id: "project-1",
        repo_id: "repo-1",
        priority: 10
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const taskId = createResponse.json().id as string;

    let task = await persistence.getTaskById(taskId);
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (task?.status === "DONE") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
      task = await persistence.getTaskById(taskId);
    }

    expect(task?.status).toBe("DONE");
    expect(
      persistence.delegations.some(
        (delegation) =>
          delegation.requester_task_id === taskId && delegation.status === "completed"
      )
    ).toBe(true);
  });

  it("marks task as failed when delegation completed with explicit failed marker", async () => {
    await app.close();

    const failedMarkerExecutor: DelegationExecutor = {
      execute: async () => ({
        execution_mode: "codex_exec",
        result_summary: "TASK_RESULT:FAILED cannot write file",
        output_text: "TASK_RESULT:FAILED cannot write file"
      })
    };

    app = await createApp({
      config: {
        ...config,
        taskAutoDispatchEnabled: true,
        taskAutoDispatchIntervalMs: 20,
        taskAutoDispatchCapability: "reviewer"
      },
      persistence,
      storage,
      publisher,
      authProfileRateLimitsReader,
      delegationExecutor: failedMarkerExecutor
    });
    await app.ready();

    await persistence.createAgentTemplate({
      name: "auto-dispatch-reviewer-failed-marker",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "review task",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });
    await persistence.createAuthProfile({
      label: "auto-dispatch-profile-failed-marker",
      status: "active",
      checksum: "checksum-auto-dispatch-profile-failed-marker",
      storage_path: "auth-profiles/auto-dispatch-profile-failed-marker/auth.json",
      meta_json: {},
      uploaded_by: "admin"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        title: "Auto task failed marker",
        description: "Task should be marked terminal failed",
        project_id: "project-1",
        repo_id: "repo-1",
        priority: 10
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const taskId = createResponse.json().id as string;

    let task = await persistence.getTaskById(taskId);
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (task?.status === "FAILED_TERMINAL") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
      task = await persistence.getTaskById(taskId);
    }

    expect(task?.status).toBe("FAILED_TERMINAL");
  });

  it("passes sandbox and approval policy from template to delegation executor", async () => {
    await app.close();

    let capturedInput: DelegationExecutionInput | null = null;
    const capturingExecutor: DelegationExecutor = {
      execute: async (input) => {
        capturedInput = input;
        return {
          execution_mode: "codex_exec",
          result_summary: "TASK_RESULT:SUCCESS",
          output_text: "TASK_RESULT:SUCCESS"
        };
      }
    };

    app = await createApp({
      config,
      persistence,
      storage,
      publisher,
      authProfileRateLimitsReader,
      delegationExecutor: capturingExecutor
    });
    await app.ready();

    const template = await persistence.createAgentTemplate({
      name: "sandbox-capture",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "capture sandbox",
      sandbox_policy: "danger-full-access",
      approval_policy: "on-request"
    });

    const dispatchResponse = await app.inject({
      method: "POST",
      url: "/api/delegation/dispatch",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-sandbox-policy-capture" },
      payload: {
        requester_task_id: "task-capture-sandbox",
        capability: "reviewer",
        target_selector: { agent_template_id: template.id },
        payload: { prompt: "capture run" }
      }
    });

    expect(dispatchResponse.statusCode).toBe(202);
    expect(capturedInput).not.toBeNull();
    const capturedTemplate = (capturedInput as unknown as DelegationExecutionInput).target_template;
    expect(capturedTemplate.sandbox_policy).toBe("danger-full-access");
    expect(capturedTemplate.approval_policy).toBe("on-request");
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

  it("accepts task /say message and persists intervention", async () => {
    const task = await persistence.createTask({
      title: "Say task",
      description: "task say message",
      project_id: "project",
      repo_id: "repo",
      branch: null,
      priority: 100,
      status: "RUNNING",
      source: "api",
      created_by: "admin"
    });

    const sayResponse = await app.inject({
      method: "POST",
      url: `/api/tasks/${task.id}/say`,
      headers: { "x-admin-token": config.adminToken },
      payload: { message: "Нужно доделать проверку edge-cases" }
    });

    expect(sayResponse.statusCode).toBe(202);
    expect(sayResponse.json()).toEqual({ accepted: true });
    expect(persistence.interventions).toHaveLength(1);
    expect(persistence.interventions[0]).toMatchObject({
      task_id: task.id,
      source: "admin",
      type: "steer",
      created_by: "admin",
      payload: { message: "Нужно доделать проверку edge-cases" }
    });
  });

  it("validates task /say payload", async () => {
    const task = await persistence.createTask({
      title: "Say task invalid",
      description: "task say invalid payload",
      project_id: "project",
      repo_id: "repo",
      branch: null,
      priority: 100,
      status: "RUNNING",
      source: "api",
      created_by: "admin"
    });

    const sayResponse = await app.inject({
      method: "POST",
      url: `/api/tasks/${task.id}/say`,
      headers: { "x-admin-token": config.adminToken },
      payload: { message: "   " }
    });

    expect(sayResponse.statusCode).toBe(400);
    expect(sayResponse.json().code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for /say when task does not exist", async () => {
    const sayResponse = await app.inject({
      method: "POST",
      url: "/api/tasks/task-missing/say",
      headers: { "x-admin-token": config.adminToken },
      payload: { message: "hello" }
    });

    expect(sayResponse.statusCode).toBe(404);
    expect(sayResponse.json().code).toBe("NOT_FOUND");
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

  it("uploads auth.json to storage and emits event", async () => {
    const authJsonObject = {
      auth_mode: "chatgpt",
      access_token: "token-value",
      refresh_token: "refresh-value"
    };
    const authJsonText = JSON.stringify(authJsonObject);
    const authJsonBuffer = Buffer.from(authJsonText, "utf8");

    const response = await request(app.server)
      .post("/api/auth-profiles/chatgpt/upload")
      .set("x-admin-token", config.adminToken)
      .field("label", "profile-a")
      .attach("file", authJsonBuffer, {
        filename: "auth.json",
        contentType: "application/json"
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.label).toBe("profile-a");
    const persistedProfile = persistence.profiles[0];
    expect(persistedProfile).toBeDefined();
    if (!persistedProfile) {
      throw new Error("Expected persisted auth profile");
    }

    const expectedChecksum = createHash("sha256")
      .update(Buffer.from(authJsonText, "utf8"))
      .digest("hex");
    expect(persistedProfile.checksum).toBe(expectedChecksum);
    expect(persistedProfile.storage_path.endsWith(".auth.json")).toBe(true);
    expect(storage.contentTypes.get(persistedProfile.storage_path)).toBe("application/json");
    expect(storage.objects.get(persistedProfile.storage_path)?.toString("utf8")).toBe(authJsonText);
    expect(storage.objects.size).toBe(1);
    expect(publisher.events.some((event) => event.eventType === "auth_profile.uploaded")).toBe(true);
  });

  it("rejects upload when filename is not auth.json", async () => {
    const authJsonBuffer = Buffer.from(JSON.stringify({ auth_mode: "chatgpt" }), "utf8");

    const response = await request(app.server)
      .post("/api/auth-profiles/chatgpt/upload")
      .set("x-admin-token", config.adminToken)
      .field("label", "profile-invalid-filename")
      .attach("file", authJsonBuffer, {
        filename: "profile.json",
        contentType: "application/json"
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects upload with invalid auth.json payload", async () => {
    const invalidBuffer = Buffer.from("not-json", "utf8");

    const response = await request(app.server)
      .post("/api/auth-profiles/chatgpt/upload")
      .set("x-admin-token", config.adminToken)
      .field("label", "profile-invalid-json")
      .attach("file", invalidBuffer, {
        filename: "auth.json",
        contentType: "application/json"
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
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

  it("deletes auth profile and clears switch references", async () => {
    const profile = await persistence.createAuthProfile({
      label: "profile-delete",
      status: "inactive",
      checksum: "checksum-profile-delete",
      storage_path: "auth-profiles/profile-delete.auth.json",
      meta_json: {},
      uploaded_by: "admin"
    });

    await persistence.createAuthSwitchEvent({
      module_key: SWITCH_MODULE_KEY,
      from_auth_profile_id: profile.id,
      to_auth_profile_id: profile.id,
      reason: "manual",
      status: "completed"
    });

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/auth-profiles/chatgpt/${profile.id}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(deleteResponse.statusCode).toBe(204);
    expect(deleteResponse.body).toBe("");

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/auth-profiles/chatgpt",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items.some((item: { id: string }) => item.id === profile.id)).toBe(false);

    expect(persistence.switchEvents[0]?.from_auth_profile_id).toBeNull();
    expect(persistence.switchEvents[0]?.to_auth_profile_id).toBeNull();
  });

  it("returns 404 when deleting unknown auth profile", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/api/auth-profiles/chatgpt/profile-missing",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "Profile not found",
      code: "NOT_FOUND"
    });
  });

  it("returns 404 when active profile is not selected", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/auth-profiles/chatgpt/active",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "Active profile not found",
      code: "NOT_FOUND"
    });
  });

  it("returns live limits for a specific auth profile", async () => {
    const profile = await persistence.createAuthProfile({
      label: "limits-profile",
      status: "inactive",
      checksum: "checksum-limits",
      storage_path: "auth-profiles/limits.auth.json",
      meta_json: {},
      uploaded_by: "admin"
    });

    authProfileRateLimitsReader.responsesByProfileId.set(profile.id, {
      profile: {
        id: profile.id,
        label: profile.label,
        status: profile.status,
        checksum: profile.checksum
      },
      rate_limits: {
        source: "openai_app_server_rpc",
        captured_at: "2026-04-07T20:18:20.000Z",
        limit_id: "codex",
        limit_name: null,
        plan_type: "plus",
        primary: {
          used_percent: 22,
          remaining_percent: 78,
          window_minutes: 300,
          resets_at_unix: 1775605962,
          resets_at_utc: "2026-04-07T23:52:42.000Z",
          reset_after_seconds: 12960
        },
        secondary: {
          used_percent: 33,
          remaining_percent: 67,
          window_minutes: 10080,
          resets_at_unix: 1776166327,
          resets_at_utc: "2026-04-14T11:32:07.000Z",
          reset_after_seconds: 573326
        },
        credits: {
          has_credits: false,
          unlimited: false,
          balance: "0"
        }
      },
      rate_limits_by_limit_id: null
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/auth-profiles/chatgpt/${profile.id}/limits`,
      headers: { "x-admin-token": config.adminToken }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().profile.id).toBe(profile.id);
    expect(response.json().rate_limits.primary.remaining_percent).toBe(78);
    expect(response.json().rate_limits.secondary.remaining_percent).toBe(67);
  });

  it("returns 502 when live limits source is unavailable", async () => {
    const profile = await persistence.createAuthProfile({
      label: "limits-fail-profile",
      status: "inactive",
      checksum: "checksum-limits-fail",
      storage_path: "auth-profiles/limits-fail.auth.json",
      meta_json: {},
      uploaded_by: "admin"
    });

    authProfileRateLimitsReader.failuresByProfileId.set(
      profile.id,
      new Error("rpc timeout")
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/auth-profiles/chatgpt/${profile.id}/limits`,
      headers: { "x-admin-token": config.adminToken }
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: "Failed to fetch live limits via codex app-server",
      code: "RATE_LIMITS_UNAVAILABLE"
    });
  });

  it("returns 404 for limits when auth profile does not exist", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/auth-profiles/chatgpt/profile-missing/limits",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "Profile not found",
      code: "NOT_FOUND"
    });
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

  it("returns delegation runtime cards grouped by lifecycle state", async () => {
    const profile = await persistence.createAuthProfile({
      label: "ops-account-1",
      status: "active",
      checksum: "checksum-ops-account-1",
      storage_path: "auth-profiles/ops-account-1/auth.json",
      meta_json: {},
      uploaded_by: "admin"
    });

    const template = await persistence.createAgentTemplate({
      name: "reviewer-template",
      role: "reviewer",
      model: "gpt-5.4",
      system_prompt: "review",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });

    const preparing = await persistence.createDelegationRequest({
      requester_task_id: "task-preparing",
      requester_task_run_id: null,
      capability: "reviewer",
      target_selector: { role: "reviewer" },
      payload: { prompt: "prepare summary" },
      priority: 100,
      input_prompt: "prepare summary",
      trace_id: "trace-preparing"
    });
    await persistence.updateDelegationRequest(preparing.id, {
      status: "accepted",
      target_agent_template_id: template.id,
      selected_auth_profile_id: profile.id,
      started_at: new Date("2026-04-08T10:00:00.000Z")
    });

    const running = await persistence.createDelegationRequest({
      requester_task_id: "task-running",
      requester_task_run_id: null,
      capability: "reviewer",
      target_selector: { role: "reviewer" },
      payload: { prompt: "run checks" },
      priority: 100,
      input_prompt: "run checks",
      trace_id: "trace-running"
    });
    await persistence.updateDelegationRequest(running.id, {
      status: "running",
      target_agent_template_id: template.id,
      selected_auth_profile_id: profile.id,
      started_at: new Date("2026-04-08T10:01:00.000Z"),
      execution_log: "running-log"
    });

    const recent = await persistence.createDelegationRequest({
      requester_task_id: "task-recent",
      requester_task_run_id: null,
      capability: "reviewer",
      target_selector: { role: "reviewer" },
      payload: { prompt: "completed work" },
      priority: 100,
      input_prompt: "completed work",
      trace_id: "trace-recent"
    });
    await persistence.updateDelegationRequest(recent.id, {
      status: "completed",
      target_agent_template_id: template.id,
      selected_auth_profile_id: profile.id,
      execution_mode: "codex_exec",
      execution_log: "completed-log",
      result_summary: "completed-summary",
      started_at: new Date("2026-04-08T09:59:00.000Z"),
      ended_at: new Date("2026-04-08T10:02:00.000Z")
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/delegation/cards",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().preparing).toHaveLength(1);
    expect(response.json().running).toHaveLength(1);
    expect(response.json().recent).toHaveLength(1);
    expect(response.json().running[0]).toMatchObject({
      id: running.id,
      prompt: "run checks",
      account: {
        id: profile.id,
        label: profile.label
      },
      target_template: {
        id: template.id,
        name: template.name
      }
    });
  });

  it("manages agent memory entries via API", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/memory/entries",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        project_id: "proj-memory",
        agent_role: "Designer",
        title: "UI map",
        content: "Landing page has two key tabs and sticky top nav."
      }
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      project_id: "proj-memory",
      agent_role: "designer",
      title: "UI map",
      is_active: true
    });

    const createdId = createResponse.json().id as string;

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/memory/entries?project_id=proj-memory&agent_role=designer&is_active=true",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items).toHaveLength(1);

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/api/memory/entries/${createdId}`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        is_active: false
      }
    });
    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().is_active).toBe(false);

    const inactiveListResponse = await app.inject({
      method: "GET",
      url: "/api/memory/entries?project_id=proj-memory&is_active=false",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(inactiveListResponse.statusCode).toBe(200);
    expect(inactiveListResponse.json().items).toHaveLength(1);
  });

  it("creates and lists agent requests including open-pool filters", async () => {
    const task = await persistence.createTask({
      title: "Agent request seed",
      description: "Need extra runtime capability",
      project_id: "project",
      repo_id: "repo",
      branch: null,
      priority: 100,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/agent-requests",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        type: "runtime_dependency",
        project_id: "project",
        task_id: task.id,
        title: "Need playwright",
        reason: "Browser tests are blocked without dependency",
        request_payload: { dependency: "playwright" }
      }
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      type: "runtime_dependency",
      status: "open",
      project_id: "project",
      task_id: task.id
    });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/agent-requests?open_pool=true&project_id=project",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items).toHaveLength(1);
    expect(listResponse.json().items[0].status).toBe("open");
  });

  it("keeps blocked_agent requests in open-pool and removes resolved_manual", async () => {
    const task = await persistence.createTask({
      title: "Resolve request seed",
      description: "Need ACL update",
      project_id: "project",
      repo_id: "repo",
      branch: null,
      priority: 100,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });

    const created = await app.inject({
      method: "POST",
      url: "/api/agent-requests",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        type: "mcp_tool_acl",
        project_id: "project",
        task_id: task.id,
        title: "Need write access",
        reason: "Reviewer can only read now"
      }
    });
    expect(created.statusCode).toBe(201);
    const requestId = created.json().id as string;

    const blockedResponse = await app.inject({
      method: "POST",
      url: `/api/agent-requests/${requestId}/resolve`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        status: "blocked_agent",
        claimed_by_governor_id: "governor-main",
        resolution_payload: { reason: "need_manual_approval" }
      }
    });
    expect(blockedResponse.statusCode).toBe(200);
    expect(blockedResponse.json().status).toBe("blocked_agent");

    const openPoolWithBlocked = await app.inject({
      method: "GET",
      url: "/api/agent-requests?open_pool=true&project_id=project",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(openPoolWithBlocked.statusCode).toBe(200);
    expect(
      openPoolWithBlocked
        .json()
        .items.some((item: { id: string; status: string }) => item.id === requestId && item.status === "blocked_agent")
    ).toBe(true);

    const resolvedManual = await app.inject({
      method: "POST",
      url: `/api/agent-requests/${requestId}/resolve`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        status: "resolved_manual",
        resolved_by: "operator",
        resolution_payload: { decision: "approved" }
      }
    });
    expect(resolvedManual.statusCode).toBe(200);
    expect(resolvedManual.json().status).toBe("resolved_manual");

    const openPoolAfterResolve = await app.inject({
      method: "GET",
      url: "/api/agent-requests?open_pool=true&project_id=project",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(openPoolAfterResolve.statusCode).toBe(200);
    expect(
      openPoolAfterResolve
        .json()
        .items.some((item: { id: string }) => item.id === requestId)
    ).toBe(false);
  });

  it("records and returns agent request audit events", async () => {
    const task = await persistence.createTask({
      title: "Audit request seed",
      description: "Request audit checks",
      project_id: "project",
      repo_id: "repo",
      branch: null,
      priority: 100,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });

    const created = await app.inject({
      method: "POST",
      url: "/api/agent-requests",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-agent-request-create-1" },
      payload: {
        type: "runtime_dependency",
        project_id: "project",
        task_id: task.id,
        title: "Need browser",
        reason: "missing browser runtime",
        request_payload: { governor_auto_resolve: false }
      }
    });
    expect(created.statusCode).toBe(201);
    const requestId = created.json().id as string;

    const resolved = await app.inject({
      method: "POST",
      url: `/api/agent-requests/${requestId}/resolve`,
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-agent-request-resolve-1" },
      payload: {
        status: "blocked_agent",
        claimed_by_governor_id: "governor-main",
        resolution_payload: { reason: "manual approval required" }
      }
    });
    expect(resolved.statusCode).toBe(200);
    expect(resolved.json().status).toBe("blocked_agent");

    const audit = await app.inject({
      method: "GET",
      url: `/api/agent-requests/${requestId}/audit?limit=10`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(audit.statusCode).toBe(200);
    expect(audit.json().items).toHaveLength(2);
    const blockedEvent = audit.json().items.find(
      (item: { event_type?: unknown }) => item.event_type === "request_blocked_agent"
    );
    const createdEvent = audit.json().items.find(
      (item: { event_type?: unknown }) => item.event_type === "request_created"
    );

    expect(blockedEvent).toBeTruthy();
    expect(createdEvent).toBeTruthy();
    expect(blockedEvent).toMatchObject({
      request_id: requestId,
      event_type: "request_blocked_agent",
      from_status: "open",
      to_status: "blocked_agent",
      actor_type: "governor",
      actor_id: "governor-main",
      trace_id: "trace-agent-request-resolve-1"
    });
    expect(createdEvent).toMatchObject({
      request_id: requestId,
      event_type: "request_created",
      from_status: null,
      to_status: "open",
      actor_type: "admin_api",
      actor_id: "admin",
      trace_id: "trace-agent-request-create-1"
    });

    const invalidLimit = await app.inject({
      method: "GET",
      url: `/api/agent-requests/${requestId}/audit?limit=0`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(invalidLimit.statusCode).toBe(400);
    expect(invalidLimit.json().code).toBe("REQUEST_VALIDATION_FAILED");
  });

  it("returns REQUEST_STATE_CONFLICT for terminal agent request transition", async () => {
    const task = await persistence.createTask({
      title: "Conflict request seed",
      description: "Request conflict checks",
      project_id: "project",
      repo_id: "repo",
      branch: null,
      priority: 100,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });

    const created = await app.inject({
      method: "POST",
      url: "/api/agent-requests",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        type: "other",
        project_id: "project",
        task_id: task.id,
        title: "Need policy override",
        reason: "Custom ask"
      }
    });
    expect(created.statusCode).toBe(201);
    const requestId = created.json().id as string;

    const resolved = await app.inject({
      method: "POST",
      url: `/api/agent-requests/${requestId}/resolve`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        status: "resolved_manual"
      }
    });
    expect(resolved.statusCode).toBe(200);
    expect(resolved.json().status).toBe("resolved_manual");

    const conflict = await app.inject({
      method: "POST",
      url: `/api/agent-requests/${requestId}/resolve`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        status: "blocked_agent"
      }
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().code).toBe("REQUEST_STATE_CONFLICT");
  });

  it("creates agent profile and auto-binds orchestrator MCP server", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/agent-profiles",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        project_id: "project",
        name: "UI tester",
        role: "Tester",
        source_policy: "catalog_plus_custom"
      }
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      project_id: "project",
      name: "UI tester",
      role: "tester",
      source_policy: "catalog_plus_custom",
      is_enabled: true
    });
    const profileId = createResponse.json().id as string;

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/agent-profiles?project_id=project&include_disabled=false",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(listResponse.statusCode).toBe(200);
    expect(
      listResponse
        .json()
        .items.some((item: { id: string }) => item.id === profileId)
    ).toBe(true);

    const bindingsResponse = await app.inject({
      method: "GET",
      url: `/api/agent-profiles/${profileId}/mcp-servers`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(bindingsResponse.statusCode).toBe(200);
    expect(bindingsResponse.json().items).toHaveLength(1);
    expect(bindingsResponse.json().items[0].is_required).toBe(true);
    expect(bindingsResponse.json().items[0].mcp_server.name).toBe("orchestrator-core");
  });

  it("manages custom MCP bindings and prevents orchestrator unbind", async () => {
    const createProfileResponse = await app.inject({
      method: "POST",
      url: "/api/agent-profiles",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        project_id: "project",
        name: "browser profile",
        role: "reviewer"
      }
    });
    expect(createProfileResponse.statusCode).toBe(201);
    const profileId = createProfileResponse.json().id as string;

    const createServerResponse = await app.inject({
      method: "POST",
      url: "/api/mcp/servers",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        name: "browser-mcp",
        transport: "stdio",
        endpoint_or_command: "npx @playwright/mcp",
        origin_type: "catalog",
        is_approved: true
      }
    });
    expect(createServerResponse.statusCode).toBe(201);
    const serverId = createServerResponse.json().id as string;

    const bindResponse = await app.inject({
      method: "POST",
      url: `/api/agent-profiles/${profileId}/mcp-servers/${serverId}`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        is_required: false,
        priority: 40,
        config_json: { channel: "stable" }
      }
    });
    expect(bindResponse.statusCode).toBe(200);
    expect(bindResponse.json()).toMatchObject({
      agent_profile_id: profileId,
      mcp_server_id: serverId,
      is_required: false,
      priority: 40
    });

    const profileServersResponse = await app.inject({
      method: "GET",
      url: `/api/agent-profiles/${profileId}/mcp-servers`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(profileServersResponse.statusCode).toBe(200);
    expect(profileServersResponse.json().items).toHaveLength(2);
    const orchestratorBinding = profileServersResponse
      .json()
      .items.find((item: { mcp_server: { name: string } }) => item.mcp_server.name === "orchestrator-core");
    expect(orchestratorBinding).toBeDefined();

    const deleteCustomBindingResponse = await app.inject({
      method: "DELETE",
      url: `/api/agent-profiles/${profileId}/mcp-servers/${serverId}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(deleteCustomBindingResponse.statusCode).toBe(204);

    const deleteOrchestratorBindingResponse = await app.inject({
      method: "DELETE",
      url: `/api/agent-profiles/${profileId}/mcp-servers/${orchestratorBinding.mcp_server_id as string}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(deleteOrchestratorBindingResponse.statusCode).toBe(409);
    expect(deleteOrchestratorBindingResponse.json().code).toBe("MCP_SERVER_REQUIRED");
  });

  it("upserts profile scripts and applies include_disabled filter", async () => {
    const createProfileResponse = await app.inject({
      method: "POST",
      url: "/api/agent-profiles",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        project_id: "project",
        name: "ops profile",
        role: "DevOps"
      }
    });
    expect(createProfileResponse.statusCode).toBe(201);
    const profileId = createProfileResponse.json().id as string;

    const firstScript = await app.inject({
      method: "PUT",
      url: `/api/agent-profiles/${profileId}/scripts/windows`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        script_type: "shell",
        content: "Write-Host 'hello'"
      }
    });
    expect(firstScript.statusCode).toBe(200);
    expect(firstScript.json().version).toBe(1);

    const secondScript = await app.inject({
      method: "PUT",
      url: `/api/agent-profiles/${profileId}/scripts/windows`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        script_type: "shell",
        content: "Write-Host 'updated'"
      }
    });
    expect(secondScript.statusCode).toBe(200);
    expect(secondScript.json().version).toBe(2);

    const scriptsResponse = await app.inject({
      method: "GET",
      url: `/api/agent-profiles/${profileId}/scripts`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(scriptsResponse.statusCode).toBe(200);
    expect(scriptsResponse.json().items).toHaveLength(1);
    expect(scriptsResponse.json().items[0]).toMatchObject({
      os: "windows",
      script_type: "shell",
      version: 2
    });

    const disableProfileResponse = await app.inject({
      method: "PATCH",
      url: `/api/agent-profiles/${profileId}`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        is_enabled: false,
        source_policy: "custom_only"
      }
    });
    expect(disableProfileResponse.statusCode).toBe(200);
    expect(disableProfileResponse.json().is_enabled).toBe(false);
    expect(disableProfileResponse.json().source_policy).toBe("custom_only");

    const enabledOnlyResponse = await app.inject({
      method: "GET",
      url: "/api/agent-profiles?project_id=project&include_disabled=false",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(enabledOnlyResponse.statusCode).toBe(200);
    expect(
      enabledOnlyResponse
        .json()
        .items.some((item: { id: string }) => item.id === profileId)
    ).toBe(false);
  });

  it("creates MCP API key with ACL rules and profile bindings", async () => {
    const createProfileResponse = await app.inject({
      method: "POST",
      url: "/api/agent-profiles",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        project_id: "project",
        name: "review profile",
        role: "reviewer"
      }
    });
    expect(createProfileResponse.statusCode).toBe(201);
    const profileId = createProfileResponse.json().id as string;

    const createKeyResponse = await app.inject({
      method: "POST",
      url: "/api/mcp/keys",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        name: "reviewer-readonly",
        acl_tools: ["orchestrator.list_tasks", "orchestrator.list_agents"],
        profile_ids: [profileId],
        meta_json: { owner: "qa" }
      }
    });
    expect(createKeyResponse.statusCode).toBe(201);
    expect(createKeyResponse.json()).toMatchObject({
      name: "reviewer-readonly",
      status: "active",
      profile_bindings: [{ agent_profile_id: profileId }]
    });
    expect(createKeyResponse.json().secret.startsWith("mcpk_")).toBe(true);
    expect(createKeyResponse.json().acl_rules).toHaveLength(2);
    const keyId = createKeyResponse.json().id as string;

    const listKeysResponse = await app.inject({
      method: "GET",
      url: "/api/mcp/keys?include_revoked=true",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(listKeysResponse.statusCode).toBe(200);
    const listed = listKeysResponse
      .json()
      .items.find((item: { id: string }) => item.id === keyId);
    expect(listed).toBeDefined();
    expect(listed.secret).toBeUndefined();
    expect(listed.acl_rules).toHaveLength(2);
  });

  it("patches, rotates, revokes and unbinds MCP API key", async () => {
    const createProfileResponse = await app.inject({
      method: "POST",
      url: "/api/agent-profiles",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        project_id: "project",
        name: "devops profile",
        role: "devops"
      }
    });
    expect(createProfileResponse.statusCode).toBe(201);
    const profileId = createProfileResponse.json().id as string;

    const createKeyResponse = await app.inject({
      method: "POST",
      url: "/api/mcp/keys",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        name: "devops-key"
      }
    });
    expect(createKeyResponse.statusCode).toBe(201);
    const keyId = createKeyResponse.json().id as string;

    const bindResponse = await app.inject({
      method: "POST",
      url: `/api/mcp/keys/${keyId}/bindings/profiles/${profileId}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(bindResponse.statusCode).toBe(200);
    expect(bindResponse.json()).toMatchObject({
      key_id: keyId,
      agent_profile_id: profileId
    });

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/api/mcp/keys/${keyId}`,
      headers: { "x-admin-token": config.adminToken },
      payload: {
        status: "disabled",
        acl_tools: []
      }
    });
    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().status).toBe("disabled");
    expect(patchResponse.json().acl_rules).toHaveLength(0);

    const rotateResponse = await app.inject({
      method: "POST",
      url: `/api/mcp/keys/${keyId}/rotate`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(rotateResponse.statusCode).toBe(200);
    expect(rotateResponse.json().status).toBe("active");
    expect(rotateResponse.json().secret.startsWith("mcpk_")).toBe(true);

    const revokeResponse = await app.inject({
      method: "POST",
      url: `/api/mcp/keys/${keyId}/revoke`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(revokeResponse.statusCode).toBe(200);
    expect(revokeResponse.json().status).toBe("revoked");

    const hiddenRevokedListResponse = await app.inject({
      method: "GET",
      url: "/api/mcp/keys",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(hiddenRevokedListResponse.statusCode).toBe(200);
    expect(
      hiddenRevokedListResponse
        .json()
        .items.some((item: { id: string }) => item.id === keyId)
    ).toBe(false);

    const deleteBindingResponse = await app.inject({
      method: "DELETE",
      url: `/api/mcp/keys/${keyId}/bindings/profiles/${profileId}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(deleteBindingResponse.statusCode).toBe(204);

    const deleteAgainResponse = await app.inject({
      method: "DELETE",
      url: `/api/mcp/keys/${keyId}/bindings/profiles/${profileId}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(deleteAgainResponse.statusCode).toBe(404);
  });

  it("evaluates MCP authz by key status, ACL and profile binding", async () => {
    const createProfileResponse = await app.inject({
      method: "POST",
      url: "/api/agent-profiles",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        project_id: "project",
        name: "qa profile",
        role: "tester"
      }
    });
    expect(createProfileResponse.statusCode).toBe(201);
    const profileId = createProfileResponse.json().id as string;

    const createKeyResponse = await app.inject({
      method: "POST",
      url: "/api/mcp/keys",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        name: "qa-key",
        acl_tools: ["orchestrator.list_tasks"],
        profile_ids: [profileId]
      }
    });
    expect(createKeyResponse.statusCode).toBe(201);
    const keyId = createKeyResponse.json().id as string;
    const secret = createKeyResponse.json().secret as string;

    const allowedResponse = await app.inject({
      method: "POST",
      url: "/api/mcp/authz/evaluate",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-authz-allow-1" },
      payload: {
        api_key: secret,
        tool_name: "orchestrator.list_tasks",
        agent_profile_id: profileId
      }
    });
    expect(allowedResponse.statusCode).toBe(200);
    expect(allowedResponse.json()).toMatchObject({
      allowed: true,
      key_id: keyId
    });

    const wrongToolResponse = await app.inject({
      method: "POST",
      url: "/api/mcp/authz/evaluate",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        api_key: secret,
        tool_name: "orchestrator.dispatch_agent",
        agent_profile_id: profileId
      }
    });
    expect(wrongToolResponse.statusCode).toBe(403);
    expect(wrongToolResponse.json().code).toBe("MCP_TOOL_FORBIDDEN");

    const wrongProfileResponse = await app.inject({
      method: "POST",
      url: "/api/mcp/authz/evaluate",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        api_key: secret,
        tool_name: "orchestrator.list_tasks",
        agent_profile_id: "unknown-profile"
      }
    });
    expect(wrongProfileResponse.statusCode).toBe(403);
    expect(wrongProfileResponse.json().code).toBe("MCP_PROFILE_FORBIDDEN");

    const missingKeyResponse = await app.inject({
      method: "POST",
      url: "/api/mcp/authz/evaluate",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        tool_name: "orchestrator.list_tasks"
      }
    });
    expect(missingKeyResponse.statusCode).toBe(401);
    expect(missingKeyResponse.json().code).toBe("MCP_KEY_REQUIRED");

    await app.inject({
      method: "POST",
      url: `/api/mcp/keys/${keyId}/revoke`,
      headers: { "x-admin-token": config.adminToken }
    });

    const revokedResponse = await app.inject({
      method: "POST",
      url: "/api/mcp/authz/evaluate",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        api_key: secret,
        tool_name: "orchestrator.list_tasks",
        agent_profile_id: profileId
      }
    });
    expect(revokedResponse.statusCode).toBe(401);
    expect(revokedResponse.json().code).toBe("MCP_KEY_REVOKED");

    expect(
      persistence.mcpAuthAuditEvents.some(
        (event) => event.event_type === "allowed" && event.key_id === keyId
      )
    ).toBe(true);
    expect(
      persistence.mcpAuthAuditEvents.some(
        (event) =>
          event.event_type === "denied" &&
          (event.request_meta_json?.["code"] as string | undefined) === "MCP_TOOL_FORBIDDEN"
      )
    ).toBe(true);
  });

  it("applies MCP template constraints in authz evaluate", async () => {
    const createTemplateResponse = await app.inject({
      method: "POST",
      url: "/api/agents/templates",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        name: "tpl-authz",
        role: "reviewer",
        model: "gpt-5.4-mini",
        system_prompt: "review",
        sandbox_policy: "workspace-write",
        approval_policy: "never"
      }
    });
    expect(createTemplateResponse.statusCode).toBe(201);
    const templateId = createTemplateResponse.json().id as string;

    const createKeyResponse = await app.inject({
      method: "POST",
      url: "/api/mcp/keys",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        name: "template-key",
        acl_tools: ["orchestrator.list_tasks"]
      }
    });
    expect(createKeyResponse.statusCode).toBe(201);
    const keyId = createKeyResponse.json().id as string;
    const secret = createKeyResponse.json().secret as string;

    const bindConstraintResponse = await app.inject({
      method: "POST",
      url: `/api/mcp/keys/${keyId}/constraints/templates/${templateId}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(bindConstraintResponse.statusCode).toBe(200);
    expect(bindConstraintResponse.json()).toMatchObject({
      key_id: keyId,
      agent_template_id: templateId
    });

    const forbiddenTemplateResponse = await app.inject({
      method: "POST",
      url: "/api/mcp/authz/evaluate",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        api_key: secret,
        tool_name: "orchestrator.list_tasks",
        agent_template_id: "another-template"
      }
    });
    expect(forbiddenTemplateResponse.statusCode).toBe(403);
    expect(forbiddenTemplateResponse.json().code).toBe("MCP_TEMPLATE_FORBIDDEN");

    const allowedTemplateResponse = await app.inject({
      method: "POST",
      url: "/api/mcp/authz/evaluate",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        api_key: secret,
        tool_name: "orchestrator.list_tasks",
        agent_template_id: templateId
      }
    });
    expect(allowedTemplateResponse.statusCode).toBe(200);
    expect(allowedTemplateResponse.json().allowed).toBe(true);

    const removeConstraintResponse = await app.inject({
      method: "DELETE",
      url: `/api/mcp/keys/${keyId}/constraints/templates/${templateId}`,
      headers: { "x-admin-token": config.adminToken }
    });
    expect(removeConstraintResponse.statusCode).toBe(204);
  });

  it("injects project-role memory into delegation execution payload", async () => {
    await app.close();

    const executionCalls: Array<{
      payload: Record<string, unknown>;
    }> = [];
    const injectedExecutor: DelegationExecutor = {
      async execute(input) {
        executionCalls.push({
          payload: input.payload
        });
        return {
          execution_mode: "mock",
          result_summary: "ok",
          output_text: "ok"
        };
      }
    };

    app = await createApp({
      config,
      persistence,
      publisher,
      storage,
      delegationExecutor: injectedExecutor,
      authProfileRateLimitsReader
    });
    await app.ready();

    const task = await persistence.createTask({
      title: "Memory task",
      description: "Needs memory-aware execution",
      project_id: "proj-memory",
      repo_id: "repo-memory",
      branch: null,
      priority: 100,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });

    await persistence.createAgentMemoryEntry({
      project_id: "proj-memory",
      agent_role: "reviewer",
      title: "UI observation",
      content: "Tester already confirmed breadcrumbs are required on all pages.",
      created_by: "admin"
    });

    await persistence.createAgentTemplate({
      name: "reviewer-template",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "You are reviewer",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });

    const dispatchResponse = await app.inject({
      method: "POST",
      url: "/api/delegation/dispatch",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-memory-delegation-1" },
      payload: {
        requester_task_id: task.id,
        capability: "reviewer",
        target_selector: { role: "reviewer" },
        payload: { prompt: "Собери review-план" },
        priority: 50
      }
    });

    expect(dispatchResponse.statusCode).toBe(202);
    expect(executionCalls).toHaveLength(1);
    const firstExecution = executionCalls[0];
    if (!firstExecution) {
      throw new Error("Expected delegation execution call to be captured");
    }
    expect(firstExecution.payload["prompt"]).toContain("Собери review-план");
    expect(firstExecution.payload["prompt"]).toContain("Память проекта (proj-memory)");
    expect(firstExecution.payload["prompt"]).toContain("breadcrumbs are required");
    expect(firstExecution.payload["memory_context"]).toMatchObject({
      project_id: "proj-memory",
      agent_role: "reviewer",
      entries_used: 1,
      disabled: false
    });
  });

  it("auto-resolves agent profile by project+role and injects MCP/scripts into execution context", async () => {
    await app.close();

    const executionCalls: Array<{
      payload: Record<string, unknown>;
    }> = [];
    const injectedExecutor: DelegationExecutor = {
      async execute(input) {
        executionCalls.push({
          payload: input.payload
        });
        return {
          execution_mode: "mock",
          result_summary: "ok",
          output_text: "ok"
        };
      }
    };

    app = await createApp({
      config,
      persistence,
      publisher,
      storage,
      delegationExecutor: injectedExecutor,
      authProfileRateLimitsReader
    });
    await app.ready();

    const task = await persistence.createTask({
      title: "Agent profile runtime task",
      description: "Needs profile runtime context",
      project_id: "proj-memory",
      repo_id: "repo-memory",
      branch: null,
      priority: 100,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });

    await persistence.createAgentTemplate({
      name: "reviewer-template-profile",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "You are reviewer",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });

    const profile = await persistence.createAgentProfile({
      project_id: "proj-memory",
      name: "ui-reviewer-profile",
      role: "reviewer",
      source_policy: "catalog_plus_custom",
      is_enabled: true
    });
    const customServer = await persistence.createMcpServerRegistryEntry({
      name: "browser-mcp-auto-resolve",
      transport: "stdio",
      endpoint_or_command: "npx @playwright/mcp",
      origin_type: "catalog",
      is_approved: true
    });
    await persistence.bindMcpServerToAgentProfile(profile.id, customServer.id, {
      is_required: false,
      priority: 20,
      config_json: { channel: "stable" }
    });
    const runtimeScriptOs: AgentProfileScriptOs =
      process.platform === "win32"
        ? "windows"
        : process.platform === "darwin"
          ? "macos"
          : "linux";
    await persistence.upsertAgentProfileScriptSet(profile.id, {
      os: runtimeScriptOs,
      script_type: "instruction",
      content: "Используй browser MCP для smoke UI проверок."
    });

    const dispatchResponse = await app.inject({
      method: "POST",
      url: "/api/delegation/dispatch",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-agent-profile-context-1" },
      payload: {
        requester_task_id: task.id,
        capability: "reviewer",
        target_selector: { role: "reviewer" },
        payload: { prompt: "Собери runtime контекст профиля" },
        priority: 70
      }
    });

    expect(dispatchResponse.statusCode).toBe(202);
    expect(executionCalls).toHaveLength(1);
    const executionPayload = executionCalls[0]?.payload;
    if (!executionPayload) {
      throw new Error("Expected delegation execution payload to be captured");
    }

    expect(executionPayload["agent_profile_id"]).toBe(profile.id);
    expect(executionPayload["prompt"]).toContain("Используй browser MCP");
    expect(executionPayload["agent_profile_context"]).toMatchObject({
      profile_id: profile.id,
      profile_role: "reviewer",
      source_policy: "catalog_plus_custom"
    });
    const payloadContext = executionPayload["agent_profile_context"] as {
      mcp_servers?: Array<{ name?: string }>;
    };
    expect(
      payloadContext.mcp_servers?.some((item) => item.name === "browser-mcp-auto-resolve")
    ).toBe(true);

    expect(dispatchResponse.json().execution_meta_json.agent_profile_context).toMatchObject({
      profile_id: profile.id,
      profile_role: "reviewer",
      source_policy: "catalog_plus_custom"
    });
  });

  it("returns AGENT_PROFILE_* conflicts for selector profile mismatches", async () => {
    await persistence.createAgentTemplate({
      name: "selector-validation-template",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "You are reviewer",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });
    const requesterTask = await persistence.createTask({
      title: "selector profile mismatch",
      description: "validate profile selector mismatches",
      project_id: "project",
      repo_id: "project",
      branch: null,
      status: "QUEUED",
      priority: 60,
      source: "smoke-script",
      created_by: "smoke-script"
    });

    const wrongProjectProfile = await persistence.createAgentProfile({
      project_id: "proj-memory",
      name: "wrong-project-profile",
      role: "reviewer",
      is_enabled: true
    });
    const wrongProjectResponse = await app.inject({
      method: "POST",
      url: "/api/delegation/dispatch",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-agent-profile-project-mismatch-1" },
      payload: {
        requester_task_id: requesterTask.id,
        capability: "reviewer",
        target_selector: {
          role: "reviewer",
          agent_profile_id: wrongProjectProfile.id
        },
        payload: { prompt: "check mismatch" },
        priority: 60
      }
    });
    expect(wrongProjectResponse.statusCode).toBe(409);
    expect(wrongProjectResponse.json().code).toBe("AGENT_PROFILE_PROJECT_MISMATCH");

    const wrongRoleProfile = await persistence.createAgentProfile({
      project_id: "project",
      name: "wrong-role-profile",
      role: "devops",
      is_enabled: true
    });
    const wrongRoleResponse = await app.inject({
      method: "POST",
      url: "/api/delegation/dispatch",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-agent-profile-role-mismatch-1" },
      payload: {
        requester_task_id: requesterTask.id,
        capability: "reviewer",
        target_selector: {
          role: "reviewer",
          agent_profile_id: wrongRoleProfile.id
        },
        payload: { prompt: "check mismatch role" },
        priority: 60
      }
    });
    expect(wrongRoleResponse.statusCode).toBe(409);
    expect(wrongRoleResponse.json().code).toBe("AGENT_PROFILE_ROLE_MISMATCH");
  });

  it("uses project workspace_path as default cwd for delegation when payload cwd is absent", async () => {
    await app.close();

    const executionCalls: Array<{
      payload: Record<string, unknown>;
    }> = [];
    const injectedExecutor: DelegationExecutor = {
      async execute(input) {
        executionCalls.push({
          payload: input.payload
        });
        return {
          execution_mode: "mock",
          result_summary: "ok",
          output_text: "ok"
        };
      }
    };

    app = await createApp({
      config,
      persistence,
      publisher,
      storage,
      delegationExecutor: injectedExecutor,
      authProfileRateLimitsReader
    });
    await app.ready();

    await persistence.patchProject("proj-memory", {
      workspace_path: "C:/workspace/proj-memory"
    });

    const task = await persistence.createTask({
      title: "Workspace task",
      description: "Needs default cwd from project",
      project_id: "proj-memory",
      repo_id: "repo-memory",
      branch: null,
      priority: 100,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });

    await persistence.createAgentTemplate({
      name: "workspace-template",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "You are reviewer",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });

    const dispatchResponse = await app.inject({
      method: "POST",
      url: "/api/delegation/dispatch",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-project-cwd-fallback-1" },
      payload: {
        requester_task_id: task.id,
        capability: "reviewer",
        target_selector: { role: "reviewer" },
        payload: { prompt: "Проверь cwd fallback" },
        priority: 50
      }
    });

    expect(dispatchResponse.statusCode).toBe(202);
    expect(executionCalls).toHaveLength(1);
    const firstExecution = executionCalls[0];
    if (!firstExecution) {
      throw new Error("Expected delegation execution call to be captured");
    }
    expect(firstExecution.payload["cwd"]).toBe("C:/workspace/proj-memory");
  });

  it("keeps explicit payload cwd and does not override with project workspace_path", async () => {
    await app.close();

    const executionCalls: Array<{
      payload: Record<string, unknown>;
    }> = [];
    const injectedExecutor: DelegationExecutor = {
      async execute(input) {
        executionCalls.push({
          payload: input.payload
        });
        return {
          execution_mode: "mock",
          result_summary: "ok",
          output_text: "ok"
        };
      }
    };

    app = await createApp({
      config,
      persistence,
      publisher,
      storage,
      delegationExecutor: injectedExecutor,
      authProfileRateLimitsReader
    });
    await app.ready();

    await persistence.patchProject("proj-memory", {
      workspace_path: "C:/workspace/proj-memory"
    });

    const task = await persistence.createTask({
      title: "Workspace override task",
      description: "Needs explicit cwd override",
      project_id: "proj-memory",
      repo_id: "repo-memory",
      branch: null,
      priority: 100,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });

    await persistence.createAgentTemplate({
      name: "workspace-template",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "You are reviewer",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });

    const dispatchResponse = await app.inject({
      method: "POST",
      url: "/api/delegation/dispatch",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-project-cwd-override-1" },
      payload: {
        requester_task_id: task.id,
        capability: "reviewer",
        target_selector: { role: "reviewer" },
        payload: { prompt: "Проверь cwd override", cwd: "C:/manual/override" },
        priority: 50
      }
    });

    expect(dispatchResponse.statusCode).toBe(202);
    expect(executionCalls).toHaveLength(1);
    const firstExecution = executionCalls[0];
    if (!firstExecution) {
      throw new Error("Expected delegation execution call to be captured");
    }
    expect(firstExecution.payload["cwd"]).toBe("C:/manual/override");
  });

  it("uses injected delegation executor and stores returned summary", async () => {
    await app.close();

    const executionCalls: unknown[] = [];
    const injectedExecutor: DelegationExecutor = {
      async execute(input) {
        executionCalls.push(input);
        return {
          execution_mode: "codex_exec",
          result_summary: "executor-result-summary",
          output_text: "executor-output-text"
        };
      }
    };

    app = await createApp({
      config,
      persistence,
      publisher,
      storage,
      delegationExecutor: injectedExecutor,
      authProfileRateLimitsReader
    });
    await app.ready();

    await persistence.createAgentTemplate({
      name: "executor-template",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "You are helper",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });

    const dispatchResponse = await app.inject({
      method: "POST",
      url: "/api/delegation/dispatch",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-delegation-executor-1" },
      payload: {
        requester_task_id: "task-1",
        requester_task_run_id: "run-1",
        capability: "reviewer",
        target_selector: { role: "reviewer" },
        payload: { prompt: "Run executor path" },
        priority: 77
      }
    });

    expect(dispatchResponse.statusCode).toBe(202);
    expect(dispatchResponse.json().status).toBe("completed");
    expect(dispatchResponse.json().result_summary).toBe("executor-result-summary");
    expect(executionCalls).toHaveLength(1);
    expect(
      publisher.events.some(
        (event) =>
          event.eventType === "agent.delegation.completed" &&
          event.payload["execution_mode"] === "codex_exec"
      )
    ).toBe(true);
  });

  it("injects project secrets into delegation runtime_env for matching role bindings", async () => {
    await app.close();

    const executionCalls: Array<{ payload: Record<string, unknown> }> = [];
    const injectedExecutor: DelegationExecutor = {
      async execute(input) {
        executionCalls.push({ payload: input.payload });
        return {
          execution_mode: "mock",
          result_summary: "ok",
          output_text: "ok"
        };
      }
    };

    app = await createApp({
      config,
      persistence,
      publisher,
      storage,
      delegationExecutor: injectedExecutor,
      authProfileRateLimitsReader
    });
    await app.ready();

    const template = await persistence.createAgentTemplate({
      name: "secret-runtime-template",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "You are helper",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });

    const task = await persistence.createTask({
      title: "Secret runtime env task",
      description: "Check runtime env injection",
      project_id: "proj-memory",
      repo_id: "repo-memory",
      branch: null,
      priority: 100,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });

    const createSecretResponse = await app.inject({
      method: "POST",
      url: "/api/projects/proj-memory/secrets",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        key: "OPENAI_API_KEY",
        value: "sk-runtime-secret-12345",
        bind_roles: ["reviewer"]
      }
    });
    expect(createSecretResponse.statusCode).toBe(201);

    const dispatchResponse = await app.inject({
      method: "POST",
      url: "/api/delegation/dispatch",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-secret-runtime-env-1" },
      payload: {
        requester_task_id: task.id,
        capability: "reviewer",
        target_selector: { role: "reviewer", agent_template_id: template.id },
        payload: { prompt: "Runtime env secret check", execution_mode: "mock" },
        priority: 80
      }
    });

    expect(dispatchResponse.statusCode).toBe(202);
    expect(executionCalls).toHaveLength(1);
    const firstPayload = executionCalls[0]?.payload ?? {};
    const runtimeEnv = firstPayload["runtime_env"] as Record<string, string>;
    const secretContext = firstPayload["secrets_context"] as {
      injected_count?: number;
      injected_keys?: string[];
    };
    expect(runtimeEnv["OPENAI_API_KEY"]).toBe("sk-runtime-secret-12345");
    expect(secretContext.injected_count).toBe(1);
    expect(secretContext.injected_keys).toEqual(["OPENAI_API_KEY"]);
  });

  it("redacts runtime secret values from completed delegation logs and metadata", async () => {
    await app.close();

    const leakedSecret = "sk-runtime-redact-7777";
    const injectedExecutor: DelegationExecutor = {
      async execute(input) {
        const runtimeEnv = input.payload["runtime_env"] as Record<string, string> | undefined;
        const runtimeSecret = runtimeEnv?.["OPENAI_API_KEY"] ?? leakedSecret;
        return {
          execution_mode: "codex_exec",
          result_summary: `summary with ${runtimeSecret}`,
          output_text: `stdout with ${runtimeSecret}`,
          metadata: {
            nested: {
              note: `metadata with ${runtimeSecret}`
            }
          }
        };
      }
    };

    app = await createApp({
      config,
      persistence,
      publisher,
      storage,
      delegationExecutor: injectedExecutor,
      authProfileRateLimitsReader
    });
    await app.ready();

    const template = await persistence.createAgentTemplate({
      name: "secret-redaction-template",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "You are helper",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });

    const task = await persistence.createTask({
      title: "Secret redaction task",
      description: "Check redaction",
      project_id: "proj-memory",
      repo_id: "repo-memory",
      branch: null,
      priority: 100,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });

    const createSecretResponse = await app.inject({
      method: "POST",
      url: "/api/projects/proj-memory/secrets",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        key: "OPENAI_API_KEY",
        value: leakedSecret,
        bind_roles: ["reviewer"]
      }
    });
    expect(createSecretResponse.statusCode).toBe(201);

    const dispatchResponse = await app.inject({
      method: "POST",
      url: "/api/delegation/dispatch",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-secret-redaction-completed-1" },
      payload: {
        requester_task_id: task.id,
        capability: "reviewer",
        target_selector: { role: "reviewer", agent_template_id: template.id },
        payload: { prompt: "Check secret redaction", execution_mode: "mock" },
        priority: 80
      }
    });

    expect(dispatchResponse.statusCode).toBe(202);
    expect(dispatchResponse.json().status).toBe("completed");
    expect(dispatchResponse.json().result_summary).not.toContain(leakedSecret);
    expect(dispatchResponse.json().result_summary).toContain("[REDACTED_SECRET]");
    expect(dispatchResponse.json().execution_log).not.toContain(leakedSecret);
    expect(dispatchResponse.json().execution_log).toContain("[REDACTED_SECRET]");
    const metaSerialized = JSON.stringify(dispatchResponse.json().execution_meta_json);
    expect(metaSerialized).not.toContain(leakedSecret);
    expect(metaSerialized).toContain("[REDACTED_SECRET]");
  });

  it("redacts runtime secret values from failed delegation errors", async () => {
    await app.close();

    const leakedSecret = "sk-runtime-redact-fail-8888";
    const injectedExecutor: DelegationExecutor = {
      async execute(input) {
        const runtimeEnv = input.payload["runtime_env"] as Record<string, string> | undefined;
        const runtimeSecret = runtimeEnv?.["OPENAI_API_KEY"] ?? leakedSecret;
        const error = new Error(`Executor failed with ${runtimeSecret}`) as Error & {
          code: "EXECUTION_FAILED";
        };
        error.code = "EXECUTION_FAILED";
        throw error;
      }
    };

    app = await createApp({
      config,
      persistence,
      publisher,
      storage,
      delegationExecutor: injectedExecutor,
      authProfileRateLimitsReader
    });
    await app.ready();

    const template = await persistence.createAgentTemplate({
      name: "secret-redaction-fail-template",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "You are helper",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });

    const task = await persistence.createTask({
      title: "Secret redaction fail task",
      description: "Check failed redaction",
      project_id: "proj-memory",
      repo_id: "repo-memory",
      branch: null,
      priority: 100,
      status: "NEW",
      source: "api",
      created_by: "admin"
    });

    const createSecretResponse = await app.inject({
      method: "POST",
      url: "/api/projects/proj-memory/secrets",
      headers: { "x-admin-token": config.adminToken },
      payload: {
        key: "OPENAI_API_KEY",
        value: leakedSecret,
        bind_roles: ["reviewer"]
      }
    });
    expect(createSecretResponse.statusCode).toBe(201);

    const dispatchResponse = await app.inject({
      method: "POST",
      url: "/api/delegation/dispatch",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-secret-redaction-failed-1" },
      payload: {
        requester_task_id: task.id,
        capability: "reviewer",
        target_selector: { role: "reviewer", agent_template_id: template.id },
        payload: { prompt: "Check failed secret redaction", execution_mode: "mock" },
        priority: 80
      }
    });

    expect(dispatchResponse.statusCode).toBe(202);
    expect(dispatchResponse.json().status).toBe("failed");
    expect(dispatchResponse.json().result_summary).not.toContain(leakedSecret);
    expect(dispatchResponse.json().result_summary).toContain("[REDACTED_SECRET]");
    expect(dispatchResponse.json().execution_log).not.toContain(leakedSecret);
    expect(dispatchResponse.json().execution_log).toContain("[REDACTED_SECRET]");
  });

  it("marks delegation failed for terminal AUTH_PROFILE_REQUIRED executor error", async () => {
    await app.close();

    const injectedExecutor: DelegationExecutor = {
      async execute() {
        const error = new Error("Active auth profile is required for codex execution") as Error & {
          code: "AUTH_PROFILE_REQUIRED";
        };
        error.code = "AUTH_PROFILE_REQUIRED";
        throw error;
      }
    };

    app = await createApp({
      config,
      persistence,
      publisher,
      storage,
      delegationExecutor: injectedExecutor,
      authProfileRateLimitsReader
    });
    await app.ready();

    await persistence.createAgentTemplate({
      name: "executor-template",
      role: "reviewer",
      model: "gpt-5",
      system_prompt: "You are helper",
      sandbox_policy: "workspace-write",
      approval_policy: "never"
    });

    const dispatchResponse = await app.inject({
      method: "POST",
      url: "/api/delegation/dispatch",
      headers: { "x-admin-token": config.adminToken, "x-trace-id": "trace-delegation-auth-required-1" },
      payload: {
        requester_task_id: "task-1",
        requester_task_run_id: "run-1",
        capability: "reviewer",
        target_selector: { role: "reviewer" },
        payload: { prompt: "Run executor path" },
        priority: 77
      }
    });

    expect(dispatchResponse.statusCode).toBe(202);
    expect(dispatchResponse.json().status).toBe("failed");
    expect(dispatchResponse.json().result_summary).toContain("Active auth profile is required");

    const failedEvent = publisher.events.find(
      (event) =>
        event.eventType === "agent.delegation.failed" &&
        event.payload["reason"] === "auth_profile_required"
    );
    expect(failedEvent).toBeDefined();
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
      storage,
      authProfileRateLimitsReader
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
      storage,
      authProfileRateLimitsReader
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
      storage,
      authProfileRateLimitsReader
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

  it("filters switch-events by profile/status/limit", async () => {
    persistence.switchEvents.push(
      {
        id: "switch-1",
        module_key: SWITCH_MODULE_KEY,
        from_auth_profile_id: "profile-a",
        to_auth_profile_id: "profile-b",
        reason: "manual_activate",
        status: "completed",
        started_at: new Date("2026-01-01T00:01:00.000Z"),
        ended_at: new Date("2026-01-01T00:02:00.000Z")
      },
      {
        id: "switch-2",
        module_key: SWITCH_MODULE_KEY,
        from_auth_profile_id: "profile-c",
        to_auth_profile_id: "profile-a",
        reason: "manual_deactivate",
        status: "failed",
        started_at: new Date("2026-01-02T00:01:00.000Z"),
        ended_at: new Date("2026-01-02T00:02:00.000Z")
      },
      {
        id: "switch-3",
        module_key: SWITCH_MODULE_KEY,
        from_auth_profile_id: "profile-c",
        to_auth_profile_id: "profile-d",
        reason: "manual_deactivate",
        status: "failed",
        started_at: new Date("2026-01-03T00:01:00.000Z"),
        ended_at: new Date("2026-01-03T00:02:00.000Z")
      }
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/auth-profiles/chatgpt/switch-events?profile_id=profile-a&status=failed&limit=1",
      headers: { "x-admin-token": config.adminToken }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items).toHaveLength(1);
    expect(response.json().items[0].id).toBe("switch-2");
  });

  it("validates switch-events filter query", async () => {
    const invalidStatus = await app.inject({
      method: "GET",
      url: "/api/auth-profiles/chatgpt/switch-events?status=unknown",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(invalidStatus.statusCode).toBe(400);
    expect(invalidStatus.json().code).toBe("VALIDATION_ERROR");

    const invalidLimit = await app.inject({
      method: "GET",
      url: "/api/auth-profiles/chatgpt/switch-events?limit=0",
      headers: { "x-admin-token": config.adminToken }
    });
    expect(invalidLimit.statusCode).toBe(400);
    expect(invalidLimit.json().code).toBe("VALIDATION_ERROR");
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
