// Purge E2E test records (orgs, admins, interns, candidates, tokens, etc.).
//
// Identification rules (mirrors e2e-test.js):
//   - Org.slug LIKE 'e2e-%' OR Org.name LIKE 'E2E Test Org%'
//   - Admin.email ending in '@test.intelliforge.tech'
//   - Intern.email  ending in '@test.intelliforge.tech'
//   - VerificationToken.identifier ending in '@test.intelliforge.tech'
//   - Candidate.email ending in '@test.intelliforge.tech' (orphaned, in real orgs)
//
// Cascade behaviour (from prisma/schema.prisma):
//   Organization → CASCADE → Admin, Intern, JobPosting
//   JobPosting   → CASCADE → Candidate
//   Intern       → CASCADE → Attendance, Task, NotificationLog,
//                            NotificationPreference, BotInteractionLog,
//                            PerformanceScore, PerformanceReview,
//                            DocumentVerification, LearningEnrollment
//
// Default: DRY RUN (prints counts + samples, deletes nothing).
// Run:    node --env-file=.env.local scripts/purge-e2e-records.mjs
// Apply:  node --env-file=.env.local scripts/purge-e2e-records.mjs --execute

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EXECUTE = process.argv.includes("--execute");
const TEST_DOMAIN = "@test.intelliforge.tech";

const orgWhere = {
  OR: [
    { slug: { startsWith: "e2e-" } },
    { name: { startsWith: "E2E Test Org" } },
  ],
};
const testEmailWhere = { email: { endsWith: TEST_DOMAIN } };

function line() {
  console.log("─".repeat(72));
}

function header(t) {
  line();
  console.log(t);
  line();
}

