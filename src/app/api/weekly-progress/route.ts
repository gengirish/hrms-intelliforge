import { NextRequest, NextResponse } from "next/server";
import { WeeklyProgressStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthIntern } from "@/lib/auth";
import { weeklyProgressUpsertSchema } from "@/lib/validations";
import { getCurrentISOWeek } from "@/lib/utils";
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

    const weekParam = req.nextUrl.searchParams.get("week");
    const weekKey = weekParam?.trim() || getCurrentISOWeek();

    const report = await prisma.weeklyProgressReport.findUnique({
      where: {
        internId_weekKey: { internId: intern.id, weekKey },
      },
    });

    return NextResponse.json({ weekKey, report, internName: intern.name });
  } catch (err: unknown) {
    return serverError(err, "Weekly progress GET error");
  }
}

export async function POST(req: NextRequest) {
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

    const json = await req.json();
    const parsed = weeklyProgressUpsertSchema.safeParse(json);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { accomplishments, learningOutcomes, challenges, weekKey: bodyWeekKey } =
      parsed.data;
    const weekKey = bodyWeekKey?.trim() || getCurrentISOWeek();

    const existing = await prisma.weeklyProgressReport.findUnique({
      where: {
        internId_weekKey: { internId: intern.id, weekKey },
      },
    });

    if (existing?.status === WeeklyProgressStatus.SUBMITTED) {
      return NextResponse.json(
        { error: "This week is already submitted and cannot be edited" },
        { status: 409 }
      );
    }

    const report = await prisma.weeklyProgressReport.upsert({
      where: {
        internId_weekKey: { internId: intern.id, weekKey },
      },
      create: {
        internId: intern.id,
        weekKey,
        accomplishments,
        learningOutcomes,
        challenges,
        status: WeeklyProgressStatus.DRAFT,
      },
      update: {
        accomplishments,
        learningOutcomes,
        challenges,
        status: WeeklyProgressStatus.DRAFT,
      },
    });

    return NextResponse.json(report);
  } catch (err: unknown) {
    return serverError(err, "Weekly progress POST error");
  }
}
