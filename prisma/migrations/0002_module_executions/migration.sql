CREATE TYPE module_execution_status AS ENUM (
  'started',
  'completed',
  'failed'
);

CREATE TABLE module_executions (
  id TEXT PRIMARY KEY,
  module_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status module_execution_status NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_module_executions_module_started
  ON module_executions(module_key, started_at);
