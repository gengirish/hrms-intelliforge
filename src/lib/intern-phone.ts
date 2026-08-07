/**
 * Phone → Intern lookup for WhatsApp OTP sign-in.
 *
 * Kept out of `src/lib/otp.ts` so that module stays free of a Prisma import and
 * its pure helpers remain unit-testable without a database.
 */

import { prisma } from "@/lib/prisma";
import type { InternPhoneMatch } from "@/lib/otp";

/** Sanity cap. A number resolving to more rows than this is a data problem, and
 *  everything past the second match is ambiguous anyway. */
const MAX_MATCHES = 20;

/** Shortest suffix worth matching on — the shortest E.164 subscriber number
 *  `normalizePhoneE164` will accept. */
const MIN_SUFFIX = 8;

/**
 * Interns whose stored phone ends in the same digits as `suffix10`.
 *
 * The comparison strips non-digits in SQL rather than matching the raw column,
 * because `Intern.phone` is free text: `+919876543210`, `9876543210` and
 * `+91 98765 43210` all denote the same person. A `contains` match would also
 * have accepted a number that merely embeds those digits somewhere in the
 * middle; anchoring to the tail of a digits-only projection matches on the
 * subscriber number and nothing else.
 *
 * Two Postgres details worth keeping: `[^0-9]` rather than `\D`, because a
 * backslash escape is eaten by the template literal before Postgres ever sees
 * it; and `::int` on the length, because Prisma binds JS numbers as `bigint` and
 * there is no `right(text, bigint)` overload.
 *
 * This cannot use an index on `phone`. It is an auth path hit rarely, against a
 * small table, so a scan is the right trade for correctness.
 */
export async function findInternsByPhoneSuffix(
  suffix10: string
): Promise<InternPhoneMatch[]> {
  // Guard, not validation: `right(digits, 0) = ''` is true for every row whose
  // phone is blank — and blank phones exist. A too-short suffix must match
  // nothing rather than everything. Callers normalise first, so this is a floor.
  if (suffix10.length < MIN_SUFFIX) return [];

  return prisma.$queryRaw<InternPhoneMatch[]>`
    SELECT id, email, name, "orgId", status, deactivated
    FROM "interns"
    WHERE right(regexp_replace(phone, '[^0-9]', '', 'g'), ${suffix10.length}::int) = ${suffix10}
    LIMIT ${MAX_MATCHES}
  `;
}
