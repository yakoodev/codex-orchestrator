ALTER TABLE "scheduled_rules"
  ADD COLUMN "task_title" TEXT,
  ADD COLUMN "task_description" TEXT,
  ADD COLUMN "task_repo_id" TEXT,
  ADD COLUMN "task_branch" TEXT,
  ADD COLUMN "task_priority" INTEGER NOT NULL DEFAULT 100;
