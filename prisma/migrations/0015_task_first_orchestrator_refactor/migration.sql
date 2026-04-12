-- Task-first breaking migration:
-- 1) hard cleanup legacy operational data (tasks/schedules/delegations)
-- 2) drop legacy repo/branch fields and project github_repo/default_branch
-- 3) enforce explicit executor binding on task and schedule
-- 4) add CANCELLED status and cancel metadata

TRUNCATE TABLE
  "delegation_requests",
  "file_locks",
  "interventions",
  "artifacts",
  "task_runs",
  "subtasks",
  "scheduled_runs",
  "tasks",
  "scheduled_rules"
RESTART IDENTITY;

UPDATE "worker_instances"
SET "current_task_id" = NULL;

DO $$
BEGIN
  ALTER TYPE "task_status" ADD VALUE 'CANCELLED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "projects"
  DROP COLUMN IF EXISTS "github_repo",
  DROP COLUMN IF EXISTS "default_branch";

ALTER TABLE "scheduled_rules" DROP CONSTRAINT IF EXISTS "scheduled_rules_target_agent_template_id_fkey";

ALTER TABLE "scheduled_rules"
  DROP COLUMN IF EXISTS "target_agent_template_id",
  DROP COLUMN IF EXISTS "fallback_role",
  DROP COLUMN IF EXISTS "task_repo_id",
  DROP COLUMN IF EXISTS "task_branch",
  ADD COLUMN "task_agent_profile_id" TEXT NOT NULL,
  ADD COLUMN "task_agent_template_id" TEXT NOT NULL;

DROP INDEX IF EXISTS "idx_tasks_project_repo";
DROP INDEX IF EXISTS "idx_tasks_status";

ALTER TABLE "tasks"
  DROP COLUMN IF EXISTS "repo_id",
  DROP COLUMN IF EXISTS "branch",
  ADD COLUMN "agent_profile_id" TEXT NOT NULL,
  ADD COLUMN "agent_template_id" TEXT NOT NULL,
  ADD COLUMN "cancel_reason" TEXT,
  ADD COLUMN "cancelled_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "tasks_status_created_at_idx"
  ON "tasks"("status", "created_at");
CREATE INDEX IF NOT EXISTS "tasks_project_id_created_at_idx"
  ON "tasks"("project_id", "created_at");
CREATE INDEX IF NOT EXISTS "tasks_agent_profile_id_status_created_at_idx"
  ON "tasks"("agent_profile_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "tasks_agent_template_id_status_created_at_idx"
  ON "tasks"("agent_template_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "scheduled_rules_task_agent_profile_id_is_enabled_updated_at_idx"
  ON "scheduled_rules"("task_agent_profile_id", "is_enabled", "updated_at");
CREATE INDEX IF NOT EXISTS "scheduled_rules_task_agent_template_id_is_enabled_updated_at_idx"
  ON "scheduled_rules"("task_agent_template_id", "is_enabled", "updated_at");

CREATE UNIQUE INDEX IF NOT EXISTS "scheduled_runs_rule_id_idempotency_key_key"
  ON "scheduled_runs"("rule_id", "idempotency_key");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_agent_profile_id_fkey'
  ) THEN
    ALTER TABLE "tasks"
      ADD CONSTRAINT "tasks_agent_profile_id_fkey"
      FOREIGN KEY ("agent_profile_id")
      REFERENCES "agent_profiles"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_agent_template_id_fkey'
  ) THEN
    ALTER TABLE "tasks"
      ADD CONSTRAINT "tasks_agent_template_id_fkey"
      FOREIGN KEY ("agent_template_id")
      REFERENCES "agent_templates"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scheduled_rules_task_agent_profile_id_fkey'
  ) THEN
    ALTER TABLE "scheduled_rules"
      ADD CONSTRAINT "scheduled_rules_task_agent_profile_id_fkey"
      FOREIGN KEY ("task_agent_profile_id")
      REFERENCES "agent_profiles"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scheduled_rules_task_agent_template_id_fkey'
  ) THEN
    ALTER TABLE "scheduled_rules"
      ADD CONSTRAINT "scheduled_rules_task_agent_template_id_fkey"
      FOREIGN KEY ("task_agent_template_id")
      REFERENCES "agent_templates"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
