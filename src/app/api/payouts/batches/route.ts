import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";
import { getISTDate } from "@/lib/utils";

const ORPHAN_ADMIN_MSG =
  "Your admin account isn't attached to an organization. Contact support.";

const createBatchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM")
    .optional(),
});

function currentMonthIst(): string {
  const ist = getISTDate();
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

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

  try {
    const batches = await prisma.stipendPayoutBatch.findMany({
      where: { orgId: admin.orgId },
      orderBy: { createdAt: "desc" },
      include: {
        payouts: {
          select: {
            id: true,
            internId: true,
            amountPaise: true,
            status: true,
            failureReason: true,
          },
        },
        _count: { select: { payouts: true } },
      },
    });

    return NextResponse.json({ batches });
  } catch (err) {
    return serverError(err, "Payout batches GET error");
  }
}

export async function POST(req: NextRequest) {
  if (!rateLimit(getClientIp(req), 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const admin = await getAuthAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!admin.orgId) {
    return NextResponse.json({ error: ORPHAN_ADMIN_MSG }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createBatchSchema.safeParse(body);
  if (!parsed.success) {
    const msg =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ||
      "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const month = parsed.data.month ?? currentMonthIst();

  try {
    const existing = await prisma.stipendPayoutBatch.findFirst({
      where: {
        orgId: admin.orgId,
        month,
        status: { in: ["DRAFT", "PROCESSING"] },
      },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: `A ${existing.status.toLowerCase()} batch already exists for ${month}`,
          batchId: existing.id,
        },
        { status: 409 }
      );
    }

    const interns = await prisma.intern.findMany({
      where: {
        orgId: admin.orgId,
        status: "ACTIVE",
        deactivated: false,
        stipendPaise: { gt: 0 },
      },
      select: { id: true, stipendPaise: true },
    });

    if (interns.length === 0) {
      return NextResponse.json(
        { error: "No active interns with a stipend to pay" },
        { status: 400 }
      );
    }

    const profiles = await prisma.internPayoutProfile.findMany({
      where: { internId: { in: interns.map((i) => i.id) } },
      select: { internId: true },
    });
    const profileSet = new Set(profiles.map((p) => p.internId));

    const eligible = interns.filter((i) => profileSet.has(i.id));
    if (eligible.length === 0) {
      return NextResponse.json(
        {
          error:
            "No active interns have payout profiles (bank/UPI details). Add InternPayoutProfile rows first.",
          skippedNoProfile: interns.length,
        },
        { status: 400 }
      );
    }

    const totalPaise = eligible.reduce((sum, i) => sum + i.stipendPaise, 0);

    const batch = await prisma.stipendPayoutBatch.create({
      data: {
        orgId: admin.orgId,
        month,
        totalPaise,
        createdById: admin.id,
        payouts: {
          create: eligible.map((intern) => ({
            internId: intern.id,
            amountPaise: intern.stipendPaise,
          })),
        },
      },
      include: {
        payouts: true,
        _count: { select: { payouts: true } },
      },
    });

    return NextResponse.json({
      batch,
      skippedNoProfile: interns.length - eligible.length,
    });
  } catch (err) {
    return serverError(err, "Payout batch create error");
  }
}
