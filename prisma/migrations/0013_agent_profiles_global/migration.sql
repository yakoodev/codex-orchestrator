-- Agent profiles become global (project_id is legacy/nullable).
ALTER TABLE "agent_profiles"
  ALTER COLUMN "project_id" DROP NOT NULL;

DROP INDEX IF EXISTS "agent_profiles_project_id_is_enabled_updated_at_idx";
DROP INDEX IF EXISTS "agent_profiles_project_id_role_updated_at_idx";

CREATE INDEX IF NOT EXISTS "agent_profiles_is_enabled_updated_at_idx"
  ON "agent_profiles"("is_enabled", "updated_at");

CREATE INDEX IF NOT EXISTS "agent_profiles_role_is_enabled_updated_at_idx"
  ON "agent_profiles"("role", "is_enabled", "updated_at");

CREATE INDEX IF NOT EXISTS "agent_profiles_project_id_updated_at_idx"
  ON "agent_profiles"("project_id", "updated_at");
