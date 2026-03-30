import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { z } from "zod";

const reviewSchema = z.object({
  verificationId: z.string(),
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { verificationId, action, note } = parsed.data;

    const verification = await prisma.documentVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      return NextResponse.json({ error: "Verification not found" }, { status: 404 });
    }

    const updated = await prisma.documentVerification.update({
      where: { id: verificationId },
      data: {
        status: action === "APPROVE" ? "VERIFIED" : "REJECTED",
        reviewNote: note ?? verification.reviewNote,
        verifiedAt: action === "APPROVE" ? new Date() : null,
      },
    });

    return NextResponse.json({ verification: updated });
  } catch (err) {
    return serverError(err, "Document review error");
  }
}
