import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

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

    let sent = 0;
    for (const intern of activeInterns) {
      try {
        await notify(intern.id, "TASK_REMINDER");
        sent++;
      } catch (err) {
        console.error(`Task reminder failed for ${intern.email}:`, err);
      }
    }

    return NextResponse.json({ ok: true, sent, total: activeInterns.length });
  } catch (err) {
    console.error("Cron task-reminder error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
