-- CreateEnum
CREATE TYPE "DailyPlanStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'DAILY_PLAN_NUDGE';

-- CreateTable
CREATE TABLE "daily_task_plans" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "DailyPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_task_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_task_items" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_task_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_task_plans_internId_idx" ON "daily_task_plans"("internId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_task_plans_internId_date_key" ON "daily_task_plans"("internId", "date");

-- CreateIndex
CREATE INDEX "daily_task_items_planId_idx" ON "daily_task_items"("planId");

-- AddForeignKey
ALTER TABLE "daily_task_plans" ADD CONSTRAINT "daily_task_plans_internId_fkey" FOREIGN KEY ("internId") REFERENCES "interns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_task_items" ADD CONSTRAINT "daily_task_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "daily_task_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
