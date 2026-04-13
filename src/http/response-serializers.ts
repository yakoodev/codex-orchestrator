import type {
  AgentProfileEntity,
  AgentProfileMcpServerBindingEntity,
  AgentProfileScriptSetEntity,
  AgentRequestAuditEventEntity,
  AgentRequestEntity,
  AgentRequestStatus,
  ArtifactEntity,
  AuthContextEntity,
  AuthProfileEntity,
  DelegationRequestEntity,
  McpApiKeyEntity,
  McpKeyAclRuleEntity,
  McpKeyProfileBindingEntity,
  McpKeyProfileConstraintEntity,
  McpServerRegistryEntity,
  ModuleExecutionEntity,
  PackRegistryEntity,
  Persistence,
  ProjectEntity,
  ProjectSecretEntity,
  ProjectSecretProfileBindingEntity,
  ProjectSecretRoleBindingEntity,
  ProjectSummaryEntity,
  ScheduledRuleEntity,
  ScheduledRunEntity,
  TaskEntity,
  WorkerEntity
} from "../runtime/contracts";

export function projectToResponse(project: ProjectEntity): Record<string, unknown> {
  return {
    id: project.id,
    key: project.key,
    name: project.name,
    description: project.description,
    github_url: project.github_url,
    workspace_path: project.workspace_path,
    meta_json: project.meta_json,
    is_active: project.is_active,
    created_at: project.created_at,
    updated_at: project.updated_at
  };
}

export function projectSummaryToResponse(summary: ProjectSummaryEntity): Record<string, unknown> {
  return {
    project: projectToResponse(summary.project),
    tasks_total: summary.tasks_total,
    tasks_by_status: summary.tasks_by_status,
    active_memory_entries: summary.active_memory_entries,
    switch_events_recent: summary.switch_events_recent,
    switch_events_window_hours: summary.switch_events_window_hours,
    last_switch_event_at: summary.last_switch_event_at
  };
}

export function projectSecretToResponse(secret: ProjectSecretEntity): Record<string, unknown> {
  return {
    id: secret.id,
    project_id: secret.project_id,
    key: secret.key,
    description: secret.description,
    masked_preview: secret.masked_preview,
    is_active: secret.is_active,
    algo: secret.algo,
    version: secret.version,
    created_by: secret.created_by,
    updated_by: secret.updated_by,
    created_at: secret.created_at,
    updated_at: secret.updated_at,
    rotated_at: secret.rotated_at,
    revoked_at: secret.revoked_at
  };
}

export function projectSecretProfileBindingToResponse(
  binding: ProjectSecretProfileBindingEntity
): Record<string, unknown> {
  return {
    id: binding.id,
    secret_id: binding.secret_id,
    profile_id: binding.profile_id,
    created_by: binding.created_by,
    created_at: binding.created_at
  };
}

export function projectSecretRoleBindingToResponse(
  binding: ProjectSecretRoleBindingEntity
): Record<string, unknown> {
  return {
    id: binding.id,
    secret_id: binding.secret_id,
    role: binding.role,
    created_by: binding.created_by,
    created_at: binding.created_at
  };
}

export async function buildProjectSecretResponse(
  persistence: Persistence,
  secret: ProjectSecretEntity
): Promise<Record<string, unknown>> {
  const [profileBindings, roleBindings] = await Promise.all([
    persistence.listProjectSecretProfileBindings(secret.id),
    persistence.listProjectSecretRoleBindings(secret.id)
  ]);

  return {
    ...projectSecretToResponse(secret),
    profile_bindings: profileBindings.map((item) =>
      projectSecretProfileBindingToResponse(item)
    ),
    role_bindings: roleBindings.map((item) => projectSecretRoleBindingToResponse(item))
  };
}

export function taskToResponse(task: TaskEntity): Record<string, unknown> {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    project_id: task.project_id,
    agent_profile_id: task.agent_profile_id,
    cancel_reason: task.cancel_reason,
    cancelled_at: task.cancelled_at,
    created_at: task.created_at,
    updated_at: task.updated_at
  };
}

export function workerToResponse(worker: WorkerEntity): Record<string, unknown> {
  return {
    id: worker.id,
    status: worker.status,
    runtime_mode: worker.runtime_mode,
    current_task_id: worker.current_task_id
  };
}

export function authContextToResponse(authContext: AuthContextEntity): Record<string, unknown> {
  return {
    id: authContext.id,
    label: authContext.label,
    type: authContext.type,
    is_enabled: authContext.is_enabled
  };
}

