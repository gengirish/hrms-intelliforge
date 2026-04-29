import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";

function getISTStartOfDay() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  istNow.setUTCHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - istOffset);
}

export async function GET(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 20)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!admin.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization. Contact support." },
        { status: 403 }
      );
    }

    const todayStart = getISTStartOfDay();
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const activeInterns = await prisma.intern.findMany({
      where: {
        orgId: admin.orgId,
        status: { in: ["ACTIVE", "OFFERED"] },
        deactivated: { not: true },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
      orderBy: { name: "asc" },
    });

    const todayRecords = await prisma.attendance.findMany({
      where: {
        internId: { in: activeInterns.map((i) => i.id) },
        date: { gte: todayStart, lt: todayEnd },
      },
    });

    const recordMap = new Map(todayRecords.map((r) => [r.internId, r]));

    const overview = activeInterns.map((intern) => {
      const record = recordMap.get(intern.id);
      return {
        ...intern,
        today: record
          ? {
              id: record.id,
              punchIn: record.punchIn,
              punchOut: record.punchOut,
              mode: record.mode,
              dailyStatus: record.dailyStatus,
            }
          : null,
      };
    });

    const summary = {
      total: activeInterns.length,
      present: todayRecords.length,
      absent: activeInterns.length - todayRecords.length,
      punchedOut: todayRecords.filter((r) => r.punchOut).length,
      withStatus: todayRecords.filter((r) => r.dailyStatus).length,
    };

    return NextResponse.json({ overview, summary });
  } catch (err: unknown) {
    return serverError(err, "Dashboard attendance overview error");
  }
}
