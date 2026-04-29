/**
 * E2E Test Suite — IntelliForge HRMS Portal
 *
 * Tests every API route against the live Vercel deployment.
 * Authenticates via JWT session cookies (register/login flow).
 * Uses a unique email per run to avoid 409 conflicts.
 *
 * Run:  node e2e-test.js
 * Env:  BASE_URL (optional, defaults to production)
 */

const BASE = process.env.BASE_URL || "https://hrms.intelliforge.tech";
const RUN_ID = Date.now().toString(36);
const ORG_SLUG = `e2e-${RUN_ID}`;
const ADMIN_EMAIL = `admin.${RUN_ID}@test.intelliforge.tech`;
const ADMIN_PASSWORD = `TestPass!${RUN_ID}`;
const INTERN_EMAIL = `intern.${RUN_ID}@test.intelliforge.tech`;
const INTERN_PASSWORD = `TestPass!${RUN_ID}`;
const INTERN_NAME = "Priya Sharma";

let passed = 0;
let failed = 0;
let skipped = 0;
const results = [];

const state = {
  adminCookie: null,
  internCookie: null,
  internId: null,
  currentStatus: null,
  testJobId: null,
  testJobSlug: null,
  testCandidateId: null,
  adminCookie2: null,
  xorgCandidateId: null,
};

// ─── Helpers ─────────────────────────────────────────────────────

function extractSessionCookie(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    if (c.startsWith("hrms-session=")) return c.split(";")[0];
  }
  return null;
}

async function api(method, path, body, contentType, cookie) {
  const opts = { method, headers: {}, redirect: "manual" };
  if (cookie) opts.headers["Cookie"] = cookie;
  if (body && contentType === "json") {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  } else if (body && contentType === "form") {
    const form = new FormData();
    for (const [k, v] of Object.entries(body)) form.append(k, String(v));
    opts.body = form;
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data, res };
}

