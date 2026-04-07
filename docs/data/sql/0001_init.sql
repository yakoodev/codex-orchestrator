-- Baseline SQL specification for MVP (PostgreSQL).
-- Source of truth is synchronized with docs/data/prisma/schema.prisma.

CREATE TYPE task_status AS ENUM (
  'NEW','QUEUED','ASSIGNED','STARTING','RUNNING','WAITING_APPROVAL',
  'WAITING_LIMIT','DRAINING_ACTIVE','SWITCHING_AUTH','WAITING_USER',
  'INTERRUPTING','INTERRUPTED','REPLANNING','BLOCKED',
  'FAILED_RETRYABLE','FAILED_TERMINAL','DONE','ARCHIVED'
);

CREATE TYPE worker_runtime_mode AS ENUM ('ondemand','warm_pool','dedicated');
CREATE TYPE worker_status AS ENUM ('READY','BUSY','STOPPED','FAILED','DISABLED');
CREATE TYPE auth_context_type AS ENUM ('apikey','chatgpt','chatgptAuthTokens');
CREATE TYPE artifact_type AS ENUM ('diff','patch','log','test_report','screenshot','summary','trace');
CREATE TYPE intervention_type AS ENUM ('steer','interrupt','pause','resume','replan','approve','reject');
CREATE TYPE limit_status AS ENUM ('NORMAL','DEGRADED','BLOCKED');
CREATE TYPE profile_status AS ENUM ('active','inactive','blocked');
CREATE TYPE switch_event_status AS ENUM ('started','completed','failed','skipped');
CREATE TYPE schedule_scope AS ENUM ('global','project');
CREATE TYPE schedule_overlap_policy AS ENUM ('one_active_skip');
CREATE TYPE schedule_misfire_policy AS ENUM ('recompute_due_on_restart');
CREATE TYPE scheduled_run_status AS ENUM ('started','completed','failed','skipped_due_to_overlap');
CREATE TYPE pack_source_type AS ENUM ('git','zip');
CREATE TYPE pack_materialize_status AS ENUM ('registered','materialized','failed');
CREATE TYPE delegation_status AS ENUM ('requested','accepted','running','completed','failed','cancelled');

CREATE TABLE pack_registry_entries (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  role TEXT NOT NULL,
  capabilities_json JSONB NOT NULL,
  source_type pack_source_type NOT NULL,
  source_ref TEXT NOT NULL,
  pinned_version TEXT NOT NULL,
  manifest_json JSONB NOT NULL,
  materialize_status pack_materialize_status NOT NULL DEFAULT 'registered',
  cached_path TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  registered_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pack_id, pinned_version)
);
CREATE INDEX idx_pack_registry_entries_enabled_role ON pack_registry_entries(is_enabled, role);

CREATE TABLE agent_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  model TEXT NOT NULL,
  auth_context_id TEXT,
  pack_registry_entry_id TEXT REFERENCES pack_registry_entries(id) ON DELETE SET NULL,
  system_prompt TEXT NOT NULL,
  instructions_md TEXT,
  sandbox_policy TEXT NOT NULL,
  approval_policy TEXT NOT NULL,
  cwd_policy TEXT,
  input_schema JSONB,
  output_schema JSONB,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE worker_instances (
  id TEXT PRIMARY KEY,
  agent_template_id TEXT NOT NULL REFERENCES agent_templates(id),
  status worker_status NOT NULL,
  runtime_mode worker_runtime_mode NOT NULL,
  codex_home_path TEXT NOT NULL,
  workspace_path TEXT NOT NULL,
  cwd TEXT,
  thread_id TEXT,
  current_task_id TEXT,
  pid_or_container TEXT,
  started_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ
);
CREATE INDEX idx_worker_instances_status ON worker_instances(status);

CREATE TABLE auth_contexts (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  type auth_context_type NOT NULL,
  provider TEXT NOT NULL,
  usage_policy JSONB,
  limit_policy JSONB,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT NOT NULL,
  project_id TEXT NOT NULL,
  repo_id TEXT NOT NULL,
  branch TEXT,
  priority INT NOT NULL DEFAULT 100,
  requested_pipeline TEXT,
  status task_status NOT NULL,
  hold_reason TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_project_repo ON tasks(project_id, repo_id);

CREATE TABLE subtasks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  parent_subtask_id TEXT,
  role_required TEXT NOT NULL,
  title TEXT NOT NULL,
  acceptance_criteria TEXT,
  depends_on JSONB,
  status TEXT NOT NULL,
  position INT NOT NULL
);
CREATE INDEX idx_subtasks_task_position ON subtasks(task_id, position);

