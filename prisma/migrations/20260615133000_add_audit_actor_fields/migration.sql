ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "actor_name" TEXT,
  ADD COLUMN IF NOT EXISTS "actor_email" TEXT,
  ADD COLUMN IF NOT EXISTS "actor_role" TEXT;
