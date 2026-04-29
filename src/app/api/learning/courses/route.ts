import { NextRequest, NextResponse } from "next/server";
import { getAuthAdmin } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { listCourses, isConfigured, LearningApiError, type LearningCourse } from "@/lib/learning-client";

/**
 * In-memory course cache. The course catalog changes rarely and several
 * admins may open the picker concurrently; cache for 5 minutes per
 * serverless instance to keep the Learning API quiet.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
type CacheEntry = { fetchedAt: number; courses: LearningCourse[] };
let cache: CacheEntry | null = null;

export async function GET(req: NextRequest) {
  if (!rateLimit(getClientIp(req), 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const admin = await getAuthAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!admin.orgId) {
    return NextResponse.json(
      { error: "Your admin account isn't attached to an organization. Contact support." },
      { status: 403 }
    );
  }

  if (!isConfigured()) {
    return NextResponse.json(
      {
        error: "Learning integration is not configured on this deployment. Set LEARNING_API_KEY.",
        configured: false,
        courses: [] as LearningCourse[],
      },
      { status: 503 }
    );
  }

  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      courses: cache.courses,
      cached: true,
      cacheAgeMs: now - cache.fetchedAt,
    });
  }

  try {
    const courses = await listCourses();
    cache = { fetchedAt: now, courses };
    return NextResponse.json({ courses, cached: false });
  } catch (err) {
    if (err instanceof LearningApiError) {
      const status = err.status === 401 || err.status === 403 ? 502 : err.status || 502;
      const message =
        err.status === 401 || err.status === 403
          ? "Learning rejected our credentials. Check LEARNING_API_KEY."
          : err.message;
      return NextResponse.json({ error: message }, { status });
    }
    console.error("Learning courses proxy error:", err);
    return NextResponse.json({ error: "Failed to load Learning courses" }, { status: 502 });
  }
}
