import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";
import { syncInternLearningProgress } from "@/lib/learning-provision";
import { isConfigured, LearningApiError } from "@/lib/learning-client";

const ORPHAN_ADMIN_MSG =
  "Your admin account isn't attached to an organization. Contact support.";

export async function POST(req: NextRequest) {
  if (!rateLimit(getClientIp(req), 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const admin = await getAuthAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!admin.orgId) {
    return NextResponse.json({ error: ORPHAN_ADMIN_MSG }, { status: 403 });
  }

  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Learning integration is not configured on this deployment." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const internId =
    typeof body === "object" && body !== null && "internId" in body
      ? String((body as { internId: unknown }).internId ?? "")
      : "";

  if (!internId) {
    return NextResponse.json({ error: "internId is required" }, { status: 400 });
  }

  try {
    const intern = await prisma.intern.findUnique({
      where: { id: internId },
      select: { orgId: true },
    });
    if (!intern || intern.orgId !== admin.orgId) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    const { enrollments, synced } = await syncInternLearningProgress(internId);
    return NextResponse.json({ enrollments, synced });
  } catch (err) {
    if (err instanceof LearningApiError) {
      if (err.status === 503) {
        return NextResponse.json(
          { error: "Learning integration is not configured on this deployment." },
          { status: 503 }
        );
      }
      if (err.status === 401 || err.status === 403) {
        return NextResponse.json(
          { error: "Learning rejected our credentials. Check LEARNING_API_KEY." },
          { status: 502 }
        );
      }
      return NextResponse.json(
        { error: err.message || "Failed to sync Learning progress" },
        { status: err.status || 502 }
      );
    }
    return serverError(err, "Learning sync error");
  }
}
