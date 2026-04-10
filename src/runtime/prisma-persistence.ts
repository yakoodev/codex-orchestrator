import { randomBytes } from "node:crypto";
import {
  AgentProfileScriptOs as PrismaAgentProfileScriptOs,
  AgentProfileScriptType as PrismaAgentProfileScriptType,
  AgentProfileSourcePolicy as PrismaAgentProfileSourcePolicy,
  AgentRequestStatus as PrismaAgentRequestStatus,
  AgentRequestType as PrismaAgentRequestType,
  AuthContextType as PrismaAuthContextType,
  ArtifactType as PrismaArtifactType,
  DelegationStatus as PrismaDelegationStatus,
  InterventionType as PrismaInterventionType,
  McpApiKeyStatus as PrismaMcpApiKeyStatus,
  McpKeyAclEffect as PrismaMcpKeyAclEffect,
  ModuleExecutionStatus as PrismaModuleExecutionStatus,
  McpServerOriginType as PrismaMcpServerOriginType,
  McpServerTransport as PrismaMcpServerTransport,
  Prisma,
  PrismaClient,
  ProfileStatus,
  ScheduleMisfirePolicy as PrismaScheduleMisfirePolicy,
  ScheduleOverlapPolicy as PrismaScheduleOverlapPolicy,
  ScheduleScope as PrismaScheduleScope,
  ScheduledRunStatus as PrismaScheduledRunStatus,
  SwitchEventStatus as PrismaSwitchEventStatus,
  TaskStatus as PrismaTaskStatus,
  WorkerRuntimeMode as PrismaWorkerRuntimeMode
} from "@prisma/client";
import type {
  ActiveAuthProfileRuntimeEntity,
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
  AuthProfileEntity,
  AuthSwitchEventEntity,
  CreateProjectInput,
  CreateProjectSecretInput,
  CreateAgentProfileInput,
  CreateAgentRequestAuditEventInput,
  CreateAgentRequestInput,
  CreateAgentMemoryEntryInput,
  CreateAuthProfileInput,
  CreateAuthSwitchEventInput,
  CreateAgentTemplateInput,
  CreateAuthContextInput,
  CreateDelegationRequestInput,
  CreateInterventionInput,
  CreateMcpAuthAuditEventInput,
  CreateMcpApiKeyInput,
  CreateSecretAuditEventInput,
  CreateModuleExecutionInput,
  CreateScheduledRuleInput,
  CreateScheduledRunInput,
  CreatePackRegistryInput,
  CreateMcpServerRegistryInput,
  CreateTaskInput,
  CustomModuleConfigEntity,
  DelegationRequestEntity,
  ListAuthSwitchEventsOptions,
  ModuleExecutionEntity,
  McpApiKeyEntity,
  McpApiKeyStatus,
  McpAuthAuditEventEntity,
  McpKeyAclRuleEntity,
  McpKeyProfileBindingEntity,
  McpKeyTemplateConstraintEntity,
  McpServerOriginType,
  McpServerRegistryEntity,
  McpServerTransport,
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
  ScheduleScope,
  SecretAuditEventEntity,
  ScheduledRunStatus,
  TaskEntity,
  WorkerEntity
} from "./contracts";
import type { TaskStatus } from "../types";

const AUTH_PROFILE_ID_SUFFIX_LENGTH = 5;
const AUTH_PROFILE_ID_MAX_BASE_LENGTH = 48;
const AUTH_PROFILE_ID_CREATE_ATTEMPTS = 8;

function normalizeAuthProfileIdBase(label: string): string {
  const normalized = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  const trimmed = normalized
    .slice(0, AUTH_PROFILE_ID_MAX_BASE_LENGTH)
    .replace(/-+$/g, "");
  return trimmed || "profile";
}

function randomAlphaNumeric(length: number): string {
  let value = "";
  while (value.length < length) {
    value += randomBytes(length)
      .toString("base64url")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }
  return value.slice(0, length);
}

function buildAuthProfileIdCandidate(label: string): string {
  return `${normalizeAuthProfileIdBase(label)}-${randomAlphaNumeric(AUTH_PROFILE_ID_SUFFIX_LENGTH)}`;
}

function toTaskEntity(task: {
  id: string;
  title: string;
  description: string;
  status: PrismaTaskStatus;
  priority: number;
  project_id: string;
  repo_id: string;
  branch: string | null;
}): TaskEntity {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as TaskStatus,
    priority: task.priority,
    project_id: task.project_id,
    repo_id: task.repo_id,
    branch: task.branch
  };
}

function toProjectEntity(entity: {
  id: string;
  key: string;
  name: string;
  description: string | null;
  github_url: string | null;
  github_repo: string | null;
  default_branch: string | null;
  workspace_path: string | null;
  meta_json: Prisma.JsonValue | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}): ProjectEntity {
  return {
    id: entity.id,
    key: entity.key,
    name: entity.name,
    description: entity.description,
    github_url: entity.github_url,
    github_repo: entity.github_repo,
    default_branch: entity.default_branch,
    workspace_path: entity.workspace_path,
    meta_json: entity.meta_json as Record<string, unknown> | null,
    is_active: entity.is_active,
    created_at: entity.created_at,
    updated_at: entity.updated_at
  };
}

function toProjectSecretEntity(entity: {
  id: string;
  project_id: string;
  key: string;
  description: string | null;
  masked_preview: string | null;
  is_active: boolean;
  ciphertext: string;
  dek_encrypted: string;
  dek_kms_key_id: string;
  algo: string;
  version: number;
  created_by: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  rotated_at: Date | null;
  revoked_at: Date | null;
}): ProjectSecretEntity {
  return {
    id: entity.id,
    project_id: entity.project_id,
    key: entity.key,
    description: entity.description,
    masked_preview: entity.masked_preview,
    is_active: entity.is_active,
    ciphertext: entity.ciphertext,
    dek_encrypted: entity.dek_encrypted,
    dek_kms_key_id: entity.dek_kms_key_id,
    algo: entity.algo,
    version: entity.version,
    created_by: entity.created_by,
    updated_by: entity.updated_by,
    created_at: entity.created_at,
    updated_at: entity.updated_at,
    rotated_at: entity.rotated_at,
    revoked_at: entity.revoked_at
  };
}

function toProjectSecretTemplateBindingEntity(entity: {
  id: string;
  secret_id: string;
  template_id: string;
  created_by: string;
  created_at: Date;
}): ProjectSecretTemplateBindingEntity {
  return {
    id: entity.id,
    secret_id: entity.secret_id,
    template_id: entity.template_id,
    created_by: entity.created_by,
    created_at: entity.created_at
  };
}

function toProjectSecretRoleBindingEntity(entity: {
  id: string;
  secret_id: string;
  role: string;
  created_by: string;
  created_at: Date;
}): ProjectSecretRoleBindingEntity {
  return {
    id: entity.id,
    secret_id: entity.secret_id,
    role: entity.role,
    created_by: entity.created_by,
    created_at: entity.created_at
  };
}

function toSecretAuditEventEntity(entity: {
  id: string;
  secret_id: string | null;
  project_id: string;
  event_type: string;
  actor: string;
  trace_id: string | null;
  metadata_json: Prisma.JsonValue | null;
  created_at: Date;
}): SecretAuditEventEntity {
  return {
    id: entity.id,
    secret_id: entity.secret_id,
    project_id: entity.project_id,
    event_type: entity.event_type,
    actor: entity.actor,
    trace_id: entity.trace_id,
    metadata_json: entity.metadata_json as Record<string, unknown> | null,
    created_at: entity.created_at
  };
}

function toAuthProfileEntity(entity: {
  id: string;
  label: string;
  status: ProfileStatus;
  checksum: string;
  created_at: Date;
}): AuthProfileEntity {
  return {
    id: entity.id,
    label: entity.label,
    status: entity.status,
    checksum: entity.checksum,
    created_at: entity.created_at
  };
}

function toAuthContextEntity(entity: {
  id: string;
  label: string;
  type: PrismaAuthContextType;
  is_enabled: boolean;
}): AuthContextEntity {
  return {
    id: entity.id,
    label: entity.label,
    type: entity.type as AuthContextType,
    is_enabled: entity.is_enabled
  };
}

function toWorkerEntity(entity: {
  id: string;
  status: string;
  runtime_mode: PrismaWorkerRuntimeMode;
  current_task_id: string | null;
}): WorkerEntity {
  return {
    id: entity.id,
    status: entity.status,
    runtime_mode: entity.runtime_mode,
    current_task_id: entity.current_task_id
  };
}

function toArtifactEntity(entity: {
  id: string;
  task_id: string;
  type: PrismaArtifactType;
  path: string;
}): ArtifactEntity {
  return {
    id: entity.id,
    task_id: entity.task_id,
    type: entity.type,
    path: entity.path
  };
}

function toAgentTemplateEntity(entity: {
  id: string;
  name: string;
  role: string;
  model: string;
  auth_context_id: string | null;
  pack_registry_entry_id: string | null;
  sandbox_policy: string;
  approval_policy: string;
  is_enabled: boolean;
}): AgentTemplateEntity {
  return {
    id: entity.id,
    name: entity.name,
    role: entity.role,
    model: entity.model,
    auth_context_id: entity.auth_context_id,
    pack_registry_entry_id: entity.pack_registry_entry_id,
    sandbox_policy: entity.sandbox_policy,
    approval_policy: entity.approval_policy,
    is_enabled: entity.is_enabled
  };
}

function toPackRegistryEntity(entity: {
  id: string;
  pack_id: string;
  role: string;
  capabilities_json: Prisma.JsonValue;
  source_type: "git" | "zip";
  source_ref: string;
  pinned_version: string;
  manifest_json: Prisma.JsonValue;
  materialize_status: "registered" | "materialized" | "failed";
  cached_path: string | null;
  is_enabled: boolean;
  registered_by: string;
  created_at: Date;
  updated_at: Date;
}): PackRegistryEntity {
  return {
    id: entity.id,
    pack_id: entity.pack_id,
    role: entity.role,
    capabilities_json: entity.capabilities_json as Record<string, unknown>,
    source_type: entity.source_type,
    source_ref: entity.source_ref,
    pinned_version: entity.pinned_version,
    manifest_json: entity.manifest_json as Record<string, unknown>,
    materialize_status: entity.materialize_status,
    cached_path: entity.cached_path,
    is_enabled: entity.is_enabled,
    registered_by: entity.registered_by,
    created_at: entity.created_at,
    updated_at: entity.updated_at
  };
}

