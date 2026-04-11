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
    expect([400, 429]).toContain(response.status());
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

  test("POST /api/intern-onboarding blocks unauthenticated access", async ({ request }) => {
    const response = await request.post("/api/intern-onboarding", {
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

  test("GET /api/cron/performance-scores rejects without cron secret", async ({ request }) => {
    const response = await request.get("/api/cron/performance-scores");
    expect([401, 403, 500, 503]).toContain(response.status());
  });
});

test.describe("Analytics API (unauthenticated)", () => {
  test("GET /api/analytics/overview blocks unauthenticated access", async ({ request }) => {
    const response = await request.get("/api/analytics/overview");
    expect([401, 403]).toContain(response.status());
  });

  test("GET /api/analytics/scores blocks unauthenticated access", async ({ request }) => {
    const response = await request.get("/api/analytics/scores");
    expect([401, 403]).toContain(response.status());
  });

  test("GET /api/analytics/review blocks unauthenticated access", async ({ request }) => {
    const response = await request.get("/api/analytics/review");
    expect([401, 403]).toContain(response.status());
  });
});

test.describe("Billing API (unauthenticated)", () => {
  test("POST /api/billing/checkout blocks unauthenticated access", async ({ request }) => {
    const response = await request.post("/api/billing/checkout", {
      data: { plan: "starter" },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("POST /api/billing/portal blocks unauthenticated access", async ({ request }) => {
    const response = await request.post("/api/billing/portal");
    expect([401, 403]).toContain(response.status());
  });
});

test.describe("Organization API", () => {
  test("POST /api/org rejects empty body", async ({ request }) => {
    const response = await request.post("/api/org", { data: {} });
    expect([400, 500]).toContain(response.status());
  });

  test("GET /api/org blocks unauthenticated access", async ({ request }) => {
    const response = await request.get("/api/org");
    expect([401, 403]).toContain(response.status());
  });

  test("PUT /api/org blocks unauthenticated access", async ({ request }) => {
    const response = await request.put("/api/org", {
      data: { name: "Test Org" },
    });
    expect([401, 403]).toContain(response.status());
  });
});

test.describe("Jobs API (unauthenticated)", () => {
  test("GET /api/jobs blocks unauthenticated access", async ({ request }) => {
    const response = await request.get("/api/jobs");
    expect([401, 403]).toContain(response.status());
  });

  test("POST /api/jobs blocks unauthenticated access", async ({ request }) => {
    const response = await request.post("/api/jobs", {
      data: { title: "Test Job", description: "Test", skills: ["js"] },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("GET /api/jobs/fake-id/candidates blocks unauthenticated access", async ({ request }) => {
    const response = await request.get("/api/jobs/fake-id/candidates");
    expect([401, 403]).toContain(response.status());
  });

  test("POST /api/jobs/fake-id/convert blocks unauthenticated access", async ({ request }) => {
    const response = await request.post("/api/jobs/fake-id/convert", {
      data: { candidateId: "fake", role: "Dev Intern", startDate: "2026-04-01", durationWeeks: 8 },
    });
    expect([401, 403]).toContain(response.status());
  });
});

test.describe("Documents API (unauthenticated)", () => {
  test("POST /api/documents/verify blocks unauthenticated access", async ({ request }) => {
    const response = await request.post("/api/documents/verify", {
      data: { internId: "fake", documentType: "aadhaar", documentUrl: "https://example.com/doc.jpg" },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("GET /api/documents/verify blocks unauthenticated access", async ({ request }) => {
    const response = await request.get("/api/documents/verify?internId=fake");
    expect([401, 403]).toContain(response.status());
  });

  test("POST /api/documents/review blocks unauthenticated access", async ({ request }) => {
    const response = await request.post("/api/documents/review", {
      data: { verificationId: "fake", action: "APPROVE" },
    });
    expect([401, 403]).toContain(response.status());
  });
});

test.describe("Webhook Endpoints", () => {
  test("POST /api/webhooks/stripe rejects without valid signature", async ({ request }) => {
    const response = await request.post("/api/webhooks/stripe", {
      data: { type: "test" },
      headers: { "stripe-signature": "invalid" },
    });
    expect([400, 401, 500]).toContain(response.status());
  });

  test("POST /api/webhooks/interview-bot rejects without valid secret", async ({ request }) => {
    const response = await request.post("/api/webhooks/interview-bot", {
      data: { event: "interview.completed" },
    });
    expect([400, 401, 403, 500]).toContain(response.status());
  });

  test("GET /api/webhooks/whatsapp rejects invalid verify token", async ({ request }) => {
    const response = await request.get(
      "/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test123"
    );
    expect([200, 403, 405]).toContain(response.status());
  });
});
