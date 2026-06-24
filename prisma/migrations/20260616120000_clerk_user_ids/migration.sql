-- Clerk external ids + optional password for Clerk-only admins
ALTER TABLE "admins" ADD COLUMN "clerkUserId" TEXT;
CREATE UNIQUE INDEX "admins_clerkUserId_key" ON "admins"("clerkUserId");

ALTER TABLE "interns" ADD COLUMN "clerkUserId" TEXT;
CREATE UNIQUE INDEX "interns_clerkUserId_key" ON "interns"("clerkUserId");

ALTER TABLE "admins" ALTER COLUMN "passwordHash" DROP NOT NULL;
