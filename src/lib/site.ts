/**
 * Public site identity: founder details and the public contact address (D9).
 * Every public page, metadata/JSON-LD, footer, sign-in and the command palette
 * read from here. Operational inboxes (the AgentMail HR inbox, HR alert
 * recipients) live in src/lib/company.ts and src/lib/agentmail.ts instead.
 */

// DECISION: Q3 — founder link target. Proposed; confirm before merging.
const FOUNDER_URL = "https://girish-hiremath-profile.vercel.app";

// DECISION: Q3 — public contact address. Proposed; confirm before merging.
// intelliforge.tech's MX points at AgentMail, so this must be an inbox someone
// actually reads (or forwards) before it goes live.
const CONTACT_EMAIL = "founder@intelliforge.tech";

/** User-facing product name (D10). Not "HRMS" or "HR workspace". */
export const PRODUCT_NAME = "Mentor Internship Platform";

export const SITE = {
  founder: {
    name: "Girish Hiremath",
    initials: "GH",
    title: "Founder & Principal Engineer, IntelliForge",
    url: FOUNDER_URL,
    /** Host shown as link text, e.g. in the command palette hint. */
    urlLabel: new URL(FOUNDER_URL).host,
  },
  contactEmail: CONTACT_EMAIL,
} as const;

export function mailto(subject?: string, email: string = SITE.contactEmail): string {
  return subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;
}
