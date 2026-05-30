import { NextRequest, NextResponse } from "next/server";
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { sendWeeklyProgressFeedbackToIntern } from "@/lib/agentmail";
import { weeklyProgressFeedbackSchema } from "@/lib/validations";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";
import { ORG_ADMIN_ROLE, normalizeOrgAdminRole } from "@/lib/org-admin-roles";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!rateLimit(getClientIp(req), 30)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Not authorized. Admin access required." },
        { status: 403 }
      );
    }
    if (!admin.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization." },
        { status: 403 }
      );
    }

    const { id } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = weeklyProgressFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      const msg =
        Object.values(parsed.error.flatten().fieldErrors).flat()[0] ||
        "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const mentorFeedback = parsed.data.mentorFeedback.trim();

    const report = await prisma.weeklyProgressReport.findUnique({
      where: { id },
      include: { intern: { select: { orgId: true, mentorId: true } } },
    });

    if (!report || report.intern.orgId !== admin.orgId) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const isMentor = normalizeOrgAdminRole(admin.role) === ORG_ADMIN_ROLE.MENTOR;
    if (isMentor && report.intern.mentorId !== admin.id) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const updated = await prisma.weeklyProgressReport.update({
      where: { id },
      data: {
        mentorFeedback,
        feedbackAt: new Date(),
        feedbackById: admin.id,
      },
      include: {
        intern: { select: { id: true, name: true, email: true } },
      },
    });

    try {
      await sendWeeklyProgressFeedbackToIntern({
        internEmail: updated.intern.email,
        internName: updated.intern.name,
        weekKey: updated.weekKey,
        feedbackPreview: mentorFeedback,
      });
      await prisma.notificationLog.create({
        data: {
          internId: updated.intern.id,
          channel: NotificationChannel.EMAIL,
          type: NotificationType.WEEKLY_PROGRESS_FEEDBACK,
          subject: `Mentor feedback — ${updated.weekKey}`,
          body: `Mentor left feedback for week ${updated.weekKey}`,
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });
    } catch (e) {
      console.error("Weekly progress feedback notify:", e);
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      accomplishments: updated.accomplishments,
      learningOutcomes: updated.learningOutcomes,
      challenges: updated.challenges,
      mentorFeedback: updated.mentorFeedback,
      feedbackAt: updated.feedbackAt,
      submittedAt: updated.submittedAt,
      intern: updated.intern,
    });
  } catch (err: unknown) {
    return serverError(err, "Weekly progress feedback PATCH");
  }
}
