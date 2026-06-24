/**
 * Learning provisioning & progress sync for HRMS ↔ IntelliForge Learning.
 *
 * Auto-provision triggers when an intern becomes ACTIVE (offer accepted).
 * Configure with LEARNING_AUTO_ENROLL_COURSE_SLUGS or LEARNING_AUTO_ENROLL_COURSE_IDS.
 * See docs/LEARNING_SETUP.md and src/lib/learning-config.ts for production defaults.
 */

import type { LearningEnrollment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import {
  enroll as learningEnroll,
  listCourses,
  getEnrollmentsByEmail,
  registerParticipant,
  registerLiveSession,
  courseUrl,
  isConfigured,
  LearningApiError,
} from "@/lib/learning-client";
import {
  getAutoRegisterSession,
  getAutoRegisterLiveSessionId,
  resolveAutoEnrollCourseIds,
} from "@/lib/learning-config";

export {
  getAutoEnrollCourseIds,
  getAutoEnrollCourseSlugs,
  getAutoRegisterSession,
  getAutoRegisterLiveSessionId,
} from "@/lib/learning-config";

export interface ProvisionResult {
  coursesEnrolled: number;
  coursesSkipped: number;
  sessionRegistered: boolean;
  liveSessionRegistered: boolean;
  errors: string[];
}

export async function enrollInternInCourse(params: {
  internId: string;
  internEmail: string;
  courseId: string;
  adminId?: string | null;
  sendWelcomeEmail?: boolean;
}): Promise<{ enrollment: LearningEnrollment; created: boolean } | null> {
  const { internId, internEmail, courseId, adminId, sendWelcomeEmail = true } = params;

  const existing = await prisma.learningEnrollment.findUnique({
    where: { internId_courseId: { internId, courseId } },
  });
  if (existing) {
    return { enrollment: existing, created: false };
  }

  let courses;
  try {
    courses = await listCourses();
  } catch (err) {
    if (err instanceof LearningApiError) throw err;
    throw new LearningApiError(502, "Failed to load Learning courses");
  }

  const course = courses.find((c) => c.id === courseId);
  if (!course) return null;

  const result = await learningEnroll(internEmail, courseId);

  const enrollment = await prisma.learningEnrollment.create({
    data: {
      internId,
      courseId,
      courseTitle: course.title,
      courseSlug: course.slug,
      learningEnrollmentId: result.enrollment.id,
      status: result.enrollment.status || "active",
      enrolledByAdminId: adminId ?? null,
    },
  });

  if (sendWelcomeEmail && !result.alreadyEnrolled) {
    try {
      await notify(internId, "COURSE_ENROLLED", {
        courseTitle: course.title,
        courseUrl: courseUrl(course.slug),
      });
    } catch (err) {
      console.error("COURSE_ENROLLED notification failed:", err);
    }
  }

  return { enrollment, created: !result.alreadyEnrolled };
}

function mapRemoteProgress(remote: {
  status: string;
  completed_at?: string | null;
  progress?: { total: number; completed: number; percentage: number };
}) {
  return {
    status: remote.status,
    progressTotal: remote.progress?.total ?? null,
    progressCompleted: remote.progress?.completed ?? null,
    progressPercent: remote.progress?.percentage ?? null,
    completedAt: remote.completed_at ? new Date(remote.completed_at) : null,
    lastSyncedAt: new Date(),
  };
}

/**
 * Pull enrollments + progress from Learning and upsert local rows.
 */
export async function syncInternLearningProgress(internId: string): Promise<{
  enrollments: LearningEnrollment[];
  synced: number;
}> {
  if (!isConfigured()) {
    throw new LearningApiError(
      503,
      "Learning integration is not configured (LEARNING_API_KEY missing)"
    );
  }

  const intern = await prisma.intern.findUnique({
    where: { id: internId },
    select: { id: true, email: true },
  });
  if (!intern) {
    throw new LearningApiError(404, "Intern not found");
  }

  const remote = await getEnrollmentsByEmail(intern.email);
  let synced = 0;

  for (const item of remote) {
    const progressData = mapRemoteProgress(item);
    const existing = await prisma.learningEnrollment.findUnique({
      where: { internId_courseId: { internId, courseId: item.course_id } },
    });

    if (existing) {
      await prisma.learningEnrollment.update({
        where: { id: existing.id },
        data: {
          ...progressData,
          courseTitle: item.course_title || existing.courseTitle,
          courseSlug: item.course_slug || existing.courseSlug,
          learningEnrollmentId: item.id,
        },
      });
    } else {
      await prisma.learningEnrollment.create({
        data: {
          internId,
          courseId: item.course_id,
          courseTitle: item.course_title || "Learning course",
          courseSlug: item.course_slug ?? null,
          learningEnrollmentId: item.id,
          ...progressData,
        },
      });
    }
    synced += 1;
  }

  const enrollments = await prisma.learningEnrollment.findMany({
    where: { internId },
    orderBy: { enrolledAt: "desc" },
  });

  return { enrollments, synced };
}

/**
 * Auto-enroll configured courses and register bootcamp/live sessions.
 * Best-effort: individual failures are collected, not thrown.
 */
export async function provisionLearningForIntern(
  internId: string,
  opts?: { adminId?: string | null }
): Promise<ProvisionResult | null> {
  if (!isConfigured()) return null;

  const intern = await prisma.intern.findUnique({
    where: { id: internId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      college: true,
      role: true,
    },
  });
  if (!intern) return null;

  const result: ProvisionResult = {
    coursesEnrolled: 0,
    coursesSkipped: 0,
    sessionRegistered: false,
    liveSessionRegistered: false,
    errors: [],
  };

  const { courseIds, errors: resolveErrors } = await resolveAutoEnrollCourseIds(listCourses);
  result.errors.push(...resolveErrors);

  for (const courseId of courseIds) {
    try {
      const enrolled = await enrollInternInCourse({
        internId: intern.id,
        internEmail: intern.email,
        courseId,
        adminId: opts?.adminId,
      });
      if (!enrolled) {
        result.errors.push(`Course ${courseId} not found in Learning catalog`);
      } else if (enrolled.created) {
        result.coursesEnrolled += 1;
      } else {
        result.coursesSkipped += 1;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Course enrollment failed";
      result.errors.push(`Course ${courseId}: ${msg}`);
    }
  }

  const trainingSession = getAutoRegisterSession();
  if (trainingSession) {
    try {
      await registerParticipant({
        full_name: intern.name,
        email: intern.email,
        phone: intern.phone || null,
        organization: intern.college || null,
        training_session: trainingSession,
        referral_source: "hrms-auto-provision",
      });
      result.sessionRegistered = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Session registration failed";
      result.errors.push(`Bootcamp session: ${msg}`);
    }
  }

  const liveSessionId = getAutoRegisterLiveSessionId();
  if (liveSessionId) {
    try {
      await registerLiveSession(liveSessionId, intern.email, intern.name);
      result.liveSessionRegistered = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Live session registration failed";
      result.errors.push(`Live session: ${msg}`);
    }
  }

  try {
    await syncInternLearningProgress(internId);
  } catch (err) {
    console.error("Post-provision progress sync failed:", err);
  }

  return result;
}

/** Fire-and-forget auto-provision when an intern becomes ACTIVE. */
export function scheduleLearningProvision(
  internId: string,
  adminId?: string | null
): void {
  provisionLearningForIntern(internId, { adminId }).catch((err) =>
    console.error(`Learning auto-provision failed for intern ${internId}:`, err)
  );
}
