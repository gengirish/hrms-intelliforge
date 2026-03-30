import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { verifyDocument } from "@/lib/ai/document-verifier";
import { serverError } from "@/lib/api-utils";
import { z } from "zod";

const verifySchema = z.object({
  internId: z.string(),
  documentType: z.enum(["AADHAAR", "PAN"]),
  documentUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { internId, documentType, documentUrl } = parsed.data;

    const { verificationId, result } = await verifyDocument(internId, documentType, documentUrl);

    return NextResponse.json({ verificationId, result });
  } catch (err) {
    return serverError(err, "Document verify error");
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const internId = req.nextUrl.searchParams.get("internId");
    if (!internId) {
      return NextResponse.json({ error: "internId is required" }, { status: 400 });
    }

    if (session.role === "intern" && session.sub !== internId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const verifications = await prisma.documentVerification.findMany({
      where: { internId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ verifications });
  } catch (err) {
    return serverError(err, "Document verify GET error");
  }
}
