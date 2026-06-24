#!/usr/bin/env node
/**
 * Print Learning catalog + recommended HRMS env vars for intern auto-provision.
 *
 * Usage:
 *   node scripts/learning-catalog.mjs
 *   LEARNING_API_KEY=ifk_... node scripts/learning-catalog.mjs
 */

const BASE = (process.env.LEARNING_API_BASE_URL || "https://learning.intelliforge.tech").replace(
  /\/+$/,
  ""
);

async function fetchJson(path, headers = {}) {
  const res = await fetch(`${BASE}${path}`, { headers, cache: "no-store" });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${res.status} ${path}`);
  }
  return data;
}

async function main() {
  console.log(`\nIntelliForge Learning catalog — ${BASE}\n`);

  const registrationCourses = await fetchJson("/api/register/sessions");
  const courses = Array.isArray(registrationCourses)
    ? registrationCourses
    : registrationCourses?.value ?? [];

  console.log("Published courses (registration / enroll):\n");
  for (const c of courses) {
    console.log(`  • ${c.title}`);
    console.log(`    id:   ${c.id}`);
    console.log(`    slug: ${c.slug}`);
    console.log(`    url:  ${BASE}/courses/${c.slug}`);
    console.log("");
  }

  const onboarding = courses.find((c) => c.slug === "intelliforge-intern-onboarding");
  const engineering = courses.find((c) => c.slug === "software-engineering-with-gen-ai");

  console.log("Recommended HRMS .env (copy to Vercel Production + Preview):\n");
  console.log("LEARNING_API_KEY=ifk_...   # mint at /admin/api-keys (write scope)");
  if (onboarding && engineering) {
    console.log(
      `LEARNING_AUTO_ENROLL_COURSE_SLUGS=${onboarding.slug},${engineering.slug}`
    );
    console.log(`LEARNING_AUTO_REGISTER_SESSION=${onboarding.title}`);
  } else if (onboarding) {
    console.log(`LEARNING_AUTO_ENROLL_COURSE_SLUGS=${onboarding.slug}`);
    console.log(`LEARNING_AUTO_REGISTER_SESSION=${onboarding.title}`);
  }
  console.log("# LEARNING_AUTO_REGISTER_LIVE_SESSION_ID=   # set when a live session is scheduled");
  console.log("# LEARNING_AUTO_ENROLL_DEFAULTS=false      # disable built-in slug defaults\n");

  const apiKey = process.env.LEARNING_API_KEY?.trim();
  if (apiKey) {
    try {
      const v1 = await fetchJson("/api/v1/courses", {
        Authorization: `Bearer ${apiKey}`,
      });
      const v1Courses = v1?.courses ?? [];
      console.log(`Verified API key — ${v1Courses.length} courses visible via v1 API.\n`);

      try {
        const sessions = await fetchJson("/api/v1/sessions?upcoming=true", {
          Authorization: `Bearer ${apiKey}`,
        });
        const upcoming = sessions?.sessions ?? [];
        if (upcoming.length === 0) {
          console.log("No upcoming live sessions (v1). Skip LEARNING_AUTO_REGISTER_LIVE_SESSION_ID for now.\n");
        } else {
          console.log("Upcoming live sessions (v1):\n");
          for (const s of upcoming) {
            console.log(`  • ${s.title} — ${s.start_time}`);
            console.log(`    id: ${s.id}\n`);
          }
        }
      } catch (err) {
        console.log(
          `Live sessions v1 not available yet (deploy training-feedback v1/sessions): ${err.message}\n`
        );
      }
    } catch (err) {
      console.error(`API key check failed: ${err.message}\n`);
      process.exitCode = 1;
    }
  } else {
    console.log("Tip: pass LEARNING_API_KEY=ifk_... to verify credentials and list live sessions.\n");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