async function summarise() {
  const orgs = await prisma.organization.findMany({
    where: orgWhere,
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { admins: true, interns: true, jobPostings: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const orgIds = orgs.map((o) => o.id);

  // Admins / Interns that match the test domain (covers any orphans too).
  const admins = await prisma.admin.findMany({
    where: { OR: [testEmailWhere, orgIds.length ? { orgId: { in: orgIds } } : { id: "_never_" }] },
    select: { id: true, email: true, orgId: true },
  });

  const interns = await prisma.intern.findMany({
    where: { OR: [testEmailWhere, orgIds.length ? { orgId: { in: orgIds } } : { id: "_never_" }] },
    select: { id: true, email: true, orgId: true, status: true },
  });

  const jobPostings = await prisma.jobPosting.findMany({
    where: orgIds.length ? { orgId: { in: orgIds } } : { id: "_never_" },
    select: { id: true, slug: true, title: true, orgId: true },
  });

  const jobPostingIds = jobPostings.map((j) => j.id);
  const candidatesInE2eJobs = jobPostingIds.length
    ? await prisma.candidate.count({ where: { jobPostingId: { in: jobPostingIds } } })
    : 0;

  // Candidates with test-domain email living under a NON-e2e job posting.
  const orphanCandidates = await prisma.candidate.findMany({
    where: {
      email: { endsWith: TEST_DOMAIN },
      ...(jobPostingIds.length ? { NOT: { jobPostingId: { in: jobPostingIds } } } : {}),
    },
    select: { id: true, email: true, jobPostingId: true },
  });

  const internIds = interns.map((i) => i.id);
  const subCounts = internIds.length
    ? {
        attendance: await prisma.attendance.count({ where: { internId: { in: internIds } } }),
        tasks: await prisma.task.count({ where: { internId: { in: internIds } } }),
        notificationLogs: await prisma.notificationLog.count({ where: { internId: { in: internIds } } }),
        notificationPrefs: await prisma.notificationPreference.count({ where: { internId: { in: internIds } } }),
        botInteractions: await prisma.botInteractionLog.count({ where: { internId: { in: internIds } } }),
        perfScores: await prisma.performanceScore.count({ where: { internId: { in: internIds } } }),
        perfReviews: await prisma.performanceReview.count({ where: { internId: { in: internIds } } }),
        docVerifications: await prisma.documentVerification.count({ where: { internId: { in: internIds } } }),
        learningEnrollments: await prisma.learningEnrollment.count({ where: { internId: { in: internIds } } }),
      }
    : null;

  const verificationTokens = await prisma.verificationToken.count({
    where: { identifier: { endsWith: TEST_DOMAIN } },
  });

  return { orgs, admins, interns, jobPostings, candidatesInE2eJobs, orphanCandidates, subCounts, verificationTokens };
}

async function main() {
  header(`E2E PURGE — ${EXECUTE ? "EXECUTE MODE (will delete)" : "DRY RUN (no changes)"}`);

  const summary = await summarise();
  const { orgs, admins, interns, jobPostings, candidatesInE2eJobs, orphanCandidates, subCounts, verificationTokens } = summary;

  console.log("Targeted organizations:", orgs.length);
  for (const o of orgs) {
    console.log(
      `  - ${o.name.padEnd(30)} slug=${o.slug.padEnd(28)} admins=${o._count.admins} interns=${o._count.interns} jobs=${o._count.jobPostings}`
    );
  }

  console.log("\nAdmins matched (e2e org OR @test.intelliforge.tech):", admins.length);
  for (const a of admins.slice(0, 30)) {
    console.log(`  - ${a.email.padEnd(45)} orgId=${a.orgId ?? "<null>"}`);
  }
  if (admins.length > 30) console.log(`  … (+${admins.length - 30} more)`);

  console.log("\nInterns matched:", interns.length);
  for (const i of interns.slice(0, 30)) {
    console.log(`  - ${i.email.padEnd(50)} orgId=${i.orgId ?? "<null>"}  status=${i.status}`);
  }
  if (interns.length > 30) console.log(`  … (+${interns.length - 30} more)`);

  console.log(`\nJobPostings under e2e orgs: ${jobPostings.length}`);
  console.log(`Candidates under those jobs (cascade): ${candidatesInE2eJobs}`);
  console.log(`Orphan candidates with ${TEST_DOMAIN} email under NON-e2e jobs: ${orphanCandidates.length}`);
  for (const c of orphanCandidates.slice(0, 10)) {
    console.log(`  - ${c.email.padEnd(45)} jobPostingId=${c.jobPostingId}`);
  }

  if (subCounts) {
    console.log("\nIntern child rows (will cascade when interns/orgs are deleted):");
    for (const [k, v] of Object.entries(subCounts)) console.log(`  ${k.padEnd(22)} ${v}`);
  }

  console.log(`\nVerificationTokens with ${TEST_DOMAIN} identifier: ${verificationTokens}`);

  if (!EXECUTE) {
    line();
    console.log("Re-run with --execute to apply these deletions.");
    line();
    return;
  }

  // ── EXECUTE ──────────────────────────────────────────────────────────────
  header("APPLYING DELETIONS");

  const orgIds = orgs.map((o) => o.id);
  const orphanInternIds = interns.filter((i) => !i.orgId || !orgIds.includes(i.orgId)).map((i) => i.id);
  const orphanAdminIds = admins.filter((a) => !a.orgId || !orgIds.includes(a.orgId)).map((a) => a.id);
  const orphanCandidateIds = orphanCandidates.map((c) => c.id);

  // Single transaction so a failure rolls back cleanly.
  const result = await prisma.$transaction(async (tx) => {
    const out = {};

    // 1. Delete e2e organizations -> cascades to admins, interns, jobs
    //    (and through interns, all their child rows).
    out.deletedOrgs = orgIds.length
      ? (await tx.organization.deleteMany({ where: { id: { in: orgIds } } })).count
      : 0;

    // 2. Cleanup orphan @test.intelliforge.tech interns (had null orgId, etc.).
    out.deletedOrphanInterns = orphanInternIds.length
      ? (await tx.intern.deleteMany({ where: { id: { in: orphanInternIds } } })).count
      : 0;

    // 3. Cleanup orphan @test.intelliforge.tech admins.
    out.deletedOrphanAdmins = orphanAdminIds.length
      ? (await tx.admin.deleteMany({ where: { id: { in: orphanAdminIds } } })).count
      : 0;

    // 4. Cleanup orphan candidates (test-domain email but in non-e2e jobs).
    out.deletedOrphanCandidates = orphanCandidateIds.length
      ? (await tx.candidate.deleteMany({ where: { id: { in: orphanCandidateIds } } })).count
      : 0;

    // 5. Cleanup verification tokens.
    out.deletedVerificationTokens = (
      await tx.verificationToken.deleteMany({
        where: { identifier: { endsWith: TEST_DOMAIN } },
      })
    ).count;

    return out;
  });

  console.log("Deleted:");
  for (const [k, v] of Object.entries(result)) console.log(`  ${k.padEnd(28)} ${v}`);

  // Final totals as a sanity check.
  line();
  console.log("POST-PURGE TOTALS");
  line();
  console.log(`organizations: ${await prisma.organization.count()}`);
  console.log(`admins:        ${await prisma.admin.count()}`);
  console.log(`interns:       ${await prisma.intern.count()}`);
  console.log(`jobPostings:   ${await prisma.jobPosting.count()}`);
  console.log(`candidates:    ${await prisma.candidate.count()}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
