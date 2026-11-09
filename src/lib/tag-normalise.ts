import { canonicalTag, tagKey } from "@/lib/tag-aliases";

export const MAX_EXPERTISE_TAGS = 20;
export const MAX_TAG_LENGTH = 80;

/**
 * Normalise expertise tags on save (D6): split on ";" and ",", collapse
 * whitespace, drop empties, de-duplicate case-insensitively (first spelling
 * wins) and cap the count/length the API schemas allow.
 */
export function normaliseTags(tags: readonly string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags ?? []) {
    for (const part of String(raw).split(/[;,]/)) {
      const tag = part.replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LENGTH).trim();
      if (!tag) continue;
      const key = tagKey(tag);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
      if (out.length >= MAX_EXPERTISE_TAGS) return out;
    }
  }
  return out;
}

/**
 * Build the public filter from the tags stored on profiles: canonical label →
 * every stored string that should match it. Stored strings that still contain
 * "a; b" (before the backfill runs) map to both labels.
 */
export function buildTagFilterIndex(storedTags: Iterable<string>): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  const labelFor = new Map<string, string>();
  for (const stored of Array.from(storedTags)) {
    for (const tag of normaliseTags([stored])) {
      const canonical = canonicalTag(tag);
      const key = tagKey(canonical);
      const label = labelFor.get(key) ?? canonical;
      labelFor.set(key, label);
      const set = index.get(label) ?? new Set<string>();
      set.add(stored);
      index.set(label, set);
    }
  }
  return index;
}

/** Sorted, de-duplicated filter labels. */
export function tagFilterOptions(index: Map<string, Set<string>>): string[] {
  return Array.from(index.keys()).sort((a, b) => a.localeCompare(b));
}

/** Stored tag strings to query with Prisma `hasSome` for a chosen filter label. */
export function storedTagsForFilter(index: Map<string, Set<string>>, label: string): string[] {
  const key = tagKey(canonicalTag(label));
  for (const [k, stored] of Array.from(index.entries())) {
    if (tagKey(k) === key) return Array.from(stored);
  }
  return [label];
}
