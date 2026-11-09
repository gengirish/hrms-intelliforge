// Recreates the mentor and listing data the 09/11/2026 QA pass reported
// (D5, D6, D11) so the fixes and tests can be checked locally.
//
// LOCAL / CI DATABASES ONLY. Refuses to run unless DATABASE_URL points at
// localhost or 127.0.0.1. Idempotent (upserts by slug / email).
//
// Dry run (default):  node --env-file=.env.local scripts/qa-fix/seed-qa-fixtures.mjs
// Apply:              node --env-file=.env.local scripts/qa-fix/seed-qa-fixtures.mjs --execute
// Remove fixtures:    node --env-file=.env.local scripts/qa-fix/seed-qa-fixtures.mjs --execute --remove

import { PrismaClient } from "@prisma/client";

const execute = process.argv.includes("--execute");
const remove = process.argv.includes("--remove");
const ORG_SLUG = process.env.QA_FIXTURE_ORG_SLUG ?? "intelliforge-ai";

function assertLocalDatabase() {
  const raw = process.env.DATABASE_URL ?? "";
  let host = "";
  try {
    host = new URL(raw).hostname;
  } catch {
    // fall through
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    console.error(`Refusing to run: DATABASE_URL host is "${host || "unset"}", not localhost.`);
    process.exit(2);
  }
}

const MENTORS = [
  {
    email: "qa-fixture-ravi-1@example.test",
    name: "Ravi Bandakkanavar",
    slug: "ravi-bandakkanavar-hxpv4e",
    headline: "Engineering leader · Cloud & platform architecture",
    bio: "Twelve years building and scaling platform teams. Mentors interns on system design, code review habits and shipping to production.",
    yearsExperience: 12,
    expertise: ["Cloud Architecture", "System Design", "Agile"],
    hourlyRatePaise: 300000,
  },
  {
    // Duplicate name, empty profile (D5).
    email: "qa-fixture-ravi-2@example.test",
    name: "Ravi Bandakkanavar",
    slug: "ravi-bandakkanavar-2pcl8a",
    headline: null,
    bio: null,
    yearsExperience: 15,
    expertise: [],
    hourlyRatePaise: null,
  },
  {
    // Empty profile (D5).
    email: "qa-fixture-jaganathan@example.test",
    name: "Jaganathan Govindaraju",
    slug: "jaganathan-govindaraju-5wpyj4",
    headline: null,
    bio: null,
    yearsExperience: null,
    expertise: [],
    hourlyRatePaise: null,
  },
  {
    // Bio repeats headline, rate with no currency, messy tags (D5, D6).
    email: "qa-fixture-kiran@example.test",
    name: "Kiran RK",
    slug: "kiran-rk-1yep6s",
    headline: "Operations leader and student mentor",
    bio: "Operations leader and student mentor",
    yearsExperience: 9,
    expertise: [
      "Operations Management; Student Mentoring",
      "SDLC",
      "Software Development Lifecycle",
      "Agile Project Management",
      "Digital Transformation",
      "Digital Business Transformation",
    ],
    hourlyRatePaise: 500000,
  },
];

const JOBS = [
  {
    // Slug does not match title (D11).
    slug: "sales-associate-intern-awaazos",
    title: "AI-Native Outreach Associate Intern",
    description: "Run AI-assisted outreach campaigns for AwaazOS and learn modern B2B growth.",
    employmentType: "INTERNSHIP",
    salaryInfo: "₹10,000 – ₹15,000 / month",
  },
  {
    // Contract posting on an internships board (D11).
    slug: "cognyzer-researcher-network",
    title: "Cognyzer Researcher Network",
    description: "Join a paid network of domain researchers reviewing AI evaluation tasks.",
    employmentType: "CONTRACT",
    salaryInfo: null,
  },
  {
    // Stipend with no amount (D11).
    slug: "ai-swe-intern-qa-fixture",
    title: "AI Software Engineer Intern",
    description: "Build agentic features end to end with a senior mentor.",
    employmentType: "INTERNSHIP",
    salaryInfo: "Stipend + PPO Potential",
  },
];

async function main() {
  assertLocalDatabase();
  const prisma = new PrismaClient();
  try {
    const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
    if (!org) throw new Error(`Org "${ORG_SLUG}" not found — run prisma/seed.mjs first.`);

    console.log(`${execute ? "APPLY" : "DRY RUN"}${remove ? " (remove)" : ""} — org ${org.slug}`);

    if (remove) {
      for (const m of MENTORS) console.log(`  delete admin+profile ${m.email}`);
      for (const j of JOBS) console.log(`  delete job ${j.slug}`);
      if (execute) {
        await prisma.admin.deleteMany({ where: { email: { in: MENTORS.map((m) => m.email) } } });
        await prisma.jobPosting.deleteMany({ where: { slug: { in: JOBS.map((j) => j.slug) } } });
      }
      return;
    }

    for (const m of MENTORS) {
      console.log(`  upsert mentor ${m.slug} (${m.name})`);
      if (!execute) continue;
      const admin = await prisma.admin.upsert({
        where: { email: m.email },
        update: { name: m.name, orgId: org.id, role: "MENTOR" },
        create: { email: m.email, name: m.name, orgId: org.id, role: "MENTOR", emailVerified: true },
      });
      const profile = {
        headline: m.headline,
        bio: m.bio,
        yearsExperience: m.yearsExperience,
        expertise: m.expertise,
        hourlyRatePaise: m.hourlyRatePaise,
        isPublic: true,
      };
      await prisma.mentorProfile.upsert({
        where: { slug: m.slug },
        update: profile,
        create: { ...profile, slug: m.slug, adminId: admin.id, orgId: org.id },
      });
    }

    for (const j of JOBS) {
      console.log(`  upsert job ${j.slug} (${j.employmentType})`);
      if (!execute) continue;
      const data = { ...j, orgId: org.id, skills: [], responsibilities: [], bonusSkills: [], isActive: true };
      await prisma.jobPosting.upsert({ where: { slug: j.slug }, update: data, create: data });
    }

    if (!execute) console.log("\nNothing written. Re-run with --execute to apply.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
