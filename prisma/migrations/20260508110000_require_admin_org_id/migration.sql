-- Make Admin.orgId required.
--
-- Pre-condition: every admin row must already have a non-null "orgId".
-- All current admins (gen.girish@gmail.com, hr@intelliforge.tech) belong
-- to the IntelliForge AI org after the multi-tenant consolidation.
--
-- This migration:
--   1. Fails fast if any admin still has a NULL orgId (defense in depth).
--   2. Promotes the column to NOT NULL.
--
-- The foreign-key constraint already exists with ON DELETE CASCADE
-- (see initial migration). PostgreSQL keeps the constraint as-is when we
-- only flip the nullability of the column, so no FK rebuild is needed.

DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM "admins" WHERE "orgId" IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Cannot enforce NOT NULL on admins.orgId: % rows still have NULL. Backfill them before running this migration.',
      orphan_count;
  END IF;
END $$;

ALTER TABLE "admins" ALTER COLUMN "orgId" SET NOT NULL;
