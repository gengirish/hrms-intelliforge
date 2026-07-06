-- Drop unused Clerk SSO columns (auth is JWT + bcrypt only).

DROP INDEX IF EXISTS "interns_clerkUserId_key";
ALTER TABLE "interns" DROP COLUMN IF EXISTS "clerkUserId";

DROP INDEX IF EXISTS "admins_clerkUserId_key";
ALTER TABLE "admins" DROP COLUMN IF EXISTS "clerkUserId";
