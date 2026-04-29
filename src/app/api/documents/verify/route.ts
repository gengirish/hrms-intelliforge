import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { verifyDocument } from "@/lib/ai/document-verifier";
import { serverError } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const verifySchema = z.object({
  internId: z.string(),
  documentType: z.enum(["AADHAAR", "PAN"]),
  documentUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await getSession();
    if (!session || session.role !== "admin" || !session.orgId) {
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

    const intern = await prisma.intern.findUnique({
      where: { id: internId },
      select: { orgId: true },
    });
    if (!intern || intern.orgId !== session.orgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

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
    if (session.role === "admin" && !session.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization. Contact support." },
        { status: 403 }
      );
    }

    const internId = req.nextUrl.searchParams.get("internId");
    if (!internId) {
      return NextResponse.json({ error: "internId is required" }, { status: 400 });
    }

    if (session.role === "intern" && session.sub !== internId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.role === "admin") {
      const intern = await prisma.intern.findUnique({
        where: { id: internId },
        select: { orgId: true },
      });
      if (!intern || intern.orgId !== session.orgId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
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
