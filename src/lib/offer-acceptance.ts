import type { Intern } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { scheduleLearningProvision } from "@/lib/learning-provision";
import { formatDateIST } from "@/lib/utils";

/**
 * Single source of truth for OFFERED -> ACTIVE. Every acceptance path (email
 * reply, WhatsApp reply, intern portal, admin approve_offer, Digio e-sign)
 * goes through acceptOffer() so status checks, timestamps, learning
 * provisioning and the OFFER_ACCEPTED notification cannot drift apart.
 */

export type AcceptanceChannel = "email" | "whatsapp";

export type AcceptanceSource = "EMAIL" | "WHATSAPP" | "PORTAL" | "ADMIN" | "ESIGN";

export type AcceptOfferResult =
  | { outcome: "accepted"; intern: Intern }
  | { outcome: "already_active"; intern: Intern }
  | { outcome: "not_found" }
  | { outcome: "deactivated"; intern: Intern }
  | { outcome: "invalid_status"; intern: Intern };

/**
 * A reply that says no must never be read as yes ("I don't accept",
 * "not agree", "I decline"). Deliberately broad: a false negative just leaves
 * the intern OFFERED for an admin to approve; a false positive is not undoable.
 */
const NEGATION =
  /\b(?:not|no|nope|never|don'?t|do\s+not|doesn'?t|can'?t|cannot|won'?t|wouldn'?t|shouldn'?t|isn'?t|decline[sd]?|declining|reject(?:s|ed|ing)?|refuse[sd]?|withdraw)\b/;

/** Email replies often carry the quoted offer letter, which itself says "I Accept". */
function stripQuotedEmail(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (
      /^\s*>/.test(line) ||
      /^\s*On\b.*\bwrote:\s*$/i.test(line) ||
      /^\s*-{2,}\s*Original Message\s*-{2,}/i.test(line) ||
      /^\s*From:\s/i.test(line)
    ) {
      break;
    }
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Does this inbound reply accept the offer?
 *  - email: must say "I accept" (what the offer letter asks for).
 *  - whatsapp: "I accept" / "accept" / "yes" / "agree" / "confirm".
 * Either way, any negation in the reply rejects it.
 */
export function isAcceptanceReply(
  text: string | null | undefined,
  channel: AcceptanceChannel
): boolean {
  if (typeof text !== "string") return false;
  const body = channel === "email" ? stripQuotedEmail(text) : text;
  const normalized = body
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return false;
  if (NEGATION.test(normalized)) return false;

  if (channel === "email") {
    return /\bi\s+(?:hereby\s+)?accept\b/.test(normalized);
  }
  return /\b(?:accept(?:ed)?|yes|agree[d]?|confirm(?:ed)?)\b/.test(normalized);
}

export async function acceptOffer(params: {
  internId: string;
  source: AcceptanceSource;
  /** When set, an intern outside this org is treated as not found. */
  orgId?: string;
  /** Admin who approved, forwarded to learning provisioning. */
  adminId?: string | null;
}): Promise<AcceptOfferResult> {
  const { internId, source, orgId, adminId } = params;

  const intern = await prisma.intern.findUnique({ where: { id: internId } });
  const classified = classify(intern, orgId);
  if (classified) return classified;
  const offered = intern as Intern;

  // Conditional update: two concurrent replies (or email + WhatsApp) can both
  // see OFFERED, but only one flips the row, so side effects run once.
  const acceptedAt = new Date();
  const { count } = await prisma.intern.updateMany({
    where: { id: internId, status: "OFFERED", deactivated: false },
    data: { status: "ACTIVE", acceptedAt },
  });

  if (count === 0) {
    const current = await prisma.intern.findUnique({ where: { id: internId } });
    return classify(current, orgId) ?? { outcome: "invalid_status", intern: offered };
  }

  scheduleLearningProvision(internId, adminId);

  try {
    await notify(internId, "OFFER_ACCEPTED", {
      startDate: formatDateIST(offered.startDate),
    });
  } catch (err) {
    // Non-critical: the intern is already ACTIVE.
    console.error(`[offer-acceptance] OFFER_ACCEPTED notify failed for ${internId}:`, err);
  }

  console.info(`[offer-acceptance] Intern ${internId} accepted offer via ${source}`);

  return { outcome: "accepted", intern: { ...offered, status: "ACTIVE", acceptedAt } };
}

/** Returns a terminal result, or null when the intern can be accepted. */
function classify(intern: Intern | null, orgId?: string): AcceptOfferResult | null {
  if (!intern || (orgId !== undefined && intern.orgId !== orgId)) {
    return { outcome: "not_found" };
  }
  if (intern.deactivated) return { outcome: "deactivated", intern };
  if (intern.status === "ACTIVE") return { outcome: "already_active", intern };
  if (intern.status !== "OFFERED") return { outcome: "invalid_status", intern };
  return null;
}
