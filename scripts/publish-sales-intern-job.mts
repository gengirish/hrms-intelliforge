// Create or update the commission-only AwaazOS sales posting. Candidates and
// isActive are left alone on an update.
//
// Default: DRY RUN.
// Run:    npx tsx --env-file=.env.local scripts/publish-sales-intern-job.mts <orgSlug>
// Apply:  npx tsx --env-file=.env.local scripts/publish-sales-intern-job.mts <orgSlug> --execute

import { PrismaClient } from "@prisma/client";
import { SALES_INTERN_JOB } from "../src/lib/hiring/sales-intern-job";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const orgSlug = args.find((a) => !a.startsWith("--"));

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, slug: true, name: true } });
  const org = orgs.find((o) => o.slug === orgSlug);
  if (!org) {
    console.error("Usage: publish-sales-intern-job.mts <orgSlug> [--execute]");
    console.error(`Organizations: ${orgs.map((o) => o.slug).join(", ") || "<none>"}`);
    process.exitCode = 1;
    return;
  }

  const { slug, ...content } = SALES_INTERN_JOB;
  const data = {
    ...content,
    skills: [...content.skills],
    responsibilities: [...content.responsibilities],
    requirements: [...content.requirements],
    bonusSkills: [...content.bonusSkills],
    perks: [...content.perks],
    interviewSteps: [...content.interviewSteps],
  };

  const existing = await prisma.jobPosting.findUnique({
    where: { slug },
    select: { id: true, orgId: true },
  });
  if (existing && existing.orgId !== org.id) {
    console.error(`Slug ${slug} already belongs to another organization. Nothing changed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`${EXECUTE ? "EXECUTE" : "DRY RUN"}: ${existing ? "update" : "create"} "${data.title}" for ${org.name}`);
  console.log(`Public page: /internships/${slug}`);
  console.log(`Pay: ${data.salaryInfo}`);
  if (!EXECUTE) {
    console.log("Nothing written. Re-run with --execute to publish.");
    return;
  }

  if (existing) {
    await prisma.jobPosting.update({ where: { id: existing.id }, data });
  } else {
    await prisma.jobPosting.create({ data: { ...data, slug, orgId: org.id } });
  }
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
