import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureMessage = vi.hoisted(() => vi.fn());
vi.mock("@sentry/nextjs", () => ({ captureMessage }));

import {
  __resetRateLimitWarningForTests,
  rateLimit,
  rateLimitAsync,
} from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the limit", () => {
    const ip = "test-allow-ip";
    const limit = 3;

    expect(rateLimit(ip, limit, 60_000)).toBe(true);
    expect(rateLimit(ip, limit, 60_000)).toBe(true);
    expect(rateLimit(ip, limit, 60_000)).toBe(true);
  });

  it("blocks requests after the limit is exceeded", () => {
    const ip = "test-block-ip";
    const limit = 2;

    expect(rateLimit(ip, limit, 60_000)).toBe(true);
    expect(rateLimit(ip, limit, 60_000)).toBe(true);
    expect(rateLimit(ip, limit, 60_000)).toBe(false);
    expect(rateLimit(ip, limit, 60_000)).toBe(false);
  });

  it("resets after the window expires", () => {
    const ip = "test-reset-ip";
    const limit = 1;
    const windowMs = 10;

    expect(rateLimit(ip, limit, windowMs)).toBe(true);
    expect(rateLimit(ip, limit, windowMs)).toBe(false);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(rateLimit(ip, limit, windowMs)).toBe(true);
        resolve();
      }, windowMs + 5);
    });
  });
});

describe("in-memory fallback warning", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    __resetRateLimitWarningForTests();
    captureMessage.mockReset();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("warns exactly once in production without Upstash", async () => {
    vi.stubEnv("VERCEL_ENV", "production");

    expect(rateLimit("warn-prod-ip", 5, 60_000)).toBe(true);
    expect(await rateLimitAsync("warn-prod-ip", 5, 60_000)).toBe(true);
    rateLimit("warn-prod-ip-2", 5, 60_000);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0][0])).toContain("UPSTASH_REDIS_REST_URL");
    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("in-memory"),
      "error"
    );
  });

  it("does not warn outside production", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    rateLimit("warn-preview-ip", 5, 60_000);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("does not warn in production when Upstash is configured", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    rateLimit("warn-upstash-ip", 5, 60_000);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("still limits (does not throw) when Sentry reporting fails", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    captureMessage.mockImplementation(() => {
      throw new Error("sentry down");
    });
    expect(rateLimit("warn-throw-ip", 1, 60_000)).toBe(true);
    expect(rateLimit("warn-throw-ip", 1, 60_000)).toBe(false);
  });
});
