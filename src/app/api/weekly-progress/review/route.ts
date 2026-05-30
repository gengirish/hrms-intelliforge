import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { getCurrentISOWeek } from "@/lib/utils";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";
import { ORG_ADMIN_ROLE, normalizeOrgAdminRole } from "@/lib/org-admin-roles";

const WEEK_KEY_RE = /^\d{4}-W\d{2}$/;

export async function GET(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 40)) {
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

    const rawWeek = req.nextUrl.searchParams.get("week")?.trim() || getCurrentISOWeek();
    if (!WEEK_KEY_RE.test(rawWeek)) {
      return NextResponse.json({ error: "Invalid week (use YYYY-Www)" }, { status: 400 });
    }

    const isMentor = normalizeOrgAdminRole(admin.role) === ORG_ADMIN_ROLE.MENTOR;

    const reports = await prisma.weeklyProgressReport.findMany({
      where: {
        weekKey: rawWeek,
        intern: {
          orgId: admin.orgId,
          ...(isMentor ? { mentorId: admin.id } : {}),
        },
      },
      include: {
        intern: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    });

    const items = reports.map((r) => ({
      id: r.id,
      status: r.status,
      accomplishments: r.accomplishments,
      learningOutcomes: r.learningOutcomes,
      challenges: r.challenges,
      mentorFeedback: r.mentorFeedback,
      feedbackAt: r.feedbackAt,
      submittedAt: r.submittedAt,
      intern: r.intern,
    }));

    return NextResponse.json({ weekKey: rawWeek, items });
  } catch (err: unknown) {
    return serverError(err, "Weekly progress review GET");
  }
}
