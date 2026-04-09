CREATE TYPE mcp_api_key_status AS ENUM (
  'active',
  'disabled',
  'revoked'
);

CREATE TYPE mcp_key_acl_effect AS ENUM (
  'allow'
);

CREATE TABLE mcp_api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  status mcp_api_key_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  meta_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mcp_api_keys_status_updated
  ON mcp_api_keys(status, updated_at DESC);

CREATE INDEX idx_mcp_api_keys_expires_at
  ON mcp_api_keys(expires_at);

CREATE TABLE mcp_key_acl_rules (
  id TEXT PRIMARY KEY,
  key_id TEXT NOT NULL REFERENCES mcp_api_keys(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  effect mcp_key_acl_effect NOT NULL DEFAULT 'allow',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(key_id, tool_name)
);

CREATE INDEX idx_mcp_key_acl_rules_key_created
  ON mcp_key_acl_rules(key_id, created_at DESC);

CREATE TABLE mcp_key_profile_bindings (
  id TEXT PRIMARY KEY,
  key_id TEXT NOT NULL REFERENCES mcp_api_keys(id) ON DELETE CASCADE,
  agent_profile_id TEXT NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(key_id, agent_profile_id)
);

CREATE INDEX idx_mcp_key_profile_bindings_profile_created
  ON mcp_key_profile_bindings(agent_profile_id, created_at DESC);
