CREATE TABLE mcp_key_template_constraints (
  id TEXT PRIMARY KEY,
  key_id TEXT NOT NULL REFERENCES mcp_api_keys(id) ON DELETE CASCADE,
  agent_template_id TEXT NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(key_id, agent_template_id)
);

CREATE INDEX idx_mcp_key_template_constraints_template_created
  ON mcp_key_template_constraints(agent_template_id, created_at DESC);

CREATE TABLE mcp_auth_audit_events (
  id TEXT PRIMARY KEY,
  key_id TEXT REFERENCES mcp_api_keys(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  trace_id TEXT,
  request_meta_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mcp_auth_audit_events_key_created
  ON mcp_auth_audit_events(key_id, created_at DESC);

CREATE INDEX idx_mcp_auth_audit_events_trace
  ON mcp_auth_audit_events(trace_id);
