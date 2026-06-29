// Create (or upsert) an admin account for an Organization.
//
// Self-registration in /api/auth/register only creates Interns, so admins
// must be provisioned out-of-band. This script does that safely:
//   - requires an org (single org by default, or --org-id when multiple exist)
//   - bcrypt-hashes the password
//   - upserts by email (so re-running just updates the password / orgId)
//   - leaves emailVerified=true so the admin can log in immediately
//
// Run:    node --env-file=.env.local scripts/create-admin.mjs <email> <password> [name]
//         node --env-file=.env.local scripts/create-admin.mjs --org-id <id> <email> <password> [name]
// Example: node --env-file=.env.local scripts/create-admin.mjs hr@intelliforge.tech 'StrongPass!23' 'HR Bot'

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

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

const { orgId: flagOrgId, rest } = parseOrgIdFlag(process.argv.slice(2));
const [email, password, ...nameParts] = rest;
const name = nameParts.join(" ").trim() || null;

if (!email || !password) {
  console.error(
    "Usage: node --env-file=.env.local scripts/create-admin.mjs [--org-id <id>] <email> <password> [name]"
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });
  if (orgs.length === 0) {
    console.error("ABORT: no organization in DB. Run `npx prisma db seed` first.");
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

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash, orgId: org.id, ...(name ? { name } : {}) },
    create: {
      email,
      passwordHash,
      emailVerified: true,
      role: "ADMIN",
      orgId: org.id,
      name,
    },
    select: { id: true, email: true, role: true, orgId: true, name: true },
  });

  console.log("Admin upserted:");
  console.log(`  id:    ${admin.id}`);
  console.log(`  email: ${admin.email}`);
  console.log(`  name:  ${admin.name ?? "<unset>"}`);
  console.log(`  role:  ${admin.role}`);
  console.log(`  org:   ${org.name} (${org.slug})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
