import { NextRequest, NextResponse } from "next/server";
import type { Admin, Intern } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { getInternForAdmin } from "@/lib/admin-intern-access";
import {
  adminBulkTaskImportSchema,
  adminWeekTasksSchema,
  type AdminTaskPayload,
} from "@/lib/admin-task-import";
import { getCurrentISOWeek } from "@/lib/utils";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";

async function resolveIntern(
  admin: Admin,
  internId?: string,
  internEmail?: string
): Promise<Intern | null> {
  if (internId) {
    return getInternForAdmin(admin, internId);
  }
  if (!internEmail || !admin.orgId) return null;
  const intern = await prisma.intern.findFirst({
    where: { email: internEmail.toLowerCase(), orgId: admin.orgId },
  });
  if (!intern) return null;
  return getInternForAdmin(admin, intern.id);
}

async function createTasksForIntern(
  intern: Intern,
  weekKey: string,
  tasks: AdminTaskPayload[]
) {
  if (intern.status !== "ACTIVE") {
    throw new Error(`Intern ${intern.email} is not active`);
  }

  return prisma.$transaction(
    tasks.map((task) =>
      prisma.task.create({
        data: {
          internId: intern.id,
          title: task.title,
          description: task.description?.trim() || "Assigned by admin",
          status: task.status,
          hours: task.hours,
          week: weekKey,
        },
      })
    )
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 10)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Not authorized. Admin access required." },
        { status: 403 }
      );
    }
    if (!admin.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization." },
        { status: 403 }
      );
    }

    const json = await req.json();

    const bulkParsed = adminBulkTaskImportSchema.safeParse(json);
    if (bulkParsed.success) {
      const { weekKey: defaultWeek, assignments } = bulkParsed.data;
      const results: Array<{
        internId: string;
        internEmail: string;
        weekKey: string;
        count: number;
      }> = [];
      const errors: string[] = [];

      for (const assignment of assignments) {
        const weekKey =
          assignment.weekKey ?? defaultWeek ?? getCurrentISOWeek();
        try {
          const intern = await resolveIntern(
            admin,
            assignment.internId,
            assignment.internEmail
          );
          if (!intern) {
            errors.push(
              `Intern not found: ${assignment.internEmail ?? assignment.internId}`
            );
            continue;
          }
          const created = await createTasksForIntern(
            intern,
            weekKey,
            assignment.tasks
          );
          results.push({
            internId: intern.id,
            internEmail: intern.email,
            weekKey,
            count: created.length,
          });
        } catch (e) {
          const label =
            assignment.internEmail ?? assignment.internId ?? "unknown intern";
          errors.push(
            `${label}: ${e instanceof Error ? e.message : "Failed"}`
          );
        }
      }

      if (results.length === 0) {
        return NextResponse.json(
          { error: errors[0] ?? "No tasks were imported", errors },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        mode: "bulk",
        results,
        totalTasks: results.reduce((sum, r) => sum + r.count, 0),
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    const singleParsed = adminWeekTasksSchema.safeParse(json);
    if (!singleParsed.success) {
      const msg =
        singleParsed.error.flatten().formErrors[0] ||
        singleParsed.error.errors[0]?.message ||
        "Invalid import JSON";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { internId, internEmail, weekKey, tasks } = singleParsed.data;
    const intern = await resolveIntern(admin, internId, internEmail);
    if (!intern) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    const created = await createTasksForIntern(intern, weekKey, tasks);

    return NextResponse.json({
      ok: true,
      mode: "single",
      weekKey,
      internId: intern.id,
      internEmail: intern.email,
      tasks: created,
      count: created.length,
    });
  } catch (err: unknown) {
    return serverError(err, "Dashboard tasks import POST");
  }
}
