import { test, expect } from "@playwright/test";

test.describe("API Endpoints (unauthenticated)", () => {
  test("GET /api/dashboard blocks unauthenticated access", async ({ request }) => {
    const response = await request.get("/api/dashboard");
    expect([401, 403, 500]).toContain(response.status());
  });

  test("GET /api/attendance blocks unauthenticated access", async ({ request }) => {
    const response = await request.get("/api/attendance");
    expect([401, 403, 500]).toContain(response.status());
  });

  test("GET /api/tasks blocks unauthenticated access", async ({ request }) => {
    const response = await request.get("/api/tasks");
    expect([401, 403, 500]).toContain(response.status());
  });

  test("GET /api/offer blocks unauthenticated access", async ({ request }) => {
    const response = await request.get("/api/offer");
    expect([401, 403, 500]).toContain(response.status());
  });

  test("POST /api/onboard blocks unauthenticated access", async ({ request }) => {
    const response = await request.post("/api/onboard", {
      data: { name: "Test" },
    });
    expect([401, 403, 500]).toContain(response.status());
  });

  test("POST /api/dashboard/action blocks unauthenticated access", async ({ request }) => {
    const response = await request.post("/api/dashboard/action", {
      data: { action: "send_offer", internId: "test" },
    });
    expect([401, 403, 500]).toContain(response.status());
  });

  test("POST /api/tasks blocks unauthenticated access", async ({ request }) => {
    const response = await request.post("/api/tasks", {
      data: { title: "Test", description: "Test", status: "TODO", hours: 1 },
    });
    expect([401, 403, 500]).toContain(response.status());
  });

  test("POST /api/attendance blocks unauthenticated access", async ({ request }) => {
    const response = await request.post("/api/attendance", {
      data: { type: "in", mode: "WFH" },
    });
    expect([401, 403, 500]).toContain(response.status());
  });

  test("POST /api/offer/accept blocks unauthenticated access", async ({ request }) => {
    const response = await request.post("/api/offer/accept");
    expect([401, 403, 500]).toContain(response.status());
  });

  test("GET /api/dashboard does NOT return 200", async ({ request }) => {
    const response = await request.get("/api/dashboard");
    expect(response.status()).not.toBe(200);
  });
});

test.describe("API Cron Endpoints", () => {
  test("GET /api/cron/attendance-nudge rejects without cron secret", async ({ request }) => {
    const response = await request.get("/api/cron/attendance-nudge");
    expect([401, 403, 500, 503]).toContain(response.status());
  });

  test("GET /api/cron/task-reminder rejects without cron secret", async ({ request }) => {
    const response = await request.get("/api/cron/task-reminder");
    expect([401, 403, 500, 503]).toContain(response.status());
  });
});