function toDelegationRequestEntity(entity: {
  id: string;
  requester_task_id: string;
  requester_task_run_id: string | null;
  capability: string;
  target_selector_json: Prisma.JsonValue;
  payload_json: Prisma.JsonValue;
  priority: number;
  status: "requested" | "accepted" | "running" | "completed" | "failed" | "cancelled";
  target_agent_template_id: string | null;
  target_worker_instance_id: string | null;
  result_summary: string | null;
  input_prompt: string | null;
  selected_auth_profile_id: string | null;
  execution_mode: string | null;
  execution_log: string | null;
  execution_meta_json: Prisma.JsonValue | null;
  trace_id: string;
  created_at: Date;
  started_at: Date | null;
  ended_at: Date | null;
}): DelegationRequestEntity {
  return {
    id: entity.id,
    requester_task_id: entity.requester_task_id,
    requester_task_run_id: entity.requester_task_run_id,
    capability: entity.capability,
    target_selector: entity.target_selector_json as Record<string, unknown>,
    payload: entity.payload_json as Record<string, unknown>,
    priority: entity.priority,
    status: entity.status,
    target_agent_template_id: entity.target_agent_template_id,
    target_worker_instance_id: entity.target_worker_instance_id,
    result_summary: entity.result_summary,
    input_prompt: entity.input_prompt,
    selected_auth_profile_id: entity.selected_auth_profile_id,
    execution_mode: entity.execution_mode,
    execution_log: entity.execution_log,
    execution_meta_json: entity.execution_meta_json as Record<string, unknown> | null,
    trace_id: entity.trace_id,
    created_at: entity.created_at,
    started_at: entity.started_at,
    ended_at: entity.ended_at
  };
}

function toAgentMemoryEntryEntity(entity: {
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
}): AgentMemoryEntryEntity {
  return {
    id: entity.id,
    project_id: entity.project_id,
    agent_role: entity.agent_role,
    title: entity.title,
    content: entity.content,
    is_active: entity.is_active,
    created_by: entity.created_by,
    updated_by: entity.updated_by,
    created_at: entity.created_at,
    updated_at: entity.updated_at
  };
}

function toAgentRequestEntity(entity: {
  id: string;
  type: PrismaAgentRequestType;
  status: PrismaAgentRequestStatus;
  priority: number;
  project_id: string;
  task_id: string;
  agent_run_id: string | null;
  agent_profile_id: string | null;
  agent_template_id: string | null;
  requested_by_agent_id: string | null;
  title: string;
  reason: string;
  request_payload_json: Prisma.JsonValue | null;
  resolution_payload_json: Prisma.JsonValue | null;
  claimed_by_governor_id: string | null;
  resolved_by: string | null;
  resolved_at: Date | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}): AgentRequestEntity {
  return {
    id: entity.id,
    type: entity.type as AgentRequestType,
    status: entity.status as AgentRequestStatus,
    priority: entity.priority,
    project_id: entity.project_id,
    task_id: entity.task_id,
    agent_run_id: entity.agent_run_id,
    agent_profile_id: entity.agent_profile_id,
    agent_template_id: entity.agent_template_id,
    requested_by_agent_id: entity.requested_by_agent_id,
    title: entity.title,
    reason: entity.reason,
    request_payload_json: entity.request_payload_json as Record<string, unknown> | null,
    resolution_payload_json: entity.resolution_payload_json as Record<string, unknown> | null,
    claimed_by_governor_id: entity.claimed_by_governor_id,
    resolved_by: entity.resolved_by,
    resolved_at: entity.resolved_at,
    created_by: entity.created_by,
    created_at: entity.created_at,
    updated_at: entity.updated_at
  };
}

function toAgentRequestAuditEventEntity(entity: {
  id: string;
  request_id: string;
  event_type: string;
  from_status: PrismaAgentRequestStatus | null;
  to_status: PrismaAgentRequestStatus | null;
  actor_type: string;
  actor_id: string | null;
  trace_id: string | null;
  metadata_json: Prisma.JsonValue | null;
  created_at: Date;
}): AgentRequestAuditEventEntity {
  return {
    id: entity.id,
    request_id: entity.request_id,
    event_type: entity.event_type,
    from_status: entity.from_status as AgentRequestStatus | null,
    to_status: entity.to_status as AgentRequestStatus | null,
    actor_type: entity.actor_type,
    actor_id: entity.actor_id,
    trace_id: entity.trace_id,
    metadata_json: entity.metadata_json as Record<string, unknown> | null,
    created_at: entity.created_at
  };
}

function toAgentProfileEntity(entity: {
  id: string;
  project_id: string;
  name: string;
  role: string;
  description: string | null;
  source_policy: PrismaAgentProfileSourcePolicy;
  is_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}): AgentProfileEntity {
  return {
    id: entity.id,
    project_id: entity.project_id,
    name: entity.name,
    role: entity.role,
    description: entity.description,
    source_policy: entity.source_policy as AgentProfileSourcePolicy,
    is_enabled: entity.is_enabled,
    created_at: entity.created_at,
    updated_at: entity.updated_at
  };
}

function toMcpServerRegistryEntity(entity: {
  id: string;
  name: string;
  transport: PrismaMcpServerTransport;
  endpoint_or_command: string;
  origin_type: PrismaMcpServerOriginType;
  is_approved: boolean;
  meta_json: Prisma.JsonValue | null;
  created_at: Date;
  updated_at: Date;
}): McpServerRegistryEntity {
  return {
    id: entity.id,
    name: entity.name,
    transport: entity.transport as McpServerTransport,
    endpoint_or_command: entity.endpoint_or_command,
    origin_type: entity.origin_type as McpServerOriginType,
    is_approved: entity.is_approved,
    meta_json: entity.meta_json as Record<string, unknown> | null,
    created_at: entity.created_at,
    updated_at: entity.updated_at
  };
}

function toAgentProfileMcpServerBindingEntity(entity: {
  id: string;
  agent_profile_id: string;
  mcp_server_id: string;
  is_required: boolean;
  priority: number;
  config_json: Prisma.JsonValue | null;
  created_at: Date;
  updated_at: Date;
}): AgentProfileMcpServerBindingEntity {
  return {
    id: entity.id,
    agent_profile_id: entity.agent_profile_id,
    mcp_server_id: entity.mcp_server_id,
    is_required: entity.is_required,
    priority: entity.priority,
    config_json: entity.config_json as Record<string, unknown> | null,
    created_at: entity.created_at,
    updated_at: entity.updated_at
  };
}

function toAgentProfileScriptSetEntity(entity: {
  id: string;
  agent_profile_id: string;
  os: PrismaAgentProfileScriptOs;
  script_type: PrismaAgentProfileScriptType;
  content: string;
  version: number;
  created_at: Date;
  updated_at: Date;
}): AgentProfileScriptSetEntity {
  return {
    id: entity.id,
    agent_profile_id: entity.agent_profile_id,
    os: entity.os as AgentProfileScriptOs,
    script_type: entity.script_type as AgentProfileScriptType,
    content: entity.content,
    version: entity.version,
    created_at: entity.created_at,
    updated_at: entity.updated_at
  };
}

function toMcpApiKeyEntity(entity: {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  status: PrismaMcpApiKeyStatus;
  expires_at: Date | null;
  last_used_at: Date | null;
  rotated_at: Date | null;
  revoked_at: Date | null;
  created_by: string;
  updated_by: string | null;
  meta_json: Prisma.JsonValue | null;
  created_at: Date;
  updated_at: Date;
}): McpApiKeyEntity {
  return {
    id: entity.id,
    name: entity.name,
    key_prefix: entity.key_prefix,
    key_hash: entity.key_hash,
    status: entity.status as McpApiKeyStatus,
    expires_at: entity.expires_at,
    last_used_at: entity.last_used_at,
    rotated_at: entity.rotated_at,
    revoked_at: entity.revoked_at,
    created_by: entity.created_by,
    updated_by: entity.updated_by,
    meta_json: entity.meta_json as Record<string, unknown> | null,
    created_at: entity.created_at,
    updated_at: entity.updated_at
  };
}

function toMcpKeyAclRuleEntity(entity: {
  id: string;
  key_id: string;
  tool_name: string;
  effect: PrismaMcpKeyAclEffect;
  created_by: string;
  created_at: Date;
}): McpKeyAclRuleEntity {
  return {
    id: entity.id,
    key_id: entity.key_id,
    tool_name: entity.tool_name,
    effect: entity.effect,
    created_by: entity.created_by,
    created_at: entity.created_at
  };
}

function toMcpKeyProfileBindingEntity(entity: {
  id: string;
  key_id: string;
  agent_profile_id: string;
  created_by: string;
  created_at: Date;
}): McpKeyProfileBindingEntity {
  return {
    id: entity.id,
    key_id: entity.key_id,
    agent_profile_id: entity.agent_profile_id,
    created_by: entity.created_by,
    created_at: entity.created_at
  };
}

function toMcpKeyTemplateConstraintEntity(entity: {
  id: string;
  key_id: string;
  agent_template_id: string;
  created_by: string;
  created_at: Date;
}): McpKeyTemplateConstraintEntity {
  return {
    id: entity.id,
    key_id: entity.key_id,
    agent_template_id: entity.agent_template_id,
    created_by: entity.created_by,
    created_at: entity.created_at
  };
}

