import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { isMentorBlockedApi, isMentorBlockedPage } from "@/lib/mentor-access";

const findFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { admin: { findFirst: (...args: unknown[]) => findFirst(...args) } },
}));

vi.mock("@/lib/ai/performance-scorer", () => ({
  computeScoresForAllInterns: vi.fn(async () => ({ total: 0, succeeded: 0, failed: 0 })),
  getCurrentWeekLabel: () => "2026-W38",
}));

const TEST_JWT_SECRET = "test-jwt-secret-at-least-32-chars-long";

async function sessionCookie(adminOrgRole: "ADMIN" | "MENTOR") {
  const token = await new SignJWT({
    role: "admin",
    email: "someone@example.com",
    orgId: "org_a",
    adminOrgRole,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin_1")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(TEST_JWT_SECRET));
  return `hrms-session=${token}`;
}

async function runMiddleware(path: string, method: string, role: "ADMIN" | "MENTOR") {
  const { middleware } = await import("@/middleware");
  const req = new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: { cookie: await sessionCookie(role) },
  });
  return middleware(req);
}

describe("mentor access rules", () => {
  it("blocks MENTOR from payout APIs regardless of method", () => {
    expect(isMentorBlockedApi("/api/payouts/batches", "GET")).toBe(true);
    expect(isMentorBlockedApi("/api/payouts/batches", "POST")).toBe(true);
    expect(isMentorBlockedApi("/api/payouts/batches/b1/process", "POST")).toBe(true);
    expect(isMentorBlockedApi("/api/dashboard/intern/i1/payout-profile", "GET")).toBe(true);
    expect(isMentorBlockedApi("/api/dashboard/intern/i1/payout-profile", "PUT")).toBe(true);
  });

  it("keeps the pre-existing MENTOR restrictions", () => {
    expect(isMentorBlockedApi("/api/billing/checkout", "POST")).toBe(true);
    expect(isMentorBlockedApi("/api/jobs", "GET")).toBe(true);
    expect(isMentorBlockedApi("/api/org", "PUT")).toBe(true);
    expect(isMentorBlockedApi("/api/org/admins", "POST")).toBe(true);
    expect(isMentorBlockedApi("/api/org/admins/direct", "POST")).toBe(true);
    expect(isMentorBlockedApi("/api/org/admins/promote-intern", "POST")).toBe(true);
    expect(isMentorBlockedApi("/api/org/admins/adm_2", "PATCH")).toBe(true);
    expect(isMentorBlockedPage("/dashboard/settings")).toBe(true);
    expect(isMentorBlockedPage("/dashboard/hiring/abc")).toBe(true);
    expect(isMentorBlockedPage("/dashboard/payouts")).toBe(true);
  });

  it("leaves mentor-facing routes open", () => {
    expect(isMentorBlockedApi("/api/org", "GET")).toBe(false);
    expect(isMentorBlockedApi("/api/org/admins", "GET")).toBe(false);
    expect(isMentorBlockedApi("/api/dashboard", "GET")).toBe(false);
    expect(isMentorBlockedApi("/api/dashboard/intern", "GET")).toBe(false);
    expect(isMentorBlockedApi("/api/dashboard/tasks", "POST")).toBe(false);
    expect(isMentorBlockedApi("/api/mentors/payout-profile", "POST")).toBe(false);
    expect(isMentorBlockedPage("/dashboard")).toBe(false);
    expect(isMentorBlockedPage("/dashboard/attendance")).toBe(false);
  });
});

describe("middleware MENTOR enforcement", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  it("returns 403 to a MENTOR creating a payout batch", async () => {
    const res = await runMiddleware("/api/payouts/batches", "POST", "MENTOR");
    expect(res.status).toBe(403);
  });

  it("returns 403 to a MENTOR editing an intern's bank details", async () => {
    const res = await runMiddleware("/api/dashboard/intern/i1/payout-profile", "PUT", "MENTOR");
    expect(res.status).toBe(403);
  });

  it("redirects a MENTOR away from the payouts page", async () => {
    const res = await runMiddleware("/dashboard/payouts", "GET", "MENTOR");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("lets a full ADMIN through and injects session headers", async () => {
    const res = await runMiddleware("/api/payouts/batches", "POST", "ADMIN");
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-request-x-user-org-id")).toBe("org_a");
  });
});

describe("hasFullOrgAdminAccess", () => {
  beforeEach(() => findFirst.mockReset());

  it("re-reads the role from the database, scoped to the session org", async () => {
    const { hasFullOrgAdminAccess } = await import("@/lib/admin-intern-access");
    findFirst.mockResolvedValueOnce({ role: "ADMIN" });
    await expect(hasFullOrgAdminAccess("admin_1", "org_a")).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "admin_1", orgId: "org_a" },
      select: { role: true },
    });
  });

  it("denies an admin demoted to MENTOR after the JWT was issued", async () => {
    const { hasFullOrgAdminAccess } = await import("@/lib/admin-intern-access");
    findFirst.mockResolvedValueOnce({ role: "MENTOR" });
    await expect(hasFullOrgAdminAccess("admin_1", "org_a")).resolves.toBe(false);
  });

  it("denies an admin no longer in the session org", async () => {
    const { hasFullOrgAdminAccess } = await import("@/lib/admin-intern-access");
    findFirst.mockResolvedValueOnce(null);
    await expect(hasFullOrgAdminAccess("admin_1", "org_a")).resolves.toBe(false);
  });

  it("denies without querying when the session lacks an id or org", async () => {
    const { hasFullOrgAdminAccess } = await import("@/lib/admin-intern-access");
    await expect(hasFullOrgAdminAccess(undefined, "org_a")).resolves.toBe(false);
    await expect(hasFullOrgAdminAccess("admin_1", undefined)).resolves.toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("isFullOrgAdmin rejects MENTOR and orphan admins", async () => {
    const { isFullOrgAdmin } = await import("@/lib/admin-intern-access");
    expect(isFullOrgAdmin({ role: "ADMIN", orgId: "org_a" })).toBe(true);
    expect(isFullOrgAdmin({ role: "MENTOR", orgId: "org_a" })).toBe(false);
    expect(isFullOrgAdmin({ role: "ADMIN", orgId: null as unknown as string })).toBe(false);
    expect(isFullOrgAdmin(null)).toBe(false);
  });
});

describe("performance-scores cron auth", () => {
  it("refuses 'Bearer undefined' when CRON_SECRET is unset", async () => {
    const saved = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      const { GET } = await import("@/app/api/cron/performance-scores/route");
      const res = await GET(
        new NextRequest("http://localhost:3000/api/cron/performance-scores", {
          headers: { authorization: "Bearer undefined" },
        })
      );
      expect(res.status).toBe(503);
    } finally {
      if (saved !== undefined) process.env.CRON_SECRET = saved;
    }
  });
});
