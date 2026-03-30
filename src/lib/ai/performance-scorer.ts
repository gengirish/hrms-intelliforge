import { prisma } from "@/lib/prisma";

interface ScoreResult {
  attendanceScore: number;
  taskScore: number;
  consistencyScore: number;
  overallScore: number;
  riskLevel: string;
}

function getWeekBounds(weekLabel: string): { start: Date; end: Date } {
  const [yearStr, weekStr] = weekLabel.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);

  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay() || 7;
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() + (jan1Day <= 4 ? 1 - jan1Day : 8 - jan1Day));

  const start = new Date(firstMonday);
  start.setDate(start.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return { start, end };
}

export function getCurrentWeekLabel(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export async function computePerformanceScore(
  internId: string,
  weekLabel: string
): Promise<ScoreResult> {
  const { start, end } = getWeekBounds(weekLabel);
  const expectedDays = 5;
  const expectedHoursPerWeek = 40;

  const attendance = await prisma.attendance.findMany({
    where: { internId, date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
  });

  const tasks = await prisma.task.findMany({
    where: { internId, week: weekLabel },
  });

  const daysPresent = attendance.length;
  const onTimeCount = attendance.filter((a) => {
    if (!a.punchIn) return false;
    const hour = new Date(a.punchIn).getUTCHours() + 5;
    return hour <= 10;
  }).length;

  const attendancePresenceRatio = Math.min(1, daysPresent / expectedDays);
  const onTimeRatio = daysPresent > 0 ? onTimeCount / daysPresent : 0;
  const attendanceScore = Math.round((attendancePresenceRatio * 0.7 + onTimeRatio * 0.3) * 100);

  const completedTasks = tasks.filter((t) => t.status === "DONE").length;
  const totalTasks = tasks.length;
  const totalHours = tasks.reduce((sum, t) => sum + t.hours, 0);
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const hoursRatio = Math.min(1, totalHours / expectedHoursPerWeek);
  const taskScore = Math.round((completionRate * 0.6 + hoursRatio * 0.4) * 100);

  let streakPenalty = 0;
  if (daysPresent > 0) {
    let maxGap = 0;
    const sortedDates = attendance.map((a) => a.date.getTime()).sort();
    for (let i = 1; i < sortedDates.length; i++) {
      const gap = Math.floor((sortedDates[i] - sortedDates[i - 1]) / (24 * 60 * 60 * 1000)) - 1;
      maxGap = Math.max(maxGap, gap);
    }
    if (maxGap >= 3) streakPenalty = 40;
    else if (maxGap >= 2) streakPenalty = 20;
    else if (maxGap >= 1) streakPenalty = 10;
  } else {
    streakPenalty = 50;
  }
  const consistencyScore = Math.max(0, 100 - streakPenalty);

  const overallScore = Math.round(
    attendanceScore * 0.4 + taskScore * 0.4 + consistencyScore * 0.2
  );

  const riskLevel = determineRiskLevel(attendanceScore, taskScore, consistencyScore, overallScore);

  return { attendanceScore, taskScore, consistencyScore, overallScore, riskLevel };
}

function determineRiskLevel(
  attendance: number,
  task: number,
  consistency: number,
  overall: number
): string {
  if (overall <= 20 || (attendance === 0 && consistency <= 50)) return "CRITICAL";
  if (overall <= 40 || attendance <= 30 || task <= 25) return "HIGH";
  if (overall <= 60 || attendance <= 50 || task <= 40) return "MEDIUM";
  return "LOW";
}

export async function computeAndStoreScore(internId: string, weekLabel: string) {
  const score = await computePerformanceScore(internId, weekLabel);

  return prisma.performanceScore.upsert({
    where: { internId_weekLabel: { internId, weekLabel } },
    create: { internId, weekLabel, ...score },
    update: score,
  });
}

export async function computeScoresForAllInterns(weekLabel: string) {
  const interns = await prisma.intern.findMany({
    where: { status: { in: ["ACTIVE", "OFFERED"] } },
    select: { id: true },
  });

  const results = await Promise.allSettled(
    interns.map((i) => computeAndStoreScore(i.id, weekLabel))
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  return { total: interns.length, succeeded, failed };
}
