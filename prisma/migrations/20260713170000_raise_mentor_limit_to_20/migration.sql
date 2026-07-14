-- Raise mentor capacity default and backfill existing organizations.
ALTER TABLE "organizations" ALTER COLUMN "maxMentors" SET DEFAULT 20;

UPDATE "organizations"
SET "maxMentors" = 20
WHERE "maxMentors" < 20;
