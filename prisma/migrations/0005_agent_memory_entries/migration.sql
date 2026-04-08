CREATE TABLE agent_memory_entries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent_role TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_memory_entries_project_role_active_updated
  ON agent_memory_entries(project_id, agent_role, is_active, updated_at DESC);
CREATE INDEX idx_agent_memory_entries_project_updated
  ON agent_memory_entries(project_id, updated_at DESC);
