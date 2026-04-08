-- AlterTable: Add rich fields to job_postings
ALTER TABLE "job_postings" ADD COLUMN "location" TEXT;
ALTER TABLE "job_postings" ADD COLUMN "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME';
ALTER TABLE "job_postings" ADD COLUMN "duration" TEXT;
ALTER TABLE "job_postings" ADD COLUMN "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "job_postings" ADD COLUMN "requirements" JSONB;
ALTER TABLE "job_postings" ADD COLUMN "bonusSkills" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "job_postings" ADD COLUMN "perks" JSONB;
ALTER TABLE "job_postings" ADD COLUMN "interviewSteps" JSONB;
ALTER TABLE "job_postings" ADD COLUMN "applicationEmail" TEXT;
ALTER TABLE "job_postings" ADD COLUMN "salaryInfo" TEXT;

-- AlterTable: Add application fields to candidates
ALTER TABLE "candidates" ADD COLUMN "resumeUrl" TEXT;
ALTER TABLE "candidates" ADD COLUMN "githubUrl" TEXT;
ALTER TABLE "candidates" ADD COLUMN "portfolioUrl" TEXT;
ALTER TABLE "candidates" ADD COLUMN "coverNote" TEXT;
