import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

const NOTIFY_CONCURRENCY = 15;

async function notifyInBatches(
  items: { id: string; email: string }[],
  type: "TASK_REMINDER"
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i += NOTIFY_CONCURRENCY) {
    const batch = items.slice(i, i + NOTIFY_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((intern) => notify(intern.id, type))
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const intern = batch[j];
      if (r.status === "fulfilled") {
        sent++;
      } else {
        failed++;
        console.error(`Task reminder failed for ${intern.email}:`, r.reason);
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

    const { sent, failed } = await notifyInBatches(
      activeInterns.map((i) => ({ id: i.id, email: i.email })),
      "TASK_REMINDER"
    );

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      total: activeInterns.length,
    });
  } catch (err) {
    console.error("Cron task-reminder error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
