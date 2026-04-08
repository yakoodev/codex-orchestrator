import {
  AuthContextType as PrismaAuthContextType,
  ArtifactType as PrismaArtifactType,
  DelegationStatus as PrismaDelegationStatus,
  InterventionType as PrismaInterventionType,
  ModuleExecutionStatus as PrismaModuleExecutionStatus,
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
  AgentMemoryEntryEntity,
  AgentTemplateEntity,
  ArtifactEntity,
  AuthContextEntity,
  AuthContextType,
  AuthProfileEntity,
  AuthSwitchEventEntity,
  CreateAgentMemoryEntryInput,
  CreateAuthProfileInput,
  CreateAuthSwitchEventInput,
  CreateAgentTemplateInput,
  CreateAuthContextInput,
  CreateDelegationRequestInput,
  CreateInterventionInput,
  CreateModuleExecutionInput,
  CreateScheduledRuleInput,
  CreateScheduledRunInput,
  CreatePackRegistryInput,
  CreateTaskInput,
  CustomModuleConfigEntity,
  DelegationRequestEntity,
  ModuleExecutionEntity,
  PackRegistryEntity,
  Persistence,
  ScheduledRuleEntity,
  ScheduledRunEntity,
  ScheduleMisfirePolicy,
  ScheduleOverlapPolicy,
  ScheduleScope,
  ScheduledRunStatus,
  TaskEntity,
  WorkerEntity
} from "./contracts";
import type { TaskStatus } from "../types";

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

export class PrismaPersistence implements Persistence {
  public constructor(private readonly prisma: PrismaClient) {}

  public async pingDb(): Promise<void> {
    await this.prisma.$queryRawUnsafe("SELECT 1");
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
    const created = await this.prisma.chatGptAuthProfile.create({
      data: {
        label: input.label,
        status: input.status,
        checksum: input.checksum,
        storage_path: input.storage_path,
        meta_json: input.meta_json as Prisma.InputJsonValue,
        uploaded_by: input.uploaded_by
      }
    });

    return toAuthProfileEntity(created);
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

  public async listAuthSwitchEvents(): Promise<AuthSwitchEventEntity[]> {
    const events = await this.prisma.authSwitchEvent.findMany({
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
