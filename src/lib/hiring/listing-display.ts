import { generateSlug } from "@/lib/utils";

/** Listing types shown as a badge and offered as a filter on /internships (D11). */
export const LISTING_TYPE_LABELS: Record<string, string> = {
  INTERNSHIP: "Internship",
  FULL_TIME: "Full-Time",
  PART_TIME: "Part-Time",
  CONTRACT: "Contract",
};

export function listingTypeLabel(type: string): string {
  return LISTING_TYPE_LABELS[type] ?? type;
}

/**
 * Pay line for a listing. `salaryInfo` is free text: show it when it states an
 * amount, flag it when it does not, and say so when nothing is set.
 */
export function formatStipendLabel(
  salaryInfo: string | null | undefined,
  employmentType = "INTERNSHIP",
): { text: string; disclosed: boolean } {
  const noun = employmentType === "INTERNSHIP" ? "Stipend" : "Pay";
  const info = (salaryInfo ?? "").trim();
  if (!info) return { text: `${noun} not disclosed`, disclosed: false };
  if (!/\d/.test(info)) return { text: `${info} · amount not disclosed`, disclosed: false };
  return { text: info, disclosed: true };
}

/** True when the slug still reflects the title (a "-abcd" uniqueness suffix is allowed). */
export function slugMatchesTitle(slug: string, title: string): boolean {
  const base = generateSlug(title);
  if (slug === base) return true;
  // generateSlug output is [a-z0-9-] only, so a prefix check is safe.
  return slug.startsWith(`${base}-`) && /^[a-z0-9]{1,8}$/.test(slug.slice(base.length + 1));
}

/**
 * Slug change for a retitled posting. Call from the posting edit path when the
 * title changes (there is no edit endpoint yet): it returns the new slug and
 * the previousSlugs list to store, or null when the slug already fits.
 * `isTaken` must check both `slug` and `previousSlugs` of other postings.
 */
export async function slugChangeForTitle(
  job: { slug: string; title: string; previousSlugs: string[] },
  newTitle: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<{ slug: string; previousSlugs: string[] } | null> {
  if (slugMatchesTitle(job.slug, newTitle)) return null;
  const base = generateSlug(newTitle);
  let slug = base;
  for (let i = 0; (await isTaken(slug)) && slug !== job.slug; i++) {
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (i > 10) throw new Error(`Could not find a free slug for "${newTitle}"`);
  }
  if (slug === job.slug) return null;
  const previousSlugs = Array.from(new Set([...job.previousSlugs, job.slug])).filter((s) => s !== slug);
  return { slug, previousSlugs };
}
