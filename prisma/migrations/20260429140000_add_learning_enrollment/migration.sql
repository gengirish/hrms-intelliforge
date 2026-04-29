-- Add COURSE_ENROLLED to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COURSE_ENROLLED';

-- Create learning_enrollments table
CREATE TABLE "learning_enrollments" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseTitle" TEXT NOT NULL,
    "courseSlug" TEXT,
    "learningEnrollmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "enrolledByAdminId" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "learning_enrollments_internId_courseId_key" ON "learning_enrollments"("internId", "courseId");
CREATE INDEX "learning_enrollments_internId_idx" ON "learning_enrollments"("internId");

ALTER TABLE "learning_enrollments"
    ADD CONSTRAINT "learning_enrollments_internId_fkey"
    FOREIGN KEY ("internId") REFERENCES "interns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learning_enrollments"
    ADD CONSTRAINT "learning_enrollments_enrolledByAdminId_fkey"
    FOREIGN KEY ("enrolledByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
