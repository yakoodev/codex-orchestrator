CREATE TABLE agent_request_audit_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES agent_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status agent_request_status,
  to_status agent_request_status,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  trace_id TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_request_audit_request_created
  ON agent_request_audit_events(request_id, created_at DESC);

CREATE INDEX idx_agent_request_audit_trace
  ON agent_request_audit_events(trace_id);
