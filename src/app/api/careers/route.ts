import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serverError } from "@/lib/api-utils";

export async function GET() {
  try {
    const jobs = await prisma.jobPosting.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        skills: true,
        location: true,
        employmentType: true,
        duration: true,
        salaryInfo: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ jobs });
  } catch (err) {
    return serverError(err, "Public careers GET error");
  }
}
