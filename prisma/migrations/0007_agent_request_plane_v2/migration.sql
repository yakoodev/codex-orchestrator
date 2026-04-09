CREATE TYPE agent_request_type AS ENUM (
  'mcp_server_attach',
  'mcp_tool_acl',
  'script_set',
  'runtime_dependency',
  'other'
);

CREATE TYPE agent_request_status AS ENUM (
  'open',
  'in_progress',
  'resolved_by_agent',
  'blocked_agent',
  'resolved_manual',
  'rejected_manual'
);

CREATE TABLE agent_requests (
  id TEXT PRIMARY KEY,
  type agent_request_type NOT NULL,
  status agent_request_status NOT NULL DEFAULT 'open',
  priority INT NOT NULL DEFAULT 100,
  project_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  agent_run_id TEXT,
  agent_profile_id TEXT,
  agent_template_id TEXT,
  requested_by_agent_id TEXT,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  request_payload_json JSONB,
  resolution_payload_json JSONB,
  claimed_by_governor_id TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_requests_status_updated
  ON agent_requests(status, updated_at DESC);

CREATE INDEX idx_agent_requests_project_created
  ON agent_requests(project_id, created_at DESC);

CREATE INDEX idx_agent_requests_task_created
  ON agent_requests(task_id, created_at DESC);

CREATE INDEX idx_agent_requests_type_status_created
  ON agent_requests(type, status, created_at DESC);
