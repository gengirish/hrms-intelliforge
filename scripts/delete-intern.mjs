// Delete a single intern by email, with cascade summary.
//
// Default: DRY RUN.
// Run:    node --env-file=.env.local scripts/delete-intern.mjs <email>
// Apply:  node --env-file=.env.local scripts/delete-intern.mjs <email> --execute

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const email = args.find((a) => !a.startsWith("--"));

if (!email) {
  console.error("Usage: node scripts/delete-intern.mjs <email> [--execute]");
  process.exit(1);
}

function line() {
  console.log("─".repeat(72));
}

async function main() {
  line();
  console.log(`DELETE INTERN — ${email}  (${EXECUTE ? "EXECUTE" : "DRY RUN"})`);
  line();

  const intern = await prisma.intern.findUnique({
    where: { email },
    include: {
      org: { select: { name: true, slug: true } },
      _count: {
        select: {
          attendance: true,
          tasks: true,
          notifications: true,
          botInteractions: true,
          performanceScores: true,
          performanceReviews: true,
          documentVerifications: true,
          learningEnrollments: true,
        },
      },
    },
  });

  if (!intern) {
    console.error(`No intern found with email ${email}.`);
    process.exitCode = 1;
    return;
  }

  console.log(`Intern id:    ${intern.id}`);
  console.log(`Name:         ${intern.name}`);
  console.log(`Status:       ${intern.status}`);
  console.log(`Created at:   ${intern.createdAt.toISOString()}`);
  console.log(`Org:          ${intern.org?.name ?? "<none>"} (${intern.org?.slug ?? "?"})`);
  console.log("\nChild rows that will cascade:");
  for (const [k, v] of Object.entries(intern._count)) {
    console.log(`  ${k.padEnd(22)} ${v}`);
  }

  // notification_preferences is 1:1 (no _count helper); query directly.
  const prefs = await prisma.notificationPreference.count({ where: { internId: intern.id } });
  console.log(`  notificationPrefs      ${prefs}`);

  if (!EXECUTE) {
    line();
    console.log("Re-run with --execute to delete.");
    line();
    return;
  }

  line();
  console.log("DELETING …");
  line();
  const deleted = await prisma.intern.delete({ where: { id: intern.id } });
  console.log(`Deleted intern ${deleted.email} (id=${deleted.id}).`);
  console.log("All child rows cascaded via FK ON DELETE CASCADE.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
