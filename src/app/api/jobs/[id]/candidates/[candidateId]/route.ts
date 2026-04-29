import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";

const jobPostingSelect = {
  id: true,
  slug: true,
  title: true,
  orgId: true,
} as const;

const patchSchema = z.object({
  interviewStatus: z.enum([
    "APPLIED",
    "SHORTLISTED",
    "INTERVIEWED",
    "REJECTED",
    "HIRED",
    "PENDING",
    "COMPLETED",
  ]),
});

function shapeCandidate<
  T extends { jobPosting: { id: string; slug: string; title: string; orgId: string } },
>(candidate: T) {
  const { jobPosting, ...rest } = candidate;
  return {
    ...rest,
    jobPosting: {
      id: jobPosting.id,
      slug: jobPosting.slug,
      title: jobPosting.title,
    },
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin" || !session.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, candidateId } = await params;

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { jobPosting: { select: jobPostingSelect } },
    });

    if (
      !candidate ||
      candidate.jobPostingId !== id ||
      candidate.jobPosting.orgId !== session.orgId
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ candidate: shapeCandidate(candidate) });
  } catch (err) {
    return serverError(err, "Candidate GET error");
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin" || !session.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, candidateId } = await params;

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const existing = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { jobPosting: { select: jobPostingSelect } },
    });

    if (
      !existing ||
      existing.jobPostingId !== id ||
      existing.jobPosting.orgId !== session.orgId
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.candidate.update({
      where: { id: candidateId },
      data: { interviewStatus: parsed.data.interviewStatus },
      include: { jobPosting: { select: jobPostingSelect } },
    });

    return NextResponse.json({ candidate: shapeCandidate(updated) });
  } catch (err) {
    return serverError(err, "Candidate PATCH error");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin" || !session.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, candidateId } = await params;

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { jobPosting: { select: jobPostingSelect } },
    });

    if (
      !candidate ||
      candidate.jobPostingId !== id ||
      candidate.jobPosting.orgId !== session.orgId
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (candidate.convertedToIntern) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a converted candidate; deactivate the intern instead",
        },
        { status: 409 }
      );
    }

    await prisma.candidate.delete({ where: { id: candidateId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, "Candidate DELETE error");
  }
}
