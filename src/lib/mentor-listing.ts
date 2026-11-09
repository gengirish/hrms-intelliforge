import type { Prisma } from "@prisma/client";

/**
 * Public mentor directory rules (D5).
 *
 * A profile is listed publicly only when it is complete: a headline, a bio and
 * at least one expertise tag. Incomplete profiles stay reachable by their owner
 * (dashboard → Mentor Profile) and by org admins, who see a "complete your
 * profile" prompt.
 */

export interface MentorCompletenessFields {
  headline: string | null;
  bio: string | null;
  expertise: string[];
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function missingMentorProfileFields(p: MentorCompletenessFields): string[] {
  const missing: string[] = [];
  if (!hasText(p.headline)) missing.push("headline");
  if (!hasText(p.bio)) missing.push("bio");
  if (!p.expertise.some((e) => hasText(e))) missing.push("at least one expertise tag");
  return missing;
}

export function isMentorProfileComplete(p: MentorCompletenessFields): boolean {
  return missingMentorProfileFields(p).length === 0;
}

/** Prisma filter for profiles shown in the public directory, list API and sitemap. */
export function publicMentorWhere(
  extra: Prisma.MentorProfileWhereInput = {},
): Prisma.MentorProfileWhereInput {
  return {
    AND: [
      { isPublic: true },
      { headline: { not: null } },
      { NOT: { headline: "" } },
      { bio: { not: null } },
      { NOT: { bio: "" } },
      { NOT: { expertise: { isEmpty: true } } },
      extra,
    ],
  };
}

function normaliseForCompare(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // Keep Latin letters, digits and Devanagari; everything else is a separator.
    .replace(/[^a-z0-9\u0900-\u097f]+/g, " ")
    .trim();
}

/** Drop the bio when it only repeats the headline. Returns the bio to store. */
export function dedupeBioAgainstHeadline(
  headline: string | null | undefined,
  bio: string | null | undefined,
): string | null {
  if (!hasText(bio)) return null;
  const trimmed = (bio as string).trim();
  if (hasText(headline) && normaliseForCompare(trimmed) === normaliseForCompare(headline as string)) {
    return null;
  }
  return trimmed;
}

/** Normalise the editable text fields of a mentor profile before saving. */
export function normaliseMentorProfileFields<
  T extends { headline?: string | null; bio?: string | null },
>(fields: T): T {
  const headline = hasText(fields.headline) ? (fields.headline as string).trim() : fields.headline;
  const next = { ...fields, headline };
  if ("bio" in fields) next.bio = dedupeBioAgainstHeadline(headline, fields.bio);
  return next;
}

/** "₹5,000/hr" from integer paise; null when no rate is set. */
export function formatHourlyRate(paise: number | null | undefined): string | null {
  if (paise == null || paise <= 0) return null;
  const rupees = paise / 100;
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
  }).format(rupees);
  return `${formatted}/hr`;
}

/** Lower-cased, accent- and punctuation-free name used to spot duplicate mentors. */
export function normaliseMentorName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
