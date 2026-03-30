import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

function getISTStartOfDay() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  istNow.setUTCHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - istOffset);
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const activeInterns = await prisma.intern.findMany({
      where: { status: "ACTIVE" },
    });

    const todayStart = getISTStartOfDay();
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    let sent = 0;
    for (const intern of activeInterns) {
      const hasAttendance = await prisma.attendance.findFirst({
        where: {
          internId: intern.id,
          date: { gte: todayStart, lt: todayEnd },
        },
      });

      if (!hasAttendance) {
        try {
          await notify(intern.id, "ATTENDANCE_NUDGE");
          sent++;
        } catch (err) {
          console.error(`Attendance nudge failed for ${intern.email}:`, err);
        }
      }
    }

    return NextResponse.json({ ok: true, sent, total: activeInterns.length });
  } catch (err) {
    console.error("Cron attendance-nudge error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
