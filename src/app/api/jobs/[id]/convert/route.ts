import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { z } from "zod";

const convertSchema = z.object({
  candidateId: z.string(),
  role: z.string().min(2),
  startDate: z.string(),
  durationWeeks: z.coerce.number().min(1).max(52),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin" || !session.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobId } = await params;
    const body = await req.json();
    const parsed = convertSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: parsed.data.candidateId },
      include: { jobPosting: { select: { orgId: true } } },
    });

    if (!candidate || candidate.jobPostingId !== jobId || candidate.jobPosting.orgId !== session.orgId) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    if (candidate.convertedToIntern) {
      return NextResponse.json({ error: "Already converted to intern" }, { status: 409 });
    }

    const existingIntern = await prisma.intern.findUnique({ where: { email: candidate.email } });
    if (existingIntern) {
      return NextResponse.json({ error: "An intern with this email already exists" }, { status: 409 });
    }

    const [intern] = await prisma.$transaction([
      prisma.intern.create({
        data: {
          orgId: session.orgId,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone ?? "",
          college: "N/A",
          branch: "N/A",
          year: "N/A",
          role: parsed.data.role,
          startDate: new Date(parsed.data.startDate),
          durationWeeks: parsed.data.durationWeeks,
          status: "PENDING",
        },
      }),
      prisma.candidate.update({
        where: { id: candidate.id },
        data: { convertedToIntern: true },
      }),
    ]);

    return NextResponse.json({ intern });
  } catch (err) {
    return serverError(err, "Convert candidate error");
  }
}
