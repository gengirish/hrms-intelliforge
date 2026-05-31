/**
 * Set passwordHash for a mentor (Admin) and an intern, and optionally assign mentorId.
 *
 * Password is NEVER hardcoded — pass as the first CLI arg or HRMS_SET_PASSWORD.
 *
 * Defaults (override with MENTOR_EMAIL / INTERN_EMAIL):
 *   Mentor: gen.girish@gmail.com
 *   Intern: rohinikoppal101@gmail.com
 *
 * Usage:
 *   node --env-file=.env scripts/set-mentor-intern-passwords.mjs "YourSecurePassword!"
 *   HRMS_SET_PASSWORD='...' node --env-file=.env scripts/set-mentor-intern-passwords.mjs
 *
 * Optional: set LINK_MENTOR=1 to set intern.mentorId to this admin when same org.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

const MENTOR_EMAIL =
  process.env.MENTOR_EMAIL?.trim() || "gen.girish@gmail.com";
const INTERN_EMAIL =
  process.env.INTERN_EMAIL?.trim() || "rohinikoppal101@gmail.com";

const cliArgs = process.argv.slice(2).filter((a) => a !== "--link-mentor");
const password =
  cliArgs[0]?.trim() ||
  process.env.HRMS_SET_PASSWORD?.trim() ||
  "";

if (!password || password.length < 8) {
  console.error(
    "Provide a password (min 8 chars): first CLI arg, or HRMS_SET_PASSWORD env var."
  );
  console.error(
    'Example: node --env-file=.env scripts/set-mentor-intern-passwords.mjs "YourSecurePassword!"'
  );
  process.exit(1);
}

const linkMentor =
  process.env.LINK_MENTOR === "1" || process.argv.includes("--link-mentor");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const admin = await prisma.admin.findUnique({
    where: { email: MENTOR_EMAIL },
    select: { id: true, email: true, orgId: true, name: true, role: true },
  });
  if (!admin) {
    console.error(`No Admin found with email: ${MENTOR_EMAIL}`);
    process.exitCode = 1;
    return;
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash, emailVerified: true },
  });
  console.log(`Updated Admin password: ${admin.email} (${admin.id})`);

  const intern = await prisma.intern.findUnique({
    where: { email: INTERN_EMAIL },
    select: {
      id: true,
      email: true,
      orgId: true,
      name: true,
      mentorId: true,
    },
  });
  if (!intern) {
    console.error(`No Intern found with email: ${INTERN_EMAIL}`);
    process.exitCode = 1;
    return;
  }

  const internUpdate = { passwordHash, emailVerified: true };
  if (linkMentor) {
    if (intern.orgId !== admin.orgId) {
      console.warn(
        `SKIP link: intern org ${intern.orgId} !== admin org ${admin.orgId}`
      );
    } else {
      internUpdate.mentorId = admin.id;
      console.log(`Will set intern.mentorId -> ${admin.id}`);
    }
  }

  await prisma.intern.update({
    where: { id: intern.id },
    data: internUpdate,
  });
  console.log(`Updated Intern password: ${intern.email} (${intern.id})`);
  if (linkMentor && intern.orgId === admin.orgId) {
    console.log(`Linked intern to mentor ${MENTOR_EMAIL}`);
  } else if (!linkMentor) {
    console.log(
      "Tip: re-run with LINK_MENTOR=1 or --link-mentor to set intern.mentorId for weekly review."
    );
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
