import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { agentmail } from "@/lib/agentmail";
import { escapeHtml } from "@/lib/html-escape";

const contactSchema = z.object({
  subject: z.string().min(2).max(200),
  message: z.string().min(10).max(10000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  try {
    if (!rateLimit(getClientIp(req), 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await getSession();
    if (!session || session.role !== "admin" || !session.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inboxId = process.env.AGENTMAIL_HR_INBOX_ID?.trim();
    if (!inboxId) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 503 }
      );
    }

    const { id, candidateId } = await params;

    const body = await req.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        jobPosting: { select: { id: true, slug: true, title: true, orgId: true } },
      },
    });

    if (
      !candidate ||
      candidate.jobPostingId !== id ||
      candidate.jobPosting.orgId !== session.orgId
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const safeName = escapeHtml(candidate.name);
    const safeBody = escapeHtml(parsed.data.message).replace(/\n/g, "<br/>");

    try {
      await agentmail.inboxes.messages.send(inboxId, {
        to: candidate.email,
        subject: parsed.data.subject,
        html: `
          <h2>Hi ${safeName},</h2>
          <p>${safeBody}</p>
          <br/>
          <p>— IntelliForge HR Team</p>
        `,
      });
    } catch (err) {
      console.error("Candidate contact send error:", err, {
        candidateId,
      });
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, sentAt: new Date().toISOString() });
  } catch (err) {
    return serverError(err, "Candidate contact POST error");
  }
}
