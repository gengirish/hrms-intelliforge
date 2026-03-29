/**
 * E2E Test Suite — IntelliForge HRMS Portal
 *
 * Tests every API route against the live Vercel deployment.
 * Uses a unique email per run to avoid 409 conflicts.
 * Proper dependency chaining: later tests skip if prerequisites fail.
 *
 * Run:  node e2e-test.js
 * Env:  BASE_URL (optional, defaults to production)
 */

const BASE = process.env.BASE_URL || "https://hrms.intelliforge.tech";
const ADMIN_EMAIL = "admin@intelliforge.tech";
const TEST_EMAIL = `e2e.${Date.now()}@test.intelliforge.tech`;

let passed = 0;
let failed = 0;
let skipped = 0;
const results = [];

const state = {
  internId: null,
  currentStatus: null,
};

// ─── Helpers ─────────────────────────────────────────────────────

async function api(method, path, body, contentType) {
  const opts = { method, headers: {} };
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
  return { status: res.status, ok: res.ok, data };
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

// ─── 1. Page Loads ───────────────────────────────────────────────

async function testPageLoads() {
  console.log("\n┌─ 1. Page Loads ──────────────────────────────────────");
  for (const [path, label] of [
    ["/", "Home"],
    ["/onboard", "Onboard"],
    ["/offer", "Offer"],
    ["/attendance", "Attendance"],
    ["/tasks", "Tasks"],
    ["/dashboard", "Dashboard"],
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
  console.log("\n┌─ 2. Onboarding (POST /api/onboard) ──────────────────");

  await test("Reject missing fields (400)", async () => {
    const { status, data } = await api("POST", "/api/onboard", { name: "Test" }, "form");
    assert(status === 400, `Expected 400, got ${status}`);
    return data;
  });

  await test("Create intern via formData", async () => {
    const { status, data } = await api("POST", "/api/onboard", {
      name: "Priya Sharma",
      email: TEST_EMAIL,
      phone: "+919876543210",
      college: "IIT Bangalore",
      branch: "Computer Science",
      year: "3rd Year",
      role: "AI Intern",
      startDate: "2026-04-15",
      durationWeeks: "12",
    }, "form");
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.id, "Missing intern id");
    assert(data.status === "PENDING", `Expected PENDING, got ${data.status}`);
    state.internId = data.id;
    state.currentStatus = "PENDING";
    return data;
  });

  await test("Block duplicate email (409)", async () => {
    const { status, data } = await api("POST", "/api/onboard", {
      name: "Priya Sharma",
      email: TEST_EMAIL,
      phone: "+919876543210",
      college: "IIT Bangalore",
      branch: "Computer Science",
      year: "3rd Year",
      role: "AI Intern",
      startDate: "2026-04-15",
      durationWeeks: "12",
    }, "form");
    assert(status === 409, `Expected 409, got ${status}`);
    return data;
  });

  if (state.internId) {
    await test("Intern created (shared HR inbox hr@intelliforge.tech for all mail)", async () => {
      const { data } = await api("GET", `/api/dashboard/intern?id=${state.internId}`);
      assert(data.id === state.internId, "detail id mismatch");
      return { email: data.email, status: data.status };
    });
  }
}

// ─── 3. Dashboard ───────────────────────────────────────────────

async function testDashboard() {
  console.log("\n┌─ 3. Dashboard (GET /api/dashboard) ──────────────────");

  await test("Reject missing email (400)", async () => {
    const { status } = await api("GET", "/api/dashboard");
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test("Reject non-admin (403)", async () => {
    const { status, data } = await api("GET", "/api/dashboard?email=nobody@example.com");
    assert(status === 403, `Expected 403, got ${status}`);
    return data;
  });

  await test("Admin sees intern list", async () => {
    const { status, data } = await api("GET", `/api/dashboard?email=${ADMIN_EMAIL}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.interns), "interns should be array");
    const ours = data.interns.find((i) => i.email === TEST_EMAIL);
    assert(ours, "Test intern not in list");
    return { count: data.interns.length, testInternStatus: ours.status };
  });
}

// ─── 4. Intern Detail ───────────────────────────────────────────

async function testInternDetail() {
  console.log("\n┌─ 4. Intern Detail (GET /api/dashboard/intern) ───────");

  await test("Reject missing id (400)", async () => {
    const { status } = await api("GET", "/api/dashboard/intern");
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test("Reject unknown id (404)", async () => {
    const { status } = await api("GET", "/api/dashboard/intern?id=nonexistent_123");
    assert(status === 404, `Expected 404, got ${status}`);
  });

  if (!state.internId) return skip("Fetch detail", "No internId");

  await test("Return full intern detail with relations", async () => {
    const { status, data } = await api("GET", `/api/dashboard/intern?id=${state.internId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.name === "Priya Sharma", `Name: ${data.name}`);
    assert(Array.isArray(data.attendance), "Missing attendance[]");
    assert(Array.isArray(data.tasks), "Missing tasks[]");
    assert(Array.isArray(data.messages), "Missing messages[]");
    return { name: data.name, status: data.status };
  });
}

// ─── 5. Admin Actions ───────────────────────────────────────────

async function testAdminActions() {
  console.log("\n┌─ 5. Admin Actions (POST /api/dashboard/action) ──────");

  if (!state.internId) return skip("Admin actions", "No internId");

  await test("Reject missing action (400)", async () => {
    const { status } = await api("POST", "/api/dashboard/action", { internId: state.internId }, "json");
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test("Reject unknown action (400)", async () => {
    const { status, data } = await api("POST", "/api/dashboard/action", {
      action: "bogus",
      internId: state.internId,
    }, "json");
    assert(status === 400, `Expected 400, got ${status}`);
    return data;
  });

  await test("update_stipend → 15000 paise", async () => {
    const { status, data } = await api("POST", "/api/dashboard/action", {
      action: "update_stipend",
      internId: state.internId,
      stipendPaise: 15000,
    }, "json");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.ok, "Expected ok:true");
    return data;
  });

  await test("send_offer → status OFFERED (via shared hr@intelliforge.tech)", async () => {
    const { status, data } = await api("POST", "/api/dashboard/action", {
      action: "send_offer",
      internId: state.internId,
    }, "json");
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.status === "OFFERED", `Expected OFFERED, got ${data.status}`);
    state.currentStatus = "OFFERED";
    return data;
  });

  await test("Verify stipend persisted", async () => {
    const { data } = await api("GET", `/api/dashboard/intern?id=${state.internId}`);
    assert(data.stipendPaise === 15000, `Expected 15000, got ${data.stipendPaise}`);
    assert(data.status === state.currentStatus, `Status: ${data.status}`);
    return { stipend: data.stipendPaise, status: data.status };
  });
}

// ─── 6. Offer Lookup ────────────────────────────────────────────

async function testOffer() {
  console.log("\n┌─ 6. Offer (GET /api/offer) ──────────────────────────");

  await test("Reject missing email (400)", async () => {
    const { status } = await api("GET", "/api/offer");
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test("Reject unknown email (404)", async () => {
    const { status } = await api("GET", "/api/offer?email=nobody@example.com");
    assert(status === 404, `Expected 404, got ${status}`);
  });

  await test("Return offer for test intern", async () => {
    const { status, data } = await api("GET", `/api/offer?email=${TEST_EMAIL}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.name === "Priya Sharma", `Name: ${data.name}`);
    assert(data.role === "AI Intern", `Role: ${data.role}`);
    assert(data.stipendPaise === 15000, `Stipend: ${data.stipendPaise}`);
    assert(data.status === state.currentStatus, `Status: ${data.status}`);
    return { name: data.name, status: data.status, stipend: data.stipendPaise };
  });
}

// ─── 7. Accept Offer ────────────────────────────────────────────

async function testOfferAccept() {
  console.log("\n┌─ 7. Accept Offer (POST /api/offer/accept) ───────────");

  if (!state.internId) return skip("Offer accept", "No internId");

  await test("Reject missing internId (400)", async () => {
    const { status } = await api("POST", "/api/offer/accept", {}, "json");
    assert(status === 400, `Expected 400, got ${status}`);
  });

  if (state.currentStatus !== "OFFERED") {
    skip("Accept offer", `Status is ${state.currentStatus}, not OFFERED`);
    skip("Re-accept guard", "Depends on accept step");
  } else {
    await test("Accept offer (OFFERED → ACTIVE)", async () => {
      const { status, data } = await api("POST", "/api/offer/accept", {
        internId: state.internId,
      }, "json");
      assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
      assert(data.status === "ACTIVE", `Expected ACTIVE, got ${data.status}`);
      state.currentStatus = "ACTIVE";
      return data;
    });

    await test("Re-accept blocked (400, already ACTIVE)", async () => {
      const { status, data } = await api("POST", "/api/offer/accept", {
        internId: state.internId,
      }, "json");
      assert(status === 400, `Expected 400, got ${status}`);
      return data;
    });
  }
}

// ─── 8. Attendance ──────────────────────────────────────────────

async function testAttendance() {
  console.log("\n┌─ 8. Attendance (/api/attendance) ─────────────────────");

  await test("GET — reject missing email (400)", async () => {
    const { status } = await api("GET", "/api/attendance");
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test("GET — reject unknown email (404)", async () => {
    const { status } = await api("GET", "/api/attendance?email=nobody@example.com");
    assert(status === 404, `Expected 404, got ${status}`);
  });

  const canAccess = state.currentStatus === "ACTIVE" || state.currentStatus === "OFFERED";

  if (!canAccess) {
    skip("GET — load attendance", `Status is ${state.currentStatus} (needs ACTIVE/OFFERED)`);
    skip("POST — punch in", "Attendance not accessible");
    skip("POST — duplicate punch in", "Attendance not accessible");
    skip("POST — punch out", "Attendance not accessible");
    skip("POST — duplicate punch out", "Attendance not accessible");
    skip("POST — invalid type", "Attendance not accessible");
    skip("GET — verify attendance recorded", "Attendance not accessible");
    return;
  }

  await test("GET — load attendance for intern", async () => {
    const { status, data } = await api("GET", `/api/attendance?email=${TEST_EMAIL}`);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.internId === state.internId, "internId mismatch");
    assert(data.internName === "Priya Sharma", `Name: ${data.internName}`);
    return { today: data.today ? "exists" : "none", weekCount: data.week.length };
  });

  await test("POST — reject missing fields (400)", async () => {
    const { status } = await api("POST", "/api/attendance", {}, "json");
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test("POST — punch in (type:'in', mode:'WFH')", async () => {
    const { status, data } = await api("POST", "/api/attendance", {
      internId: state.internId,
      type: "in",
      mode: "WFH",
    }, "json");
    if (status === 400 && data.error === "Already punched in today") {
      return { note: "Already punched in (previous run today)" };
    }
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.record.punchIn, "Missing punchIn");
    assert(data.record.mode === "WFH", `Mode: ${data.record.mode}`);
    return { punchIn: data.record.punchIn, mode: data.record.mode };
  });

  await test("POST — duplicate punch in blocked (400)", async () => {
    const { status, data } = await api("POST", "/api/attendance", {
      internId: state.internId,
      type: "in",
      mode: "Office",
    }, "json");
    assert(status === 400, `Expected 400, got ${status}`);
    assert(data.error === "Already punched in today", `Error: ${data.error}`);
    return data;
  });

  await test("POST — punch out (type:'out')", async () => {
    const { status, data } = await api("POST", "/api/attendance", {
      internId: state.internId,
      type: "out",
    }, "json");
    if (status === 400 && data.error === "Already punched out today") {
      return { note: "Already punched out (previous run today)" };
    }
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.record.punchOut, "Missing punchOut");
    return { punchIn: data.record.punchIn, punchOut: data.record.punchOut };
  });

  await test("POST — duplicate punch out blocked (400)", async () => {
    const { status, data } = await api("POST", "/api/attendance", {
      internId: state.internId,
      type: "out",
    }, "json");
    assert(status === 400, `Expected 400, got ${status}`);
    return data;
  });

  await test("POST — reject invalid type (400)", async () => {
    const { status, data } = await api("POST", "/api/attendance", {
      internId: state.internId,
      type: "invalid",
    }, "json");
    assert(status === 400, `Expected 400, got ${status}`);
    assert(data.error === "Invalid type", `Error: ${data.error}`);
    return data;
  });

  await test("GET — verify today's attendance recorded", async () => {
    const { data } = await api("GET", `/api/attendance?email=${TEST_EMAIL}`);
    assert(data.today, "No attendance record for today");
    assert(data.today.punchIn, "Missing punchIn");
    assert(data.week.length >= 1, "Week should have ≥1 entry");
    return { mode: data.today.mode, hasPunchOut: !!data.today.punchOut };
  });
}

// ─── 9. Tasks ───────────────────────────────────────────────────

async function testTasks() {
  console.log("\n┌─ 9. Tasks (/api/tasks) ───────────────────────────────");

  if (!state.internId) return skip("Tasks", "No internId");

  await test("GET — reject missing email (400)", async () => {
    const { status } = await api("GET", "/api/tasks");
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test("GET — reject unknown email (404)", async () => {
    const { status } = await api("GET", "/api/tasks?email=nobody@example.com");
    assert(status === 404, `Expected 404, got ${status}`);
  });

  await test("GET — load tasks for intern", async () => {
    const { status, data } = await api("GET", `/api/tasks?email=${TEST_EMAIL}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.internId === state.internId, "internId mismatch");
    return { taskCount: data.tasks.length };
  });

  await test("POST — reject missing fields (400)", async () => {
    const { status } = await api("POST", "/api/tasks", { internId: state.internId }, "json");
    assert(status === 400, `Expected 400, got ${status}`);
  });

  let taskId = null;

  await test("POST — create task (IN_PROGRESS, 4h)", async () => {
    const { status, data } = await api("POST", "/api/tasks", {
      internId: state.internId,
      title: "Setup Dev Environment",
      description: "Install Python 3.11, VS Code, configure Git SSH keys",
      status: "IN_PROGRESS",
      hours: 4,
    }, "json");
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.id, "Missing task id");
    assert(data.title === "Setup Dev Environment", `Title: ${data.title}`);
    assert(data.status === "IN_PROGRESS", `Status: ${data.status}`);
    assert(data.hours === 4, `Hours: ${data.hours}`);
    assert(data.week, "Missing week");
    taskId = data.id;
    return { id: data.id, week: data.week };
  });

  await test("POST — create second task (TODO, 2.5h)", async () => {
    const { status, data } = await api("POST", "/api/tasks", {
      internId: state.internId,
      title: "Read project documentation",
      description: "Go through the wiki, API docs, and coding standards guide",
      status: "TODO",
      hours: 2.5,
    }, "json");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.hours === 2.5, `Hours: ${data.hours}`);
    return { id: data.id, hours: data.hours };
  });

  await test("POST — create third task (DONE, 1h)", async () => {
    const { status, data } = await api("POST", "/api/tasks", {
      internId: state.internId,
      title: "Complete onboarding form",
      description: "Fill out the HRMS portal onboarding form with documents",
      status: "DONE",
      hours: 1,
    }, "json");
    assert(status === 200, `Expected 200, got ${status}`);
    return { id: data.id, status: data.status };
  });

  await test("GET — verify 3 tasks, total 7.5h", async () => {
    const { data } = await api("GET", `/api/tasks?email=${TEST_EMAIL}`);
    assert(data.tasks.length >= 3, `Expected ≥3 tasks, got ${data.tasks.length}`);
    const total = data.tasks.reduce((s, t) => s + t.hours, 0);
    assert(total >= 7.5, `Expected ≥7.5h total, got ${total}`);
    return { taskCount: data.tasks.length, totalHours: total };
  });

  if (taskId) {
    await test("DELETE — remove task by id", async () => {
      const { status, data } = await api("DELETE", `/api/tasks?id=${taskId}`);
      assert(status === 200, `Expected 200, got ${status}`);
      assert(data.ok, "Expected ok:true");
      return data;
    });

    await test("GET — verify deletion (task count decreased)", async () => {
      const { data } = await api("GET", `/api/tasks?email=${TEST_EMAIL}`);
      const found = data.tasks.find((t) => t.id === taskId);
      assert(!found, "Deleted task still present");
      return { taskCount: data.tasks.length };
    });
  }

  await test("DELETE — reject missing id (400)", async () => {
    const { status } = await api("DELETE", "/api/tasks");
    assert(status === 400, `Expected 400, got ${status}`);
  });
}

// ─── 10. Webhook ────────────────────────────────────────────────

async function testWebhook() {
  console.log("\n┌─ 10. Webhook (POST /api/webhooks/agentmail) ─────────");

  await test("Irrelevant event returns ok", async () => {
    const { status, data } = await api("POST", "/api/webhooks/agentmail", {
      event: "message.sent",
      message: {},
    }, "json");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.ok, "Expected ok:true");
    return data;
  });

  await test("message.received without sender returns ok", async () => {
    const { status, data } = await api("POST", "/api/webhooks/agentmail", {
      event: "message.received",
      message: { extractedText: "I accept" },
    }, "json");
    assert(status === 200, `Expected 200, got ${status}`);
    return data;
  });

  await test("Empty body returns ok", async () => {
    const { status, data } = await api("POST", "/api/webhooks/agentmail", {}, "json");
    assert(status === 200, `Expected 200, got ${status}`);
    return data;
  });
}

// ─── 11. Final Verification ─────────────────────────────────────

async function testFinalState() {
  console.log("\n┌─ 11. Final State ─────────────────────────────────────");

  if (!state.internId) return skip("Final state", "No internId");

  await test("Intern detail has correct aggregated data", async () => {
    const { data } = await api("GET", `/api/dashboard/intern?id=${state.internId}`);
    assert(data.name === "Priya Sharma", `Name: ${data.name}`);
    assert(data.status === state.currentStatus, `Status: ${data.status} (expected ${state.currentStatus})`);
    assert(data.stipendPaise === 15000, `Stipend: ${data.stipendPaise}`);
    assert(data.tasks.length >= 1, "Should have tasks");
    return {
      status: data.status,
      stipend: `₹${(data.stipendPaise / 100).toFixed(2)}`,
      attendanceCount: data.attendance.length,
      taskCount: data.tasks.length,
      hrFrom: "hr@intelliforge.tech",
    };
  });

  await test("Dashboard reflects final intern state", async () => {
    const { data } = await api("GET", `/api/dashboard?email=${ADMIN_EMAIL}`);
    const ours = data.interns.find((i) => i.email === TEST_EMAIL);
    assert(ours, "Test intern missing from dashboard");
    assert(ours.status === state.currentStatus, `Status: ${ours.status}`);
    return { status: ours.status, email: ours.email };
  });
}

// ─── Runner ──────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║       IntelliForge HRMS — E2E Test Suite            ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`  Target:   ${BASE}`);
  console.log(`  Admin:    ${ADMIN_EMAIL}`);
  console.log(`  Intern:   ${TEST_EMAIL}`);

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
