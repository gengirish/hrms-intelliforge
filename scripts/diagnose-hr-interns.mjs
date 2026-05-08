// One-off diagnostic — does NOT mutate anything.
// Answers:
//   1) How many admins are in the DB? (total + per org + with/without orgId)
//   2) Why can hr@intelliforge.tech not see all interns?
//      -> Compare hr@intelliforge.tech's orgId vs the orgIds of every intern.
//
// Run with: node --env-file=.env.local scripts/diagnose-hr-interns.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_EMAIL = "hr@intelliforge.tech";

function line() {
  console.log("─".repeat(72));
}

async function main() {
  // ── 1. Admin counts ──────────────────────────────────────────────────────
  line();
  console.log("ADMIN COUNTS");
  line();
  const totalAdmins = await prisma.admin.count();
  const adminsWithOrg = await prisma.admin.count({ where: { orgId: { not: null } } });
  const adminsWithoutOrg = await prisma.admin.count({ where: { orgId: null } });
  console.log(`Total admins:              ${totalAdmins}`);
  console.log(`Admins WITH    orgId:      ${adminsWithOrg}`);
  console.log(`Admins WITHOUT orgId:      ${adminsWithoutOrg}`);

  const adminsByOrg = await prisma.admin.groupBy({
    by: ["orgId"],
    _count: { _all: true },
    orderBy: { _count: { orgId: "desc" } },
  });
  console.log("\nAdmins per org:");
  for (const row of adminsByOrg) {
    console.log(`  orgId=${row.orgId ?? "<null>"}  count=${row._count._all}`);
  }

  const allAdmins = await prisma.admin.findMany({
    select: { id: true, email: true, role: true, orgId: true, emailVerified: true },
    orderBy: { email: "asc" },
  });
  console.log("\nAll admins:");
  for (const a of allAdmins) {
    console.log(
      `  ${a.email.padEnd(40)} role=${(a.role ?? "").padEnd(8)} orgId=${a.orgId ?? "<null>"} verified=${a.emailVerified}`
    );
  }

  // ── 2. Why hr@intelliforge.tech can't see all interns ───────────────────
  line();
  console.log(`HR USER DIAGNOSTIC — ${TARGET_EMAIL}`);
  line();

  const hr = await prisma.admin.findUnique({
    where: { email: TARGET_EMAIL },
    include: { org: true },
  });

  if (!hr) {
    console.log(`No admin row found for ${TARGET_EMAIL}.`);
  } else {
    console.log(`Admin id:       ${hr.id}`);
    console.log(`Admin role:     ${hr.role}`);
    console.log(`Admin orgId:    ${hr.orgId ?? "<null>"}`);
    console.log(`Admin org name: ${hr.org?.name ?? "<no org>"}`);
    console.log(`Admin org slug: ${hr.org?.slug ?? "<no org>"}`);
    console.log(`Email verified: ${hr.emailVerified}`);
  }

  // ── 3. Intern distribution across orgs ───────────────────────────────────
  line();
  console.log("INTERN COUNTS BY orgId");
  line();
  const totalInterns = await prisma.intern.count();
  const internsByOrg = await prisma.intern.groupBy({
    by: ["orgId"],
    _count: { _all: true },
    orderBy: { _count: { orgId: "desc" } },
  });
  console.log(`Total interns: ${totalInterns}\n`);

  // Resolve org names for readability.
  const orgIds = internsByOrg.map((r) => r.orgId).filter(Boolean);
  const orgs = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
    select: { id: true, name: true, slug: true },
  });
  const orgById = new Map(orgs.map((o) => [o.id, o]));

  for (const row of internsByOrg) {
    const meta = row.orgId ? orgById.get(row.orgId) : null;
    const label = row.orgId
      ? `${meta?.name ?? "(unknown org)"} (slug=${meta?.slug ?? "?"}, id=${row.orgId})`
      : "<null orgId>";
    console.log(`  ${label.padEnd(60)}  interns=${row._count._all}`);
  }

  // ── 4. What hr@intelliforge.tech currently sees vs what exists ───────────
  if (hr?.orgId) {
    line();
    console.log("VISIBILITY CHECK — what /api/dashboard returns for HR");
    line();
    const visible = await prisma.intern.count({ where: { orgId: hr.orgId } });
    const hidden = totalInterns - visible;
    console.log(`Interns HR can see (orgId=${hr.orgId}): ${visible}`);
    console.log(`Interns HR canNOT see (other org or null): ${hidden}`);

    if (hidden > 0) {
      const hiddenSample = await prisma.intern.findMany({
        where: { OR: [{ orgId: null }, { orgId: { not: hr.orgId } }] },
        select: { id: true, name: true, email: true, orgId: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      console.log("\nFirst 20 hidden interns (newest first):");
      for (const i of hiddenSample) {
        console.log(
          `  ${i.email.padEnd(40)} ${i.name.padEnd(24)} orgId=${i.orgId ?? "<null>"}  status=${i.status}`
        );
      }
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
