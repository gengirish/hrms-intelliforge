import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";

interface ReviewInput {
  internId: string;
  periodWeeks?: number;
}

export async function generatePerformanceReview(input: ReviewInput) {
  const { internId, periodWeeks = 4 } = input;

  const intern = await prisma.intern.findUnique({
    where: { id: internId },
    select: { name: true, role: true, college: true, startDate: true, durationWeeks: true, status: true },
  });
  if (!intern) throw new Error("Intern not found");

  const scores = await prisma.performanceScore.findMany({
    where: { internId },
    orderBy: { weekLabel: "desc" },
    take: periodWeeks,
  });

  const recentTasks = await prisma.task.findMany({
    where: { internId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { title: true, status: true, hours: true, week: true },
  });

  if (scores.length === 0) {
    const review = await prisma.performanceReview.create({
      data: {
        internId,
        periodStart: new Date(),
        periodEnd: new Date(),
        summary: "Insufficient data to generate a performance review. No performance scores recorded yet.",
        recommendation: "NEEDS_DATA",
      },
    });
    return review;
  }

  const periodStart = scores.length > 0
    ? new Date(Math.min(...scores.map((s) => s.createdAt.getTime())))
    : new Date();
  const periodEnd = new Date();

  const avgOverall = scores.reduce((s, sc) => s + sc.overallScore, 0) / scores.length;
  const avgAttendance = scores.reduce((s, sc) => s + sc.attendanceScore, 0) / scores.length;
  const avgTask = scores.reduce((s, sc) => s + sc.taskScore, 0) / scores.length;
  const latestRisk = scores[0]?.riskLevel ?? "LOW";
  const trend = scores.length >= 2
    ? scores[0].overallScore > scores[scores.length - 1].overallScore
      ? "improving"
      : scores[0].overallScore < scores[scores.length - 1].overallScore
        ? "declining"
        : "stable"
    : "stable";

  const taskSummary = recentTasks.slice(0, 10).map((t) => `${t.title} (${t.status})`).join(", ");

  const prompt = `Generate a concise 3-4 sentence performance review for an intern.

Intern: ${intern.name}
Role: ${intern.role}
College: ${intern.college}
Duration: ${intern.durationWeeks} weeks
Status: ${intern.status}

Performance over last ${scores.length} weeks:
- Average overall score: ${avgOverall.toFixed(1)}/100
- Average attendance score: ${avgAttendance.toFixed(1)}/100
- Average task score: ${avgTask.toFixed(1)}/100
- Score trend: ${trend}
- Current risk level: ${latestRisk}
- Recent tasks: ${taskSummary || "None logged"}

Write a professional, constructive review. End with one of these recommendations:
- EXTEND (if performing well, worth keeping longer)
- CONVERT_FULL_TIME (if exceptional, ready for full-time)
- NEEDS_IMPROVEMENT (if below expectations)
- ON_TRACK (if meeting expectations)

Format: Return ONLY a JSON object: {"summary": "...", "recommendation": "EXTEND|CONVERT_FULL_TIME|NEEDS_IMPROVEMENT|ON_TRACK"}`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 300,
      messages: [
        { role: "system", content: "You are an HR performance reviewer. Be professional and constructive." },
        { role: "user", content: prompt },
      ],
    });

    const content = res.choices[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(content) as { summary: string; recommendation: string };

    const review = await prisma.performanceReview.create({
      data: {
        internId,
        periodStart,
        periodEnd,
        summary: parsed.summary,
        recommendation: parsed.recommendation,
      },
    });

    return review;
  } catch (e) {
    console.error("AI review generation failed:", e);

    const fallbackSummary = `${intern.name} has an average performance score of ${avgOverall.toFixed(0)}/100 over the past ${scores.length} weeks. Attendance score averages ${avgAttendance.toFixed(0)}/100 and task completion averages ${avgTask.toFixed(0)}/100. The performance trend is ${trend}.`;
    const fallbackRec = avgOverall >= 80 ? "CONVERT_FULL_TIME"
      : avgOverall >= 60 ? "ON_TRACK"
      : avgOverall >= 40 ? "NEEDS_IMPROVEMENT"
      : "NEEDS_IMPROVEMENT";

    const review = await prisma.performanceReview.create({
      data: {
        internId,
        periodStart,
        periodEnd,
        summary: fallbackSummary,
        recommendation: fallbackRec,
      },
    });

    return review;
  }
}

export async function getLatestReview(internId: string) {
  return prisma.performanceReview.findFirst({
    where: { internId },
    orderBy: { generatedAt: "desc" },
  });
}
