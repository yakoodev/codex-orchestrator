ALTER TABLE delegation_requests
  ADD COLUMN input_prompt TEXT,
  ADD COLUMN selected_auth_profile_id TEXT,
  ADD COLUMN execution_mode TEXT,
  ADD COLUMN execution_log TEXT,
  ADD COLUMN execution_meta_json JSONB;

