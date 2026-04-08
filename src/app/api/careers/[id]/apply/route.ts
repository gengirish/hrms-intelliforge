import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serverError } from "@/lib/api-utils";
import { z } from "zod";

const applySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please provide a valid email"),
  phone: z.string().optional(),
  githubUrl: z.string().url("Please provide a valid URL").optional().or(z.literal("")),
  portfolioUrl: z.string().url("Please provide a valid URL").optional().or(z.literal("")),
  coverNote: z.string().max(2000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.jobPosting.findUnique({
      where: { id, isActive: true },
      select: { id: true, interviewLink: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job posting not found or closed" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const existing = await prisma.candidate.findFirst({
      where: { jobPostingId: job.id, email: parsed.data.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already applied for this position", interviewLink: job.interviewLink },
        { status: 409 }
      );
    }

    const candidate = await prisma.candidate.create({
      data: {
        jobPostingId: job.id,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        githubUrl: parsed.data.githubUrl || null,
        portfolioUrl: parsed.data.portfolioUrl || null,
        coverNote: parsed.data.coverNote || null,
        interviewStatus: "APPLIED",
      },
    });

    return NextResponse.json({
      success: true,
      candidateId: candidate.id,
      interviewLink: job.interviewLink,
    });
  } catch (err) {
    return serverError(err, "Careers apply POST error");
  }
}
