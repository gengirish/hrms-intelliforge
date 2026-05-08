-- Make Intern.orgId required.
--
-- Pre-condition: every intern row must already have a non-null "orgId".
-- The data backfill was performed via scripts/consolidate-single-org.mjs.
--
-- This migration:
--   1. Fails fast if any intern still has a NULL orgId (defense in depth).
--   2. Promotes the column to NOT NULL.
--
-- Note: The foreign-key constraint already exists with ON DELETE CASCADE
-- (see initial migration). PostgreSQL keeps the constraint as-is when we
-- only flip the nullability of the column, so no FK rebuild is needed.

DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM "interns" WHERE "orgId" IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Cannot enforce NOT NULL on interns.orgId: % rows still have NULL. Run scripts/consolidate-single-org.mjs first.',
      orphan_count;
  END IF;
END $$;

ALTER TABLE "interns" ALTER COLUMN "orgId" SET NOT NULL;
