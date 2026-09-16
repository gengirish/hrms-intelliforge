import { z } from "zod";

/**
 * Expert-network postings (e.g. the Cognyzer partnership) reuse the hiring
 * pipeline for researchers, post-graduates, PhDs and postdocs rather than
 * interns. They collect academic fields instead of GitHub/portfolio, skip the
 * Interview Bot, and support submitting someone else's resume as a referral.
 */

export const JOB_FORM_TYPES = ["STANDARD", "EXPERT_NETWORK"] as const;
export type JobFormType = (typeof JOB_FORM_TYPES)[number];

export function isExpertNetworkForm(formType: string | null | undefined): boolean {
  return formType === "EXPERT_NETWORK";
}

export const EXPERT_DOMAINS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Statistics",
  "Economics",
  "Engineering",
  "Finance",
  "Quantitative Research",
  "Other",
] as const;

export const EXPERT_DEGREES = [
  "Post-graduate student",
  "Master's",
  "PhD candidate",
  "PhD",
  "Postdoc",
  "Faculty / Researcher",
] as const;

/**
 * Referral payout per the partner's terms: H-index 0–1 → ₹300, >1 → ₹500.
 * Returned in paise to match how money is stored elsewhere. Null when the
 * candidate is not a referral or the H-index is unknown.
 */
export function referralPayoutPaise(candidate: {
  referrerEmail: string | null;
  hIndex: number | null;
}): number | null {
  if (!candidate.referrerEmail || candidate.hIndex === null) return null;
  return candidate.hIndex > 1 ? 50_000 : 30_000;
}

const optionalUrl = z.string().url("Please provide a valid URL").optional().or(z.literal(""));
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const expertApplySchema = z
  .object({
    resumeUrl: z.string().url("Please upload a resume"),
    expertDomain: z.enum(EXPERT_DOMAINS, {
      errorMap: () => ({ message: "Please choose an area of expertise" }),
    }),
    highestDegree: z.enum(EXPERT_DEGREES, {
      errorMap: () => ({ message: "Please choose the highest qualification" }),
    }),
    hIndex: z.coerce.number().int().min(0).max(500).optional().nullable(),
    scholarUrl: optionalUrl,
    referrerName: optionalText(100),
    referrerEmail: z.string().email("Please provide a valid referrer email").optional().or(z.literal("")),
    referralConsent: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const isReferral = Boolean(data.referrerName || data.referrerEmail);
    if (!isReferral) return;
    if (!data.referrerName || !data.referrerEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["referrerEmail"],
        message: "Referrer name and email are both required for a referral",
      });
    }
    if (data.referralConsent !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["referralConsent"],
        message: "Please confirm the candidate consented to sharing their resume",
      });
    }
  });

export type ExpertApplyInput = z.infer<typeof expertApplySchema>;
