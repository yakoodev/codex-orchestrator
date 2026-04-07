import type { TaskStatus } from "../types";

export interface TaskEntity {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  project_id: string;
  repo_id: string;
  branch: string | null;
}

export type AuthContextType = "apikey" | "chatgpt" | "chatgptAuthTokens";
export type WorkerRuntimeMode = "ondemand" | "warm_pool" | "dedicated";

export interface AuthProfileEntity {
  id: string;
  label: string;
  status: "active" | "inactive" | "blocked";
  checksum: string;
  created_at: Date;
}

export interface AuthSwitchEventEntity {
  id: string;
  module_key: string;
  from_auth_profile_id: string | null;
  to_auth_profile_id: string | null;
  reason: string;
  status: "started" | "completed" | "failed" | "skipped";
  started_at: Date;
  ended_at: Date | null;
}

export interface CustomModuleConfigEntity {
  id: string;
  module_key: string;
  is_enabled: boolean;
  scope: string;
  config_json: Record<string, unknown>;
}

export interface ModuleExecutionEntity {
  id: string;
  module_key: string;
  event_type: string;
  status: "started" | "completed" | "failed";
  started_at: Date;
  ended_at: Date | null;
}

export interface AuthContextEntity {
  id: string;
  label: string;
  type: AuthContextType;
  is_enabled: boolean;
}

export interface WorkerEntity {
  id: string;
  status: string;
  runtime_mode: WorkerRuntimeMode;
  current_task_id: string | null;
}

export interface ArtifactEntity {
  id: string;
  task_id: string;
  type: "diff" | "patch" | "log" | "test_report" | "screenshot" | "summary" | "trace";
  path: string;
}

export interface AgentTemplateEntity {
  id: string;
  name: string;
  role: string;
  model: string;
  auth_context_id: string | null;
  pack_registry_entry_id: string | null;
  sandbox_policy: string;
  approval_policy: string;
  is_enabled: boolean;
}

