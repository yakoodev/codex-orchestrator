export interface TaskCreateRequest {
  title?: unknown;
  description?: unknown;
  project_id?: unknown;
  agent_profile_id?: unknown;
  priority?: unknown;
}

export interface ProjectCreateRequest {
  key?: unknown;
  name?: unknown;
  description?: unknown;
  github_url?: unknown;
  workspace_path?: unknown;
  meta_json?: unknown;
  is_active?: unknown;
}

export interface ProjectPatchRequest {
  name?: unknown;
  description?: unknown;
  github_url?: unknown;
  workspace_path?: unknown;
  meta_json?: unknown;
  is_active?: unknown;
}

export interface ProjectSecretCreateRequest {
  key?: unknown;
  value?: unknown;
  description?: unknown;
  is_active?: unknown;
  bind_profile_ids?: unknown;
  bind_roles?: unknown;
}

export interface ProjectSecretPatchRequest {
  description?: unknown;
  is_active?: unknown;
}

export interface ProjectSecretRotateRequest {
  value?: unknown;
}

export interface TaskSayRequest {
  message?: unknown;
}

export interface TaskCancelRequest {
  reason?: unknown;
}

export interface AuthContextCreateRequest {
  label?: unknown;
  type?: unknown;
  provider?: unknown;
  usage_policy?: unknown;
  limit_policy?: unknown;
}

export interface AuthContextPatchRequest {
  label?: unknown;
  type?: unknown;
  provider?: unknown;
  usage_policy?: unknown;
  limit_policy?: unknown;
  is_enabled?: unknown;
  notes?: unknown;
}

export interface PackCreateRequest {
  pack_id?: unknown;
  role?: unknown;
  capabilities_json?: unknown;
  source_type?: unknown;
  source_ref?: unknown;
  pinned_version?: unknown;
  manifest_json?: unknown;
}

export interface PackPatchRequest {
  pinned_version?: unknown;
  is_enabled?: unknown;
  source_ref?: unknown;
}

export interface DelegationDispatchRequest {
  requester_task_id?: unknown;
  requester_task_run_id?: unknown;
  capability?: unknown;
  target_selector?: unknown;
  payload?: unknown;
  priority?: unknown;
}

export interface MemoryEntryCreateRequest {
  project_id?: unknown;
  agent_role?: unknown;
  title?: unknown;
  content?: unknown;
  is_active?: unknown;
}

export interface MemoryEntryPatchRequest {
  title?: unknown;
  content?: unknown;
  is_active?: unknown;
}

export interface AgentRequestCreateRequest {
  type?: unknown;
  priority?: unknown;
  project_id?: unknown;
  task_id?: unknown;
  agent_run_id?: unknown;
  agent_profile_id?: unknown;
  requested_by_agent_id?: unknown;
  title?: unknown;
  reason?: unknown;
  request_payload?: unknown;
}

export interface AgentRequestResolveRequest {
  status?: unknown;
  resolution_payload?: unknown;
  claimed_by_governor_id?: unknown;
  resolved_by?: unknown;
}

export interface AgentProfileCreateRequest {
  name?: unknown;
  role?: unknown;
  description?: unknown;
  source_policy?: unknown;
  is_enabled?: unknown;
}

export interface AgentProfilePatchRequest {
  name?: unknown;
  role?: unknown;
  description?: unknown;
  source_policy?: unknown;
  is_enabled?: unknown;
}

export interface AgentProfileMcpBindingRequest {
  is_required?: unknown;
  priority?: unknown;
  config_json?: unknown;
}

export interface AgentProfileScriptUpsertRequest {
  script_type?: unknown;
  content?: unknown;
}

export interface McpServerCreateRequest {
  name?: unknown;
  transport?: unknown;
  endpoint_or_command?: unknown;
  origin_type?: unknown;
  is_approved?: unknown;
  meta_json?: unknown;
}

export interface McpApiKeyCreateRequest {
  name?: unknown;
  expires_at?: unknown;
  meta_json?: unknown;
  acl_tools?: unknown;
  profile_ids?: unknown;
}

export interface McpApiKeyPatchRequest {
  name?: unknown;
  status?: unknown;
  expires_at?: unknown;
  meta_json?: unknown;
  acl_tools?: unknown;
}

export interface McpAuthzEvaluateRequest {
  api_key?: unknown;
  tool_name?: unknown;
  agent_profile_id?: unknown;
  actor?: unknown;
}

export interface ModulePatchRequest {
  is_enabled?: unknown;
  config_json?: unknown;
}

export interface ScheduleCreateRequest {
  name?: unknown;
  scope?: unknown;
  project_id?: unknown;
  rule_ast?: unknown;
  task_agent_profile_id?: unknown;
  task_title?: unknown;
  task_description?: unknown;
  task_priority?: unknown;
  overlap_policy?: unknown;
  misfire_policy?: unknown;
}

export interface SchedulePatchRequest {
  name?: unknown;
  is_enabled?: unknown;
  rule_ast?: unknown;
  task_agent_profile_id?: unknown;
  task_title?: unknown;
  task_description?: unknown;
  task_priority?: unknown;
  overlap_policy?: unknown;
  misfire_policy?: unknown;
}

export interface ScheduleTriggerRequest {
  dry_run_context?: unknown;
}