export function artifactToResponse(artifact: ArtifactEntity): Record<string, unknown> {
  return {
    id: artifact.id,
    task_id: artifact.task_id,
    type: artifact.type,
    path: artifact.path
  };
}

export function packToResponse(pack: PackRegistryEntity): Record<string, unknown> {
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

export function delegationToResponse(delegation: DelegationRequestEntity): Record<string, unknown> {
  return {
    id: delegation.id,
    requester_task_id: delegation.requester_task_id,
    requester_task_run_id: delegation.requester_task_run_id,
    capability: delegation.capability,
    target_selector: delegation.target_selector,
    payload: delegation.payload,
    priority: delegation.priority,
    status: delegation.status,
    target_agent_profile_id: delegation.target_agent_profile_id,
    target_worker_instance_id: delegation.target_worker_instance_id,
    result_summary: delegation.result_summary,
    input_prompt: delegation.input_prompt,
    selected_auth_profile_id: delegation.selected_auth_profile_id,
    execution_mode: delegation.execution_mode,
    execution_log: delegation.execution_log,
    execution_meta_json: delegation.execution_meta_json,
    trace_id: delegation.trace_id,
    created_at: delegation.created_at,
    started_at: delegation.started_at,
    ended_at: delegation.ended_at
  };
}

export function agentRequestToResponse(agentRequest: AgentRequestEntity): Record<string, unknown> {
  return {
    id: agentRequest.id,
    type: agentRequest.type,
    status: agentRequest.status,
    priority: agentRequest.priority,
    project_id: agentRequest.project_id,
    task_id: agentRequest.task_id,
    agent_run_id: agentRequest.agent_run_id,
    agent_profile_id: agentRequest.agent_profile_id,
    requested_by_agent_id: agentRequest.requested_by_agent_id,
    title: agentRequest.title,
    reason: agentRequest.reason,
    request_payload: agentRequest.request_payload_json,
    resolution_payload: agentRequest.resolution_payload_json,
    claimed_by_governor_id: agentRequest.claimed_by_governor_id,
    resolved_by: agentRequest.resolved_by,
    resolved_at: agentRequest.resolved_at,
    created_by: agentRequest.created_by,
    created_at: agentRequest.created_at,
    updated_at: agentRequest.updated_at
  };
}

export function agentRequestAuditEventToResponse(
  event: AgentRequestAuditEventEntity
): Record<string, unknown> {
  return {
    id: event.id,
    request_id: event.request_id,
    event_type: event.event_type,
    from_status: event.from_status,
    to_status: event.to_status,
    actor_type: event.actor_type,
    actor_id: event.actor_id,
    trace_id: event.trace_id,
    metadata_json: event.metadata_json,
    created_at: event.created_at
  };
}

export function getAgentRequestStatusEventType(status: AgentRequestStatus): string {
  if (status === "in_progress") {
    return "request_claimed";
  }
  if (status === "blocked_agent") {
    return "request_blocked_agent";
  }
  if (status === "resolved_by_agent") {
    return "request_resolved_by_agent";
  }
  if (status === "resolved_manual") {
    return "request_resolved_manual";
  }
  if (status === "rejected_manual") {
    return "request_rejected_manual";
  }

  return "request_status_updated";
}

export function agentProfileToResponse(profile: AgentProfileEntity): Record<string, unknown> {
  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    description: profile.description,
    source_policy: profile.source_policy,
    is_enabled: profile.is_enabled,
    created_at: profile.created_at,
    updated_at: profile.updated_at
  };
}

export function mcpServerRegistryToResponse(server: McpServerRegistryEntity): Record<string, unknown> {
  return {
    id: server.id,
    name: server.name,
    transport: server.transport,
    endpoint_or_command: server.endpoint_or_command,
    origin_type: server.origin_type,
    is_approved: server.is_approved,
    meta_json: server.meta_json,
    created_at: server.created_at,
    updated_at: server.updated_at
  };
}

export function agentProfileMcpBindingToResponse(
  binding: AgentProfileMcpServerBindingEntity,
  server?: McpServerRegistryEntity | null
): Record<string, unknown> {
  return {
    id: binding.id,
    agent_profile_id: binding.agent_profile_id,
    mcp_server_id: binding.mcp_server_id,
    is_required: binding.is_required,
    priority: binding.priority,
    config_json: binding.config_json,
    created_at: binding.created_at,
    updated_at: binding.updated_at,
    mcp_server: server ? mcpServerRegistryToResponse(server) : null
  };
}

