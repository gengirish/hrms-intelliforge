/**
 * Expertise tag aliases (D6): variant spellings mapped to one canonical label
 * for the public mentor filter. Keys are compared case-insensitively after
 * whitespace is collapsed. Add a line here to merge two labels in the filter;
 * stored profile tags are not rewritten.
 */
export const TAG_ALIASES: Record<string, string> = {
  sdlc: "Software Development Lifecycle",
  "software development life cycle": "Software Development Lifecycle",
  "software development lifecycle": "Software Development Lifecycle",
  "agile project management": "Agile",
  "agile methodologies": "Agile",
  "digital business transformation": "Digital Transformation",
};

export function tagKey(tag: string): string {
  return tag.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Canonical filter label for a single, already-split tag. */
export function canonicalTag(tag: string): string {
  const clean = tag.replace(/\s+/g, " ").trim();
  return TAG_ALIASES[tagKey(clean)] ?? clean;
}
