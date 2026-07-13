import { prisma } from "@/lib/prisma";
import { calculatePlatformFee } from "@/lib/plan-limits";
import { recordMarketplaceTransaction } from "@/lib/marketplace";
import {
  createPayout,
  payoutModeForRecipient,
  type PayoutRecipient,
  type RazorpayPayout,
} from "@/lib/razorpay";

export function applyPlatformFeeToPayout(
  grossPaise: number,
  feeBps: number
): {
  grossAmountPaise: number;
  platformFeePaise: number;
  netAmountPaise: number;
} {
  const { platformFeePaise, netAmountPaise } = calculatePlatformFee(
    grossPaise,
    feeBps
  );
  return {
    grossAmountPaise: grossPaise,
    platformFeePaise,
    netAmountPaise,
  };
}

export interface ProcessInternPayoutInput {
  payoutId: string;
  orgId: string;
  internId: string;
  grossAmountPaise: number;
  feeBps: number;
  fundAccountId: string;
  recipient: PayoutRecipient;
  batchMonth: string;
}

export interface ProcessInternPayoutResult {
  razorpayPayout: RazorpayPayout;
  platformFeePaise: number;
  netAmountPaise: number;
}

export async function processInternPayoutWithFee(
  input: ProcessInternPayoutInput
): Promise<ProcessInternPayoutResult> {
  const { platformFeePaise, netAmountPaise } = applyPlatformFeeToPayout(
    input.grossAmountPaise,
    input.feeBps
  );

  if (netAmountPaise < 100) {
    throw new Error(
      "Net payout amount after platform fee is below the minimum (₹1)"
    );
  }

  const rzPayout = await createPayout({
    fundAccountId: input.fundAccountId,
    amountPaise: netAmountPaise,
    referenceId: input.payoutId,
    mode: payoutModeForRecipient(input.recipient),
    narration: `Stipend ${input.batchMonth}`,
  });

  await prisma.stipendPayout.update({
    where: { id: input.payoutId },
    data: {
      status: "PROCESSING",
      platformFeePaise,
      netAmountPaise,
      razorpayPayoutId: rzPayout.id,
      failureReason: null,
    },
  });

  await recordMarketplaceTransaction({
    orgId: input.orgId,
    payoutId: input.payoutId,
    recipientType: "intern",
    recipientId: input.internId,
    grossAmountPaise: input.grossAmountPaise,
    feeBps: input.feeBps,
    razorpayPayoutId: rzPayout.id,
  });

  return { razorpayPayout: rzPayout, platformFeePaise, netAmountPaise };
}
