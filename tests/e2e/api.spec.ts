import { test, expect } from "@playwright/test";

test.describe("Auth API Endpoints", () => {
  test("POST /api/auth/login rejects invalid credentials", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: { email: "nonexistent@test.com", password: "wrongpassword" },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test("POST /api/auth/login rejects empty body", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test("GET /api/auth/me returns 401 without session", async ({ request }) => {
    const response = await request.get("/api/auth/me");
    expect(response.status()).toBe(401);
  });

  test("POST /api/auth/register rejects missing fields", async ({ request }) => {
    const response = await request.post("/api/auth/register", {
      data: { email: "test@example.com" },
    });
    expect(response.status()).toBe(400);
  });

  test("POST /api/auth/magic-link rejects empty email", async ({ request }) => {
    const response = await request.post("/api/auth/magic-link", {
      data: {},
    });
    expect([400, 404, 429, 500]).toContain(response.status());
  });
});

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
    expect([401, 403, 429, 500]).toContain(response.status());
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
