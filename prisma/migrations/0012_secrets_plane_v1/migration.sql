CREATE TABLE project_secrets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  key TEXT NOT NULL,
  description TEXT,
  masked_preview TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ciphertext TEXT NOT NULL,
  dek_encrypted TEXT NOT NULL,
  dek_kms_key_id TEXT NOT NULL,
  algo TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  UNIQUE(project_id, key)
);

CREATE INDEX idx_project_secrets_project_active_updated
  ON project_secrets(project_id, is_active, updated_at DESC);

CREATE TABLE project_secret_template_bindings (
  id TEXT PRIMARY KEY,
  secret_id TEXT NOT NULL REFERENCES project_secrets(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(secret_id, template_id)
);

CREATE INDEX idx_project_secret_template_bindings_template_created
  ON project_secret_template_bindings(template_id, created_at DESC);

CREATE TABLE project_secret_role_bindings (
  id TEXT PRIMARY KEY,
  secret_id TEXT NOT NULL REFERENCES project_secrets(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(secret_id, role)
);

CREATE INDEX idx_project_secret_role_bindings_role_created
  ON project_secret_role_bindings(role, created_at DESC);

CREATE TABLE secret_audit_events (
  id TEXT PRIMARY KEY,
  secret_id TEXT REFERENCES project_secrets(id) ON DELETE SET NULL,
  project_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  trace_id TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_secret_audit_events_secret_created
  ON secret_audit_events(secret_id, created_at DESC);

CREATE INDEX idx_secret_audit_events_project_created
  ON secret_audit_events(project_id, created_at DESC);

CREATE INDEX idx_secret_audit_events_trace
  ON secret_audit_events(trace_id);
