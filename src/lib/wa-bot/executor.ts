import { prisma } from "@/lib/prisma";
import { getCurrentISOWeek } from "@/lib/utils";
import { BotIntent } from "./intent-parser";
import * as resp from "./responses";

interface InternData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  stipendPaise: number;
  startDate: Date;
  durationWeeks: number;
  college: string;
}

function getISTStartOfDay(): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  istNow.setUTCHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - istOffset);
}

function getISTStartOfWeek(): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const day = istNow.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  istNow.setUTCDate(istNow.getUTCDate() - diff);
  istNow.setUTCHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - istOffset);
}

export async function executeIntent(
  intern: InternData,
  intent: BotIntent
): Promise<string> {
  switch (intent.action) {
    case "HELP":
      return resp.helpResponse(intern.name);

    case "PUNCH_IN":
      return handlePunchIn(intern, intent.mode);

    case "PUNCH_OUT":
      return handlePunchOut(intern);

    case "LOG_TASK":
      return handleLogTask(intern, intent.title, intent.hours, intent.status);

    case "QUERY_TASKS":
      return handleQueryTasks(intern);

    case "QUERY_ATTENDANCE":
      return handleQueryAttendance(intern);

    case "QUERY_STIPEND":
      return resp.stipendResponse(intern);

    case "QUERY_STATUS":
      return resp.statusResponse(intern);

    case "ACCEPT_OFFER":
      return "To accept your offer, please reply with 'I accept' when you receive the offer letter.";

    case "UNKNOWN":
      return resp.unknownResponse();

    default:
      return resp.unknownResponse();
  }
}

async function handlePunchIn(intern: InternData, mode?: "WFH" | "Office"): Promise<string> {
  if (intern.status !== "ACTIVE" && intern.status !== "OFFERED") {
    return resp.notActiveResponse();
  }

  const todayStart = getISTStartOfDay();
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const existing = await prisma.attendance.findFirst({
    where: {
      internId: intern.id,
      date: { gte: todayStart, lt: todayEnd },
    },
  });

  if (existing) return resp.alreadyPunchedInResponse();

  await prisma.attendance.create({
    data: {
      internId: intern.id,
      date: todayStart,
      punchIn: new Date(),
      mode: mode ?? "Office",
    },
  });

  return resp.punchInResponse(mode);
}

async function handlePunchOut(intern: InternData): Promise<string> {
  if (intern.status !== "ACTIVE" && intern.status !== "OFFERED") {
    return resp.notActiveResponse();
  }

  const todayStart = getISTStartOfDay();
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const existing = await prisma.attendance.findFirst({
    where: {
      internId: intern.id,
      date: { gte: todayStart, lt: todayEnd },
    },
  });

  if (!existing) return resp.noPunchInResponse();
  if (existing.punchOut) return resp.alreadyPunchedOutResponse();

  await prisma.attendance.update({
    where: { id: existing.id },
    data: { punchOut: new Date() },
  });

  return resp.punchOutResponse();
}

async function handleLogTask(
  intern: InternData,
  title: string,
  hours: number,
  status: "TODO" | "IN_PROGRESS" | "DONE"
): Promise<string> {
  if (intern.status !== "ACTIVE" && intern.status !== "OFFERED") {
    return resp.notActiveResponse();
  }

  const week = getCurrentISOWeek();

  await prisma.task.create({
    data: {
      internId: intern.id,
      title,
      description: `Logged via WhatsApp bot`,
      status,
      hours,
      week,
    },
  });

  return resp.taskLoggedResponse(title, hours, status);
}

async function handleQueryTasks(intern: InternData): Promise<string> {
  const week = getCurrentISOWeek();
  const tasks = await prisma.task.findMany({
    where: { internId: intern.id, week },
    orderBy: { createdAt: "desc" },
  });

  return resp.tasksListResponse(
    tasks.map((t) => ({ title: t.title, status: t.status, hours: t.hours }))
  );
}

async function handleQueryAttendance(intern: InternData): Promise<string> {
  const weekStart = getISTStartOfWeek();
  const records = await prisma.attendance.findMany({
    where: {
      internId: intern.id,
      date: { gte: weekStart },
    },
    orderBy: { date: "desc" },
  });

  return resp.attendanceListResponse(
    records.map((r) => ({
      date: r.date,
      punchIn: r.punchIn,
      punchOut: r.punchOut,
      mode: r.mode,
    }))
  );
}
