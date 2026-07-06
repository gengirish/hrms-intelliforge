import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyInterviewWebhookAuth } from "@/lib/interview-webhook-auth";

interface InterviewCompletePayload {
  candidateId?: string;
  candidateEmail?: string;
  jobId?: string;
  score?: number;
  status?: string;
  reportUrl?: string;
}

let devMissingSecretWarned = false;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedKey = process.env.INTERVIEW_BOT_WEBHOOK_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (!expectedKey && !isProduction && !devMissingSecretWarned) {
    console.warn(
      "[interview-bot-webhook] INTERVIEW_BOT_WEBHOOK_SECRET not set — allowing unauthenticated requests in development"
    );
    devMissingSecretWarned = true;
  }

  const auth = verifyInterviewWebhookAuth(authHeader, expectedKey, isProduction);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = (await req.json()) as InterviewCompletePayload;

    if (!body.candidateEmail || !body.jobId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const job = await prisma.jobPosting.findFirst({
      where: { interviewBotJobId: body.jobId },
    });

    if (!job) {
      console.warn(`[interview-bot-webhook] No job found for bot job ID: ${body.jobId}`);
      return NextResponse.json({ ok: true });
    }

    let candidate = await prisma.candidate.findFirst({
      where: { jobPostingId: job.id, email: body.candidateEmail },
    });

    if (!candidate) {
      candidate = await prisma.candidate.create({
        data: {
          jobPostingId: job.id,
          name: body.candidateEmail.split("@")[0],
          email: body.candidateEmail,
          interviewScore: body.score ?? null,
          interviewStatus: body.status ?? "COMPLETED",
          reportUrl: body.reportUrl ?? null,
        },
      });
    } else {
      candidate = await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          interviewScore: body.score ?? candidate.interviewScore,
          interviewStatus: body.status ?? "COMPLETED",
          reportUrl: body.reportUrl ?? candidate.reportUrl,
        },
      });
    }

    console.info(
      `[interview-bot-webhook] Updated candidate ${candidate.email}: score=${body.score}, status=${body.status}`
    );

    return NextResponse.json({ ok: true, candidateId: candidate.id });
  } catch (err) {
    console.error("Interview bot webhook error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
