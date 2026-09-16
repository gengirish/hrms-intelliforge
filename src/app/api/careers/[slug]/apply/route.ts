import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serverError } from "@/lib/api-utils";
import { sendNewApplicationAlert } from "@/lib/agentmail";
import { expertApplySchema, isExpertNetworkForm } from "@/lib/hiring/expert-network";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const applySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please provide a valid email"),
  phone: z.string().optional(),
  resumeUrl: z.string().url("Please provide a valid URL").optional().or(z.literal("")),
  githubUrl: z.string().url("Please provide a valid URL").optional().or(z.literal("")),
  portfolioUrl: z.string().url("Please provide a valid URL").optional().or(z.literal("")),
  coverNote: z.string().max(2000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    if (!rateLimit(getClientIp(req), 10)) {
      return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
    }

    const { slug } = await params;

    const job = await prisma.jobPosting.findUnique({
      where: { slug, isActive: true },
      select: { id: true, title: true, interviewLink: true, formType: true },
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

    const isExpert = isExpertNetworkForm(job.formType);
    let expert: z.infer<typeof expertApplySchema> | null = null;
    if (isExpert) {
      const expertParsed = expertApplySchema.safeParse(body);
      if (!expertParsed.success) {
        const first = expertParsed.error.flatten().fieldErrors;
        const msg = Object.values(first).flat()[0] || "Invalid input";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      expert = expertParsed.data;
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
        resumeUrl: parsed.data.resumeUrl || null,
        githubUrl: parsed.data.githubUrl || null,
        portfolioUrl: parsed.data.portfolioUrl || null,
        coverNote: parsed.data.coverNote || null,
        interviewStatus: "APPLIED",
        ...(expert && {
          expertDomain: expert.expertDomain,
          highestDegree: expert.highestDegree,
          hIndex: expert.hIndex ?? null,
          scholarUrl: expert.scholarUrl || null,
          referrerName: expert.referrerName || null,
          referrerEmail: expert.referrerEmail || null,
          referralConsent: Boolean(expert.referrerEmail && expert.referralConsent),
        }),
      },
    });

    sendNewApplicationAlert({
      jobTitle: job.title,
      candidateName: parsed.data.name,
      candidateEmail: parsed.data.email,
      candidatePhone: parsed.data.phone,
      resumeUrl: parsed.data.resumeUrl,
      githubUrl: parsed.data.githubUrl,
      portfolioUrl: parsed.data.portfolioUrl,
      coverNote: parsed.data.coverNote,
      expert: expert && {
        domain: expert.expertDomain,
        degree: expert.highestDegree,
        hIndex: expert.hIndex ?? null,
        scholarUrl: expert.scholarUrl || null,
        referrerName: expert.referrerName || null,
        referrerEmail: expert.referrerEmail || null,
      },
    }).catch((err) => console.warn("Application alert email failed:", err));

    return NextResponse.json({
      success: true,
      candidateId: candidate.id,
      interviewLink: isExpert ? null : job.interviewLink,
    });
  } catch (err) {
    return serverError(err, "Careers apply POST error");
  }
}