export function agentProfileScriptSetToResponse(scriptSet: AgentProfileScriptSetEntity): Record<string, unknown> {
  return {
    id: scriptSet.id,
    agent_profile_id: scriptSet.agent_profile_id,
    os: scriptSet.os,
    script_type: scriptSet.script_type,
    content: scriptSet.content,
    version: scriptSet.version,
    created_at: scriptSet.created_at,
    updated_at: scriptSet.updated_at
  };
}

export function mcpApiKeyToResponse(key: McpApiKeyEntity): Record<string, unknown> {
  return {
    id: key.id,
    name: key.name,
    key_prefix: key.key_prefix,
    status: key.status,
    expires_at: key.expires_at,
    last_used_at: key.last_used_at,
    rotated_at: key.rotated_at,
    revoked_at: key.revoked_at,
    created_by: key.created_by,
    updated_by: key.updated_by,
    meta_json: key.meta_json,
    created_at: key.created_at,
    updated_at: key.updated_at
  };
}

export function mcpKeyAclRuleToResponse(rule: McpKeyAclRuleEntity): Record<string, unknown> {
  return {
    id: rule.id,
    key_id: rule.key_id,
    tool_name: rule.tool_name,
    effect: rule.effect,
    created_by: rule.created_by,
    created_at: rule.created_at
  };
}

export function mcpKeyProfileBindingToResponse(binding: McpKeyProfileBindingEntity): Record<string, unknown> {
  return {
    id: binding.id,
    key_id: binding.key_id,
    agent_profile_id: binding.agent_profile_id,
    created_by: binding.created_by,
    created_at: binding.created_at
  };
}

export function mcpKeyProfileConstraintToResponse(
  constraint: McpKeyProfileConstraintEntity
): Record<string, unknown> {
  return {
    id: constraint.id,
    key_id: constraint.key_id,
    agent_profile_id: constraint.agent_profile_id,
    created_by: constraint.created_by,
    created_at: constraint.created_at
  };
}

export async function buildMcpApiKeyResponse(
  persistence: Persistence,
  key: McpApiKeyEntity
): Promise<Record<string, unknown>> {
  const [aclRules, profileBindings, profileConstraints] = await Promise.all([
    persistence.listMcpKeyAclRules(key.id),
    persistence.listMcpKeyProfileBindings(key.id),
    persistence.listMcpKeyProfileConstraints(key.id)
  ]);

  return {
    ...mcpApiKeyToResponse(key),
    acl_rules: aclRules.map((item) => mcpKeyAclRuleToResponse(item)),
    profile_bindings: profileBindings.map((item) => mcpKeyProfileBindingToResponse(item)),
    profile_constraints: profileConstraints.map((item) =>
      mcpKeyProfileConstraintToResponse(item)
    )
  };
}

export function scheduledRuleToResponse(rule: ScheduledRuleEntity): Record<string, unknown> {
  return {
    id: rule.id,
    name: rule.name,
    scope: rule.scope,
    project_id: rule.project_id,
    is_enabled: rule.is_enabled,
    rule_ast: rule.rule_ast,
    task_agent_profile_id: rule.task_agent_profile_id,
    task_title: rule.task_title,
    task_description: rule.task_description,
    task_priority: rule.task_priority,
    overlap_policy: rule.overlap_policy,
    misfire_policy: rule.misfire_policy,
    created_by: rule.created_by,
    created_at: rule.created_at,
    updated_at: rule.updated_at
  };
}

export function scheduledRunToResponse(run: ScheduledRunEntity): Record<string, unknown> {
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

export function moduleExecutionToResponse(execution: ModuleExecutionEntity): Record<string, unknown> {
  return {
    id: execution.id,
    module_key: execution.module_key,
    event_type: execution.event_type,
    status: execution.status,
    started_at: execution.started_at,
    ended_at: execution.ended_at
  };
}

export function toAuthProfileDisplayId(label: string, id: string): string {
  const normalizedLabel = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  const base = (normalizedLabel || "profile").slice(0, 40);
  const compactId = id.toLowerCase().replace(/[^a-z0-9]/g, "");
  const suffix = compactId.slice(-5).padStart(5, "0");
  return `${base}-${suffix}`;
}

export function authProfileToResponse(profile: AuthProfileEntity): Record<string, unknown> {
  return {
    id: profile.id,
    display_id: toAuthProfileDisplayId(profile.label, profile.id),
    label: profile.label,
    status: profile.status,
    checksum: profile.checksum,
    created_at: profile.created_at
  };
}

export { buildDelegationCardsResponse } from "./delegation-cards-response";
