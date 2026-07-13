import { prisma } from "@/lib/prisma";
import { calculatePlatformFee } from "@/lib/plan-limits";

export function slugifyMentorName(name: string, adminId: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "mentor"}-${adminId.slice(-6)}`;
}

export async function ensureUniqueMentorSlug(
  baseSlug: string
): Promise<string> {
  let slug = baseSlug;
  let attempt = 0;
  while (attempt < 10) {
    const existing = await prisma.mentorProfile.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return slug;
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }
  return `${baseSlug}-${Date.now()}`;
}

export async function recalculateMentorRating(
  mentorProfileId: string
): Promise<void> {
  const agg = await prisma.mentorRating.aggregate({
    where: { mentorProfileId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.mentorProfile.update({
    where: { id: mentorProfileId },
    data: {
      avgRating: agg._avg.rating ?? 0,
      ratingCount: agg._count.rating,
    },
  });
}

export async function recordMarketplaceTransaction(input: {
  orgId: string;
  payoutId?: string;
  recipientType: "intern" | "mentor";
  recipientId: string;
  grossAmountPaise: number;
  feeBps: number;
  razorpayPayoutId?: string;
}) {
  const { platformFeePaise, netAmountPaise } = calculatePlatformFee(
    input.grossAmountPaise,
    input.feeBps
  );

  return prisma.marketplaceTransaction.create({
    data: {
      orgId: input.orgId,
      payoutId: input.payoutId,
      recipientType: input.recipientType,
      recipientId: input.recipientId,
      grossAmountPaise: input.grossAmountPaise,
      platformFeePaise,
      netAmountPaise,
      feeBps: input.feeBps,
      status: input.razorpayPayoutId ? "COMPLETED" : "PENDING",
      razorpayPayoutId: input.razorpayPayoutId,
    },
  });
}
