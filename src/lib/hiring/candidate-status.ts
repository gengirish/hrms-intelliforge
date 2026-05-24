/** Candidate pipeline statuses shown in the status dropdown. */
export const CANDIDATE_STATUS_OPTIONS = [
  "APPLIED",
  "SHORTLISTED",
  "INTERVIEWED",
  "COMPLETED",
  "HIRED",
  "REJECTED",
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUS_OPTIONS)[number];

/** Statuses that block conversion to intern. */
export const NON_CONVERTIBLE_STATUSES = new Set(["REJECTED"]);

export function normalizeCandidateStatus(status: string | null | undefined): string {
  return (status ?? "").toUpperCase();
}

export function canConvertCandidate(
  interviewStatus: string | null | undefined,
  convertedToIntern: boolean
): boolean {
  if (convertedToIntern) return false;
  const normalized = normalizeCandidateStatus(interviewStatus);
  return !NON_CONVERTIBLE_STATUSES.has(normalized);
}

export function getConvertDisabledReason(
  interviewStatus: string | null | undefined,
  convertedToIntern: boolean
): string | undefined {
  if (convertedToIntern) return "Already converted";
  const normalized = normalizeCandidateStatus(interviewStatus);
  if (NON_CONVERTIBLE_STATUSES.has(normalized)) {
    return "Rejected candidates cannot be converted to intern";
  }
  return undefined;
}
