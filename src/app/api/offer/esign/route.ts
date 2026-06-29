import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createSigningRequest } from "@/lib/esign";
import { generateOfferPdfBuffer } from "@/lib/offer-pdf";
import { z } from "zod";

const esignBodySchema = z.object({
  internId: z.string().min(1),
});

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://hrms.intelliforge.tech")
  .trim()
  .replace(/\/$/, "");

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 20, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!admin.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = esignBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues.map((i) => i.message) },
        { status: 400 }
      );
    }

    const { internId } = parsed.data;

    const intern = await prisma.intern.findUnique({ where: { id: internId } });
    if (!intern || intern.orgId !== admin.orgId) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    if (intern.status !== "PENDING") {
      return NextResponse.json(
        {
          error: `Cannot send for e-sign — intern status is "${intern.status}" (expected PENDING).`,
        },
        { status: 400 }
      );
    }

    if (intern.stipendPaise === 0) {
      return NextResponse.json(
        { error: "Set the stipend amount before sending for e-sign." },
        { status: 400 }
      );
    }

    const existing = await prisma.offerEsignRequest.findFirst({
      where: {
        internId,
        status: { in: ["PENDING", "SENT"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing?.signingUrl) {
      return NextResponse.json({
        ok: true,
        id: existing.id,
        status: existing.status,
        signingUrl: existing.signingUrl,
        providerDocId: existing.providerDocId,
        reused: true,
      });
    }

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateOfferPdfBuffer(intern);
    } catch (pdfErr) {
      console.error("Offer PDF render failed:", pdfErr);
      return NextResponse.json(
        { error: "Failed to generate the offer letter PDF. Please try again." },
        { status: 500 }
      );
    }

    const esignRequest = await prisma.offerEsignRequest.create({
      data: {
        internId,
        orgId: admin.orgId,
        status: "PENDING",
      },
    });

    const callbackUrl = `${APP_URL}/api/webhooks/digio`;

    let digioResult;
    try {
      digioResult = await createSigningRequest({
        internName: intern.name,
        email: intern.email,
        offerPdfBuffer: pdfBuffer,
        callbackUrl,
        referenceId: esignRequest.id,
      });
    } catch (e) {
      await prisma.offerEsignRequest.update({
        where: { id: esignRequest.id },
        data: { status: "FAILED" },
      });
      const msg = e instanceof Error ? e.message : "Digio request failed";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const updated = await prisma.offerEsignRequest.update({
      where: { id: esignRequest.id },
      data: {
        status: "SENT",
        providerDocId: digioResult.providerDocId,
        signingUrl: digioResult.signingUrl,
        sentAt: new Date(),
      },
    });

    await prisma.intern.update({
      where: { id: internId },
      data: { status: "OFFERED" },
    });

    return NextResponse.json({
      ok: true,
      id: updated.id,
      status: updated.status,
      signingUrl: updated.signingUrl,
      providerDocId: updated.providerDocId,
      internStatus: "OFFERED",
    });
  } catch (err: unknown) {
    return serverError(err, "Offer e-sign POST error");
  }
}
