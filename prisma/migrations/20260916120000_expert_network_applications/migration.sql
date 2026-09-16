-- Expert-network postings (researcher/PhD partner programmes) with referral support.

-- AlterTable
ALTER TABLE "job_postings" ADD COLUMN "formType" TEXT NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN "expertDomain" TEXT,
ADD COLUMN "highestDegree" TEXT,
ADD COLUMN "hIndex" INTEGER,
ADD COLUMN "scholarUrl" TEXT,
ADD COLUMN "referrerName" TEXT,
ADD COLUMN "referrerEmail" TEXT,
ADD COLUMN "referralConsent" BOOLEAN NOT NULL DEFAULT false;
