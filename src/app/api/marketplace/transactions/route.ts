import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";
import { isFullOrgAdminRole } from "@/lib/org-admin-roles";

const ORPHAN_ADMIN_MSG =
  "Your admin account isn't attached to an organization. Contact support.";

export async function GET(req: NextRequest) {
  if (!rateLimit(getClientIp(req), 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const admin = await getAuthAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!admin.orgId) {
    return NextResponse.json({ error: ORPHAN_ADMIN_MSG }, { status: 403 });
  }
  if (!isFullOrgAdminRole(admin.role)) {
    return NextResponse.json(
      { error: "Only organization admins can view marketplace transactions." },
      { status: 403 }
    );
  }

  try {
    const transactions = await prisma.marketplaceTransaction.findMany({
      where: { orgId: admin.orgId },
      orderBy: { createdAt: "desc" },
      include: {
        payout: {
          select: {
            id: true,
            internId: true,
            status: true,
            batchId: true,
          },
        },
      },
    });

    const totals = transactions.reduce(
      (
        acc: {
          count: number;
          completedCount: number;
          grossAmountPaise: number;
          platformFeePaise: number;
          netAmountPaise: number;
        },
        tx: (typeof transactions)[number]
      ) => {
        acc.grossAmountPaise += tx.grossAmountPaise;
        acc.platformFeePaise += tx.platformFeePaise;
        acc.netAmountPaise += tx.netAmountPaise;
        acc.count += 1;
        if (tx.status === "COMPLETED") acc.completedCount += 1;
        return acc;
      },
      {
        count: 0,
        completedCount: 0,
        grossAmountPaise: 0,
        platformFeePaise: 0,
        netAmountPaise: 0,
      }
    );

    return NextResponse.json({ transactions, totals });
  } catch (err) {
    return serverError(err, "Marketplace transactions GET error");
  }
}
