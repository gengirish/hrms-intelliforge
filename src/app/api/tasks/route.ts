import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthIntern } from "@/lib/auth";
import { taskSchema } from "@/lib/validations";
import { getCurrentISOWeek } from "@/lib/utils";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 20)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const intern = await getAuthIntern();
    if (!intern) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (err: unknown) {
    return serverError(err, "Tasks GET error");
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 20)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const intern = await getAuthIntern();
    if (!intern) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = taskSchema.safeParse(json);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { title, description, status, hours, week } = parsed.data;

    const task = await prisma.task.create({
      data: {
        internId: intern.id,
        title,
        description,
        status,
        hours,
        week: week || getCurrentISOWeek(),
      },
    });

    return NextResponse.json(task);
  } catch (err: unknown) {
    return serverError(err, "Task create error");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 20)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const intern = await getAuthIntern();
    if (!intern) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Task id required" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.internId !== intern.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      await prisma.task.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        "code" in err &&
        (err as { code: string }).code === "P2025"
      ) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      throw err;
    }
  } catch (err: unknown) {
    return serverError(err, "Task delete error");
  }
}
