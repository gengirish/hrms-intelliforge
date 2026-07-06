import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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

const upstashEnabled =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

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
  if (!upstashEnabled) {
    return rateLimit(ip, limit, windowMs);
  }
  const { success } = await getUpstashRatelimit(limit, windowMs).limit(ip);
  return success;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
