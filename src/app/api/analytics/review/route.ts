import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getLatestReview, generatePerformanceReview } from "@/lib/ai/review-generator";
import { serverError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const internId = req.nextUrl.searchParams.get("internId");
    if (!internId) {
      return NextResponse.json({ error: "internId is required" }, { status: 400 });
    }

    if (session.role === "intern" && session.sub !== internId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const regenerate = req.nextUrl.searchParams.get("regenerate") === "true";
    let review = await getLatestReview(internId);

    if (!review || regenerate) {
      review = await generatePerformanceReview({ internId });
    }

    return NextResponse.json({ review });
  } catch (err) {
    return serverError(err, "Analytics review GET error");
  }
}
