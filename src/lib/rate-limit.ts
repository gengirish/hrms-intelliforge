/**
 * In-memory rate limiter. Resets on serverless cold starts and does not coordinate
 * across instances. For production scale, replace with Redis, Upstash, or edge-based
 * rate limiting (e.g. middleware + shared store).
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

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
