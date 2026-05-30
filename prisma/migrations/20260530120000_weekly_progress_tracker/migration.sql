-- CreateEnum
CREATE TYPE "WeeklyProgressStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'WEEKLY_PROGRESS_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'WEEKLY_PROGRESS_FEEDBACK';

-- CreateTable
CREATE TABLE "weekly_progress_reports" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "accomplishments" TEXT NOT NULL DEFAULT '',
    "learningOutcomes" TEXT NOT NULL DEFAULT '',
    "challenges" TEXT NOT NULL DEFAULT '',
    "status" "WeeklyProgressStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "mentorFeedback" TEXT,
    "feedbackAt" TIMESTAMP(3),
    "feedbackById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_progress_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_progress_reports_internId_weekKey_key" ON "weekly_progress_reports"("internId", "weekKey");

-- CreateIndex
CREATE INDEX "weekly_progress_reports_internId_idx" ON "weekly_progress_reports"("internId");

-- AddForeignKey
ALTER TABLE "weekly_progress_reports" ADD CONSTRAINT "weekly_progress_reports_internId_fkey" FOREIGN KEY ("internId") REFERENCES "interns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_progress_reports" ADD CONSTRAINT "weekly_progress_reports_feedbackById_fkey" FOREIGN KEY ("feedbackById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
