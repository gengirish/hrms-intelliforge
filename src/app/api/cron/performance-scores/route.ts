import { NextRequest, NextResponse } from "next/server";
import { computeScoresForAllInterns, getCurrentWeekLabel } from "@/lib/ai/performance-scorer";
import { serverError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weekLabel = req.nextUrl.searchParams.get("week") ?? getCurrentWeekLabel();
    const result = await computeScoresForAllInterns(weekLabel);

    console.info(`[cron:performance-scores] Week ${weekLabel}: ${result.succeeded}/${result.total} scored, ${result.failed} failed`);

    return NextResponse.json({ weekLabel, ...result });
  } catch (err) {
    return serverError(err, "Performance scores cron error");
  }
}