async function test(name, fn) {
  try {
    const result = await fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    if (result) console.log(`    → ${JSON.stringify(result).slice(0, 140)}`);
    results.push({ name, status: "PASS" });
    return result;
  } catch (err) {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    → ${err.message}`);
    results.push({ name, status: "FAIL", error: err.message });
    return null;
  }
}

function skip(name, reason) {
  skipped++;
  console.log(`  \x1b[33m○\x1b[0m ${name} — ${reason}`);
  results.push({ name, status: "SKIP", reason });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiWithRetry(method, path, body, contentType, cookie, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    const result = await api(method, path, body, contentType, cookie);
    if (result.status === 429 && i < retries) {
      const backoff = 5000 * (i + 1);
      await delay(backoff);
      continue;
    }
    return result;
  }
}

// ─── 0. Auth Setup ──────────────────────────────────────────────

async function testAuthSetup() {
  console.log("\n┌─ 0. Auth Setup ─────────────────────────────────────");

  await test("Create test organization + admin", async () => {
    const { status, data, res } = await api("POST", "/api/org", {
      orgName: `E2E Test Org ${RUN_ID}`,
      slug: ORG_SLUG,
      adminEmail: ADMIN_EMAIL,
      adminPassword: ADMIN_PASSWORD,
      adminName: "E2E Admin",
    }, "json");
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.org, "Missing org in response");
    state.adminCookie = extractSessionCookie(res);
    assert(state.adminCookie, "No admin session cookie returned");
    return { org: data.org.slug, admin: data.user?.email };
  });

  await test("Register test intern account", async () => {
    const { status, data, res } = await api("POST", "/api/auth/register", {
      email: INTERN_EMAIL,
      password: INTERN_PASSWORD,
      name: INTERN_NAME,
    }, "json");
    assert([200, 201].includes(status), `Expected 200/201, got ${status}: ${JSON.stringify(data)}`);
    state.internCookie = extractSessionCookie(res);
    assert(state.internCookie, "No intern session cookie returned");
    state.internId = data.userId;
    return { userId: data.userId, role: data.role };
  });

  await test("Admin can login with credentials", async () => {
    const { status, data, res } = await api("POST", "/api/auth/login", {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }, "json");
    assert(status === 200, `Expected 200, got ${status}`);
    const cookie = extractSessionCookie(res);
    if (cookie) state.adminCookie = cookie;
    return { role: data.user?.role };
  });
}

// ─── 1. Page Loads ───────────────────────────────────────────────

async function testPageLoads() {
  console.log("\n┌─ 1. Page Loads ──────────────────────────────────────");
  for (const [path, label] of [
    ["/", "Home"],
    ["/intern-onboarding", "Intern Onboarding"],
    ["/offer", "Offer"],
    ["/attendance", "Attendance"],
    ["/tasks", "Tasks"],
    ["/dashboard", "Dashboard"],
    ["/careers", "Careers"],
  ]) {
    await test(`GET ${path} — ${label} renders with branding`, async () => {
      const res = await fetch(`${BASE}${path}`);
      assert(res.ok, `HTTP ${res.status}`);
      const html = await res.text();
      assert(html.includes("IntelliForge"), "Missing IntelliForge branding");
      return { size: `${(html.length / 1024).toFixed(1)}KB` };
    });
  }
}

// ─── 2. Onboarding ──────────────────────────────────────────────

async function testOnboarding() {
  console.log("\n┌─ 2. Onboarding (POST /api/intern-onboarding) ────────");

  if (!state.internCookie) return skip("Onboarding", "No intern session");

  await test("Reject missing fields (400)", async () => {
    const { status, data } = await api("POST", "/api/intern-onboarding", { phone: "123" }, "form", state.internCookie);
    assert(status === 400, `Expected 400, got ${status}: ${JSON.stringify(data)}`);
    return data;
  });

  await test("Complete onboarding with all fields", async () => {
    const { status, data } = await api("POST", "/api/intern-onboarding", {
      phone: "+919876543210",
      college: "IIT Bangalore",
      branch: "Computer Science",
      year: "3rd Year",
      role: "AI Intern",
      startDate: "2026-04-15",
      durationWeeks: "12",
    }, "form", state.internCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.id, "Missing intern id");
    assert(data.status === "PENDING", `Expected PENDING, got ${data.status}`);
    state.internId = data.id;
    state.currentStatus = "PENDING";
    return data;
  });

  await test("Block duplicate onboarding (409)", async () => {
    const { status, data } = await api("POST", "/api/intern-onboarding", {
      phone: "+919876543210",
      college: "IIT Bangalore",
      branch: "Computer Science",
      year: "3rd Year",
      role: "AI Intern",
      startDate: "2026-04-15",
      durationWeeks: "12",
    }, "form", state.internCookie);
    assert(status === 409, `Expected 409, got ${status}: ${JSON.stringify(data)}`);
    return data;
  });
}

// ─── 3. Dashboard ───────────────────────────────────────────────

async function testDashboard() {
  console.log("\n┌─ 3. Dashboard (GET /api/dashboard) ──────────────────");

  await test("Reject unauthenticated access (403)", async () => {
    const { status } = await api("GET", "/api/dashboard");
    assert(status === 403, `Expected 403, got ${status}`);
  });

  await test("Reject intern session (403)", async () => {
    if (!state.internCookie) { skip("Reject intern session", "No intern cookie"); return; }
    const { status, data } = await api("GET", "/api/dashboard", null, null, state.internCookie);
    assert(status === 403, `Expected 403, got ${status}`);
    return data;
  });

  if (!state.adminCookie) return skip("Admin dashboard", "No admin session");

  await test("Admin sees org dashboard (200)", async () => {
    const { status, data } = await api("GET", "/api/dashboard", null, null, state.adminCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(Array.isArray(data.interns), "interns should be array");
    return { count: data.interns.length };
  });
}

// ─── 4. Intern Detail ───────────────────────────────────────────

async function testInternDetail() {
  console.log("\n┌─ 4. Intern Detail (GET /api/dashboard/intern) ───────");

  if (!state.adminCookie) return skip("Intern detail", "No admin session");

  await test("Reject missing id (400)", async () => {
    const { status } = await api("GET", "/api/dashboard/intern", null, null, state.adminCookie);
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test("Reject unknown id (404)", async () => {
    const { status } = await api("GET", "/api/dashboard/intern?id=nonexistent_123", null, null, state.adminCookie);
    assert(status === 404, `Expected 404, got ${status}`);
  });

  if (!state.internId) return skip("Fetch detail", "No internId");

  await test("Return full intern detail", async () => {
    const { status, data } = await api("GET", `/api/dashboard/intern?id=${state.internId}`, null, null, state.adminCookie);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.name === INTERN_NAME, `Name: ${data.name}`);
    assert(Array.isArray(data.attendance), "Missing attendance[]");
    assert(Array.isArray(data.tasks), "Missing tasks[]");
    return { name: data.name, status: data.status };
  });
}

// ─── 5. Admin Actions ───────────────────────────────────────────

async function testAdminActions() {
  console.log("\n┌─ 5. Admin Actions (POST /api/dashboard/action) ──────");

  if (!state.adminCookie || !state.internId) return skip("Admin actions", "No admin session or internId");

  await test("Reject missing action (400)", async () => {
    const { status } = await api("POST", "/api/dashboard/action", { internId: state.internId }, "json", state.adminCookie);
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test("update_stipend → 15000 paise", async () => {
    const { status, data } = await api("POST", "/api/dashboard/action", {
      action: "update_stipend",
      internId: state.internId,
      stipendPaise: 15000,
    }, "json", state.adminCookie);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.ok, "Expected ok:true");
    return data;
  });

  await test("send_offer → status OFFERED", async () => {
    const { status, data } = await api("POST", "/api/dashboard/action", {
      action: "send_offer",
      internId: state.internId,
    }, "json", state.adminCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.status === "OFFERED", `Expected OFFERED, got ${data.status}`);
    state.currentStatus = "OFFERED";
    return data;
  });

  await test("Verify stipend persisted", async () => {
    const { data } = await api("GET", `/api/dashboard/intern?id=${state.internId}`, null, null, state.adminCookie);
    assert(data.stipendPaise === 15000, `Expected 15000, got ${data.stipendPaise}`);
    assert(data.status === state.currentStatus, `Status: ${data.status}`);
    return { stipend: data.stipendPaise, status: data.status };
  });
}

// ─── 6. Offer Lookup ────────────────────────────────────────────

async function testOffer() {
  console.log("\n┌─ 6. Offer (GET /api/offer) ──────────────────────────");

  await test("Reject unauthenticated (401)", async () => {
    const { status } = await api("GET", "/api/offer");
    assert(status === 401, `Expected 401, got ${status}`);
  });

  if (!state.internCookie) return skip("Offer lookup", "No intern session");

  await test("Return offer for test intern", async () => {
    const { status, data } = await api("GET", "/api/offer", null, null, state.internCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.name === INTERN_NAME, `Name: ${data.name}`);
    assert(data.role === "AI Intern", `Role: ${data.role}`);
    assert(data.stipendPaise === 15000, `Stipend: ${data.stipendPaise}`);
    assert(data.status === state.currentStatus, `Status: ${data.status}`);
    return { name: data.name, status: data.status, stipend: data.stipendPaise };
  });
}

// ─── 7. Accept Offer ────────────────────────────────────────────

async function testOfferAccept() {
  console.log("\n┌─ 7. Accept Offer (POST /api/offer/accept) ───────────");

  if (!state.internCookie) return skip("Offer accept", "No intern session");

  if (state.currentStatus !== "OFFERED") {
    skip("Accept offer", `Status is ${state.currentStatus}, not OFFERED`);
    skip("Re-accept guard", "Depends on accept step");
  } else {
    await test("Accept offer (OFFERED → ACTIVE)", async () => {
      const { status, data } = await api("POST", "/api/offer/accept", {}, "json", state.internCookie);
      assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
      assert(data.status === "ACTIVE", `Expected ACTIVE, got ${data.status}`);
      state.currentStatus = "ACTIVE";
      return data;
    });

    await test("Re-accept blocked (400, already ACTIVE)", async () => {
      const { status, data } = await api("POST", "/api/offer/accept", {}, "json", state.internCookie);
      assert(status === 400, `Expected 400, got ${status}`);
      return data;
    });
  }
}

// ─── 8. Attendance ──────────────────────────────────────────────

async function testAttendance() {
  console.log("\n┌─ 8. Attendance (/api/attendance) ─────────────────────");

  if (!state.internCookie) return skip("Attendance", "No intern session");

  const canAccess = state.currentStatus === "ACTIVE" || state.currentStatus === "OFFERED";
  if (!canAccess) {
    skip("Attendance", `Status is ${state.currentStatus} (needs ACTIVE/OFFERED)`);
    return;
  }

  await test("GET — load attendance for intern", async () => {
    const { status, data } = await apiWithRetry("GET", "/api/attendance", null, null, state.internCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.internId, "Missing internId");
    assert(data.internName === INTERN_NAME, `Name: ${data.internName}`);
    return { today: data.today ? "exists" : "none", weekCount: data.week.length };
  });

  await test("POST — punch in (type:'in', mode:'WFH')", async () => {
    await delay(500);
    const { status, data } = await apiWithRetry("POST", "/api/attendance", {
      type: "in",
      mode: "WFH",
    }, "json", state.internCookie);
    if (status === 400 && data.error === "Already punched in today") {
      return { note: "Already punched in (previous run today)" };
    }
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.record.punchIn, "Missing punchIn");
    assert(data.record.mode === "WFH", `Mode: ${data.record.mode}`);
    return { punchIn: data.record.punchIn, mode: data.record.mode };
  });

  await test("POST — duplicate punch in blocked (400)", async () => {
    await delay(500);
    const { status, data } = await apiWithRetry("POST", "/api/attendance", {
      type: "in",
      mode: "Office",
    }, "json", state.internCookie);
    assert(status === 400, `Expected 400, got ${status}`);
    assert(data.error === "Already punched in today", `Error: ${data.error}`);
    return data;
  });

  await test("POST — punch out (type:'out')", async () => {
    await delay(500);
    const { status, data } = await apiWithRetry("POST", "/api/attendance", {
      type: "out",
    }, "json", state.internCookie);
    if (status === 400 && data.error === "Already punched out today") {
      return { note: "Already punched out (previous run today)" };
    }
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.record.punchOut, "Missing punchOut");
    return { punchIn: data.record.punchIn, punchOut: data.record.punchOut };
  });

  await test("POST — duplicate punch out blocked (400)", async () => {
    await delay(500);
    const { status, data } = await apiWithRetry("POST", "/api/attendance", {
      type: "out",
    }, "json", state.internCookie);
    assert(status === 400, `Expected 400, got ${status}`);
    return data;
  });

  await test("POST — reject invalid type (400)", async () => {
    await delay(500);
    const { status, data } = await apiWithRetry("POST", "/api/attendance", {
      type: "invalid",
    }, "json", state.internCookie);
    assert(status === 400, `Expected 400, got ${status}`);
    return data;
  });

  await test("GET — verify today's attendance recorded", async () => {
    await delay(500);
    const { status, data } = await apiWithRetry("GET", "/api/attendance", null, null, state.internCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.today, "No attendance record for today");
    assert(data.today.punchIn, "Missing punchIn");
    assert(data.week.length >= 1, "Week should have ≥1 entry");
    return { mode: data.today.mode, hasPunchOut: !!data.today.punchOut };
  });
}

// ─── 9. Tasks ───────────────────────────────────────────────────

async function testTasks() {
  console.log("\n┌─ 9. Tasks (/api/tasks) ───────────────────────────────");

  if (!state.internCookie) return skip("Tasks", "No intern session");

  await test("GET — load tasks for intern", async () => {
    const { status, data } = await apiWithRetry("GET", "/api/tasks", null, null, state.internCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.internId, "Missing internId");
    return { taskCount: data.tasks.length };
  });

  let taskId = null;

  await test("POST — create task (IN_PROGRESS, 4h)", async () => {
    await delay(1000);
    const { status, data } = await apiWithRetry("POST", "/api/tasks", {
      title: "Setup Dev Environment",
      description: "Install Python 3.11, VS Code, configure Git SSH keys",
      status: "IN_PROGRESS",
      hours: 4,
    }, "json", state.internCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.id, "Missing task id");
    assert(data.title === "Setup Dev Environment", `Title: ${data.title}`);
    assert(data.status === "IN_PROGRESS", `Status: ${data.status}`);
    assert(data.hours === 4, `Hours: ${data.hours}`);
    taskId = data.id;
    return { id: data.id, week: data.week };
  });

  await test("POST — create second task (TODO, 2.5h)", async () => {
    await delay(1000);
    const { status, data } = await apiWithRetry("POST", "/api/tasks", {
      title: "Read project documentation",
      description: "Go through the wiki, API docs, and coding standards guide",
      status: "TODO",
      hours: 2.5,
    }, "json", state.internCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.hours === 2.5, `Hours: ${data.hours}`);
    return { id: data.id, hours: data.hours };
  });

  await test("POST — create third task (DONE, 1h)", async () => {
    await delay(1000);
    const { status, data } = await apiWithRetry("POST", "/api/tasks", {
      title: "Complete onboarding form",
      description: "Fill out the HRMS portal onboarding form with documents",
      status: "DONE",
      hours: 1,
    }, "json", state.internCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    return { id: data.id, status: data.status };
  });

  await test("GET — verify 3 tasks, total 7.5h", async () => {
    await delay(5000);
    const { status, data } = await apiWithRetry("GET", "/api/tasks", null, null, state.internCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.tasks.length >= 3, `Expected ≥3 tasks, got ${data.tasks.length}`);
    const total = data.tasks.reduce((s, t) => s + t.hours, 0);
    assert(total >= 7.5, `Expected ≥7.5h total, got ${total}`);
    return { taskCount: data.tasks.length, totalHours: total };
  });

  if (taskId) {
    await test("DELETE — remove task by id", async () => {
      await delay(1000);
      const { status, data } = await apiWithRetry("DELETE", `/api/tasks?id=${taskId}`, null, null, state.internCookie);
      assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
      assert(data.ok, "Expected ok:true");
      return data;
    });

    await test("GET — verify deletion (task count decreased)", async () => {
      await delay(1000);
      const { status, data } = await apiWithRetry("GET", "/api/tasks", null, null, state.internCookie);
      assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
      const found = data.tasks.find((t) => t.id === taskId);
      assert(!found, "Deleted task still present");
      return { taskCount: data.tasks.length };
    });
  }
}

// ─── 10. Webhook ────────────────────────────────────────────────

async function testWebhook() {
  console.log("\n┌─ 10. Webhook (POST /api/webhooks/agentmail) ─────────");

  await test("Rejects request without webhook secret (401)", async () => {
    const { status } = await api("POST", "/api/webhooks/agentmail", {
      event: "message.sent",
      message: {},
    }, "json");
    assert([401, 503].includes(status), `Expected 401 or 503, got ${status}`);
  });
}

// ─── 11. Careers API ────────────────────────────────────────────

async function testCareers() {
  console.log("\n┌─ 11. Careers (Public API) ────────────────────────────");

  await test("GET /api/careers — returns 200 with jobs array", async () => {
    const { status, data } = await api("GET", "/api/careers");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.jobs), "jobs should be array");
    if (data.jobs.length > 0) {
      assert(data.jobs[0].slug, "Jobs should have slug field");
    }
    return { jobCount: data.jobs.length };
  });

  await test("GET /api/careers/nonexistent-slug — returns 404", async () => {
    const { status } = await api("GET", "/api/careers/nonexistent-slug-12345");
    assert(status === 404, `Expected 404, got ${status}`);
  });

  await test("POST /api/careers/nonexistent-slug/apply — returns 404", async () => {
    const { status } = await api("POST", "/api/careers/nonexistent-slug-12345/apply", {
      name: "Test User",
      email: "test@example.com",
    }, "json");
    assert(status === 404, `Expected 404, got ${status}`);
  });
}

// ─── 12. Candidate Management ───────────────────────────────────

async function testCandidateManagement() {
  console.log("\n┌─ 12. Candidate Management ───────────────────────────");

  if (!state.adminCookie) return skip("Candidate management", "No admin session");

  await test("Create test job posting (POST /api/jobs)", async () => {
    const { status, data } = await apiWithRetry("POST", "/api/jobs", {
      title: `E2E QA Engineer ${RUN_ID}`,
      description: "Quality assurance role for testing",
      skills: ["Testing", "Playwright"],
    }, "json", state.adminCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.job?.id, "Missing job.id in response");
    assert(data.job?.slug, "Missing job.slug in response");
    state.testJobId = data.job.id;
    state.testJobSlug = data.job.slug;
    return { jobId: state.testJobId, slug: state.testJobSlug };
  });

  if (!state.testJobId || !state.testJobSlug) {
    skip("Submit public application", "Job creation failed");
    skip("GET candidate detail — reject unauthenticated (401)", "Job creation failed");
    skip("GET candidate detail — admin sees full detail (200)", "Job creation failed");
    skip("PATCH candidate — reject invalid status (400)", "Job creation failed");
    skip("PATCH candidate — admin updates to SHORTLISTED (200)", "Job creation failed");
    skip("POST contact — reject missing subject (400)", "Job creation failed");
    skip("POST contact — admin sends email (200 or 503)", "Job creation failed");
    skip("DELETE candidate — admin deletes non-converted candidate (200)", "Job creation failed");
    skip("GET candidate detail — returns 404 after deletion", "Job creation failed");
    return;
  }

  const candidateEmail = `cand.${RUN_ID}@test.intelliforge.tech`;

  await test("Submit public application (POST /api/careers/{slug}/apply)", async () => {
    await delay(500);
    const { status, data } = await apiWithRetry("POST", `/api/careers/${state.testJobSlug}/apply`, {
      name: "Candidate One",
      email: candidateEmail,
      resumeUrl: "https://example.com/resume.pdf",
      githubUrl: "https://github.com/example",
      coverNote: "Test cover note for QA role",
    }, "json");
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.candidateId, "Missing candidateId");
    state.testCandidateId = data.candidateId;
    return { candidateId: state.testCandidateId };
  });

  if (!state.testCandidateId) {
    skip("GET candidate detail — reject unauthenticated (401)", "Candidate seed failed");
    skip("GET candidate detail — admin sees full detail (200)", "Candidate seed failed");
    skip("PATCH candidate — reject invalid status (400)", "Candidate seed failed");
    skip("PATCH candidate — admin updates to SHORTLISTED (200)", "Candidate seed failed");
    skip("POST contact — reject missing subject (400)", "Candidate seed failed");
    skip("POST contact — admin sends email (200 or 503)", "Candidate seed failed");
    skip("DELETE candidate — admin deletes non-converted candidate (200)", "Candidate seed failed");
    skip("GET candidate detail — returns 404 after deletion", "Candidate seed failed");
    return;
  }

  const candidatePath = `/api/jobs/${state.testJobId}/candidates/${state.testCandidateId}`;
  const jobTitle = `E2E QA Engineer ${RUN_ID}`;

  await test("GET candidate detail — reject unauthenticated (401)", async () => {
    const { status } = await api("GET", candidatePath);
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test("GET candidate detail — admin sees full detail (200)", async () => {
    await delay(500);
    const { status, data } = await apiWithRetry("GET", candidatePath, null, null, state.adminCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    const candidate = data.candidate ?? data;
    assert(candidate.email === candidateEmail, `Email: ${candidate.email} (expected ${candidateEmail})`);
    assert(candidate.coverNote === "Test cover note for QA role", `coverNote: ${candidate.coverNote}`);
    assert(candidate.jobPosting?.title === jobTitle, `jobPosting.title: ${candidate.jobPosting?.title} (expected ${jobTitle})`);
    return { email: candidate.email, interviewStatus: candidate.interviewStatus };
  });

  await test("PATCH candidate — reject invalid status (400)", async () => {
    await delay(500);
    const { status, data } = await apiWithRetry("PATCH", candidatePath, {
      interviewStatus: "INVALID_STATUS",
    }, "json", state.adminCookie);
    assert(status === 400, `Expected 400, got ${status}: ${JSON.stringify(data)}`);
    return data;
  });

  await test("PATCH candidate — admin updates to SHORTLISTED (200)", async () => {
    await delay(500);
    const { status, data } = await apiWithRetry("PATCH", candidatePath, {
      interviewStatus: "SHORTLISTED",
    }, "json", state.adminCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    const candidate = data.candidate ?? data;
    assert(candidate.interviewStatus === "SHORTLISTED", `interviewStatus: ${candidate.interviewStatus}`);
    return { interviewStatus: candidate.interviewStatus };
  });

  await test("POST contact — reject missing subject (400)", async () => {
    await delay(500);
    const { status, data } = await apiWithRetry("POST", `${candidatePath}/contact`, {
      message: "Test message that is long enough",
    }, "json", state.adminCookie);
    assert(status === 400, `Expected 400, got ${status}: ${JSON.stringify(data)}`);
    return data;
  });

  await test("POST contact — admin sends email (200 or 503)", async () => {
    await delay(500);
    const { status, data } = await apiWithRetry("POST", `${candidatePath}/contact`, {
      subject: "Re: Your QA application",
      message: "Hi, we'd like to learn more about your background. Are you available for a chat next week?",
    }, "json", state.adminCookie);
    // 503 acceptable: AGENTMAIL_HR_INBOX_ID may be unset in production env
    assert([200, 503].includes(status), `Expected 200 or 503, got ${status}: ${JSON.stringify(data)}`);
    return { status, ok: data?.ok };
  });

  await test("DELETE candidate — admin deletes non-converted candidate (200)", async () => {
    await delay(500);
    const { status, data } = await apiWithRetry("DELETE", candidatePath, null, null, state.adminCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.ok === true, `Expected response.ok === true, got ${JSON.stringify(data)}`);
    return data;
  });

  await test("GET candidate detail — returns 404 after deletion", async () => {
    await delay(500);
    const { status } = await apiWithRetry("GET", candidatePath, null, null, state.adminCookie);
    assert(status === 404, `Expected 404, got ${status}`);
  });
}

// ─── 13. Cross-Org Isolation ────────────────────────────────────

async function testCrossOrgIsolation() {
  console.log("\n┌─ 13. Cross-Org Isolation ────────────────────────────");

  if (!state.adminCookie) return skip("Cross-org isolation", "No primary admin session");
  if (!state.testJobId || !state.testJobSlug) return skip("Cross-org isolation", "No test job from section 12");

  const xorgEmail = `xorg.${RUN_ID}@test.intelliforge.tech`;

  await test("Setup — create fresh bait candidate in Org1 (POST /api/careers/{slug}/apply)", async () => {
    await delay(500);
    const { status, data } = await apiWithRetry("POST", `/api/careers/${state.testJobSlug}/apply`, {
      name: "Cross Org Test",
      email: xorgEmail,
      coverNote: "Bait for cross-org test",
    }, "json");
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.candidateId, "Missing candidateId");
    state.xorgCandidateId = data.candidateId;
    return { candidateId: state.xorgCandidateId };
  });

  if (!state.xorgCandidateId) {
    skip("Create second org + admin (POST /api/org)", "Bait candidate seed failed");
    skip("Org2 admin sees own dashboard (200)", "Bait candidate seed failed");
    skip("Org2 admin GET Org1 candidate detail (404)", "Bait candidate seed failed");
    skip("Org2 admin PATCH Org1 candidate status (404)", "Bait candidate seed failed");
    skip("Org2 admin DELETE Org1 candidate (404)", "Bait candidate seed failed");
    skip("Org2 admin POST contact to Org1 candidate (404)", "Bait candidate seed failed");
    skip("Org2 admin GET /api/jobs returns 0 jobs (200)", "Bait candidate seed failed");
    skip("Cleanup — Org1 admin deletes bait candidate (200)", "Bait candidate seed failed");
    return;
  }

  await test("Create second org + admin (POST /api/org)", async () => {
    await delay(500);
    const { status, data, res } = await api("POST", "/api/org", {
      orgName: `E2E Other Org ${RUN_ID}`,
      slug: `e2e-other-${RUN_ID}`,
      adminEmail: `admin2.${RUN_ID}@test.intelliforge.tech`,
      adminPassword: ADMIN_PASSWORD,
      adminName: "E2E Other Admin",
    }, "json");
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.org, "Missing org in response");
    state.adminCookie2 = extractSessionCookie(res);
    assert(state.adminCookie2, "No second admin session cookie returned");
    return { org: data.org?.slug, admin: data.user?.email };
  });

  const xorgPath = `/api/jobs/${state.testJobId}/candidates/${state.xorgCandidateId}`;

  if (!state.adminCookie2) {
    skip("Org2 admin sees own dashboard (200)", "No org2 admin session");
    skip("Org2 admin GET Org1 candidate detail (404)", "No org2 admin session");
    skip("Org2 admin PATCH Org1 candidate status (404)", "No org2 admin session");
    skip("Org2 admin DELETE Org1 candidate (404)", "No org2 admin session");
    skip("Org2 admin POST contact to Org1 candidate (404)", "No org2 admin session");
    skip("Org2 admin GET /api/jobs returns 0 jobs (200)", "No org2 admin session");
  } else {
    await test("Org2 admin sees own dashboard (200)", async () => {
      await delay(500);
      const { status, data } = await api("GET", "/api/dashboard", null, null, state.adminCookie2);
      assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
      assert(Array.isArray(data.interns), "interns should be array");
      assert(data.interns.length === 0, `Expected 0 interns in fresh org, got ${data.interns.length}`);
      return { internCount: data.interns.length };
    });

    await test("Org2 admin GET Org1 candidate detail (404)", async () => {
      await delay(500);
      const { status } = await api("GET", xorgPath, null, null, state.adminCookie2);
      assert(status === 404, `Expected 404 (no existence leak), got ${status}`);
    });

    await test("Org2 admin PATCH Org1 candidate status (404)", async () => {
      await delay(500);
      const { status } = await api("PATCH", xorgPath, {
        interviewStatus: "REJECTED",
      }, "json", state.adminCookie2);
      assert(status === 404, `Expected 404, got ${status}`);
    });

    await test("Org2 admin DELETE Org1 candidate (404)", async () => {
      await delay(500);
      const { status } = await api("DELETE", xorgPath, null, null, state.adminCookie2);
      assert(status === 404, `Expected 404, got ${status}`);
    });

    await test("Org2 admin POST contact to Org1 candidate (404)", async () => {
      await delay(500);
      const { status } = await api("POST", `${xorgPath}/contact`, {
        subject: "Trying cross-org",
        message: "This should be blocked completely.",
      }, "json", state.adminCookie2);
      assert(status === 404, `Expected 404, got ${status}`);
    });

    await test("Org2 admin GET /api/jobs returns 0 jobs (200)", async () => {
      await delay(500);
      const { status, data } = await api("GET", "/api/jobs", null, null, state.adminCookie2);
      assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
      assert(Array.isArray(data.jobs), "jobs should be array");
      assert(data.jobs.length === 0, `Expected 0 jobs in fresh org, got ${data.jobs.length}`);
      return { jobCount: data.jobs.length };
    });
  }

  await test("Cleanup — Org1 admin deletes bait candidate (200)", async () => {
    await delay(500);
    const { status, data } = await apiWithRetry("DELETE", `/api/jobs/${state.testJobId}/candidates/${state.xorgCandidateId}`, null, null, state.adminCookie);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    return data;
  });
}

// ─── 14. Final Verification ─────────────────────────────────────

async function testFinalState() {
  console.log("\n┌─ 14. Final State ────────────────────────────────────");

  if (!state.internId || !state.adminCookie) return skip("Final state", "No internId or admin session");

  await test("Intern detail has correct aggregated data", async () => {
    const { data } = await api("GET", `/api/dashboard/intern?id=${state.internId}`, null, null, state.adminCookie);
    assert(data.name === INTERN_NAME, `Name: ${data.name}`);
    assert(data.status === state.currentStatus, `Status: ${data.status} (expected ${state.currentStatus})`);
    assert(data.stipendPaise === 15000, `Stipend: ${data.stipendPaise}`);
    assert(data.tasks.length >= 1, "Should have tasks");
    return {
      status: data.status,
      stipend: `₹${(data.stipendPaise / 100).toFixed(2)}`,
      attendanceCount: data.attendance.length,
      taskCount: data.tasks.length,
    };
  });

  await test("Admin dashboard accessible (200)", async () => {
    const { status, data } = await api("GET", "/api/dashboard", null, null, state.adminCookie);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.interns), "interns should be array");
    return { orgInternCount: data.interns.length };
  });
}

// ─── Runner ──────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║       IntelliForge HRMS — E2E Test Suite            ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`  Target:   ${BASE}`);
  console.log(`  Admin:    ${ADMIN_EMAIL}`);
  console.log(`  Intern:   ${INTERN_EMAIL}`);

  await testAuthSetup();
  await testPageLoads();
  await testOnboarding();
  await testDashboard();
  await testInternDetail();
  await testAdminActions();
  await testOffer();
  await testOfferAccept();
  await testAttendance();
  await testTasks();
  await testWebhook();
  await testCareers();
  await testCandidateManagement();
  await testCrossOrgIsolation();
  await testFinalState();

  const total = passed + failed + skipped;
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log(`║  \x1b[32m${String(passed).padStart(2)} passed\x1b[0m   \x1b[31m${String(failed).padStart(2)} failed\x1b[0m   \x1b[33m${String(skipped).padStart(2)} skipped\x1b[0m   ${total} total  ║`);
  console.log("╚══════════════════════════════════════════════════════╝");

  if (failed > 0) {
    console.log("\n\x1b[31mFailed:\x1b[0m");
    for (const r of results.filter((r) => r.status === "FAIL")) {
      console.log(`  ✗ ${r.name}`);
      console.log(`    ${r.error}`);
    }
  }
  if (skipped > 0) {
    console.log("\n\x1b[33mSkipped:\x1b[0m");
    for (const r of results.filter((r) => r.status === "SKIP")) {
      console.log(`  ○ ${r.name} — ${r.reason}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(2);
});
