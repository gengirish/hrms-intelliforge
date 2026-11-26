// Create or update the commission-only AwaazDo sales posting. Candidates and
// isActive are left alone on an update. The posting is found by its current
// slug or any legacy slug; when the slug changes, the old one goes into
// previousSlugs so /internships/<old-slug> redirects.
//
// Default: DRY RUN.
// Run:    npx tsx --env-file=.env.local scripts/publish-sales-intern-job.mts <orgSlug>
// Apply:  npx tsx --env-file=.env.local scripts/publish-sales-intern-job.mts <orgSlug> --execute

import { PrismaClient } from "@prisma/client";
import { slugChangeForTitle } from "../src/lib/hiring/listing-display";
import { SALES_INTERN_JOB, SALES_INTERN_JOB_LEGACY_SLUGS } from "../src/lib/hiring/sales-intern-job";

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

  const knownSlugs = [slug, ...SALES_INTERN_JOB_LEGACY_SLUGS];
  const matches = await prisma.jobPosting.findMany({
    where: { OR: [{ slug: { in: knownSlugs } }, { previousSlugs: { hasSome: knownSlugs } }] },
    select: { id: true, orgId: true, slug: true, title: true, previousSlugs: true },
  });
  if (matches.length > 1) {
    console.error(`More than one posting uses these slugs: ${matches.map((m) => m.slug).join(", ")}. Nothing changed.`);
    process.exitCode = 1;
    return;
  }
  const existing = matches[0];
  if (existing && existing.orgId !== org.id) {
    console.error(`Slug ${existing.slug} already belongs to another organization. Nothing changed.`);
    process.exitCode = 1;
    return;
  }

  let slugData: { slug: string; previousSlugs: string[] } | null = null;
  if (existing && existing.slug !== slug) {
    const isTaken = async (s: string) =>
      Boolean(
        await prisma.jobPosting.findFirst({
          where: { id: { not: existing.id }, OR: [{ slug: s }, { previousSlugs: { has: s } }] },
          select: { id: true },
        }),
      );
    slugData = await slugChangeForTitle(existing, data.title, isTaken);
  }

  console.log(`${EXECUTE ? "EXECUTE" : "DRY RUN"}: ${existing ? "update" : "create"} "${data.title}" for ${org.name}`);
  if (existing) console.log(`Was: "${existing.title}" at /internships/${existing.slug}`);
  const publicSlug = slugData?.slug ?? existing?.slug ?? slug;
  console.log(`Public page: /internships/${publicSlug}`);
  if (slugData) console.log(`Redirects from: ${slugData.previousSlugs.map((s) => `/internships/${s}`).join(", ")}`);
  console.log(`Pay: ${data.salaryInfo}`);
  if (!EXECUTE) {
    console.log("Nothing written. Re-run with --execute to publish.");
    return;
  }

  if (existing) {
    await prisma.jobPosting.update({ where: { id: existing.id }, data: { ...data, ...(slugData ?? {}) } });
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
