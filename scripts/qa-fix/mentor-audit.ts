// Mentor data audit (QA 09/11/2026, D5).
//
// Reports — never merges or deletes:
//   1. duplicate mentors by normalised name (e.g. two "Ravi Bandakkanavar")
//   2. profiles hidden from the public directory because they are incomplete
//      (missing headline, bio or any expertise tag)
//   3. profiles whose bio only repeats the headline
//
// The only write it can make is (3): clearing a bio that equals the headline,
// and only with BOTH --fix-bios and --execute. Duplicates are for a human to
// resolve (Q4).
//
// Report (default, read-only):
//   npx tsx --env-file=.env.local scripts/qa-fix/mentor-audit.ts
//   npx tsx --env-file=.env.local scripts/qa-fix/mentor-audit.ts --json
// Strip headline-duplicate bios (writes):
//   npx tsx --env-file=.env.local scripts/qa-fix/mentor-audit.ts --fix-bios            # dry run
//   npx tsx --env-file=.env.local scripts/qa-fix/mentor-audit.ts --fix-bios --execute  # apply

import { PrismaClient } from "@prisma/client";
import {
  dedupeBioAgainstHeadline,
  isMentorProfileComplete,
  missingMentorProfileFields,
  normaliseMentorName,
} from "../../src/lib/mentor-listing";

const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const fixBios = args.has("--fix-bios");
const execute = args.has("--execute");

interface Row {
  id: string;
  slug: string;
  orgId: string;
  name: string;
  isPublic: boolean;
  headline: string | null;
  bio: string | null;
  expertise: string[];
  yearsExperience: number | null;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const profiles = await prisma.mentorProfile.findMany({
      select: {
        id: true,
        slug: true,
        orgId: true,
        isPublic: true,
        headline: true,
        bio: true,
        expertise: true,
        yearsExperience: true,
        admin: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const rows: Row[] = profiles.map((p) => ({
      id: p.id,
      slug: p.slug,
      orgId: p.orgId,
      name: p.admin.name ?? p.admin.email,
      isPublic: p.isPublic,
      headline: p.headline,
      bio: p.bio,
      expertise: p.expertise,
      yearsExperience: p.yearsExperience,
    }));

    const byName = new Map<string, Row[]>();
    for (const r of rows) {
      const key = normaliseMentorName(r.name);
      byName.set(key, [...(byName.get(key) ?? []), r]);
    }
    const duplicates = Array.from(byName.entries())
      .filter(([, group]) => group.length > 1)
      .map(([name, group]) => ({
        normalisedName: name,
        profiles: group.map((r) => ({
          slug: r.slug,
          orgId: r.orgId,
          isPublic: r.isPublic,
          complete: isMentorProfileComplete(r),
          yearsExperience: r.yearsExperience,
        })),
      }));

    const incomplete = rows
      .filter((r) => r.isPublic && !isMentorProfileComplete(r))
      .map((r) => ({ slug: r.slug, name: r.name, missing: missingMentorProfileFields(r) }));

    const bioRepeatsHeadline = rows
      .filter((r) => r.bio && dedupeBioAgainstHeadline(r.headline, r.bio) === null)
      .map((r) => ({ id: r.id, slug: r.slug, name: r.name }));

    const report = {
      totalProfiles: rows.length,
      duplicates,
      incompletePublicProfiles: incomplete,
      bioRepeatsHeadline: bioRepeatsHeadline.map(({ slug, name }) => ({ slug, name })),
    };

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Mentor profiles: ${rows.length}\n`);
      console.log(`Duplicate names (${duplicates.length}) — report only, resolve manually (Q4):`);
      for (const d of duplicates) {
        console.log(`  "${d.normalisedName}"`);
        for (const p of d.profiles) {
          console.log(
            `    - ${p.slug}  org=${p.orgId}  public=${p.isPublic}  complete=${p.complete}  yrs=${p.yearsExperience ?? "—"}`,
          );
        }
      }
      console.log(`\nIncomplete public profiles hidden from the directory (${incomplete.length}):`);
      for (const i of incomplete) console.log(`  - ${i.slug} (${i.name}): missing ${i.missing.join(", ")}`);
      console.log(`\nBio repeats headline (${bioRepeatsHeadline.length}):`);
      for (const b of bioRepeatsHeadline) console.log(`  - ${b.slug} (${b.name})`);
    }

    if (fixBios) {
      console.log(
        `\n--fix-bios: ${bioRepeatsHeadline.length} bio(s) to clear — ${execute ? "APPLYING" : "dry run, add --execute to apply"}`,
      );
      if (execute && bioRepeatsHeadline.length > 0) {
        const result = await prisma.mentorProfile.updateMany({
          where: { id: { in: bioRepeatsHeadline.map((b) => b.id) } },
          data: { bio: null },
        });
        console.log(`Cleared ${result.count} bio(s).`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
