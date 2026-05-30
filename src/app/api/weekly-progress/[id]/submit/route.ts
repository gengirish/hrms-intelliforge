import { NextRequest, NextResponse } from "next/server";
import { WeeklyProgressStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthIntern } from "@/lib/auth";
import { sendWeeklyProgressSubmittedToMentor } from "@/lib/agentmail";
import { weeklyProgressSubmitSchema } from "@/lib/validations";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";

function internProgressAllowed(intern: { status: string }) {
  return intern.status === "ACTIVE" || intern.status === "OFFERED";
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!rateLimit(getClientIp(req), 20)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const intern = await getAuthIntern();
    if (!intern) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!internProgressAllowed(intern)) {
      return NextResponse.json(
        { error: "Weekly progress is available for active interns only" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const report = await prisma.weeklyProgressReport.findUnique({
      where: { id },
    });

    if (!report || report.internId !== intern.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (report.status === WeeklyProgressStatus.SUBMITTED) {
      return NextResponse.json({ error: "Already submitted" }, { status: 409 });
    }

    const parsed = weeklyProgressSubmitSchema.safeParse({
      accomplishments: report.accomplishments,
      learningOutcomes: report.learningOutcomes,
      challenges: report.challenges,
    });
    if (!parsed.success) {
      const msg =
        parsed.error.flatten().formErrors[0] ||
        parsed.error.errors[0]?.message ||
        "Invalid report content";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const now = new Date();
    const updated = await prisma.weeklyProgressReport.update({
      where: { id },
      data: {
        status: WeeklyProgressStatus.SUBMITTED,
        submittedAt: now,
      },
    });

    const internWithMentor = await prisma.intern.findUnique({
      where: { id: intern.id },
      include: { mentor: { select: { email: true, name: true } } },
    });

    const mentorEmail = internWithMentor?.mentor?.email;
    if (mentorEmail) {
      try {
        await sendWeeklyProgressSubmittedToMentor({
          mentorEmail,
          mentorName: internWithMentor.mentor?.name ?? null,
          internName: intern.name,
          weekKey: report.weekKey,
        });
      } catch (e) {
        console.error("sendWeeklyProgressSubmittedToMentor:", e);
      }
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    return serverError(err, "Weekly progress submit error");
  }
}