function toMcpAuthAuditEventEntity(entity: {
  id: string;
  key_id: string | null;
  event_type: string;
  actor: string;
  trace_id: string | null;
  request_meta_json: Prisma.JsonValue | null;
  created_at: Date;
}): McpAuthAuditEventEntity {
  return {
    id: entity.id,
    key_id: entity.key_id,
    event_type: entity.event_type,
    actor: entity.actor,
    trace_id: entity.trace_id,
    request_meta_json: entity.request_meta_json as Record<string, unknown> | null,
    created_at: entity.created_at
  };
}

function toScheduledRuleEntity(entity: {
  id: string;
  name: string;
  scope: PrismaScheduleScope;
  project_id: string | null;
  is_enabled: boolean;
  rule_ast: Prisma.JsonValue;
  target_agent_template_id: string | null;
  fallback_role: string | null;
  overlap_policy: PrismaScheduleOverlapPolicy;
  misfire_policy: PrismaScheduleMisfirePolicy;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}): ScheduledRuleEntity {
  return {
    id: entity.id,
    name: entity.name,
    scope: entity.scope as ScheduleScope,
    project_id: entity.project_id,
    is_enabled: entity.is_enabled,
    rule_ast: entity.rule_ast as Record<string, unknown>,
    target_agent_template_id: entity.target_agent_template_id,
    fallback_role: entity.fallback_role,
    overlap_policy: entity.overlap_policy as ScheduleOverlapPolicy,
    misfire_policy: entity.misfire_policy as ScheduleMisfirePolicy,
    created_by: entity.created_by,
    created_at: entity.created_at,
    updated_at: entity.updated_at
  };
}

function toScheduledRunEntity(entity: {
  id: string;
  rule_id: string;
  created_task_id: string | null;
  status: PrismaScheduledRunStatus;
  started_at: Date;
  ended_at: Date | null;
  skip_reason: string | null;
  trace_id: string;
  idempotency_key: string | null;
  result_json: Prisma.JsonValue | null;
}): ScheduledRunEntity {
  return {
    id: entity.id,
    rule_id: entity.rule_id,
    created_task_id: entity.created_task_id,
    status: entity.status as ScheduledRunStatus,
    started_at: entity.started_at,
    ended_at: entity.ended_at,
    skip_reason: entity.skip_reason,
    trace_id: entity.trace_id,
    idempotency_key: entity.idempotency_key,
    result_json: entity.result_json as Record<string, unknown> | null
  };
}

function toAuthSwitchEventEntity(entity: {
  id: string;
  module_key: string;
  from_auth_profile_id: string | null;
  to_auth_profile_id: string | null;
  reason: string;
  status: "started" | "completed" | "failed" | "skipped";
  started_at: Date;
  ended_at: Date | null;
}): AuthSwitchEventEntity {
  return {
    id: entity.id,
    module_key: entity.module_key,
    from_auth_profile_id: entity.from_auth_profile_id,
    to_auth_profile_id: entity.to_auth_profile_id,
    reason: entity.reason,
    status: entity.status,
    started_at: entity.started_at,
    ended_at: entity.ended_at
  };
}

function toModuleConfigEntity(entity: {
  id: string;
  module_key: string;
  is_enabled: boolean;
  scope: string;
  config_json: Prisma.JsonValue;
}): CustomModuleConfigEntity {
  return {
    id: entity.id,
    module_key: entity.module_key,
    is_enabled: entity.is_enabled,
    scope: entity.scope,
    config_json: entity.config_json as Record<string, unknown>
  };
}

function toModuleExecutionEntity(entity: {
  id: string;
  module_key: string;
  event_type: string;
  status: PrismaModuleExecutionStatus;
  trace_id: string;
  idempotency_key: string | null;
  details_json: Prisma.JsonValue | null;
  started_at: Date;
  ended_at: Date | null;
}): ModuleExecutionEntity {
  return {
    id: entity.id,
    module_key: entity.module_key,
    event_type: entity.event_type,
    status: entity.status,
    trace_id: entity.trace_id,
    idempotency_key: entity.idempotency_key,
    details_json: entity.details_json as Record<string, unknown> | null,
    started_at: entity.started_at,
    ended_at: entity.ended_at
  };
}

const ORCHESTRATOR_MCP_SERVER_NAME = "orchestrator-core";
const ORCHESTRATOR_MCP_SERVER_COMMAND = "orchestrator://core";

export class PrismaPersistence implements Persistence {
  public constructor(private readonly prisma: PrismaClient) {}

  public async pingDb(): Promise<void> {
    await this.prisma.$queryRawUnsafe("SELECT 1");
  }

