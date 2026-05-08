// Create (or upsert) an admin account for the single Organization.
//
// Self-registration in /api/auth/register only creates Interns, so admins
// must be provisioned out-of-band. This script does that safely:
//   - refuses to run if the system has 0 or >1 organizations (multi-tenant
//     ambiguity) so it can't create an org-less admin
//   - bcrypt-hashes the password
//   - upserts by email (so re-running just updates the password / orgId)
//   - leaves emailVerified=true so the admin can log in immediately
//
// Run:    node --env-file=.env.local scripts/create-admin.mjs <email> <password> [name]
// Example: node --env-file=.env.local scripts/create-admin.mjs hr@intelliforge.tech 'StrongPass!23' 'HR Bot'

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;
const args = process.argv.slice(2);
const [email, password, ...nameParts] = args;
const name = nameParts.join(" ").trim() || null;

if (!email || !password) {
  console.error(
    "Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password> [name]"
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
  if (orgs.length > 1) {
    console.error(
      `ABORT: ${orgs.length} organizations exist. Pass --org-id explicitly (not implemented yet) or consolidate first.`
    );
    process.exitCode = 1;
    return;
  }
  const org = orgs[0];

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
