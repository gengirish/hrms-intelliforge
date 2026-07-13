import { prisma } from "@/lib/prisma";
import { PLANS, type PlanKey } from "@/lib/stripe";

export interface PlanLimits {
  maxInterns: number;
  maxMentors: number;
  platformFeeBps: number;
}

const PLAN_MENTOR_LIMITS: Record<PlanKey, number> = {
  free: 2,
  starter: 10,
  growth: 50,
  enterprise: 999999,
};

const DEFAULT_PLATFORM_FEE_BPS = 1000;

export function getPlanLimits(plan: string): PlanLimits {
  const key = plan as PlanKey;
  const p = PLANS[key];
  return {
    maxInterns: p?.maxInterns ?? 500,
    maxMentors: PLAN_MENTOR_LIMITS[key] ?? 2,
    platformFeeBps: DEFAULT_PLATFORM_FEE_BPS,
  };
}

export interface OrgUsage {
  internCount: number;
  mentorCount: number;
  maxInterns: number;
  maxMentors: number;
  plan: string;
  platformFeeBps: number;
  marketplaceEnabled: boolean;
}

export async function getOrgUsage(orgId: string): Promise<OrgUsage | null> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      plan: true,
      maxInterns: true,
      maxMentors: true,
      platformFeeBps: true,
      marketplaceEnabled: true,
      _count: {
        select: {
          interns: { where: { deactivated: false } },
          admins: { where: { role: "MENTOR" } },
        },
      },
    },
  });

  if (!org) return null;

  return {
    internCount: org._count.interns,
    mentorCount: org._count.admins,
    maxInterns: org.maxInterns,
    maxMentors: org.maxMentors,
    plan: org.plan,
    platformFeeBps: org.platformFeeBps,
    marketplaceEnabled: org.marketplaceEnabled,
  };
}

export class PlanLimitError extends Error {
  readonly code: "INTERN_LIMIT" | "MENTOR_LIMIT";
  readonly status = 402;

  constructor(code: "INTERN_LIMIT" | "MENTOR_LIMIT", message: string) {
    super(message);
    this.name = "PlanLimitError";
    this.code = code;
  }
}

export async function assertCanAddIntern(orgId: string): Promise<void> {
  const usage = await getOrgUsage(orgId);
  if (!usage) throw new Error("Organization not found");
  if (usage.internCount >= usage.maxInterns) {
    throw new PlanLimitError(
      "INTERN_LIMIT",
      `Intern limit reached (${usage.maxInterns}). Upgrade your plan to add more mentees.`
    );
  }
}

export async function assertCanAddMentor(orgId: string): Promise<void> {
  const usage = await getOrgUsage(orgId);
  if (!usage) throw new Error("Organization not found");
  if (usage.mentorCount >= usage.maxMentors) {
    throw new PlanLimitError(
      "MENTOR_LIMIT",
      `Mentor limit reached (${usage.maxMentors}). Upgrade your plan to invite more mentors.`
    );
  }
}

export function calculatePlatformFee(
  grossAmountPaise: number,
  feeBps: number
): { platformFeePaise: number; netAmountPaise: number } {
  const platformFeePaise = Math.round((grossAmountPaise * feeBps) / 10_000);
  const netAmountPaise = grossAmountPaise - platformFeePaise;
  return { platformFeePaise, netAmountPaise };
}