CREATE TABLE task_runs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  subtask_id TEXT,
  worker_instance_id TEXT NOT NULL REFERENCES worker_instances(id),
  thread_id TEXT,
  turn_id TEXT,
  status TEXT NOT NULL,
  input_summary TEXT,
  result_summary TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  token_estimate INT,
  cost_estimate NUMERIC(12,4)
);
CREATE INDEX idx_task_runs_task_started ON task_runs(task_id, started_at);
CREATE INDEX idx_task_runs_worker_started ON task_runs(worker_instance_id, started_at);

CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  task_run_id TEXT REFERENCES task_runs(id) ON DELETE SET NULL,
  type artifact_type NOT NULL,
  path TEXT NOT NULL,
  meta_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_artifacts_task_created ON artifacts(task_id, created_at);

CREATE TABLE interventions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  task_run_id TEXT REFERENCES task_runs(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  type intervention_type NOT NULL,
  payload JSONB,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_interventions_task_created ON interventions(task_id, created_at);

CREATE TABLE limit_snapshots (
  id TEXT PRIMARY KEY,
  auth_context_id TEXT NOT NULL REFERENCES auth_contexts(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  used_percent NUMERIC(5,2) NOT NULL,
  weekly_remaining_pct NUMERIC(5,2),
  five_hour_remaining_pct NUMERIC(5,2),
  window_duration_mins INT NOT NULL,
  resets_at TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,
  status limit_status NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_limit_snapshots_context_captured ON limit_snapshots(auth_context_id, captured_at);

CREATE TABLE file_locks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  repo_id TEXT NOT NULL,
  path_pattern TEXT NOT NULL,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_instance_id TEXT NOT NULL REFERENCES worker_instances(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_file_locks_project_repo_expires ON file_locks(project_id, repo_id, expires_at);

CREATE TABLE custom_module_configs (
  id TEXT PRIMARY KEY,
  module_key TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  scope TEXT NOT NULL,
  config_json JSONB NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chatgpt_auth_profiles (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  status profile_status NOT NULL,
  storage_path TEXT NOT NULL,
  checksum TEXT NOT NULL,
  meta_json JSONB,
  uploaded_by TEXT NOT NULL,
  activated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chatgpt_auth_profiles_status ON chatgpt_auth_profiles(status);

CREATE TABLE auth_switch_events (
  id TEXT PRIMARY KEY,
  module_key TEXT NOT NULL,
  from_auth_profile_id TEXT REFERENCES chatgpt_auth_profiles(id) ON DELETE SET NULL,
  to_auth_profile_id TEXT REFERENCES chatgpt_auth_profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  switch_scope TEXT NOT NULL,
  status switch_event_status NOT NULL,
  details_json JSONB,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ
);
CREATE INDEX idx_auth_switch_events_status_started ON auth_switch_events(status, started_at);

CREATE TABLE scheduled_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scope schedule_scope NOT NULL,
  project_id TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  rule_ast JSONB NOT NULL,
  target_agent_template_id TEXT REFERENCES agent_templates(id) ON DELETE SET NULL,
  fallback_role TEXT,
  overlap_policy schedule_overlap_policy NOT NULL,
  misfire_policy schedule_misfire_policy NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_scheduled_rules_scope_enabled ON scheduled_rules(scope, is_enabled);
CREATE INDEX idx_scheduled_rules_project_enabled ON scheduled_rules(project_id, is_enabled);

CREATE TABLE scheduled_runs (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL REFERENCES scheduled_rules(id) ON DELETE CASCADE,
  created_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  status scheduled_run_status NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  skip_reason TEXT,
  trace_id TEXT NOT NULL,
  idempotency_key TEXT,
  result_json JSONB
);
CREATE INDEX idx_scheduled_runs_rule_started ON scheduled_runs(rule_id, started_at);
CREATE INDEX idx_scheduled_runs_created_task ON scheduled_runs(created_task_id);
CREATE UNIQUE INDEX uq_scheduled_runs_rule_idempotency
  ON scheduled_runs(rule_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE delegation_requests (
  id TEXT PRIMARY KEY,
  requester_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  requester_task_run_id TEXT REFERENCES task_runs(id) ON DELETE SET NULL,
  capability TEXT NOT NULL,
  target_selector_json JSONB NOT NULL,
  payload_json JSONB NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  status delegation_status NOT NULL,
  target_agent_template_id TEXT REFERENCES agent_templates(id) ON DELETE SET NULL,
  target_worker_instance_id TEXT REFERENCES worker_instances(id) ON DELETE SET NULL,
  result_summary TEXT,
  trace_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);
CREATE INDEX idx_delegation_requests_status_created ON delegation_requests(status, created_at);
CREATE INDEX idx_delegation_requests_task_created ON delegation_requests(requester_task_id, created_at);
CREATE INDEX idx_delegation_requests_target_status ON delegation_requests(target_agent_template_id, status);
