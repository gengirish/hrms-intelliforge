import { prisma } from "@/lib/prisma";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface RiskAssessment {
  level: RiskLevel;
  factors: string[];
  score: number;
}

export async function assessAttritionRisk(internId: string): Promise<RiskAssessment> {
  const factors: string[] = [];
  let riskScore = 0;

  const now = new Date();
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentAttendance = await prisma.attendance.findMany({
    where: { internId, date: { gte: threeWeeksAgo } },
    orderBy: { date: "desc" },
  });

  if (recentAttendance.length === 0) {
    riskScore += 40;
    factors.push("No attendance in the last 3 weeks");
  } else {
    const sortedDates = recentAttendance.map((a) => a.date.getTime()).sort((a, b) => b - a);
    const mostRecent = sortedDates[0];
    const daysSinceLast = Math.floor((now.getTime() - mostRecent) / (1000 * 60 * 60 * 24));

    if (daysSinceLast >= 5) {
      riskScore += 30;
      factors.push(`No attendance in the last ${daysSinceLast} days`);
    } else if (daysSinceLast >= 3) {
      riskScore += 15;
      factors.push(`${daysSinceLast} consecutive days absent`);
    }

    let maxGap = 0;
    for (let i = 1; i < sortedDates.length; i++) {
      const gap = Math.floor((sortedDates[i - 1] - sortedDates[i]) / (1000 * 60 * 60 * 24)) - 1;
      maxGap = Math.max(maxGap, gap);
    }
    if (maxGap >= 3) {
      riskScore += 15;
      factors.push(`${maxGap}-day attendance gap detected`);
    }
  }

  const scores = await prisma.performanceScore.findMany({
    where: { internId },
    orderBy: { weekLabel: "desc" },
    take: 4,
  });

  if (scores.length >= 2) {
    const isDeclinig = scores
      .slice(0, -1)
      .every((s, i) => s.overallScore < scores[i + 1].overallScore);

    if (isDeclinig && scores.length >= 2) {
      riskScore += 20;
      factors.push("Performance scores declining for consecutive weeks");
    }
  }

  const recentTasks = await prisma.task.findMany({
    where: { internId, createdAt: { gte: threeWeeksAgo } },
  });

  if (recentTasks.length > 0) {
    const completed = recentTasks.filter((t) => t.status === "DONE").length;
    const completionRate = completed / recentTasks.length;
    if (completionRate < 0.3) {
      riskScore += 15;
      factors.push(`Task completion rate below 30% (${Math.round(completionRate * 100)}%)`);
    } else if (completionRate < 0.5) {
      riskScore += 10;
      factors.push(`Task completion rate below 50% (${Math.round(completionRate * 100)}%)`);
    }
  }

  const lastWeekTasks = await prisma.task.findMany({
    where: { internId, createdAt: { gte: oneWeekAgo } },
  });
  const totalHoursLastWeek = lastWeekTasks.reduce((s, t) => s + t.hours, 0);
  if (totalHoursLastWeek < 10 && recentAttendance.length > 0) {
    riskScore += 10;
    factors.push(`Only ${totalHoursLastWeek}h logged in the past week`);
  }

  riskScore = Math.min(100, riskScore);

  const level: RiskLevel =
    riskScore >= 70 ? "CRITICAL" :
    riskScore >= 50 ? "HIGH" :
    riskScore >= 25 ? "MEDIUM" :
    "LOW";

  return { level, factors, score: riskScore };
}
