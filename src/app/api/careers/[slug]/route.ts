import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serverError } from "@/lib/api-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const job = await prisma.jobPosting.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        skills: true,
        location: true,
        employmentType: true,
        duration: true,
        responsibilities: true,
        requirements: true,
        bonusSkills: true,
        perks: true,
        interviewSteps: true,
        applicationEmail: true,
        salaryInfo: true,
        interviewLink: true,
        createdAt: true,
        org: { select: { name: true, slug: true, logoUrl: true } },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job posting not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (err) {
    return serverError(err, "Public careers detail GET error");
  }
}
