import { NextRequest, NextResponse } from "next/server";
import { DailyPlanStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { getISTStartOfDay } from "@/lib/utils";

const NOTIFY_CONCURRENCY = 15;

async function notifyInBatches(
  items: { id: string; email: string }[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i += NOTIFY_CONCURRENCY) {
    const batch = items.slice(i, i + NOTIFY_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((intern) => notify(intern.id, "DAILY_PLAN_NUDGE"))
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const intern = batch[j];
      if (r.status === "fulfilled") {
        sent++;
      } else {
        failed++;
        console.error(`Daily plan nudge failed for ${intern.email}:`, r.reason);
      }
    }
  }
  return { sent, failed };
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
      where: { status: "ACTIVE", deactivated: false },
    });

    const todayStart = getISTStartOfDay();
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    if (activeInterns.length === 0) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        failed: 0,
        total: 0,
      });
    }

    const internIds = activeInterns.map((i) => i.id);
    const submittedPlans = await prisma.dailyTaskPlan.findMany({
      where: {
        internId: { in: internIds },
        date: { gte: todayStart, lt: todayEnd },
        status: DailyPlanStatus.SUBMITTED,
      },
      select: { internId: true },
    });
    const internIdsWithPlan = new Set(submittedPlans.map((p) => p.internId));

    const internsNeedingNudge = activeInterns.filter(
      (intern) => !internIdsWithPlan.has(intern.id)
    );

    const { sent, failed } = await notifyInBatches(
      internsNeedingNudge.map((i) => ({ id: i.id, email: i.email }))
    );

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      total: activeInterns.length,
    });
  } catch (err) {
    console.error("Cron daily-plan-nudge error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
