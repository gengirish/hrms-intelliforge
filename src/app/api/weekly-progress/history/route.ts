import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthIntern } from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";

function internProgressAllowed(intern: { status: string }) {
  return intern.status === "ACTIVE" || intern.status === "OFFERED";
}

export async function GET(req: NextRequest) {
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

    const items = await prisma.weeklyProgressReport.findMany({
      where: { internId: intern.id },
      orderBy: [{ weekKey: "desc" }, { createdAt: "desc" }],
      take: 40,
      select: {
        id: true,
        weekKey: true,
        accomplishments: true,
        learningOutcomes: true,
        challenges: true,
        status: true,
        submittedAt: true,
        mentorFeedback: true,
        feedbackAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ items });
  } catch (err: unknown) {
    return serverError(err, "Weekly progress history GET error");
  }
}
