import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import * as Sentry from "@sentry/nextjs";

/**
 * In-memory rate limiter. Resets on serverless cold starts and does not coordinate
 * across instances. Used as fallback when Upstash Redis is not configured.
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const CLEANUP_INTERVAL_MS = 60_000;

setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((entry, ip) => {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  });
}, CLEANUP_INTERVAL_MS).unref?.();

function isUpstashEnabled(): boolean {
  return (
    Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
    Boolean(process.env.UPSTASH_REDIS_REST_TOKEN)
  );
}

let inMemoryProductionWarned = false;

/**
 * The in-memory limiter is per-instance and resets on cold starts, so on Vercel it
 * gives little real protection (e.g. against OTP/password brute force). Shout once
 * per instance when production is running without Upstash. Never throws.
 */
function warnIfInMemoryInProduction(): void {
  if (inMemoryProductionWarned) return;
  if (process.env.VERCEL_ENV !== "production" || isUpstashEnabled()) return;
  inMemoryProductionWarned = true;
  const message =
    "[rate-limit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN are not set in production; " +
    "falling back to the in-memory limiter, which is not shared across serverless instances.";
  console.error(message);
  try {
    Sentry.captureMessage(message, "error");
  } catch {
    // Observability must never break request handling.
  }
}

/** Test-only: reset the one-time production warning latch. */
export function __resetRateLimitWarningForTests(): void {
  inMemoryProductionWarned = false;
}

const upstashRatelimitCache = new Map<string, Ratelimit>();

function getUpstashRatelimit(limit: number, windowMs: number): Ratelimit {
  const key = `${limit}:${windowMs}`;
  let instance = upstashRatelimitCache.get(key);
  if (!instance) {
    const redis = Redis.fromEnv();
    instance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    });
    upstashRatelimitCache.set(key, instance);
  }
  return instance;
}

export function rateLimit(ip: string, limit = 10, windowMs = 60000): boolean {
  warnIfInMemoryInProduction();
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

/** Uses Upstash Redis when configured; otherwise falls back to in-memory `rateLimit`. */
export async function rateLimitAsync(
  ip: string,
  limit = 10,
  windowMs = 60000
): Promise<boolean> {
  if (!isUpstashEnabled()) {
    return rateLimit(ip, limit, windowMs);
  }
  const { success } = await getUpstashRatelimit(limit, windowMs).limit(ip);
  return success;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
