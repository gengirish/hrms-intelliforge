// Backfill expertise tags (QA 09/11/2026, D6).
//
// Splits delimiter-joined tags ("Operations Management; Student Mentoring"),
// trims, and de-duplicates case-insensitively on mentor_profiles and
// mentor_applications — the same normaliseTags() the save paths now use.
// With --canonical it also rewrites aliases to their canonical label from
// src/lib/tag-aliases.ts (e.g. "SDLC" → "Software Development Lifecycle").
//
// Dry run (default, read-only):
//   npx tsx --env-file=.env.local scripts/qa-fix/normalise-tags.ts
//   npx tsx --env-file=.env.local scripts/qa-fix/normalise-tags.ts --canonical
// Apply:
//   npx tsx --env-file=.env.local scripts/qa-fix/normalise-tags.ts --execute
//   npx tsx --env-file=.env.local scripts/qa-fix/normalise-tags.ts --canonical --execute

import { PrismaClient } from "@prisma/client";
import { normaliseTags } from "../../src/lib/tag-normalise";
import { canonicalTag } from "../../src/lib/tag-aliases";

const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");
const canonical = args.has("--canonical");

export function backfillTags(tags: string[], useCanonical: boolean): string[] {
  const split = normaliseTags(tags);
  return useCanonical ? normaliseTags(split.map(canonicalTag)) : split;
}

function same(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

async function main() {
  const prisma = new PrismaClient();
  let changes = 0;
  try {
    console.log(`${execute ? "APPLY" : "DRY RUN"}${canonical ? " (canonical labels)" : ""}\n`);

    const profiles = await prisma.mentorProfile.findMany({ select: { id: true, slug: true, expertise: true } });
    for (const p of profiles) {
      const next = backfillTags(p.expertise, canonical);
      if (same(p.expertise, next)) continue;
      changes++;
      console.log(`mentor_profiles ${p.slug}\n  - ${JSON.stringify(p.expertise)}\n  + ${JSON.stringify(next)}`);
      if (execute) await prisma.mentorProfile.update({ where: { id: p.id }, data: { expertise: next } });
    }

    const apps = await prisma.mentorApplication.findMany({ select: { id: true, email: true, expertise: true } });
    for (const a of apps) {
      const next = backfillTags(a.expertise, canonical);
      if (same(a.expertise, next)) continue;
      changes++;
      console.log(`mentor_applications ${a.id}\n  - ${JSON.stringify(a.expertise)}\n  + ${JSON.stringify(next)}`);
      if (execute) await prisma.mentorApplication.update({ where: { id: a.id }, data: { expertise: next } });
    }

    console.log(`\n${changes} row(s) ${execute ? "updated" : "would change"}.${execute ? "" : " Re-run with --execute to apply."}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
