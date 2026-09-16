import { test, expect } from "@playwright/test";
import { getAdminCredentials } from "./helpers/auth";

/**
 * Tenant-isolation and role guards on admin APIs.
 *
 * Unauthenticated checks run everywhere. The signed-in checks need
 * E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD and only probe ids that cannot belong to
 * the admin's org, so they never mutate shared data.
 */

const FOREIGN_ID = "cross-tenant-probe-does-not-exist";

const ADMIN_ENDPOINTS: Array<{ method: "get" | "post" | "put" | "patch" | "delete"; path: string; data?: unknown }> = [
  { method: "get", path: "/api/payouts/batches" },
  { method: "post", path: "/api/payouts/batches", data: {} },
  { method: "post", path: `/api/payouts/batches/${FOREIGN_ID}/process` },
  { method: "get", path: `/api/dashboard/intern/${FOREIGN_ID}/payout-profile` },
  { method: "put", path: `/api/dashboard/intern/${FOREIGN_ID}/payout-profile`, data: {} },
  { method: "post", path: "/api/dashboard/action", data: { action: "deactivate", internId: FOREIGN_ID } },
  { method: "get", path: `/api/dashboard/intern?id=${FOREIGN_ID}` },
  { method: "get", path: `/api/notifications?internId=${FOREIGN_ID}` },
  { method: "get", path: `/api/analytics/scores?internId=${FOREIGN_ID}` },
  { method: "delete", path: `/api/scheduling/events/${FOREIGN_ID}` },
  { method: "put", path: "/api/org", data: { name: "Hijacked" } },
];

test.describe("Admin APIs reject unauthenticated callers", () => {
  for (const { method, path, data } of ADMIN_ENDPOINTS) {
    test(`${method.toUpperCase()} ${path}`, async ({ request }) => {
      const res = await request[method](path, data === undefined ? {} : { data });
      expect([401, 403, 429]).toContain(res.status());
    });
  }
});

test.describe("Signed-in admin cannot reach other tenants' records", () => {
  test.beforeEach(() => {
    test.skip(!getAdminCredentials(), "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set");
  });

  test("foreign intern / batch / event ids resolve to 404", async ({ request }) => {
    const creds = getAdminCredentials()!;
    const login = await request.post("/api/auth/login", { data: creds });
    test.skip(login.status() === 429, "login rate-limited");
    expect(login.ok()).toBeTruthy();

    const probes: Array<{ method: "get" | "post" | "put" | "delete"; path: string; data?: unknown }> = [
      { method: "get", path: `/api/dashboard/intern?id=${FOREIGN_ID}` },
      { method: "post", path: "/api/dashboard/action", data: { action: "deactivate", internId: FOREIGN_ID } },
      { method: "get", path: `/api/notifications?internId=${FOREIGN_ID}` },
      { method: "get", path: `/api/analytics/scores?internId=${FOREIGN_ID}` },
      { method: "delete", path: `/api/scheduling/events/${FOREIGN_ID}` },
    ];

    for (const { method, path, data } of probes) {
      const res = await request[method](path, data === undefined ? {} : { data });
      // 403 covers a MENTOR test account; never 2xx for a record outside the org.
      expect([403, 404, 429], `${method.toUpperCase()} ${path}`).toContain(res.status());
    }
  });
});
