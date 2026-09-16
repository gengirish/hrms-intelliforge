import { NextRequest, NextResponse } from "next/server";
import { computeScoresForAllInterns, getCurrentWeekLabel } from "@/lib/ai/performance-scorer";
import { serverError } from "@/lib/api-utils";
import { runCronWithMonitor } from "@/lib/cron-monitor";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await runCronWithMonitor("performance-scores", async () => {
      const weekLabel = req.nextUrl.searchParams.get("week") ?? getCurrentWeekLabel();
      const result = await computeScoresForAllInterns(weekLabel);

      console.info(`[cron:performance-scores] Week ${weekLabel}: ${result.succeeded}/${result.total} scored, ${result.failed} failed`);

      return NextResponse.json({ weekLabel, ...result });
    });
  } catch (err) {
    return serverError(err, "Performance scores cron error");
  }
}
