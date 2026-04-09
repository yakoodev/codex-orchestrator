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

export interface ProjectEntity {
  id: string;
  key: string;
  name: string;
  description: string | null;
  github_url: string | null;
  github_repo: string | null;
  default_branch: string | null;
  workspace_path: string | null;
  meta_json: Record<string, unknown> | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectSummaryEntity {
  project: ProjectEntity;
  tasks_total: number;
  tasks_by_status: Partial<Record<TaskStatus, number>>;
  active_memory_entries: number;
  switch_events_recent: number;
  switch_events_window_hours: number;
  last_switch_event_at: Date | null;
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

export interface ActiveAuthProfileRuntimeEntity {
  id: string;
  label: string;
  status: "active";
  checksum: string;
  storage_path: string;
}

export interface AuthProfileRuntimeEntity {
  id: string;
  label: string;
  status: "active" | "inactive" | "blocked";
  checksum: string;
  storage_path: string;
}

export interface RateLimitWindowSnapshot {
  used_percent: number | null;
  remaining_percent: number | null;
  window_minutes: number | null;
  resets_at_unix: number | null;
  resets_at_utc: string | null;
  reset_after_seconds: number | null;
}

export interface RateLimitCreditsSnapshot {
  has_credits: boolean;
  unlimited: boolean;
  balance: string | null;
}

export interface RateLimitSnapshot {
  source: "openai_app_server_rpc";
  captured_at: string;
  limit_id: string | null;
  limit_name: string | null;
  plan_type: string | null;
  primary: RateLimitWindowSnapshot | null;
  secondary: RateLimitWindowSnapshot | null;
  credits: RateLimitCreditsSnapshot | null;
}

export interface AuthProfileRateLimitsReadResult {
  profile: {
    id: string;
    label: string;
    status: "active" | "inactive" | "blocked";
    checksum: string;
  };
  rate_limits: RateLimitSnapshot;
  rate_limits_by_limit_id: Record<string, RateLimitSnapshot> | null;
}

export interface AuthProfileRateLimitsReader {
  readByProfileId(profileId: string): Promise<AuthProfileRateLimitsReadResult | null>;
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

export interface CreateAuthSwitchEventInput {
  module_key: string;
  from_auth_profile_id?: string | null;
  to_auth_profile_id?: string | null;
  reason: string;
  status: AuthSwitchEventEntity["status"];
  switch_scope?: string;
  details_json?: Record<string, unknown> | null;
  started_at?: Date;
  ended_at?: Date | null;
}

export interface ListAuthSwitchEventsOptions {
  profile_id?: string;
  status?: AuthSwitchEventEntity["status"];
  reason?: string;
  limit?: number;
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
  trace_id: string;
  idempotency_key: string | null;
  details_json: Record<string, unknown> | null;
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

export type InterventionType =
  | "steer"
  | "interrupt"
  | "pause"
  | "resume"
  | "replan"
  | "approve"
  | "reject";

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
  input_prompt: string | null;
  selected_auth_profile_id: string | null;
  execution_mode: string | null;
  execution_log: string | null;
  execution_meta_json: Record<string, unknown> | null;
  trace_id: string;
  created_at: Date;
  started_at: Date | null;
  ended_at: Date | null;
}

export interface AgentMemoryEntryEntity {
  id: string;
  project_id: string;
  agent_role: string;
  title: string;
  content: string;
  is_active: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export type AgentRequestType =
  | "mcp_server_attach"
  | "mcp_tool_acl"
  | "script_set"
  | "runtime_dependency"
  | "other";

export type AgentRequestStatus =
  | "open"
  | "in_progress"
  | "resolved_by_agent"
  | "blocked_agent"
  | "resolved_manual"
  | "rejected_manual";

export interface AgentRequestEntity {
  id: string;
  type: AgentRequestType;
  status: AgentRequestStatus;
  priority: number;
  project_id: string;
  task_id: string;
  agent_run_id: string | null;
  agent_profile_id: string | null;
  agent_template_id: string | null;
  requested_by_agent_id: string | null;
  title: string;
  reason: string;
  request_payload_json: Record<string, unknown> | null;
  resolution_payload_json: Record<string, unknown> | null;
  claimed_by_governor_id: string | null;
  resolved_by: string | null;
  resolved_at: Date | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export type AgentProfileSourcePolicy = "catalog_only" | "catalog_plus_custom" | "custom_only";
export type McpServerTransport = "stdio" | "http";
export type McpServerOriginType = "built_in" | "catalog" | "custom";
export type AgentProfileScriptOs = "windows" | "linux" | "macos";
export type AgentProfileScriptType = "instruction" | "shell";

export interface AgentProfileEntity {
  id: string;
  project_id: string;
  name: string;
  role: string;
  description: string | null;
  source_policy: AgentProfileSourcePolicy;
  is_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface McpServerRegistryEntity {
  id: string;
  name: string;
  transport: McpServerTransport;
  endpoint_or_command: string;
  origin_type: McpServerOriginType;
  is_approved: boolean;
  meta_json: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface AgentProfileMcpServerBindingEntity {
  id: string;
  agent_profile_id: string;
  mcp_server_id: string;
  is_required: boolean;
  priority: number;
  config_json: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface AgentProfileScriptSetEntity {
  id: string;
  agent_profile_id: string;
  os: AgentProfileScriptOs;
  script_type: AgentProfileScriptType;
  content: string;
  version: number;
  created_at: Date;
  updated_at: Date;
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

export interface CreateProjectInput {
  key: string;
  name: string;
  description?: string | null;
  github_url?: string | null;
  github_repo?: string | null;
  default_branch?: string | null;
  workspace_path?: string | null;
  meta_json?: Record<string, unknown> | null;
  is_active?: boolean;
}

export interface CreateInterventionInput {
  task_id: string;
  task_run_id?: string | null;
  source: string;
  type: InterventionType;
  payload?: Record<string, unknown> | null;
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
  input_prompt?: string | null;
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

export interface CreateAgentMemoryEntryInput {
  project_id: string;
  agent_role: string;
  title: string;
  content: string;
  is_active?: boolean;
  created_by: string;
}

export interface CreateAgentRequestInput {
  type: AgentRequestType;
  priority?: number;
  project_id: string;
  task_id: string;
  agent_run_id?: string | null;
  agent_profile_id?: string | null;
  agent_template_id?: string | null;
  requested_by_agent_id?: string | null;
  title: string;
  reason: string;
  request_payload_json?: Record<string, unknown> | null;
  created_by: string;
}

export interface CreateAgentProfileInput {
  project_id: string;
  name: string;
  role: string;
  description?: string | null;
  source_policy?: AgentProfileSourcePolicy;
  is_enabled?: boolean;
}

export interface CreateMcpServerRegistryInput {
  name: string;
  transport: McpServerTransport;
  endpoint_or_command: string;
  origin_type: McpServerOriginType;
  is_approved?: boolean;
  meta_json?: Record<string, unknown> | null;
}

export interface CreateModuleExecutionInput {
  module_key: string;
  event_type: string;
  status: "started" | "completed" | "failed";
  trace_id: string;
  idempotency_key?: string | null;
  details_json?: Record<string, unknown> | null;
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

export interface DelegationExecutionInput {
  delegation_id: string;
  trace_id: string;
  requester_task_id: string;
  capability: string;
  payload: Record<string, unknown>;
  target_template: Pick<AgentTemplateEntity, "id" | "role" | "model">;
}

export interface DelegationExecutionResult {
  execution_mode: "mock" | "codex_exec";
  result_summary: string;
  output_text: string;
  metadata?: Record<string, unknown>;
}

export interface DelegationExecutionError extends Error {
  code: "TIMEOUT" | "AUTH_PROFILE_REQUIRED" | "EXECUTION_FAILED";
}

export interface DelegationExecutor {
  execute(input: DelegationExecutionInput): Promise<DelegationExecutionResult>;
}

export interface Persistence {
  pingDb(): Promise<void>;
  createProject(input: CreateProjectInput): Promise<ProjectEntity>;
  listProjects(options?: { include_inactive?: boolean }): Promise<ProjectEntity[]>;
  getProjectByKey(key: string): Promise<ProjectEntity | null>;
  patchProject(
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
  ): Promise<ProjectEntity | null>;
  getProjectSummaryByKey(
    key: string,
    options?: { switch_events_window_hours?: number }
  ): Promise<ProjectSummaryEntity | null>;
  createTask(input: CreateTaskInput): Promise<TaskEntity>;
  listTasks(status?: TaskStatus): Promise<TaskEntity[]>;
  getTaskById(id: string): Promise<TaskEntity | null>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<TaskEntity | null>;
  createIntervention(input: CreateInterventionInput): Promise<boolean>;
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
  listDelegationRequests(options?: {
    statuses?: DelegationRequestEntity["status"][];
    limit?: number;
  }): Promise<DelegationRequestEntity[]>;
  createAgentMemoryEntry(input: CreateAgentMemoryEntryInput): Promise<AgentMemoryEntryEntity>;
  listAgentMemoryEntries(options?: {
    project_id?: string;
    agent_role?: string;
    is_active?: boolean;
    limit?: number;
  }): Promise<AgentMemoryEntryEntity[]>;
  createAgentProfile(input: CreateAgentProfileInput): Promise<AgentProfileEntity>;
  listAgentProfiles(options?: {
    project_id?: string;
    include_disabled?: boolean;
    role?: string;
    limit?: number;
  }): Promise<AgentProfileEntity[]>;
  getAgentProfileById(id: string): Promise<AgentProfileEntity | null>;
  patchAgentProfile(
    id: string,
    patch: {
      name?: string;
      role?: string;
      description?: string | null;
      source_policy?: AgentProfileSourcePolicy;
      is_enabled?: boolean;
    }
  ): Promise<AgentProfileEntity | null>;
  createMcpServerRegistryEntry(input: CreateMcpServerRegistryInput): Promise<McpServerRegistryEntity>;
  listMcpServerRegistry(options?: { include_unapproved?: boolean }): Promise<McpServerRegistryEntity[]>;
  getMcpServerRegistryById(id: string): Promise<McpServerRegistryEntity | null>;
  ensureOrchestratorMcpServer(): Promise<McpServerRegistryEntity>;
  bindMcpServerToAgentProfile(
    profileId: string,
    serverId: string,
    options?: {
      is_required?: boolean;
      priority?: number;
      config_json?: Record<string, unknown> | null;
    }
  ): Promise<AgentProfileMcpServerBindingEntity | null>;
  unbindMcpServerFromAgentProfile(profileId: string, serverId: string): Promise<boolean>;
  listAgentProfileMcpBindings(profileId: string): Promise<AgentProfileMcpServerBindingEntity[]>;
  upsertAgentProfileScriptSet(
    profileId: string,
    input: {
      os: AgentProfileScriptOs;
      script_type: AgentProfileScriptType;
      content: string;
    }
  ): Promise<AgentProfileScriptSetEntity | null>;
  listAgentProfileScriptSets(profileId: string): Promise<AgentProfileScriptSetEntity[]>;
  createAgentRequest(input: CreateAgentRequestInput): Promise<AgentRequestEntity>;
  listAgentRequests(options?: {
    project_id?: string;
    task_id?: string;
    agent_profile_id?: string;
    agent_template_id?: string;
    type?: AgentRequestType;
    statuses?: AgentRequestStatus[];
    limit?: number;
  }): Promise<AgentRequestEntity[]>;
  getAgentRequestById(id: string): Promise<AgentRequestEntity | null>;
  resolveAgentRequest(
    id: string,
    input: {
      status: AgentRequestStatus;
      resolution_payload_json?: Record<string, unknown> | null;
      claimed_by_governor_id?: string | null;
      resolved_by?: string | null;
      resolved_at?: Date | null;
    }
  ): Promise<AgentRequestEntity | null>;
  patchAgentMemoryEntry(
    id: string,
    patch: {
      title?: string;
      content?: string;
      is_active?: boolean;
      updated_by: string;
    }
  ): Promise<AgentMemoryEntryEntity | null>;
  updateDelegationRequest(
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
  ): Promise<DelegationRequestEntity | null>;
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
  getScheduledRunByIdempotency(
    ruleId: string,
    idempotencyKey: string
  ): Promise<ScheduledRunEntity | null>;
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
  getActiveAuthProfileRuntime(): Promise<ActiveAuthProfileRuntimeEntity | null>;
  getAuthProfileRuntimeById(id: string): Promise<AuthProfileRuntimeEntity | null>;
  activateAuthProfile(id: string, activatedBy: string): Promise<AuthProfileEntity | null>;
  deactivateAuthProfile(id: string): Promise<boolean>;
  createAuthSwitchEvent(input: CreateAuthSwitchEventInput): Promise<AuthSwitchEventEntity>;
  listAuthSwitchEvents(options?: ListAuthSwitchEventsOptions): Promise<AuthSwitchEventEntity[]>;
  listHeldTasks(): Promise<TaskEntity[]>;
  listCustomModuleConfigs(): Promise<CustomModuleConfigEntity[]>;
  getCustomModuleConfig(key: string): Promise<CustomModuleConfigEntity | null>;
  listModuleExecutions(moduleKey: string): Promise<ModuleExecutionEntity[]>;
  getModuleExecutionByIdempotency(
    moduleKey: string,
    idempotencyKey: string
  ): Promise<ModuleExecutionEntity | null>;
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
  getObject(key: string): Promise<Buffer>;
  checkReady(): Promise<void>;
  ensureBucket(): Promise<void>;
}

export interface EventPublisher {
  ping(): Promise<void>;
  publish(event: EventPublishInput): Promise<void>;
}
