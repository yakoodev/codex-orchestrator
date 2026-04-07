ALTER TABLE module_executions
  ADD COLUMN trace_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN idempotency_key TEXT,
  ADD COLUMN details_json JSONB;

CREATE UNIQUE INDEX uq_module_executions_module_idempotency
  ON module_executions(module_key, idempotency_key);
