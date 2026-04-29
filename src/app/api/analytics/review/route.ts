import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLatestReview, generatePerformanceReview } from "@/lib/ai/review-generator";
import { serverError } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const regenerate = req.nextUrl.searchParams.get("regenerate") === "true";
    // LLM-backed regeneration is expensive — tighten the limit when it's requested.
    const limit = regenerate ? 5 : 30;
    if (!rateLimit(getClientIp(req), limit, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role === "admin" && !session.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization. Contact support." },
        { status: 403 }
      );
    }

    const internId = req.nextUrl.searchParams.get("internId");
    if (!internId) {
      return NextResponse.json({ error: "internId is required" }, { status: 400 });
    }

    if (session.role === "intern" && session.sub !== internId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.role === "admin") {
      const intern = await prisma.intern.findUnique({
        where: { id: internId },
        select: { orgId: true },
      });
      if (!intern || intern.orgId !== session.orgId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    let review = await getLatestReview(internId);

    if (!review || regenerate) {
      review = await generatePerformanceReview({ internId });
    }

    return NextResponse.json({ review });
  } catch (err) {
    return serverError(err, "Analytics review GET error");
  }
}
