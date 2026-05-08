// Consolidate the entire system into a single organization.
//
// Goal:
//   - Exactly one Organization exists (after the e2e purge, this is
//     "IntelliForge AI" / slug=intelliforge-ai).
//   - gen.girish@gmail.com  AND  hr@intelliforge.tech  both belong to it.
//   - Every Intern is attached to that org (orphans with orgId = NULL get
//     backfilled). The dashboard API filters by admin.orgId, so once interns
//     share the same orgId both admins will see all of them.
//
// Default: DRY RUN (prints the plan, changes nothing).
// Run:    node --env-file=.env.local scripts/consolidate-single-org.mjs
// Apply:  node --env-file=.env.local scripts/consolidate-single-org.mjs --execute

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EXECUTE = process.argv.includes("--execute");

const ADMIN_EMAILS = ["gen.girish@gmail.com", "hr@intelliforge.tech"];

function line() {
  console.log("─".repeat(72));
}

function header(t) {
  line();
  console.log(t);
  line();
}

async function main() {
  header(`CONSOLIDATE → SINGLE ORG  (${EXECUTE ? "EXECUTE" : "DRY RUN"})`);

  // 1. There must be exactly one Organization.
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { admins: true, interns: true, jobPostings: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Organizations in DB: ${orgs.length}`);
  for (const o of orgs) {
    console.log(
      `  - ${o.name.padEnd(20)} slug=${o.slug.padEnd(22)} admins=${o._count.admins} interns=${o._count.interns} jobs=${o._count.jobPostings}`
    );
  }

  if (orgs.length === 0) {
    console.error("\nABORT: no organization in DB; nothing to consolidate into.");
    process.exitCode = 1;
    return;
  }
  if (orgs.length > 1) {
    console.error(
      "\nABORT: more than one organization exists. Refusing to guess which one is canonical."
    );
    console.error("Resolve manually (or extend this script with an explicit --target-org-id).");
    process.exitCode = 1;
    return;
  }

  const target = orgs[0];
  console.log(`\nTarget org: ${target.name} (id=${target.id}, slug=${target.slug})`);

  // 2. Both admins must exist and belong to the target org.
  const admins = await prisma.admin.findMany({
    where: { email: { in: ADMIN_EMAILS } },
    select: { id: true, email: true, orgId: true },
  });
  const byEmail = new Map(admins.map((a) => [a.email, a]));

  console.log("\nAdmin status:");
  const adminsToReassign = [];
  let missingAdmin = false;
  for (const email of ADMIN_EMAILS) {
    const a = byEmail.get(email);
    if (!a) {
      console.log(`  ✗ ${email.padEnd(28)} NOT FOUND`);
      missingAdmin = true;
      continue;
    }
    if (a.orgId === target.id) {
      console.log(`  ✓ ${email.padEnd(28)} already in target org`);
    } else {
      console.log(`  ! ${email.padEnd(28)} currently orgId=${a.orgId ?? "<null>"} (will move)`);
      adminsToReassign.push(a);
    }
  }
  if (missingAdmin) {
    console.error("\nABORT: one of the required admins is missing.");
    process.exitCode = 1;
    return;
  }

  // 3. Interns: classify into already-correct, wrong-org, null-orgId.
  const allInterns = await prisma.intern.findMany({
    select: { id: true, email: true, orgId: true, name: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  const correctInterns = allInterns.filter((i) => i.orgId === target.id);
  const nullOrgInterns = allInterns.filter((i) => i.orgId === null);
  const wrongOrgInterns = allInterns.filter((i) => i.orgId !== null && i.orgId !== target.id);

  console.log("\nIntern classification:");
  console.log(`  already in target org : ${correctInterns.length}`);
  console.log(`  orgId IS NULL         : ${nullOrgInterns.length}  (will backfill → ${target.slug})`);
  console.log(`  in some OTHER org     : ${wrongOrgInterns.length}  (will reassign → ${target.slug})`);

  if (nullOrgInterns.length) {
    console.log("\nNULL-orgId interns to backfill:");
    for (const i of nullOrgInterns) {
      console.log(`  - ${i.email.padEnd(40)} ${i.name.padEnd(28)} status=${i.status}`);
    }
  }
  if (wrongOrgInterns.length) {
    console.log("\nInterns currently in a different org (will be moved):");
    for (const i of wrongOrgInterns) {
      console.log(`  - ${i.email.padEnd(40)} ${i.name.padEnd(28)} orgId=${i.orgId} → ${target.id}`);
    }
  }

  // 4. Sanity: any other admins floating around?
  const otherAdmins = await prisma.admin.findMany({
    where: { email: { notIn: ADMIN_EMAILS } },
    select: { id: true, email: true, orgId: true },
  });
  if (otherAdmins.length) {
    console.log(`\nNote: ${otherAdmins.length} other admin row(s) exist (left as-is):`);
    for (const a of otherAdmins) {
      console.log(`  - ${a.email}  orgId=${a.orgId ?? "<null>"}`);
    }
  }

  if (!EXECUTE) {
    line();
    console.log("Re-run with --execute to apply.");
    line();
    return;
  }

  // ── EXECUTE ──────────────────────────────────────────────────────────────
  header("APPLYING UPDATES");
  const result = await prisma.$transaction(async (tx) => {
    const out = {};

    if (adminsToReassign.length) {
      out.adminsReassigned = (
        await tx.admin.updateMany({
          where: { id: { in: adminsToReassign.map((a) => a.id) } },
          data: { orgId: target.id },
        })
      ).count;
    } else {
      out.adminsReassigned = 0;
    }

    if (nullOrgInterns.length) {
      out.nullOrgInternsBackfilled = (
        await tx.intern.updateMany({
          where: { id: { in: nullOrgInterns.map((i) => i.id) } },
          data: { orgId: target.id },
        })
      ).count;
    } else {
      out.nullOrgInternsBackfilled = 0;
    }

    if (wrongOrgInterns.length) {
      out.wrongOrgInternsReassigned = (
        await tx.intern.updateMany({
          where: { id: { in: wrongOrgInterns.map((i) => i.id) } },
          data: { orgId: target.id },
        })
      ).count;
    } else {
      out.wrongOrgInternsReassigned = 0;
    }

    return out;
  });

  console.log("Updates applied:");
  for (const [k, v] of Object.entries(result)) console.log(`  ${k.padEnd(28)} ${v}`);

  // ── VERIFY ──────────────────────────────────────────────────────────────
  header("POST-CONSOLIDATION VERIFICATION");
  const finalOrgs = await prisma.organization.count();
  const internsInTarget = await prisma.intern.count({ where: { orgId: target.id } });
  const internsTotal = await prisma.intern.count();
  const internsNotInTarget = internsTotal - internsInTarget;
  const adminsInTarget = await prisma.admin.findMany({
    where: { email: { in: ADMIN_EMAILS } },
    select: { email: true, orgId: true },
  });

  console.log(`Organizations in DB         : ${finalOrgs}`);
  console.log(`Interns total               : ${internsTotal}`);
  console.log(`Interns in target org       : ${internsInTarget}`);
  console.log(`Interns NOT in target org   : ${internsNotInTarget}`);
  for (const a of adminsInTarget) {
    const ok = a.orgId === target.id ? "✓" : "✗";
    console.log(`${ok} ${a.email.padEnd(28)} orgId=${a.orgId}`);
  }

  if (internsNotInTarget === 0 && adminsInTarget.every((a) => a.orgId === target.id)) {
    console.log("\nAll set: every intern is visible to both admins via /api/dashboard.");
  } else {
    console.log("\nWARNING: residual rows remain — investigate above.");
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
