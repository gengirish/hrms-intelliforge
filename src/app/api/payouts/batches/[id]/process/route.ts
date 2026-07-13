import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";
import {
  isRazorpayConfigured,
  createContact,
  createFundAccount,
  parseRecipientJson,
  RazorpayApiError,
} from "@/lib/razorpay";
import { processInternPayoutWithFee } from "@/lib/marketplace-payouts";

const ORPHAN_ADMIN_MSG =
  "Your admin account isn't attached to an organization. Contact support.";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  if (!rateLimit(getClientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const admin = await getAuthAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!admin.orgId) {
    return NextResponse.json({ error: ORPHAN_ADMIN_MSG }, { status: 403 });
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Razorpay integration is not configured on this deployment." },
      { status: 503 }
    );
  }

  const { id } = await context.params;

  try {
    const batch = await prisma.stipendPayoutBatch.findUnique({
      where: { id },
      include: {
        payouts: {
          where: { status: "DRAFT" },
        },
      },
    });

    if (!batch || batch.orgId !== admin.orgId) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (batch.status !== "DRAFT") {
      return NextResponse.json(
        { error: `Batch is ${batch.status}; only DRAFT batches can be processed` },
        { status: 400 }
      );
    }

    if (batch.payouts.length === 0) {
      return NextResponse.json(
        { error: "No draft payouts in this batch" },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: admin.orgId },
      select: { platformFeeBps: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    const feeBps = org.platformFeeBps;

    await prisma.stipendPayoutBatch.update({
      where: { id },
      data: { status: "PROCESSING" },
    });

    const results: Array<{
      payoutId: string;
      status: string;
      razorpayPayoutId?: string;
      platformFeePaise?: number;
      netAmountPaise?: number;
      error?: string;
    }> = [];

    for (const payout of batch.payouts) {
      try {
        const intern = await prisma.intern.findUnique({
          where: { id: payout.internId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            orgId: true,
          },
        });

        if (!intern || intern.orgId !== admin.orgId) {
          await prisma.stipendPayout.update({
            where: { id: payout.id },
            data: {
              status: "FAILED",
              failureReason: "Intern not found in organization",
            },
          });
          results.push({
            payoutId: payout.id,
            status: "FAILED",
            error: "Intern not found",
          });
          continue;
        }

        let profile = await prisma.internPayoutProfile.findUnique({
          where: { internId: payout.internId },
        });

        if (!profile) {
          await prisma.stipendPayout.update({
            where: { id: payout.id },
            data: {
              status: "FAILED",
              failureReason: "Missing payout profile",
            },
          });
          results.push({
            payoutId: payout.id,
            status: "FAILED",
            error: "Missing payout profile",
          });
          continue;
        }

        const recipient = parseRecipientJson(profile.recipientJson);
        if (!recipient) {
          await prisma.stipendPayout.update({
            where: { id: payout.id },
            data: {
              status: "FAILED",
              failureReason: "Invalid recipient JSON on payout profile",
            },
          });
          results.push({
            payoutId: payout.id,
            status: "FAILED",
            error: "Invalid recipient JSON",
          });
          continue;
        }

        if (!profile.razorpayContactId) {
          const contact = await createContact({
            name: intern.name,
            email: intern.email,
            phone: intern.phone,
            referenceId: intern.id,
          });
          profile = await prisma.internPayoutProfile.update({
            where: { id: profile.id },
            data: { razorpayContactId: contact.id },
          });
        }

        if (!profile.razorpayFundAccountId) {
          const fundAccount = await createFundAccount({
            contactId: profile.razorpayContactId!,
            recipient,
          });
          profile = await prisma.internPayoutProfile.update({
            where: { id: profile.id },
            data: { razorpayFundAccountId: fundAccount.id },
          });
        }

        const { razorpayPayout, platformFeePaise, netAmountPaise } =
          await processInternPayoutWithFee({
            payoutId: payout.id,
            orgId: admin.orgId,
            internId: payout.internId,
            grossAmountPaise: payout.amountPaise,
            feeBps,
            fundAccountId: profile.razorpayFundAccountId!,
            recipient,
            batchMonth: batch.month,
          });

        results.push({
          payoutId: payout.id,
          status: "PROCESSING",
          razorpayPayoutId: razorpayPayout.id,
          platformFeePaise,
          netAmountPaise,
        });
      } catch (err) {
        const message =
          err instanceof RazorpayApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Payout failed";

        await prisma.stipendPayout.update({
          where: { id: payout.id },
          data: {
            status: "FAILED",
            failureReason: message,
          },
        });

        results.push({
          payoutId: payout.id,
          status: "FAILED",
          error: message,
        });
      }
    }

    const failedCount = results.filter((r) => r.status === "FAILED").length;
    const allFailed = failedCount === results.length;

    await prisma.stipendPayoutBatch.update({
      where: { id },
      data: {
        status: allFailed ? "FAILED" : "PROCESSING",
        processedAt: new Date(),
      },
    });

    const updatedBatch = await prisma.stipendPayoutBatch.findUnique({
      where: { id },
      include: { payouts: true },
    });

    return NextResponse.json({
      batch: updatedBatch,
      results,
      failedCount,
    });
  } catch (err) {
    if (err instanceof RazorpayApiError && err.status === 503) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return serverError(err, "Payout batch process error");
  }
}
