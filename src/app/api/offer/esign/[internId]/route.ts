import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin, getAuthIntern } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { getSigningStatus } from "@/lib/esign";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ internId: string }> }
) {
  try {
    if (!rateLimit(getClientIp(req), 30, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { internId } = await params;

    const intern = await getAuthIntern();
    const admin = intern ? null : await getAuthAdmin();

    if (!intern && !admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (intern && intern.id !== internId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetIntern = intern ?? (await prisma.intern.findUnique({ where: { id: internId } }));
    if (!targetIntern) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    if (admin) {
      if (!admin.orgId || targetIntern.orgId !== admin.orgId) {
        return NextResponse.json({ error: "Intern not found" }, { status: 404 });
      }
    }

    const esignRequest = await prisma.offerEsignRequest.findFirst({
      where: { internId },
      orderBy: { createdAt: "desc" },
    });

    if (!esignRequest) {
      return NextResponse.json({ esign: null });
    }

    let liveStatus = esignRequest.status;
    let signingUrl = esignRequest.signingUrl;
    let signedPdfUrl = esignRequest.signedPdfUrl;

    if (
      esignRequest.providerDocId &&
      esignRequest.status === "SENT"
    ) {
      try {
        const remote = await getSigningStatus(esignRequest.providerDocId);
        if (remote.status !== liveStatus) {
          liveStatus = remote.status;
          signingUrl = remote.signingUrl ?? signingUrl;
          signedPdfUrl = remote.signedPdfUrl ?? signedPdfUrl;
        }
      } catch {
        // Keep stored status when Digio is unreachable
      }
    }

    return NextResponse.json({
      esign: {
        id: esignRequest.id,
        status: liveStatus,
        provider: esignRequest.provider,
        providerDocId: esignRequest.providerDocId,
        signingUrl,
        signedPdfUrl,
        sentAt: esignRequest.sentAt,
        signedAt: esignRequest.signedAt,
        createdAt: esignRequest.createdAt,
      },
    });
  } catch (err: unknown) {
    return serverError(err, "Offer e-sign GET error");
  }
}
