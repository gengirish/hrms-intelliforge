import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { createInterviewConfig } from "@/lib/interview-bot-client";
import { z } from "zod";

const createJobSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(10).max(5000),
  skills: z.array(z.string()).min(1).max(20),
  location: z.string().max(200).optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"]).optional(),
  duration: z.string().max(100).optional(),
  responsibilities: z.array(z.string()).optional(),
  requirements: z.array(z.object({ title: z.string(), description: z.string() })).optional(),
  bonusSkills: z.array(z.string()).optional(),
  perks: z.array(z.object({ icon: z.string(), title: z.string(), description: z.string() })).optional(),
  interviewSteps: z.array(z.object({ step: z.string(), title: z.string(), description: z.string() })).optional(),
  applicationEmail: z.string().email().optional().or(z.literal("")),
  salaryInfo: z.string().max(200).optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where = session.orgId ? { orgId: session.orgId } : {};

    const jobs = await prisma.jobPosting.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { candidates: true } },
        candidates: {
          select: { interviewScore: true },
          where: { interviewScore: { not: null } },
        },
      },
    });

    const jobsWithStats = jobs.map((job) => {
      const scores = job.candidates
        .map((c) => c.interviewScore)
        .filter((s): s is number => s !== null);
      const avgScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;

      return {
        id: job.id,
        title: job.title,
        description: job.description,
        skills: job.skills,
        location: job.location,
        employmentType: job.employmentType,
        duration: job.duration,
        interviewLink: job.interviewLink,
        isActive: job.isActive,
        createdAt: job.createdAt,
        candidateCount: job._count.candidates,
        avgScore: avgScore ? Math.round(avgScore) : null,
      };
    });

    return NextResponse.json({ jobs: jobsWithStats });
  } catch (err) {
    return serverError(err, "Jobs GET error");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin" || !session.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    let interviewBotJobId: string | null = null;
    let interviewLink: string | null = null;

    try {
      const config = await createInterviewConfig({
        title: parsed.data.title,
        description: parsed.data.description,
        skills: parsed.data.skills,
        orgId: session.orgId,
      });
      interviewBotJobId = config.id;
      interviewLink = config.interviewLink;
    } catch (err) {
      console.warn("Interview Bot integration skipped:", err);
    }

    const job = await prisma.jobPosting.create({
      data: {
        orgId: session.orgId,
        title: parsed.data.title,
        description: parsed.data.description,
        skills: parsed.data.skills,
        location: parsed.data.location || null,
        employmentType: parsed.data.employmentType || "FULL_TIME",
        duration: parsed.data.duration || null,
        responsibilities: parsed.data.responsibilities || [],
        requirements: parsed.data.requirements || undefined,
        bonusSkills: parsed.data.bonusSkills || [],
        perks: parsed.data.perks || undefined,
        interviewSteps: parsed.data.interviewSteps || undefined,
        applicationEmail: parsed.data.applicationEmail || null,
        salaryInfo: parsed.data.salaryInfo || null,
        interviewBotJobId,
        interviewLink,
      },
    });

    return NextResponse.json({ job });
  } catch (err) {
    return serverError(err, "Jobs POST error");
  }
}