  public async createProject(input: CreateProjectInput): Promise<ProjectEntity> {
    const created = await this.prisma.project.create({
      data: {
        key: input.key,
        name: input.name,
        description: input.description ?? null,
        github_url: input.github_url ?? null,
        github_repo: input.github_repo ?? null,
        default_branch: input.default_branch ?? null,
        workspace_path: input.workspace_path ?? null,
        meta_json:
          input.meta_json === undefined
            ? undefined
            : ((input.meta_json ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput),
        is_active: input.is_active ?? true
      }
    });

    return toProjectEntity(created);
  }

  public async listProjects(options?: { include_inactive?: boolean }): Promise<ProjectEntity[]> {
    const includeInactive = options?.include_inactive ?? true;
    const projects = await this.prisma.project.findMany({
      where: includeInactive ? undefined : { is_active: true },
      orderBy: [{ is_active: "desc" }, { updated_at: "desc" }]
    });

    return projects.map((project) => toProjectEntity(project));
  }

  public async getProjectByKey(key: string): Promise<ProjectEntity | null> {
    const project = await this.prisma.project.findUnique({
      where: { key }
    });

    if (!project) {
      return null;
    }

    return toProjectEntity(project);
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
    const existing = await this.prisma.project.findUnique({
      where: { key }
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.project.update({
      where: { key },
      data: {
        name: patch.name,
        description: patch.description,
        github_url: patch.github_url,
        github_repo: patch.github_repo,
        default_branch: patch.default_branch,
        workspace_path: patch.workspace_path,
        meta_json:
          patch.meta_json === undefined
            ? undefined
            : ((patch.meta_json ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput),
        is_active: patch.is_active
      }
    });

    return toProjectEntity(updated);
  }

  public async getProjectSummaryByKey(
    key: string,
    options?: { switch_events_window_hours?: number }
  ): Promise<ProjectSummaryEntity | null> {
    const project = await this.prisma.project.findUnique({
      where: { key }
    });
    if (!project) {
      return null;
    }

    const windowHours = Math.max(1, Math.min(options?.switch_events_window_hours ?? 24, 24 * 30));
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1_000);

    const [taskGroups, taskTotal, activeMemoryEntries, switchEvents] = await Promise.all([
      this.prisma.task.groupBy({
        by: ["status"],
        where: { project_id: key },
        _count: { _all: true }
      }),
      this.prisma.task.count({
        where: { project_id: key }
      }),
      this.prisma.agentMemoryEntry.count({
        where: {
          project_id: key,
          is_active: true
        }
      }),
      this.prisma.authSwitchEvent.findMany({
        where: {
          started_at: { gte: windowStart },
          OR: [
            { details_json: { path: ["project_id"], equals: key } },
            { details_json: { path: ["project_key"], equals: key } },
            { details_json: { path: ["task_project_id"], equals: key } }
          ]
        },
        orderBy: { started_at: "desc" },
        select: { id: true, started_at: true }
      })
    ]);

    const tasksByStatus: Partial<Record<TaskStatus, number>> = {};
    for (const group of taskGroups) {
      tasksByStatus[group.status as TaskStatus] = group._count._all;
    }

    return {
      project: toProjectEntity(project),
      tasks_total: taskTotal,
      tasks_by_status: tasksByStatus,
      active_memory_entries: activeMemoryEntries,
      switch_events_recent: switchEvents.length,
      switch_events_window_hours: windowHours,
      last_switch_event_at: switchEvents[0]?.started_at ?? null
    };
  }

  public async createProjectSecret(input: CreateProjectSecretInput): Promise<ProjectSecretEntity> {
    const created = await this.prisma.projectSecret.create({
      data: {
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
        updated_by: input.updated_by ?? input.created_by
      }
    });

    return toProjectSecretEntity(created);
  }

  public async listProjectSecrets(
    projectId: string,
    options?: { include_inactive?: boolean; limit?: number }
  ): Promise<ProjectSecretEntity[]> {
    const includeInactive = options?.include_inactive ?? true;
    const items = await this.prisma.projectSecret.findMany({
      where: {
        project_id: projectId,
        ...(includeInactive ? {} : { is_active: true })
      },
      orderBy: [{ is_active: "desc" }, { updated_at: "desc" }],
      take: Math.max(1, Math.min(options?.limit ?? 100, 500))
    });

    return items.map((item) => toProjectSecretEntity(item));
  }

  public async getProjectSecretById(
    projectId: string,
    secretId: string
  ): Promise<ProjectSecretEntity | null> {
    const secret = await this.prisma.projectSecret.findFirst({
      where: {
        id: secretId,
        project_id: projectId
      }
    });
    if (!secret) {
      return null;
    }

    return toProjectSecretEntity(secret);
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
    const existing = await this.prisma.projectSecret.findFirst({
      where: {
        id: secretId,
        project_id: projectId
      },
      select: { id: true }
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.projectSecret.update({
      where: { id: secretId },
      data: {
        description: patch.description,
        is_active: patch.is_active,
        updated_by: patch.updated_by
      }
    });

    return toProjectSecretEntity(updated);
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
    const existing = await this.prisma.projectSecret.findFirst({
      where: {
        id: secretId,
        project_id: projectId
      },
      select: { id: true }
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.projectSecret.update({
      where: { id: secretId },
      data: {
        ciphertext: input.ciphertext,
        dek_encrypted: input.dek_encrypted,
        dek_kms_key_id: input.dek_kms_key_id,
        algo: input.algo,
        masked_preview: input.masked_preview,
        version: {
          increment: 1
        },
        is_active: true,
        revoked_at: null,
        rotated_at: input.rotated_at ?? new Date(),
        updated_by: input.updated_by
      }
    });

    return toProjectSecretEntity(updated);
  }

  public async revokeProjectSecret(
    projectId: string,
    secretId: string,
    input: {
      updated_by?: string | null;
      revoked_at?: Date | null;
    }
  ): Promise<ProjectSecretEntity | null> {
    const existing = await this.prisma.projectSecret.findFirst({
      where: {
        id: secretId,
        project_id: projectId
      },
      select: { id: true }
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.projectSecret.update({
      where: { id: secretId },
      data: {
        is_active: false,
        revoked_at: input.revoked_at ?? new Date(),
        updated_by: input.updated_by
      }
    });

    return toProjectSecretEntity(updated);
  }

  public async bindProjectSecretToTemplate(
    secretId: string,
    templateId: string,
    createdBy: string
  ): Promise<ProjectSecretTemplateBindingEntity | null> {
    const [secret, template] = await Promise.all([
      this.prisma.projectSecret.findUnique({ where: { id: secretId }, select: { id: true } }),
      this.prisma.agentTemplate.findUnique({ where: { id: templateId }, select: { id: true } })
    ]);
    if (!secret || !template) {
      return null;
    }

    const existing = await this.prisma.projectSecretTemplateBinding.findUnique({
      where: {
        secret_id_template_id: {
          secret_id: secretId,
          template_id: templateId
        }
      }
    });
    if (existing) {
      return toProjectSecretTemplateBindingEntity(existing);
    }

    const created = await this.prisma.projectSecretTemplateBinding.create({
      data: {
        secret_id: secretId,
        template_id: templateId,
        created_by: createdBy
      }
    });

    return toProjectSecretTemplateBindingEntity(created);
  }

  public async unbindProjectSecretFromTemplate(secretId: string, templateId: string): Promise<boolean> {
    const deleted = await this.prisma.projectSecretTemplateBinding.deleteMany({
      where: {
        secret_id: secretId,
        template_id: templateId
      }
    });

    return deleted.count > 0;
  }

  public async listProjectSecretTemplateBindings(
    secretId: string
  ): Promise<ProjectSecretTemplateBindingEntity[]> {
    const items = await this.prisma.projectSecretTemplateBinding.findMany({
      where: { secret_id: secretId },
      orderBy: { created_at: "desc" }
    });

    return items.map((item) => toProjectSecretTemplateBindingEntity(item));
  }

  public async bindProjectSecretToRole(
    secretId: string,
    role: string,
    createdBy: string
  ): Promise<ProjectSecretRoleBindingEntity | null> {
    const secret = await this.prisma.projectSecret.findUnique({
      where: { id: secretId },
      select: { id: true }
    });
    if (!secret) {
      return null;
    }

    const existing = await this.prisma.projectSecretRoleBinding.findUnique({
      where: {
        secret_id_role: {
          secret_id: secretId,
          role
        }
      }
    });
    if (existing) {
      return toProjectSecretRoleBindingEntity(existing);
    }

    const created = await this.prisma.projectSecretRoleBinding.create({
      data: {
        secret_id: secretId,
        role,
        created_by: createdBy
      }
    });

    return toProjectSecretRoleBindingEntity(created);
  }

  public async unbindProjectSecretFromRole(secretId: string, role: string): Promise<boolean> {
    const deleted = await this.prisma.projectSecretRoleBinding.deleteMany({
      where: {
        secret_id: secretId,
        role
      }
    });

    return deleted.count > 0;
  }

  public async listProjectSecretRoleBindings(secretId: string): Promise<ProjectSecretRoleBindingEntity[]> {
    const items = await this.prisma.projectSecretRoleBinding.findMany({
      where: { secret_id: secretId },
      orderBy: { created_at: "desc" }
    });

    return items.map((item) => toProjectSecretRoleBindingEntity(item));
  }

  public async createSecretAuditEvent(input: CreateSecretAuditEventInput): Promise<SecretAuditEventEntity> {
    const created = await this.prisma.secretAuditEvent.create({
      data: {
        secret_id: input.secret_id ?? null,
        project_id: input.project_id,
        event_type: input.event_type,
        actor: input.actor,
        trace_id: input.trace_id ?? null,
        metadata_json:
          input.metadata_json === undefined
            ? undefined
            : ((input.metadata_json ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput)
      }
    });

    return toSecretAuditEventEntity(created);
  }

  public async listSecretAuditEvents(
    projectId: string,
    options?: { secret_id?: string; limit?: number }
  ): Promise<SecretAuditEventEntity[]> {
    const items = await this.prisma.secretAuditEvent.findMany({
      where: {
        project_id: projectId,
        ...(options?.secret_id ? { secret_id: options.secret_id } : {})
      },
      orderBy: { created_at: "desc" },
      take: Math.max(1, Math.min(options?.limit ?? 100, 500))
    });

    return items.map((item) => toSecretAuditEventEntity(item));
  }

  public async createTask(input: CreateTaskInput): Promise<TaskEntity> {
    const created = await this.prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        status: input.status as PrismaTaskStatus,
        priority: input.priority,
        project_id: input.project_id,
        repo_id: input.repo_id,
        branch: input.branch,
        source: input.source,
        created_by: input.created_by
      }
    });

    return toTaskEntity(created);
  }

  public async listTasks(status?: TaskStatus): Promise<TaskEntity[]> {
    const tasks = await this.prisma.task.findMany({
      where: status ? { status: status as PrismaTaskStatus } : undefined,
      orderBy: { created_at: "desc" }
    });

    return tasks.map((task) => toTaskEntity(task));
  }

  public async getTaskById(id: string): Promise<TaskEntity | null> {
    const task = await this.prisma.task.findUnique({
      where: { id }
    });

    if (!task) {
      return null;
    }

    return toTaskEntity(task);
  }

  public async updateTaskStatus(id: string, status: TaskStatus): Promise<TaskEntity | null> {
    const existing = await this.prisma.task.findUnique({
      where: { id }
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: status as PrismaTaskStatus }
    });

    return toTaskEntity(updated);
  }

  public async createIntervention(input: CreateInterventionInput): Promise<boolean> {
    const task = await this.prisma.task.findUnique({
      where: { id: input.task_id },
      select: { id: true }
    });
    if (!task) {
      return false;
    }

    await this.prisma.intervention.create({
      data: {
        task_id: input.task_id,
        task_run_id: input.task_run_id ?? null,
        source: input.source,
        type: input.type as PrismaInterventionType,
        payload: (input.payload ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
        created_by: input.created_by
      }
    });

    return true;
  }

  public async releaseHeldQueue(): Promise<number> {
    const result = await this.prisma.task.updateMany({
      where: { status: "WAITING_LIMIT" },
      data: { status: "QUEUED" }
    });

    return result.count;
  }

  public async createAgentTemplate(input: CreateAgentTemplateInput): Promise<AgentTemplateEntity> {
    const created = await this.prisma.agentTemplate.create({
      data: {
        name: input.name,
        role: input.role,
        description: input.description,
        model: input.model,
        auth_context_id: input.auth_context_id,
        pack_registry_entry_id: input.pack_registry_entry_id ?? null,
        system_prompt: input.system_prompt,
        instructions_md: input.instructions_md,
        sandbox_policy: input.sandbox_policy,
        approval_policy: input.approval_policy,
        output_schema: input.output_schema as Prisma.InputJsonValue | undefined
      }
    });

    return toAgentTemplateEntity(created);
  }

  public async listAgentTemplates(): Promise<AgentTemplateEntity[]> {
    const templates = await this.prisma.agentTemplate.findMany({
      orderBy: { created_at: "desc" }
    });

    return templates.map((template) => toAgentTemplateEntity(template));
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
    const existing = await this.prisma.agentTemplate.findUnique({
      where: { id }
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.agentTemplate.update({
      where: { id },
      data: {
        name: patch.name,
        role: patch.role,
        description: patch.description,
        model: patch.model,
        auth_context_id: patch.auth_context_id,
        pack_registry_entry_id: patch.pack_registry_entry_id,
        system_prompt: patch.system_prompt,
        instructions_md: patch.instructions_md,
        sandbox_policy: patch.sandbox_policy,
        approval_policy: patch.approval_policy,
        output_schema: patch.output_schema as Prisma.InputJsonValue | undefined,
        is_enabled: patch.is_enabled
      }
    });

    return toAgentTemplateEntity(updated);
  }

  public async deleteAgentTemplate(id: string): Promise<boolean> {
    const result = await this.prisma.agentTemplate.deleteMany({
      where: { id }
    });

    return result.count > 0;
  }

  public async createPack(input: CreatePackRegistryInput, registeredBy: string): Promise<PackRegistryEntity> {
    const created = await this.prisma.packRegistryEntry.create({
      data: {
        pack_id: input.pack_id,
        role: input.role,
        capabilities_json: input.capabilities_json as Prisma.InputJsonValue,
        source_type: input.source_type,
        source_ref: input.source_ref,
        pinned_version: input.pinned_version,
        manifest_json: input.manifest_json as Prisma.InputJsonValue,
        registered_by: registeredBy
      }
    });

    return toPackRegistryEntity(created);
  }

  public async listPacks(): Promise<PackRegistryEntity[]> {
    const packs = await this.prisma.packRegistryEntry.findMany({
      orderBy: { created_at: "desc" }
    });

    return packs.map((pack) => toPackRegistryEntity(pack));
  }

  public async getPackById(id: string): Promise<PackRegistryEntity | null> {
    const pack = await this.prisma.packRegistryEntry.findUnique({
      where: { id }
    });

    if (!pack) {
      return null;
    }

    return toPackRegistryEntity(pack);
  }

  public async patchPack(
    id: string,
    patch: {
      pinned_version?: string;
      is_enabled?: boolean;
      source_ref?: string;
    }
  ): Promise<PackRegistryEntity | null> {
    const existing = await this.prisma.packRegistryEntry.findUnique({
      where: { id }
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.packRegistryEntry.update({
      where: { id },
      data: {
        pinned_version: patch.pinned_version,
        is_enabled: patch.is_enabled,
        source_ref: patch.source_ref
      }
    });

    return toPackRegistryEntity(updated);
  }

  public async materializePack(id: string): Promise<boolean> {
    const result = await this.prisma.packRegistryEntry.updateMany({
      where: { id },
      data: {
        materialize_status: "materialized",
        cached_path: `/packs/cache/${id}`
      }
    });

    return result.count > 0;
  }

  public async createDelegationRequest(
    input: CreateDelegationRequestInput
  ): Promise<DelegationRequestEntity> {
    const created = await this.prisma.delegationRequest.create({
      data: {
        requester_task_id: input.requester_task_id,
        requester_task_run_id: input.requester_task_run_id ?? null,
        capability: input.capability,
        target_selector_json: input.target_selector as Prisma.InputJsonValue,
        payload_json: input.payload as Prisma.InputJsonValue,
        priority: input.priority ?? 100,
        status: "requested",
        input_prompt: input.input_prompt ?? null,
        trace_id: input.trace_id
      }
    });

    return toDelegationRequestEntity(created);
  }

  public async getDelegationRequest(id: string): Promise<DelegationRequestEntity | null> {
    const delegation = await this.prisma.delegationRequest.findUnique({
      where: { id }
    });

    if (!delegation) {
      return null;
    }

    return toDelegationRequestEntity(delegation);
  }

  public async listDelegationRequests(options?: {
    statuses?: DelegationRequestEntity["status"][];
    limit?: number;
  }): Promise<DelegationRequestEntity[]> {
    const statuses = options?.statuses?.length
      ? (options.statuses as PrismaDelegationStatus[])
      : undefined;
    const take = Math.max(1, Math.min(options?.limit ?? 50, 200));

    const delegations = await this.prisma.delegationRequest.findMany({
      where: statuses ? { status: { in: statuses } } : undefined,
      orderBy: { created_at: "desc" },
      take
    });

    return delegations.map((delegation) => toDelegationRequestEntity(delegation));
  }

  public async createAgentMemoryEntry(
    input: CreateAgentMemoryEntryInput
  ): Promise<AgentMemoryEntryEntity> {
    const created = await this.prisma.agentMemoryEntry.create({
      data: {
        project_id: input.project_id,
        agent_role: input.agent_role,
        title: input.title,
        content: input.content,
        is_active: input.is_active ?? true,
        created_by: input.created_by,
        updated_by: input.created_by
      }
    });

    return toAgentMemoryEntryEntity(created);
  }

  public async listAgentMemoryEntries(options?: {
    project_id?: string;
    agent_role?: string;
    is_active?: boolean;
    limit?: number;
  }): Promise<AgentMemoryEntryEntity[]> {
    const where: Prisma.AgentMemoryEntryWhereInput = {};
    if (options?.project_id) {
      where.project_id = options.project_id;
    }
    if (options?.agent_role) {
      where.agent_role = options.agent_role;
    }
    if (typeof options?.is_active === "boolean") {
      where.is_active = options.is_active;
    }

    const entries = await this.prisma.agentMemoryEntry.findMany({
      where,
      orderBy: { updated_at: "desc" },
      take: Math.max(1, Math.min(options?.limit ?? 100, 500))
    });

    return entries.map((entry) => toAgentMemoryEntryEntity(entry));
  }

  public async createAgentProfile(input: CreateAgentProfileInput): Promise<AgentProfileEntity> {
    const created = await this.prisma.agentProfile.create({
      data: {
        project_id: input.project_id,
        name: input.name,
        role: input.role,
        description: input.description ?? null,
        source_policy: (input.source_policy ?? "catalog_only") as PrismaAgentProfileSourcePolicy,
        is_enabled: input.is_enabled ?? true
      }
    });

    return toAgentProfileEntity(created);
  }

  public async listAgentProfiles(options?: {
    project_id?: string;
    include_disabled?: boolean;
    role?: string;
    limit?: number;
  }): Promise<AgentProfileEntity[]> {
    const includeDisabled = options?.include_disabled ?? true;
    const where: Prisma.AgentProfileWhereInput = {};
    if (!includeDisabled) {
      where.is_enabled = true;
    }
    if (options?.project_id) {
      where.project_id = options.project_id;
    }
    if (options?.role) {
      where.role = options.role;
    }

    const items = await this.prisma.agentProfile.findMany({
      where,
      orderBy: [{ is_enabled: "desc" }, { updated_at: "desc" }],
      take: Math.max(1, Math.min(options?.limit ?? 100, 500))
    });

    return items.map((item) => toAgentProfileEntity(item));
  }

  public async getAgentProfileById(id: string): Promise<AgentProfileEntity | null> {
    const profile = await this.prisma.agentProfile.findUnique({
      where: { id }
    });
    if (!profile) {
      return null;
    }

    return toAgentProfileEntity(profile);
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
    const existing = await this.prisma.agentProfile.findUnique({
      where: { id }
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.agentProfile.update({
      where: { id },
      data: {
        name: patch.name,
        role: patch.role,
        description: patch.description,
        source_policy: patch.source_policy as PrismaAgentProfileSourcePolicy | undefined,
        is_enabled: patch.is_enabled
      }
    });

    return toAgentProfileEntity(updated);
  }

  public async createMcpServerRegistryEntry(
    input: CreateMcpServerRegistryInput
  ): Promise<McpServerRegistryEntity> {
    const created = await this.prisma.mcpServerRegistry.create({
      data: {
        name: input.name,
        transport: input.transport as PrismaMcpServerTransport,
        endpoint_or_command: input.endpoint_or_command,
        origin_type: input.origin_type as PrismaMcpServerOriginType,
        is_approved: input.is_approved ?? false,
        meta_json:
          input.meta_json === undefined
            ? undefined
            : ((input.meta_json ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput)
      }
    });

    return toMcpServerRegistryEntity(created);
  }

  public async listMcpServerRegistry(options?: {
    include_unapproved?: boolean;
  }): Promise<McpServerRegistryEntity[]> {
    const includeUnapproved = options?.include_unapproved ?? false;
    const items = await this.prisma.mcpServerRegistry.findMany({
      where: includeUnapproved ? undefined : { is_approved: true },
      orderBy: [{ is_approved: "desc" }, { updated_at: "desc" }]
    });

    return items.map((item) => toMcpServerRegistryEntity(item));
  }

  public async getMcpServerRegistryById(id: string): Promise<McpServerRegistryEntity | null> {
    const item = await this.prisma.mcpServerRegistry.findUnique({
      where: { id }
    });
    if (!item) {
      return null;
    }

    return toMcpServerRegistryEntity(item);
  }

  public async ensureOrchestratorMcpServer(): Promise<McpServerRegistryEntity> {
    const existing = await this.prisma.mcpServerRegistry.findUnique({
      where: { name: ORCHESTRATOR_MCP_SERVER_NAME }
    });
    if (existing) {
      return toMcpServerRegistryEntity(existing);
    }

    const created = await this.prisma.mcpServerRegistry.create({
      data: {
        name: ORCHESTRATOR_MCP_SERVER_NAME,
        transport: "stdio",
        endpoint_or_command: ORCHESTRATOR_MCP_SERVER_COMMAND,
        origin_type: "built_in",
        is_approved: true,
        meta_json: {
          builtin_key: "orchestrator_core"
        }
      }
    });

    return toMcpServerRegistryEntity(created);
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
    const [profile, server] = await Promise.all([
      this.prisma.agentProfile.findUnique({ where: { id: profileId }, select: { id: true } }),
      this.prisma.mcpServerRegistry.findUnique({ where: { id: serverId }, select: { id: true } })
    ]);
    if (!profile || !server) {
      return null;
    }

    const upserted = await this.prisma.agentProfileMcpServerBinding.upsert({
      where: {
        agent_profile_id_mcp_server_id: {
          agent_profile_id: profileId,
          mcp_server_id: serverId
        }
      },
      create: {
        agent_profile_id: profileId,
        mcp_server_id: serverId,
        is_required: options?.is_required ?? false,
        priority: options?.priority ?? 100,
        config_json:
          options?.config_json === undefined
            ? undefined
            : ((options.config_json ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput)
      },
      update: {
        is_required: options?.is_required,
        priority: options?.priority,
        config_json:
          options?.config_json === undefined
            ? undefined
            : ((options.config_json ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput)
      }
    });

    return toAgentProfileMcpServerBindingEntity(upserted);
  }

  public async unbindMcpServerFromAgentProfile(profileId: string, serverId: string): Promise<boolean> {
    const deleted = await this.prisma.agentProfileMcpServerBinding.deleteMany({
      where: {
        agent_profile_id: profileId,
        mcp_server_id: serverId
      }
    });

    return deleted.count > 0;
  }

  public async listAgentProfileMcpBindings(
    profileId: string
  ): Promise<AgentProfileMcpServerBindingEntity[]> {
    const items = await this.prisma.agentProfileMcpServerBinding.findMany({
      where: { agent_profile_id: profileId },
      orderBy: [{ priority: "asc" }, { updated_at: "desc" }]
    });

    return items.map((item) => toAgentProfileMcpServerBindingEntity(item));
  }

  public async createMcpApiKey(input: CreateMcpApiKeyInput): Promise<McpApiKeyEntity> {
    const created = await this.prisma.mcpApiKey.create({
      data: {
        name: input.name,
        key_prefix: input.key_prefix,
        key_hash: input.key_hash,
        status: (input.status ?? "active") as PrismaMcpApiKeyStatus,
        expires_at: input.expires_at ?? null,
        created_by: input.created_by,
        updated_by: input.updated_by ?? input.created_by,
        meta_json:
          input.meta_json === undefined
            ? undefined
            : ((input.meta_json ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput)
      }
    });

    return toMcpApiKeyEntity(created);
  }

  public async listMcpApiKeys(options?: {
    status?: McpApiKeyStatus;
    include_revoked?: boolean;
    limit?: number;
  }): Promise<McpApiKeyEntity[]> {
    const includeRevoked = options?.include_revoked ?? false;
    const where: Prisma.McpApiKeyWhereInput = {};
    if (options?.status) {
      where.status = options.status as PrismaMcpApiKeyStatus;
    } else if (!includeRevoked) {
      where.status = {
        not: "revoked"
      };
    }

    const items = await this.prisma.mcpApiKey.findMany({
      where,
      orderBy: [{ status: "asc" }, { updated_at: "desc" }],
      take: Math.max(1, Math.min(options?.limit ?? 100, 500))
    });

    return items.map((item) => toMcpApiKeyEntity(item));
  }

  public async getMcpApiKeyById(id: string): Promise<McpApiKeyEntity | null> {
    const key = await this.prisma.mcpApiKey.findUnique({
      where: { id }
    });
    if (!key) {
      return null;
    }

    return toMcpApiKeyEntity(key);
  }

  public async getMcpApiKeyByHash(keyHash: string): Promise<McpApiKeyEntity | null> {
    const key = await this.prisma.mcpApiKey.findUnique({
      where: { key_hash: keyHash }
    });
    if (!key) {
      return null;
    }

    return toMcpApiKeyEntity(key);
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
    const existing = await this.prisma.mcpApiKey.findUnique({
      where: { id }
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.mcpApiKey.update({
      where: { id },
      data: {
        name: patch.name,
        status: patch.status as PrismaMcpApiKeyStatus | undefined,
        expires_at: patch.expires_at,
        updated_by: patch.updated_by,
        meta_json:
          patch.meta_json === undefined
            ? undefined
            : ((patch.meta_json ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput)
      }
    });

    return toMcpApiKeyEntity(updated);
  }

  public async markMcpApiKeyLastUsed(
    id: string,
    lastUsedAt?: Date
  ): Promise<McpApiKeyEntity | null> {
    const existing = await this.prisma.mcpApiKey.findUnique({
      where: { id }
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.mcpApiKey.update({
      where: { id },
      data: {
        last_used_at: lastUsedAt ?? new Date()
      }
    });

    return toMcpApiKeyEntity(updated);
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
    const existing = await this.prisma.mcpApiKey.findUnique({
      where: { id }
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.mcpApiKey.update({
      where: { id },
      data: {
        key_prefix: input.key_prefix,
        key_hash: input.key_hash,
        status: "active",
        rotated_at: input.rotated_at ?? new Date(),
        revoked_at: null,
        updated_by: input.updated_by
      }
    });

    return toMcpApiKeyEntity(updated);
  }

  public async revokeMcpApiKey(
    id: string,
    input: {
      revoked_at?: Date;
      updated_by?: string | null;
    }
  ): Promise<McpApiKeyEntity | null> {
    const existing = await this.prisma.mcpApiKey.findUnique({
      where: { id }
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.mcpApiKey.update({
      where: { id },
      data: {
        status: "revoked",
        revoked_at: input.revoked_at ?? new Date(),
        updated_by: input.updated_by
      }
    });

    return toMcpApiKeyEntity(updated);
  }

  public async replaceMcpKeyAclRules(
    keyId: string,
    input: {
      tool_names: string[];
      created_by: string;
    }
  ): Promise<McpKeyAclRuleEntity[]> {
    await this.prisma.$transaction(async (tx) => {
      await tx.mcpKeyAclRule.deleteMany({
        where: { key_id: keyId }
      });

      if (!input.tool_names.length) {
        return;
      }

      await tx.mcpKeyAclRule.createMany({
        data: input.tool_names.map((toolName) => ({
          key_id: keyId,
          tool_name: toolName,
          effect: "allow",
          created_by: input.created_by
        })),
        skipDuplicates: true
      });
    });

    const items = await this.prisma.mcpKeyAclRule.findMany({
      where: { key_id: keyId },
      orderBy: [{ tool_name: "asc" }, { created_at: "desc" }]
    });

    return items.map((item) => toMcpKeyAclRuleEntity(item));
  }

  public async listMcpKeyAclRules(keyId: string): Promise<McpKeyAclRuleEntity[]> {
    const items = await this.prisma.mcpKeyAclRule.findMany({
      where: { key_id: keyId },
      orderBy: [{ tool_name: "asc" }, { created_at: "desc" }]
    });

    return items.map((item) => toMcpKeyAclRuleEntity(item));
  }

  public async bindMcpKeyToProfile(
    keyId: string,
    profileId: string,
    createdBy: string
  ): Promise<McpKeyProfileBindingEntity | null> {
    const [key, profile] = await Promise.all([
      this.prisma.mcpApiKey.findUnique({ where: { id: keyId }, select: { id: true } }),
      this.prisma.agentProfile.findUnique({ where: { id: profileId }, select: { id: true } })
    ]);
    if (!key || !profile) {
      return null;
    }

    const existing = await this.prisma.mcpKeyProfileBinding.findUnique({
      where: {
        key_id_agent_profile_id: {
          key_id: keyId,
          agent_profile_id: profileId
        }
      }
    });
    if (existing) {
      return toMcpKeyProfileBindingEntity(existing);
    }

    const created = await this.prisma.mcpKeyProfileBinding.create({
      data: {
        key_id: keyId,
        agent_profile_id: profileId,
        created_by: createdBy
      }
    });

    return toMcpKeyProfileBindingEntity(created);
  }

  public async unbindMcpKeyFromProfile(keyId: string, profileId: string): Promise<boolean> {
    const deleted = await this.prisma.mcpKeyProfileBinding.deleteMany({
      where: {
        key_id: keyId,
        agent_profile_id: profileId
      }
    });

    return deleted.count > 0;
  }

  public async listMcpKeyProfileBindings(keyId: string): Promise<McpKeyProfileBindingEntity[]> {
    const items = await this.prisma.mcpKeyProfileBinding.findMany({
      where: { key_id: keyId },
      orderBy: { created_at: "desc" }
    });

    return items.map((item) => toMcpKeyProfileBindingEntity(item));
  }

  public async bindMcpKeyTemplateConstraint(
    keyId: string,
    templateId: string,
    createdBy: string
  ): Promise<McpKeyTemplateConstraintEntity | null> {
    const [key, template] = await Promise.all([
      this.prisma.mcpApiKey.findUnique({ where: { id: keyId }, select: { id: true } }),
      this.prisma.agentTemplate.findUnique({ where: { id: templateId }, select: { id: true } })
    ]);
    if (!key || !template) {
      return null;
    }

    const existing = await this.prisma.mcpKeyTemplateConstraint.findUnique({
      where: {
        key_id_agent_template_id: {
          key_id: keyId,
          agent_template_id: templateId
        }
      }
    });
    if (existing) {
      return toMcpKeyTemplateConstraintEntity(existing);
    }

    const created = await this.prisma.mcpKeyTemplateConstraint.create({
      data: {
        key_id: keyId,
        agent_template_id: templateId,
        created_by: createdBy
      }
    });

    return toMcpKeyTemplateConstraintEntity(created);
  }

  public async unbindMcpKeyTemplateConstraint(keyId: string, templateId: string): Promise<boolean> {
    const deleted = await this.prisma.mcpKeyTemplateConstraint.deleteMany({
      where: {
        key_id: keyId,
        agent_template_id: templateId
      }
    });

    return deleted.count > 0;
  }

  public async listMcpKeyTemplateConstraints(
    keyId: string
  ): Promise<McpKeyTemplateConstraintEntity[]> {
    const items = await this.prisma.mcpKeyTemplateConstraint.findMany({
      where: { key_id: keyId },
      orderBy: { created_at: "desc" }
    });

    return items.map((item) => toMcpKeyTemplateConstraintEntity(item));
  }

  public async createMcpAuthAuditEvent(
    input: CreateMcpAuthAuditEventInput
  ): Promise<McpAuthAuditEventEntity> {
    const created = await this.prisma.mcpAuthAuditEvent.create({
      data: {
        key_id: input.key_id ?? null,
        event_type: input.event_type,
        actor: input.actor,
        trace_id: input.trace_id ?? null,
        request_meta_json:
          input.request_meta_json === undefined
            ? undefined
            : ((input.request_meta_json ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput)
      }
    });

    return toMcpAuthAuditEventEntity(created);
  }

  public async upsertAgentProfileScriptSet(
    profileId: string,
    input: {
      os: AgentProfileScriptOs;
      script_type: AgentProfileScriptType;
      content: string;
    }
  ): Promise<AgentProfileScriptSetEntity | null> {
    const profile = await this.prisma.agentProfile.findUnique({
      where: { id: profileId },
      select: { id: true }
    });
    if (!profile) {
      return null;
    }

    const upserted = await this.prisma.agentProfileScriptSet.upsert({
      where: {
        agent_profile_id_os: {
          agent_profile_id: profileId,
          os: input.os as PrismaAgentProfileScriptOs
        }
      },
      create: {
        agent_profile_id: profileId,
        os: input.os as PrismaAgentProfileScriptOs,
        script_type: input.script_type as PrismaAgentProfileScriptType,
        content: input.content,
        version: 1
      },
      update: {
        script_type: input.script_type as PrismaAgentProfileScriptType,
        content: input.content,
        version: {
          increment: 1
        }
      }
    });

    return toAgentProfileScriptSetEntity(upserted);
  }

  public async listAgentProfileScriptSets(profileId: string): Promise<AgentProfileScriptSetEntity[]> {
    const items = await this.prisma.agentProfileScriptSet.findMany({
      where: { agent_profile_id: profileId },
      orderBy: { updated_at: "desc" }
    });

    return items.map((item) => toAgentProfileScriptSetEntity(item));
  }

  public async createAgentRequest(input: CreateAgentRequestInput): Promise<AgentRequestEntity> {
    const created = await this.prisma.agentRequest.create({
      data: {
        type: input.type as PrismaAgentRequestType,
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
        request_payload_json:
          input.request_payload_json === undefined
            ? undefined
            : ((input.request_payload_json ?? null) as
                | Prisma.InputJsonValue
                | Prisma.NullableJsonNullValueInput),
        created_by: input.created_by
      }
    });

    return toAgentRequestEntity(created);
  }

  public async listAgentRequests(options?: {
    project_id?: string;
    task_id?: string;
    agent_profile_id?: string;
    agent_template_id?: string;
    type?: AgentRequestType;
    statuses?: AgentRequestStatus[];
    limit?: number;
  }): Promise<AgentRequestEntity[]> {
    const where: Prisma.AgentRequestWhereInput = {};
    if (options?.project_id) {
      where.project_id = options.project_id;
    }
    if (options?.task_id) {
      where.task_id = options.task_id;
    }
    if (options?.agent_profile_id) {
      where.agent_profile_id = options.agent_profile_id;
    }
    if (options?.agent_template_id) {
      where.agent_template_id = options.agent_template_id;
    }
    if (options?.type) {
      where.type = options.type as PrismaAgentRequestType;
    }
    if (options?.statuses?.length) {
      where.status = {
        in: options.statuses as PrismaAgentRequestStatus[]
      };
    }

    const items = await this.prisma.agentRequest.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: Math.max(1, Math.min(options?.limit ?? 100, 500))
    });

    return items.map((item) => toAgentRequestEntity(item));
  }

  public async getAgentRequestById(id: string): Promise<AgentRequestEntity | null> {
    const request = await this.prisma.agentRequest.findUnique({
      where: { id }
    });
    if (!request) {
      return null;
    }

    return toAgentRequestEntity(request);
  }

  public async createAgentRequestAuditEvent(
    input: CreateAgentRequestAuditEventInput
  ): Promise<AgentRequestAuditEventEntity> {
    const created = await this.prisma.agentRequestAuditEvent.create({
      data: {
        request_id: input.request_id,
        event_type: input.event_type,
        from_status:
          input.from_status === undefined
            ? undefined
            : (input.from_status as PrismaAgentRequestStatus | null),
        to_status:
          input.to_status === undefined
            ? undefined
            : (input.to_status as PrismaAgentRequestStatus | null),
        actor_type: input.actor_type,
        actor_id: input.actor_id === undefined ? undefined : input.actor_id,
        trace_id: input.trace_id === undefined ? undefined : input.trace_id,
        metadata_json:
          input.metadata_json === undefined
            ? undefined
            : ((input.metadata_json ?? null) as
                | Prisma.InputJsonValue
                | Prisma.NullableJsonNullValueInput)
      }
    });

    return toAgentRequestAuditEventEntity(created);
  }

  public async listAgentRequestAuditEvents(
    requestId: string,
    options?: { limit?: number }
  ): Promise<AgentRequestAuditEventEntity[]> {
    const items = await this.prisma.agentRequestAuditEvent.findMany({
      where: { request_id: requestId },
      orderBy: { created_at: "desc" },
      take: Math.max(1, Math.min(options?.limit ?? 100, 500))
    });

    return items.map((item) => toAgentRequestAuditEventEntity(item));
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
    const existing = await this.prisma.agentRequest.findUnique({
      where: { id }
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.agentRequest.update({
      where: { id },
      data: {
        status: input.status as PrismaAgentRequestStatus,
        resolution_payload_json:
          input.resolution_payload_json === undefined
            ? undefined
            : ((input.resolution_payload_json ?? null) as
                | Prisma.InputJsonValue
                | Prisma.NullableJsonNullValueInput),
        claimed_by_governor_id:
          input.claimed_by_governor_id === undefined
            ? undefined
            : input.claimed_by_governor_id,
        resolved_by: input.resolved_by === undefined ? undefined : input.resolved_by,
        resolved_at: input.resolved_at === undefined ? undefined : input.resolved_at
      }
    });

    return toAgentRequestEntity(updated);
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
    const existing = await this.prisma.agentMemoryEntry.findUnique({
      where: { id }
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.agentMemoryEntry.update({
      where: { id },
      data: {
        title: patch.title,
        content: patch.content,
        is_active: patch.is_active,
        updated_by: patch.updated_by
      }
    });

    return toAgentMemoryEntryEntity(updated);
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
    const existing = await this.prisma.delegationRequest.findUnique({
      where: { id }
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.delegationRequest.update({
      where: { id },
      data: {
        status: patch.status,
        target_agent_template_id: patch.target_agent_template_id,
        target_worker_instance_id: patch.target_worker_instance_id,
        result_summary: patch.result_summary,
        input_prompt: patch.input_prompt,
        selected_auth_profile_id: patch.selected_auth_profile_id,
        execution_mode: patch.execution_mode,
        execution_log: patch.execution_log,
        execution_meta_json:
          patch.execution_meta_json === undefined
            ? undefined
            : ((patch.execution_meta_json ?? null) as
                | Prisma.InputJsonValue
                | Prisma.NullableJsonNullValueInput),
        started_at: patch.started_at,
        ended_at: patch.ended_at
      }
    });

    return toDelegationRequestEntity(updated);
  }

  public async createScheduledRule(input: CreateScheduledRuleInput): Promise<ScheduledRuleEntity> {
    const created = await this.prisma.scheduledRule.create({
      data: {
        name: input.name,
        scope: input.scope as PrismaScheduleScope,
        project_id: input.project_id ?? null,
        is_enabled: true,
        rule_ast: input.rule_ast as Prisma.InputJsonValue,
        target_agent_template_id: input.target_agent_template_id ?? null,
        fallback_role: input.fallback_role ?? null,
        overlap_policy: input.overlap_policy as PrismaScheduleOverlapPolicy,
        misfire_policy: input.misfire_policy as PrismaScheduleMisfirePolicy,
        created_by: input.created_by
      }
    });

    return toScheduledRuleEntity(created);
  }

  public async listScheduledRules(): Promise<ScheduledRuleEntity[]> {
    const rules = await this.prisma.scheduledRule.findMany({
      orderBy: { created_at: "desc" }
    });

    return rules.map((rule) => toScheduledRuleEntity(rule));
  }

  public async getScheduledRuleById(id: string): Promise<ScheduledRuleEntity | null> {
    const rule = await this.prisma.scheduledRule.findUnique({
      where: { id }
    });
    if (!rule) {
      return null;
    }

    return toScheduledRuleEntity(rule);
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
    const existing = await this.prisma.scheduledRule.findUnique({
      where: { id }
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.scheduledRule.update({
      where: { id },
      data: {
        name: patch.name,
        is_enabled: patch.is_enabled,
        rule_ast: patch.rule_ast as Prisma.InputJsonValue | undefined,
        target_agent_template_id: patch.target_agent_template_id,
        fallback_role: patch.fallback_role,
        overlap_policy: patch.overlap_policy as PrismaScheduleOverlapPolicy | undefined,
        misfire_policy: patch.misfire_policy as PrismaScheduleMisfirePolicy | undefined
      }
    });

    return toScheduledRuleEntity(updated);
  }

  public async deleteScheduledRule(id: string): Promise<boolean> {
    const result = await this.prisma.scheduledRule.deleteMany({
      where: { id }
    });

    return result.count > 0;
  }

  public async setScheduledRuleEnabled(id: string, isEnabled: boolean): Promise<boolean> {
    const result = await this.prisma.scheduledRule.updateMany({
      where: { id },
      data: { is_enabled: isEnabled }
    });

    return result.count > 0;
  }

  public async createScheduledRun(input: CreateScheduledRunInput): Promise<ScheduledRunEntity> {
    const created = await this.prisma.scheduledRun.create({
      data: {
        rule_id: input.rule_id,
        created_task_id: input.created_task_id ?? null,
        status: input.status as PrismaScheduledRunStatus,
        started_at: input.started_at ?? new Date(),
        ended_at: input.ended_at ?? null,
        skip_reason: input.skip_reason ?? null,
        trace_id: input.trace_id,
        idempotency_key: input.idempotency_key ?? null,
        result_json: (input.result_json ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput
      }
    });

    return toScheduledRunEntity(created);
  }

  public async getScheduledRunByIdempotency(
    ruleId: string,
    idempotencyKey: string
  ): Promise<ScheduledRunEntity | null> {
    const run = await this.prisma.scheduledRun.findFirst({
      where: {
        rule_id: ruleId,
        idempotency_key: idempotencyKey
      }
    });
    if (!run) {
      return null;
    }

    return toScheduledRunEntity(run);
  }

  public async getActiveScheduledRun(ruleId: string): Promise<ScheduledRunEntity | null> {
    const run = await this.prisma.scheduledRun.findFirst({
      where: {
        rule_id: ruleId,
        status: "started",
        ended_at: null
      },
      orderBy: { started_at: "desc" }
    });

    if (!run) {
      return null;
    }

    return toScheduledRunEntity(run);
  }

  public async listScheduledRuns(ruleId: string): Promise<ScheduledRunEntity[]> {
    const runs = await this.prisma.scheduledRun.findMany({
      where: { rule_id: ruleId },
      orderBy: { started_at: "desc" }
    });

    return runs.map((run) => toScheduledRunEntity(run));
  }

  public async listWorkers(): Promise<WorkerEntity[]> {
    const workers = await this.prisma.workerInstance.findMany({
      orderBy: { started_at: "desc" }
    });

    return workers.map((worker) => toWorkerEntity(worker));
  }

  public async setWorkerStatus(id: string, status: "READY" | "DISABLED"): Promise<boolean> {
    const result = await this.prisma.workerInstance.updateMany({
      where: { id },
      data: { status }
    });

    return result.count > 0;
  }

  public async workerExists(id: string): Promise<boolean> {
    const count = await this.prisma.workerInstance.count({
      where: { id }
    });

    return count > 0;
  }

  public async getWorkerLogs(_id: string): Promise<string[]> {
    void _id;
    return [];
  }

  public async createAuthContext(input: CreateAuthContextInput): Promise<AuthContextEntity> {
    const created = await this.prisma.authContext.create({
      data: {
        label: input.label,
        type: input.type,
        provider: input.provider,
        usage_policy: input.usage_policy as Prisma.InputJsonValue | undefined,
        limit_policy: input.limit_policy as Prisma.InputJsonValue | undefined
      }
    });

    return toAuthContextEntity(created);
  }

  public async listAuthContexts(): Promise<AuthContextEntity[]> {
    const authContexts = await this.prisma.authContext.findMany({
      orderBy: { created_at: "desc" }
    });

    return authContexts.map((authContext) => toAuthContextEntity(authContext));
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
    const existing = await this.prisma.authContext.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.authContext.update({
      where: { id },
      data: {
        label: patch.label,
        type: patch.type,
        provider: patch.provider,
        usage_policy: patch.usage_policy as Prisma.InputJsonValue | undefined,
        limit_policy: patch.limit_policy as Prisma.InputJsonValue | undefined,
        is_enabled: patch.is_enabled,
        notes: patch.notes
      }
    });

    return toAuthContextEntity(updated);
  }

  public async disableAuthContext(id: string): Promise<boolean> {
    const result = await this.prisma.authContext.updateMany({
      where: { id },
      data: { is_enabled: false }
    });

    return result.count > 0;
  }

  public async listTaskArtifacts(taskId: string): Promise<ArtifactEntity[]> {
    const artifacts = await this.prisma.artifact.findMany({
      where: { task_id: taskId },
      orderBy: { created_at: "desc" }
    });

    return artifacts.map((artifact) => toArtifactEntity(artifact));
  }

  public async getArtifactById(id: string): Promise<ArtifactEntity | null> {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id }
    });

    if (!artifact) {
      return null;
    }

    return toArtifactEntity(artifact);
  }

  public async createAuthProfile(input: CreateAuthProfileInput): Promise<AuthProfileEntity> {
    for (let attempt = 0; attempt < AUTH_PROFILE_ID_CREATE_ATTEMPTS; attempt += 1) {
      const candidateId = buildAuthProfileIdCandidate(input.label);
      try {
        const created = await this.prisma.chatGptAuthProfile.create({
          data: {
            id: candidateId,
            label: input.label,
            status: input.status,
            checksum: input.checksum,
            storage_path: input.storage_path,
            meta_json: input.meta_json as Prisma.InputJsonValue,
            uploaded_by: input.uploaded_by
          }
        });
        return toAuthProfileEntity(created);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          continue;
        }
        throw error;
      }
    }

    throw new Error("Failed to allocate unique auth profile id");
  }

  public async listAuthProfiles(): Promise<AuthProfileEntity[]> {
    const profiles = await this.prisma.chatGptAuthProfile.findMany({
      orderBy: { created_at: "desc" }
    });

    return profiles.map((profile) => toAuthProfileEntity(profile));
  }

  public async getActiveAuthProfile(): Promise<AuthProfileEntity | null> {
    const active = await this.prisma.chatGptAuthProfile.findFirst({
      where: { status: "active" },
      orderBy: { updated_at: "desc" }
    });

    if (!active) {
      return null;
    }

    return toAuthProfileEntity(active);
  }

  public async getActiveAuthProfileRuntime(): Promise<ActiveAuthProfileRuntimeEntity | null> {
    const active = await this.prisma.chatGptAuthProfile.findFirst({
      where: { status: "active" },
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        label: true,
        status: true,
        checksum: true,
        storage_path: true
      }
    });

    if (!active) {
      return null;
    }

    return {
      id: active.id,
      label: active.label,
      status: "active",
      checksum: active.checksum,
      storage_path: active.storage_path
    };
  }

  public async getAuthProfileRuntimeById(id: string): Promise<{
    id: string;
    label: string;
    status: "active" | "inactive" | "blocked";
    checksum: string;
    storage_path: string;
  } | null> {
    const profile = await this.prisma.chatGptAuthProfile.findUnique({
      where: { id },
      select: {
        id: true,
        label: true,
        status: true,
        checksum: true,
        storage_path: true
      }
    });

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
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.chatGptAuthProfile.findUnique({ where: { id } });
      if (!target) {
        return null;
      }

      await tx.chatGptAuthProfile.updateMany({
        where: { status: "active", id: { not: id } },
        data: { status: "inactive" }
      });

      const activated = await tx.chatGptAuthProfile.update({
        where: { id },
        data: {
          status: "active",
          activated_by: activatedBy
        }
      });

      return toAuthProfileEntity(activated);
    });
  }

  public async deactivateAuthProfile(id: string): Promise<boolean> {
    const result = await this.prisma.chatGptAuthProfile.updateMany({
      where: { id },
      data: {
        status: "inactive",
        activated_by: null
      }
    });

    return result.count > 0;
  }

  public async createAuthSwitchEvent(input: CreateAuthSwitchEventInput): Promise<AuthSwitchEventEntity> {
    const created = await this.prisma.authSwitchEvent.create({
      data: {
        module_key: input.module_key,
        from_auth_profile_id: input.from_auth_profile_id ?? null,
        to_auth_profile_id: input.to_auth_profile_id ?? null,
        reason: input.reason,
        switch_scope: input.switch_scope ?? "global",
        status: input.status as PrismaSwitchEventStatus,
        details_json: (input.details_json ?? null) as
          | Prisma.InputJsonValue
          | Prisma.NullableJsonNullValueInput,
        started_at: input.started_at ?? new Date(),
        ended_at: input.ended_at ?? null
      }
    });

    return toAuthSwitchEventEntity({
      id: created.id,
      module_key: created.module_key,
      from_auth_profile_id: created.from_auth_profile_id,
      to_auth_profile_id: created.to_auth_profile_id,
      reason: created.reason,
      status: created.status,
      started_at: created.started_at,
      ended_at: created.ended_at
    });
  }

  public async listAuthSwitchEvents(
    options?: ListAuthSwitchEventsOptions
  ): Promise<AuthSwitchEventEntity[]> {
    const limit = Math.max(1, Math.min(options?.limit ?? 200, 500));
    const where: Prisma.AuthSwitchEventWhereInput = {};

    if (options?.status) {
      where.status = options.status as PrismaSwitchEventStatus;
    }

    if (options?.reason) {
      where.reason = options.reason;
    }

    if (options?.profile_id) {
      where.OR = [
        { from_auth_profile_id: options.profile_id },
        { to_auth_profile_id: options.profile_id }
      ];
    }

    const events = await this.prisma.authSwitchEvent.findMany({
      where,
      take: limit,
      orderBy: { started_at: "desc" }
    });

    return events.map((event) =>
      toAuthSwitchEventEntity({
        id: event.id,
        module_key: event.module_key,
        from_auth_profile_id: event.from_auth_profile_id,
        to_auth_profile_id: event.to_auth_profile_id,
        reason: event.reason,
        status: event.status,
        started_at: event.started_at,
        ended_at: event.ended_at
      })
    );
  }

  public async listHeldTasks(): Promise<TaskEntity[]> {
    const tasks = await this.prisma.task.findMany({
      where: { status: "WAITING_LIMIT" },
      orderBy: { created_at: "desc" }
    });

    return tasks.map((task) => toTaskEntity(task));
  }

  public async listCustomModuleConfigs(): Promise<CustomModuleConfigEntity[]> {
    const moduleConfigs = await this.prisma.customModuleConfig.findMany({
      orderBy: { updated_at: "desc" }
    });

    return moduleConfigs.map((moduleConfig) => toModuleConfigEntity(moduleConfig));
  }

  public async getCustomModuleConfig(key: string): Promise<CustomModuleConfigEntity | null> {
    const moduleConfig = await this.prisma.customModuleConfig.findUnique({
      where: { module_key: key }
    });

    if (!moduleConfig) {
      return null;
    }

    return toModuleConfigEntity(moduleConfig);
  }

  public async listModuleExecutions(moduleKey: string): Promise<ModuleExecutionEntity[]> {
    const executions = await this.prisma.moduleExecution.findMany({
      where: { module_key: moduleKey },
      orderBy: { started_at: "desc" },
      take: 100
    });

    return executions.map((execution) => toModuleExecutionEntity(execution));
  }

  public async getModuleExecutionByIdempotency(
    moduleKey: string,
    idempotencyKey: string
  ): Promise<ModuleExecutionEntity | null> {
    const execution = await this.prisma.moduleExecution.findFirst({
      where: {
        module_key: moduleKey,
        idempotency_key: idempotencyKey
      }
    });

    if (!execution) {
      return null;
    }

    return toModuleExecutionEntity(execution);
  }

  public async createModuleExecution(input: CreateModuleExecutionInput): Promise<ModuleExecutionEntity> {
    const created = await this.prisma.moduleExecution.create({
      data: {
        module_key: input.module_key,
        event_type: input.event_type,
        status: input.status,
        trace_id: input.trace_id,
        idempotency_key: input.idempotency_key ?? null,
        details_json: (input.details_json ?? null) as
          | Prisma.InputJsonValue
          | Prisma.NullableJsonNullValueInput,
        started_at: input.started_at ?? new Date(),
        ended_at: input.ended_at ?? null
      }
    });

    return toModuleExecutionEntity(created);
  }

  public async createCustomModuleConfig(input: {
    module_key: string;
    is_enabled: boolean;
    scope: string;
    config_json: Record<string, unknown>;
    updated_by: string;
  }): Promise<CustomModuleConfigEntity> {
    const created = await this.prisma.customModuleConfig.create({
      data: {
        module_key: input.module_key,
        is_enabled: input.is_enabled,
        scope: input.scope,
        config_json: input.config_json as Prisma.InputJsonValue,
        updated_by: input.updated_by
      }
    });

    return toModuleConfigEntity(created);
  }

  public async updateCustomModuleConfig(
    key: string,
    patch: {
      is_enabled?: boolean;
      config_json?: Record<string, unknown>;
      updated_by: string;
    }
  ): Promise<CustomModuleConfigEntity | null> {
    const existing = await this.prisma.customModuleConfig.findUnique({ where: { module_key: key } });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.customModuleConfig.update({
      where: { module_key: key },
      data: {
        is_enabled: patch.is_enabled,
        config_json: patch.config_json as Prisma.InputJsonValue | undefined,
        updated_by: patch.updated_by
      }
    });

    return toModuleConfigEntity(updated);
  }
}
