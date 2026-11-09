// Regenerate job-posting slugs that no longer match their titles (QA
// 09/11/2026, D11) — e.g. "sales-associate-intern-awaazos" for "AI-Native
// Outreach Associate Intern". The old slug is kept in previousSlugs, so
// /internships/<old-slug> permanently redirects to the new one. Titles and
// listing content are never changed.
//
// Dry run (default, read-only):
//   npx tsx --env-file=.env.local scripts/qa-fix/regenerate-job-slugs.ts
// Apply:
//   npx tsx --env-file=.env.local scripts/qa-fix/regenerate-job-slugs.ts --execute
// Only some postings:
//   npx tsx --env-file=.env.local scripts/qa-fix/regenerate-job-slugs.ts --only=sales-associate-intern-awaazos --execute

import { PrismaClient } from "@prisma/client";
import { slugChangeForTitle, slugMatchesTitle } from "../../src/lib/hiring/listing-display";

const argv = process.argv.slice(2);
const execute = argv.includes("--execute");
const only = argv
  .filter((a) => a.startsWith("--only="))
  .flatMap((a) => a.slice("--only=".length).split(","))
  .filter(Boolean);

async function main() {
  const prisma = new PrismaClient();
  try {
    const jobs = await prisma.jobPosting.findMany({
      where: only.length ? { slug: { in: only } } : {},
      select: { id: true, slug: true, title: true, previousSlugs: true, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    const claimed = new Set<string>();
    const isTaken = async (slug: string) => {
      if (claimed.has(slug)) return true;
      const hit = await prisma.jobPosting.findFirst({
        where: { OR: [{ slug }, { previousSlugs: { has: slug } }] },
        select: { id: true },
      });
      return Boolean(hit);
    };

    console.log(`${execute ? "APPLY" : "DRY RUN"} — ${jobs.length} posting(s) checked\n`);
    let changes = 0;
    for (const job of jobs) {
      if (slugMatchesTitle(job.slug, job.title)) continue;
      const change = await slugChangeForTitle(job, job.title, isTaken);
      if (!change) continue;
      changes++;
      claimed.add(change.slug);
      console.log(`  "${job.title}"${job.isActive ? "" : " (inactive)"}\n    ${job.slug}  →  ${change.slug}`);
      if (execute) {
        await prisma.jobPosting.update({
          where: { id: job.id },
          data: { slug: change.slug, previousSlugs: change.previousSlugs },
        });
      }
    }
    console.log(`\n${changes} slug(s) ${execute ? "regenerated" : "would change"}.${execute ? "" : " Re-run with --execute to apply."}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
