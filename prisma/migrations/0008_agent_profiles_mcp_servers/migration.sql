CREATE TYPE agent_profile_source_policy AS ENUM (
  'catalog_only',
  'catalog_plus_custom',
  'custom_only'
);

CREATE TYPE mcp_server_transport AS ENUM (
  'stdio',
  'http'
);

CREATE TYPE mcp_server_origin_type AS ENUM (
  'built_in',
  'catalog',
  'custom'
);

CREATE TYPE agent_profile_script_os AS ENUM (
  'windows',
  'linux',
  'macos'
);

CREATE TYPE agent_profile_script_type AS ENUM (
  'instruction',
  'shell'
);

CREATE TABLE agent_profiles (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  source_policy agent_profile_source_policy NOT NULL DEFAULT 'catalog_only',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_profiles_project_enabled_updated
  ON agent_profiles(project_id, is_enabled, updated_at DESC);

CREATE INDEX idx_agent_profiles_project_role_updated
  ON agent_profiles(project_id, role, updated_at DESC);

CREATE TABLE mcp_server_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  transport mcp_server_transport NOT NULL,
  endpoint_or_command TEXT NOT NULL,
  origin_type mcp_server_origin_type NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  meta_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mcp_server_registry_origin_approved_updated
  ON mcp_server_registry(origin_type, is_approved, updated_at DESC);

CREATE TABLE agent_profile_mcp_server_bindings (
  id TEXT PRIMARY KEY,
  agent_profile_id TEXT NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  mcp_server_id TEXT NOT NULL REFERENCES mcp_server_registry(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  priority INT NOT NULL DEFAULT 100,
  config_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_profile_id, mcp_server_id)
);

CREATE INDEX idx_agent_profile_mcp_bindings_profile_priority_updated
  ON agent_profile_mcp_server_bindings(agent_profile_id, priority, updated_at DESC);

CREATE TABLE agent_profile_script_sets (
  id TEXT PRIMARY KEY,
  agent_profile_id TEXT NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  os agent_profile_script_os NOT NULL,
  script_type agent_profile_script_type NOT NULL DEFAULT 'instruction',
  content TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_profile_id, os)
);

CREATE INDEX idx_agent_profile_script_sets_profile_updated
  ON agent_profile_script_sets(agent_profile_id, updated_at DESC);
