-- Raise intern capacity default and backfill existing organizations.
ALTER TABLE "organizations" ALTER COLUMN "maxInterns" SET DEFAULT 500;

UPDATE "organizations"
SET "maxInterns" = 500
WHERE "maxInterns" < 500;
