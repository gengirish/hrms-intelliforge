import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";
import { notify } from "@/lib/notifications";
import {
  enroll as learningEnroll,
  listCourses,
  courseUrl,
  isConfigured,
  LearningApiError,
} from "@/lib/learning-client";

const enrollSchema = z.object({
  internId: z.string().min(1, "internId is required"),
  courseId: z.string().min(1, "courseId is required"),
});

const ORPHAN_ADMIN_MSG =
  "Your admin account isn't attached to an organization. Contact support.";

export async function GET(req: NextRequest) {
  if (!rateLimit(getClientIp(req), 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const admin = await getAuthAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!admin.orgId) {
    return NextResponse.json({ error: ORPHAN_ADMIN_MSG }, { status: 403 });
  }

  const internId = req.nextUrl.searchParams.get("internId");
  if (!internId) {
    return NextResponse.json({ error: "internId is required" }, { status: 400 });
  }

  try {
    // Verify the intern belongs to this admin's org before exposing their
    // enrollments. Returns 404 (not 403) on cross-tenant to avoid existence
    // leaks — same convention as the orphan-admin hardening.
    const intern = await prisma.intern.findUnique({
      where: { id: internId },
      select: { orgId: true },
    });
    if (!intern || intern.orgId !== admin.orgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const enrollments = await prisma.learningEnrollment.findMany({
      where: { internId },
      orderBy: { enrolledAt: "desc" },
    });
    return NextResponse.json({ enrollments });
  } catch (err) {
    return serverError(err, "Learning enrollments GET error");
  }
}

export async function POST(req: NextRequest) {
  if (!rateLimit(getClientIp(req), 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const admin = await getAuthAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!admin.orgId) {
    return NextResponse.json({ error: ORPHAN_ADMIN_MSG }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg = Object.values(first).flat()[0] || "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { internId, courseId } = parsed.data;

  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Learning integration is not configured on this deployment." },
      { status: 503 }
    );
  }

  try {
    // 1. Org-scoped intern lookup.
    const intern = await prisma.intern.findUnique({
      where: { id: internId },
      select: { id: true, name: true, email: true, orgId: true },
    });
    if (!intern || intern.orgId !== admin.orgId) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    // 2. Local idempotency: if we already have a row, short-circuit.
    const existing = await prisma.learningEnrollment.findUnique({
      where: { internId_courseId: { internId, courseId } },
    });
    if (existing) {
      return NextResponse.json({
        enrollment: existing,
        alreadyExisted: true,
      });
    }

    // 3. Resolve the course title/slug from the cached catalog so we can
    //    persist a snapshot and build a learner-facing link without a
    //    second roundtrip.
    let courses;
    try {
      courses = await listCourses();
    } catch (err) {
      if (err instanceof LearningApiError) {
        return mapLearningError(err, "Failed to load Learning courses");
      }
      throw err;
    }
    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      return NextResponse.json(
        { error: "Course not found in Learning catalog" },
        { status: 404 }
      );
    }

    // 4. Call Learning's enroll endpoint.
    let result;
    try {
      result = await learningEnroll(intern.email, courseId);
    } catch (err) {
      if (err instanceof LearningApiError) {
        return mapLearningError(err, "Failed to enroll on Learning");
      }
      throw err;
    }

    // 5. Persist locally.
    const enrollment = await prisma.learningEnrollment.create({
      data: {
        internId,
        courseId,
        courseTitle: course.title,
        courseSlug: course.slug,
        learningEnrollmentId: result.enrollment.id,
        status: result.enrollment.status || "active",
        enrolledByAdminId: admin.id,
      },
    });

    // 6. Best-effort welcome email — never block the response on email
    //    failure since the enrollment itself succeeded.
    try {
      await notify(internId, "COURSE_ENROLLED", {
        courseTitle: course.title,
        courseUrl: courseUrl(course.slug),
      });
    } catch (err) {
      console.error("COURSE_ENROLLED notification failed:", err);
    }

    return NextResponse.json({
      enrollment,
      alreadyExisted: result.alreadyEnrolled,
      learningStatus: result.enrollment.status,
    });
  } catch (err) {
    return serverError(err, "Learning enroll error");
  }
}

function mapLearningError(err: LearningApiError, fallback: string): NextResponse {
  if (err.status === 503) {
    return NextResponse.json(
      { error: "Learning integration is not configured on this deployment." },
      { status: 503 }
    );
  }
  if (err.status === 401 || err.status === 403) {
    return NextResponse.json(
      { error: "Learning rejected our credentials. Check LEARNING_API_KEY." },
      { status: 502 }
    );
  }
  if (err.status === 404) {
    return NextResponse.json(
      { error: "Learning course not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ error: err.message || fallback }, { status: 502 });
}
