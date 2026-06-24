-- AlterTable
ALTER TABLE "learning_enrollments" ADD COLUMN "progressTotal" INTEGER,
ADD COLUMN "progressCompleted" INTEGER,
ADD COLUMN "progressPercent" INTEGER,
ADD COLUMN "completedAt" TIMESTAMP(3);
