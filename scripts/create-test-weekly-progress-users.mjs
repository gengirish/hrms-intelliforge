/**
 * Create (or upsert) a mentor admin + intern pair for weekly-progress / Playwright flows.
 *
 * - Admin has role MENTOR (required for /api/weekly-progress/review scoped to mentees).
 * - Intern is ACTIVE, emailVerified, assigned mentorId → that admin, same org.
 *
 * Emails default to stable test addresses; override with E2E_MENTOR_EMAIL / E2E_INTERN_EMAIL
 * (or MENTOR_EMAIL / INTERN_EMAIL) to match your .env.test.
 *
 * Usage:
 *   node --env-file=.env scripts/create-test-weekly-progress-users.mjs "Test1234!"
 *   node --env-file=.env scripts/create-test-weekly-progress-users.mjs --org-id <id> "Test1234!"
 *   HRMS_TEST_USERS_PASSWORD='...' node --env-file=.env scripts/create-test-weekly-progress-users.mjs
 *
 * When multiple organizations exist, pass --org-id <id> (see create-admin.mjs).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

const DEFAULT_MENTOR_EMAIL = "e2e-weekly-progress-mentor@example.com";
const DEFAULT_INTERN_EMAIL = "e2e-weekly-progress-intern@example.com";

const MENTOR_EMAIL =
  process.env.E2E_MENTOR_EMAIL?.trim() ||
  process.env.MENTOR_EMAIL?.trim() ||
  DEFAULT_MENTOR_EMAIL;
const INTERN_EMAIL =
  process.env.E2E_INTERN_EMAIL?.trim() ||
  process.env.INTERN_EMAIL?.trim() ||
  DEFAULT_INTERN_EMAIL;

function parseOrgIdFlag(argv) {
  const orgIdIdx = argv.indexOf("--org-id");
  if (orgIdIdx === -1) return { orgId: null, rest: argv };
  const orgId = argv[orgIdIdx + 1];
  if (!orgId) {
    console.error("--org-id requires a value");
    process.exit(1);
  }
  return {
    orgId,
    rest: [...argv.slice(0, orgIdIdx), ...argv.slice(orgIdIdx + 2)],
  };
}

function listOrgs(orgs) {
  console.error("Available organizations:");
  for (const o of orgs) {
    console.error(`  ${o.id}  ${o.slug}  (${o.name})`);
  }
}

const { orgId: flagOrgId, rest: cliArgs } = parseOrgIdFlag(process.argv.slice(2));
const password =
  cliArgs[0]?.trim() ||
  process.env.HRMS_TEST_USERS_PASSWORD?.trim() ||
  process.env.E2E_MENTOR_PASSWORD?.trim() ||
  process.env.E2E_INTERN_PASSWORD?.trim() ||
  "";

if (!password || password.length < 8) {
  console.error(
    "Password required (min 8 chars): first CLI arg, or HRMS_TEST_USERS_PASSWORD / E2E_MENTOR_PASSWORD / E2E_INTERN_PASSWORD."
  );
  console.error(
    'Example: node --env-file=.env scripts/create-test-weekly-progress-users.mjs "Test1234!"'
  );
  process.exit(1);
}

if (MENTOR_EMAIL.toLowerCase() === INTERN_EMAIL.toLowerCase()) {
  console.error("Mentor and intern emails must differ.");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });
  if (orgs.length === 0) {
    console.error("ABORT: no organization. Run `npx prisma db seed` first.");
    process.exitCode = 1;
    return;
  }

  let org;
  if (flagOrgId) {
    org = orgs.find((o) => o.id === flagOrgId);
    if (!org) {
      console.error(`ABORT: no organization with id ${flagOrgId}`);
      listOrgs(orgs);
      process.exitCode = 1;
      return;
    }
  } else if (orgs.length === 1) {
    org = orgs[0];
  } else {
    console.error(
      `ABORT: ${orgs.length} organizations exist. Pass --org-id <id> to select one.`
    );
    listOrgs(orgs);
    process.exitCode = 1;
    return;
  }

  const clashIntern = await prisma.intern.findUnique({
    where: { email: MENTOR_EMAIL },
    select: { id: true },
  });
  if (clashIntern) {
    console.error(
      `ABORT: ${MENTOR_EMAIL} is already an intern. Use a different mentor email.`
    );
    process.exitCode = 1;
    return;
  }

  const clashAdmin = await prisma.admin.findUnique({
    where: { email: INTERN_EMAIL },
    select: { id: true },
  });
  if (clashAdmin) {
    console.error(
      `ABORT: ${INTERN_EMAIL} is already an admin. Use a different intern email.`
    );
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 86400000);

  const mentor = await prisma.admin.upsert({
    where: { email: MENTOR_EMAIL },
    update: {
      passwordHash,
      orgId: org.id,
      emailVerified: true,
      role: "MENTOR",
      name: "E2E Weekly Progress Mentor",
    },
    create: {
      email: MENTOR_EMAIL,
      passwordHash,
      emailVerified: true,
      orgId: org.id,
      role: "MENTOR",
      name: "E2E Weekly Progress Mentor",
    },
    select: { id: true, email: true, role: true, orgId: true },
  });

  const intern = await prisma.intern.upsert({
    where: { email: INTERN_EMAIL },
    update: {
      orgId: org.id,
      passwordHash,
      emailVerified: true,
      mentorId: mentor.id,
      status: "ACTIVE",
      acceptedAt: now,
      deactivated: false,
      name: "E2E Weekly Progress Intern",
    },
    create: {
      orgId: org.id,
      email: INTERN_EMAIL,
      passwordHash,
      emailVerified: true,
      name: "E2E Weekly Progress Intern",
      phone: "+910000000001",
      college: "E2E College",
      branch: "Computer Science",
      year: "Final Year",
      role: "Intern",
      startDate,
      durationWeeks: 12,
      stipendPaise: 0,
      status: "ACTIVE",
      acceptedAt: now,
      mentorId: mentor.id,
    },
    select: { id: true, email: true, mentorId: true, status: true, orgId: true },
  });

  console.log("Weekly progress test users ready.");
  console.log(`  Organization: ${org.name} (${org.slug})`);
  console.log(`  Mentor:  ${mentor.email}  role=${mentor.role}  id=${mentor.id}`);
  console.log(`  Intern:  ${intern.email}  status=${intern.status}  mentorId=${intern.mentorId}`);
  console.log("");
  console.log("Set in .env.test (or CI) for Playwright weekly-progress mentor loop:");
  console.log(`  E2E_MENTOR_EMAIL="${MENTOR_EMAIL}"`);
  console.log(`  E2E_MENTOR_PASSWORD="<same password you passed>"`);
  console.log(`  E2E_INTERN_EMAIL="${INTERN_EMAIL}"`);
  console.log(`  E2E_INTERN_PASSWORD="<same password you passed>"`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
