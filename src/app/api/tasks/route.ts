import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getCurrentISOWeek(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor(
    (now.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const intern = await prisma.intern.findUnique({ where: { email } });
  if (!intern) {
    return NextResponse.json({ error: "Intern not found" }, { status: 404 });
  }

  const currentWeek = getCurrentISOWeek();

  const tasks = await prisma.task.findMany({
    where: { internId: intern.id, week: currentWeek },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    internId: intern.id,
    internName: intern.name,
    tasks,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { internId, title, description, status, hours, week } =
      await req.json();

    if (!internId || !title || !description || !status || !hours) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        internId,
        title,
        description,
        status,
        hours: parseFloat(hours),
        week: week || getCurrentISOWeek(),
      },
    });

    return NextResponse.json(task);
  } catch (err) {
    console.error("Task create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Task id required" }, { status: 400 });
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