export interface PackRegistryEntity {
  id: string;
  pack_id: string;
  role: string;
  capabilities_json: Record<string, unknown>;
  source_type: "git" | "zip";
  source_ref: string;
  pinned_version: string;
  manifest_json: Record<string, unknown>;
  materialize_status: "registered" | "materialized" | "failed";
  cached_path: string | null;
  is_enabled: boolean;
  registered_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface DelegationRequestEntity {
  id: string;
  requester_task_id: string;
  requester_task_run_id: string | null;
  capability: string;
  target_selector: Record<string, unknown>;
  payload: Record<string, unknown>;
  priority: number;
  status: "requested" | "accepted" | "running" | "completed" | "failed" | "cancelled";
  target_agent_template_id: string | null;
  target_worker_instance_id: string | null;
  result_summary: string | null;
  trace_id: string;
  created_at: Date;
  started_at: Date | null;
  ended_at: Date | null;
}

export type ScheduleScope = "global" | "project";
export type ScheduleOverlapPolicy = "one_active_skip";
export type ScheduleMisfirePolicy = "recompute_due_on_restart";
export type ScheduledRunStatus = "started" | "completed" | "failed" | "skipped_due_to_overlap";

export interface ScheduledRuleEntity {
  id: string;
  name: string;
  scope: ScheduleScope;
  project_id: string | null;
  is_enabled: boolean;
  rule_ast: Record<string, unknown>;
  target_agent_template_id: string | null;
  fallback_role: string | null;
  overlap_policy: ScheduleOverlapPolicy;
  misfire_policy: ScheduleMisfirePolicy;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ScheduledRunEntity {
  id: string;
  rule_id: string;
  created_task_id: string | null;
  status: ScheduledRunStatus;
  started_at: Date;
  ended_at: Date | null;
  skip_reason: string | null;
  trace_id: string;
  idempotency_key: string | null;
  result_json: Record<string, unknown> | null;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  project_id: string;
  repo_id: string;
  branch: string | null;
  priority: number;
  status: TaskStatus;
  source: string;
  created_by: string;
}

export interface CreateAuthProfileInput {
  label: string;
  status: "active" | "inactive" | "blocked";
  checksum: string;
  storage_path: string;
  meta_json: Record<string, unknown>;
  uploaded_by: string;
}

export interface CreateAuthContextInput {
  label: string;
  type: AuthContextType;
  provider: string;
  usage_policy?: Record<string, unknown>;
  limit_policy?: Record<string, unknown>;
}

export interface CreateAgentTemplateInput {
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
}

export interface CreatePackRegistryInput {
  pack_id: string;
  role: string;
  capabilities_json: Record<string, unknown>;
  source_type: "git" | "zip";
  source_ref: string;
  pinned_version: string;
  manifest_json: Record<string, unknown>;
}

export interface CreateDelegationRequestInput {
  requester_task_id: string;
  requester_task_run_id?: string | null;
  capability: string;
  target_selector: Record<string, unknown>;
  payload: Record<string, unknown>;
  priority?: number;
  trace_id: string;
}

export interface CreateScheduledRuleInput {
  name: string;
  scope: ScheduleScope;
  project_id?: string | null;
  rule_ast: Record<string, unknown>;
  target_agent_template_id?: string | null;
  fallback_role?: string | null;
  overlap_policy: ScheduleOverlapPolicy;
  misfire_policy: ScheduleMisfirePolicy;
  created_by: string;
}

export interface CreateScheduledRunInput {
  rule_id: string;
  created_task_id?: string | null;
  status: ScheduledRunStatus;
  started_at?: Date;
  ended_at?: Date | null;
  skip_reason?: string | null;
  trace_id: string;
  idempotency_key?: string | null;
  result_json?: Record<string, unknown> | null;
}

export interface CreateModuleExecutionInput {
  module_key: string;
  event_type: string;
  status: "started" | "completed" | "failed";
  started_at?: Date;
  ended_at?: Date | null;
}

export interface EventPublishInput {
  eventType: string;
  traceId: string;
  payload: Record<string, unknown>;
  taskId?: string | null;
  workerId?: string | null;
  idempotencyKey?: string | null;
}

export interface Persistence {
  pingDb(): Promise<void>;
  createTask(input: CreateTaskInput): Promise<TaskEntity>;
  listTasks(status?: TaskStatus): Promise<TaskEntity[]>;
  getTaskById(id: string): Promise<TaskEntity | null>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<TaskEntity | null>;
  releaseHeldQueue(): Promise<number>;
  createAgentTemplate(input: CreateAgentTemplateInput): Promise<AgentTemplateEntity>;
  listAgentTemplates(): Promise<AgentTemplateEntity[]>;
  patchAgentTemplate(
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
  ): Promise<AgentTemplateEntity | null>;
  deleteAgentTemplate(id: string): Promise<boolean>;
  createPack(input: CreatePackRegistryInput, registeredBy: string): Promise<PackRegistryEntity>;
  listPacks(): Promise<PackRegistryEntity[]>;
  getPackById(id: string): Promise<PackRegistryEntity | null>;
  patchPack(
    id: string,
    patch: {
      pinned_version?: string;
      is_enabled?: boolean;
      source_ref?: string;
    }
  ): Promise<PackRegistryEntity | null>;
  materializePack(id: string): Promise<boolean>;
  createDelegationRequest(input: CreateDelegationRequestInput): Promise<DelegationRequestEntity>;
  getDelegationRequest(id: string): Promise<DelegationRequestEntity | null>;
  createScheduledRule(input: CreateScheduledRuleInput): Promise<ScheduledRuleEntity>;
  listScheduledRules(): Promise<ScheduledRuleEntity[]>;
  getScheduledRuleById(id: string): Promise<ScheduledRuleEntity | null>;
  patchScheduledRule(
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
  ): Promise<ScheduledRuleEntity | null>;
  deleteScheduledRule(id: string): Promise<boolean>;
  setScheduledRuleEnabled(id: string, isEnabled: boolean): Promise<boolean>;
  createScheduledRun(input: CreateScheduledRunInput): Promise<ScheduledRunEntity>;
  getActiveScheduledRun(ruleId: string): Promise<ScheduledRunEntity | null>;
  listScheduledRuns(ruleId: string): Promise<ScheduledRunEntity[]>;
  listWorkers(): Promise<WorkerEntity[]>;
  setWorkerStatus(id: string, status: "READY" | "DISABLED"): Promise<boolean>;
  workerExists(id: string): Promise<boolean>;
  getWorkerLogs(id: string): Promise<string[]>;
  createAuthContext(input: CreateAuthContextInput): Promise<AuthContextEntity>;
  listAuthContexts(): Promise<AuthContextEntity[]>;
  patchAuthContext(
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
  ): Promise<AuthContextEntity | null>;
  disableAuthContext(id: string): Promise<boolean>;
  listTaskArtifacts(taskId: string): Promise<ArtifactEntity[]>;
  getArtifactById(id: string): Promise<ArtifactEntity | null>;
  createAuthProfile(input: CreateAuthProfileInput): Promise<AuthProfileEntity>;
  listAuthProfiles(): Promise<AuthProfileEntity[]>;
  getActiveAuthProfile(): Promise<AuthProfileEntity | null>;
  activateAuthProfile(id: string, activatedBy: string): Promise<AuthProfileEntity | null>;
  deactivateAuthProfile(id: string): Promise<boolean>;
  listAuthSwitchEvents(): Promise<AuthSwitchEventEntity[]>;
  listHeldTasks(): Promise<TaskEntity[]>;
  listCustomModuleConfigs(): Promise<CustomModuleConfigEntity[]>;
  getCustomModuleConfig(key: string): Promise<CustomModuleConfigEntity | null>;
  listModuleExecutions(moduleKey: string): Promise<ModuleExecutionEntity[]>;
  createModuleExecution(input: CreateModuleExecutionInput): Promise<ModuleExecutionEntity>;
  createCustomModuleConfig(input: {
    module_key: string;
    is_enabled: boolean;
    scope: string;
    config_json: Record<string, unknown>;
    updated_by: string;
  }): Promise<CustomModuleConfigEntity>;
  updateCustomModuleConfig(
    key: string,
    patch: {
      is_enabled?: boolean;
      config_json?: Record<string, unknown>;
      updated_by: string;
    }
  ): Promise<CustomModuleConfigEntity | null>;
}

export interface StorageService {
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  checkReady(): Promise<void>;
  ensureBucket(): Promise<void>;
}

export interface EventPublisher {
  ping(): Promise<void>;
  publish(event: EventPublishInput): Promise<void>;
}
