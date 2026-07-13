import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { errorResponse, serverError } from "@/lib/api-utils";
import { payoutProfileSchema } from "@/lib/validations";
import { parseRecipientJson } from "@/lib/razorpay";

const ORPHAN_ADMIN_MSG =
  "Your admin account isn't attached to an organization. Contact support.";

function recipientToForm(recipient: ReturnType<typeof parseRecipientJson>) {
  if (!recipient) {
    return {
      payoutMethod: "upi" as const,
      beneficiaryName: "",
      accountNumber: "",
      ifsc: "",
      upiId: "",
    };
  }
  if (recipient.type === "vpa") {
    return {
      payoutMethod: "upi" as const,
      beneficiaryName: "",
      accountNumber: "",
      ifsc: "",
      upiId: recipient.address,
    };
  }
  return {
    payoutMethod: "bank" as const,
    beneficiaryName: recipient.name,
    accountNumber: recipient.accountNumber,
    ifsc: recipient.ifsc,
    upiId: "",
  };
}

function formToRecipientJson(data: {
  payoutMethod: "upi" | "bank";
  beneficiaryName: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
}): string {
  if (data.payoutMethod === "upi") {
    return JSON.stringify({ type: "vpa", address: data.upiId });
  }
  return JSON.stringify({
    type: "bank",
    name: data.beneficiaryName,
    ifsc: data.ifsc,
    accountNumber: data.accountNumber,
  });
}

export async function GET() {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return errorResponse("Unauthorized", 401);
    }
    if (!admin.orgId) {
      return errorResponse(ORPHAN_ADMIN_MSG, 403);
    }

    const profile = await prisma.mentorPayoutProfile.findUnique({
      where: { adminId: admin.id },
    });

    if (!profile) {
      return NextResponse.json({
        adminId: admin.id,
        configured: false,
        profile: null,
        form: recipientToForm(null),
      });
    }

    const recipient = parseRecipientJson(profile.recipientJson);

    return NextResponse.json({
      adminId: admin.id,
      configured: !!recipient,
      profile: {
        id: profile.id,
        razorpayContactId: profile.razorpayContactId,
        razorpayFundAccountId: profile.razorpayFundAccountId,
        updatedAt: profile.updatedAt,
      },
      form: recipientToForm(recipient),
    });
  } catch (err: unknown) {
    return serverError(err, "Mentor payout profile GET error");
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return errorResponse("Unauthorized", 401);
    }
    if (!admin.orgId) {
      return errorResponse(ORPHAN_ADMIN_MSG, 403);
    }

    const body = await req.json();
    const parsed = payoutProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const recipientJson = formToRecipientJson(parsed.data);

    const existing = await prisma.mentorPayoutProfile.findUnique({
      where: { adminId: admin.id },
    });

    const detailsChanged =
      !existing || existing.recipientJson !== recipientJson;

    const profile = existing
      ? await prisma.mentorPayoutProfile.update({
          where: { adminId: admin.id },
          data: {
            recipientJson,
            ...(detailsChanged
              ? { razorpayContactId: null, razorpayFundAccountId: null }
              : {}),
          },
        })
      : await prisma.mentorPayoutProfile.create({
          data: { adminId: admin.id, recipientJson },
        });

    const recipient = parseRecipientJson(profile.recipientJson);

    return NextResponse.json({
      ok: true,
      profile: {
        id: profile.id,
        razorpayContactId: profile.razorpayContactId,
        razorpayFundAccountId: profile.razorpayFundAccountId,
        updatedAt: profile.updatedAt,
      },
      form: recipientToForm(recipient),
    });
  } catch (err: unknown) {
    return serverError(err, "Mentor payout profile POST error");
  }
}
