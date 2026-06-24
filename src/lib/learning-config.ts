/**
 * Production defaults for IntelliForge Learning ↔ HRMS auto-provision.
 * Override any value via env vars (see .env.example).
 *
 * Catalog source: https://learning.intelliforge.tech/api/register/sessions
 * Last refreshed: 2026-06-24
 */

/** Official intern onboarding course on Learning. */
export const DEFAULT_INTERN_ONBOARDING_COURSE = {
  id: "cmopvq5bu0000l504vc68xxeg",
  slug: "intelliforge-intern-onboarding",
  title: "IntelliForge Intern Onboarding Stack Curriculum",
  url: "https://learning.intelliforge.tech/courses/intelliforge-intern-onboarding",
} as const;

/** Free companion course for engineering interns. */
export const DEFAULT_INTERN_ENGINEERING_COURSE = {
  id: "cmn9qn8xy001fqy0opqc87lln",
  slug: "software-engineering-with-gen-ai",
  title: "Software Engineering with Gen AI",
  url: "https://learning.intelliforge.tech/courses/software-engineering-with-gen-ai",
} as const;

/** Participants API expects the published course title as training_session. */
export const DEFAULT_BOOTCAMP_SESSION_TITLE =
  DEFAULT_INTERN_ONBOARDING_COURSE.title;

export function parseCsvEnv(name: string): string[] {
  const raw = process.env[name]?.trim();
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function getAutoEnrollCourseIds(): string[] {
  return parseCsvEnv("LEARNING_AUTO_ENROLL_COURSE_IDS");
}

export function getAutoEnrollCourseSlugs(): string[] {
  const fromEnv = parseCsvEnv("LEARNING_AUTO_ENROLL_COURSE_SLUGS");
  if (fromEnv.length > 0) return fromEnv;

  // Sensible HRMS default when operator hasn't configured slugs yet.
  if (process.env.LEARNING_AUTO_ENROLL_DEFAULTS !== "false") {
    return [
      DEFAULT_INTERN_ONBOARDING_COURSE.slug,
      DEFAULT_INTERN_ENGINEERING_COURSE.slug,
    ];
  }
  return [];
}

export function getAutoRegisterSession(): string | null {
  const fromEnv = process.env.LEARNING_AUTO_REGISTER_SESSION?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.LEARNING_AUTO_ENROLL_DEFAULTS !== "false") {
    return DEFAULT_BOOTCAMP_SESSION_TITLE;
  }
  return null;
}

export function getAutoRegisterLiveSessionId(): string | null {
  return process.env.LEARNING_AUTO_REGISTER_LIVE_SESSION_ID?.trim() || null;
}

/**
 * Resolve course IDs from explicit IDs + slug lookups against the live catalog.
 */
export async function resolveAutoEnrollCourseIds(
  listCoursesFn: () => Promise<Array<{ id: string; slug: string; title: string }>>
): Promise<{ courseIds: string[]; errors: string[] }> {
  const errors: string[] = [];
  const ids = new Set(getAutoEnrollCourseIds());

  const slugs = getAutoEnrollCourseSlugs();
  if (slugs.length > 0) {
    let courses: Array<{ id: string; slug: string; title: string }>;
    try {
      courses = await listCoursesFn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load courses";
      return { courseIds: Array.from(ids), errors: [msg] };
    }

    for (const slug of slugs) {
      const course = courses.find((c) => c.slug === slug);
      if (course) {
        ids.add(course.id);
      } else {
        errors.push(`Course slug "${slug}" not found in Learning catalog`);
      }
    }
  }

  return { courseIds: Array.from(ids), errors };
}
