/** True when Clerk publishable key is configured (client-safe). */
export function isClerkEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

/** sessionStorage key for org details collected on /create-org before Clerk sign-up. */
export const PENDING_ORG_STORAGE_KEY = "hrms-pending-org";

export type PendingOrgPayload = {
  orgName: string;
  slug: string;
  adminName?: string;
};
