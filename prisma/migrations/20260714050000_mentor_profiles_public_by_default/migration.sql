-- New mentor profiles appear on the public program directory by default.
ALTER TABLE "mentor_profiles" ALTER COLUMN "isPublic" SET DEFAULT true;

-- Publish existing profiles so the /mentors directory is not empty when mentors already exist.
UPDATE "mentor_profiles" SET "isPublic" = true WHERE "isPublic" = false;
