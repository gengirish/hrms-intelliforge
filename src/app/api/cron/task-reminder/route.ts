import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTaskReminder } from "@/lib/agentmail";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const activeInterns = await prisma.intern.findMany({
      where: {
        status: "ACTIVE",
        agentmailInboxId: { not: null },
      },
    });

    let sent = 0;
    for (const intern of activeInterns) {
      try {
        await sendTaskReminder(
          intern.agentmailInboxId!,
          intern.email,
          intern.name
        );
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
