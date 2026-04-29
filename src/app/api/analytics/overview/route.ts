import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { getCurrentWeekLabel } from "@/lib/ai/performance-scorer";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin" || !session.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentWeek = getCurrentWeekLabel();

    const scores = await prisma.performanceScore.findMany({
      where: {
        weekLabel: currentWeek,
        intern: { orgId: session.orgId },
      },
      include: { intern: { select: { name: true, role: true, status: true } } },
    });

    const totalInterns = scores.length;
    const avgScore = totalInterns > 0
      ? scores.reduce((s, sc) => s + sc.overallScore, 0) / totalInterns
      : 0;

    const riskDistribution = {
      LOW: scores.filter((s) => s.riskLevel === "LOW").length,
      MEDIUM: scores.filter((s) => s.riskLevel === "MEDIUM").length,
      HIGH: scores.filter((s) => s.riskLevel === "HIGH").length,
      CRITICAL: scores.filter((s) => s.riskLevel === "CRITICAL").length,
    };

    const topPerformers = [...scores]
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 5)
      .map((s) => ({
        internId: s.internId,
        name: s.intern.name,
        role: s.intern.role,
        score: s.overallScore,
      }));

    const atRisk = scores
      .filter((s) => s.riskLevel === "HIGH" || s.riskLevel === "CRITICAL")
      .map((s) => ({
        internId: s.internId,
        name: s.intern.name,
        role: s.intern.role,
        score: s.overallScore,
        riskLevel: s.riskLevel,
      }));

    return NextResponse.json({
      weekLabel: currentWeek,
      totalInterns,
      avgScore: Math.round(avgScore),
      riskDistribution,
      topPerformers,
      atRisk,
    });
  } catch (err) {
    return serverError(err, "Analytics overview GET error");
  }
}
