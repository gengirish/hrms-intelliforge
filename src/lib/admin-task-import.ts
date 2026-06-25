import { z } from "zod";

export const adminTaskPayloadSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional().default(""),
  hours: z.coerce.number().min(0.5).max(40).optional().default(1),
  status: z
    .enum(["TODO", "IN_PROGRESS", "DONE"])
    .optional()
    .default("TODO"),
});

export const adminWeekTasksSchema = z
  .object({
    internId: z.string().min(1).optional(),
    internEmail: z.string().email().optional(),
    weekKey: z
      .string()
      .regex(/^\d{4}-W\d{2}$/, "Week must look like 2026-W22"),
    tasks: z.array(adminTaskPayloadSchema).min(1).max(100),
  })
  .refine((d) => Boolean(d.internId || d.internEmail), {
    message: "internId or internEmail is required",
    path: ["internId"],
  });

export const adminBulkTaskImportSchema = z.object({
  weekKey: z
    .string()
    .regex(/^\d{4}-W\d{2}$/, "Week must look like 2026-W22")
    .optional(),
  assignments: z
    .array(
      z
        .object({
          internId: z.string().min(1).optional(),
          internEmail: z.string().email().optional(),
          weekKey: z
            .string()
            .regex(/^\d{4}-W\d{2}$/, "Week must look like 2026-W22")
            .optional(),
          tasks: z.array(adminTaskPayloadSchema).min(1).max(100),
        })
        .refine((a) => Boolean(a.internId || a.internEmail), {
          message: "Each assignment needs internId or internEmail",
          path: ["internId"],
        })
    )
    .min(1)
    .max(50),
});

export type AdminTaskPayload = z.infer<typeof adminTaskPayloadSchema>;

export type ParsedTaskImport =
  | {
      mode: "single";
      weekKey: string;
      internId?: string;
      internEmail?: string;
      tasks: AdminTaskPayload[];
    }
  | {
      mode: "bulk";
      weekKey?: string;
      assignments: Array<{
        internId?: string;
        internEmail?: string;
        weekKey?: string;
        tasks: AdminTaskPayload[];
      }>;
    };

const WEEK_KEY_RE = /^\d{4}-W\d{2}$/;

export function parseTaskImportJson(
  raw: unknown,
  defaults?: { weekKey?: string; internId?: string; internEmail?: string }
): { ok: true; data: ParsedTaskImport } | { ok: false; error: string } {
  let payload = raw;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return { ok: false, error: "Invalid JSON" };
    }
  }

  if (Array.isArray(payload)) {
    const tasks = adminTaskPayloadSchema.array().min(1).max(100).safeParse(payload);
    if (!tasks.success) {
      return { ok: false, error: "Task array is invalid" };
    }
    const weekKey = defaults?.weekKey;
    if (!weekKey || !WEEK_KEY_RE.test(weekKey)) {
      return {
        ok: false,
        error: "Select a week or include weekKey in JSON",
      };
    }
    if (!defaults?.internId && !defaults?.internEmail) {
      return {
        ok: false,
        error: "Select an intern or include internId/internEmail in JSON",
      };
    }
    return {
      ok: true,
      data: {
        mode: "single",
        weekKey,
        internId: defaults.internId,
        internEmail: defaults.internEmail,
        tasks: tasks.data,
      },
    };
  }

  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "JSON must be an object or task array" };
  }

  const obj = payload as Record<string, unknown>;

  if (Array.isArray(obj.assignments)) {
    const parsed = adminBulkTaskImportSchema.safeParse(obj);
    if (!parsed.success) {
      const msg =
        parsed.error.flatten().formErrors[0] ||
        parsed.error.errors[0]?.message ||
        "Invalid bulk import JSON";
      return { ok: false, error: msg };
    }
    return { ok: true, data: { mode: "bulk", ...parsed.data } };
  }

  if (Array.isArray(obj.tasks)) {
    const parsed = adminWeekTasksSchema.safeParse({
      internId: obj.internId ?? defaults?.internId,
      internEmail: obj.internEmail ?? defaults?.internEmail,
      weekKey: obj.weekKey ?? defaults?.weekKey,
      tasks: obj.tasks,
    });
    if (!parsed.success) {
      const msg =
        parsed.error.flatten().formErrors[0] ||
        parsed.error.errors[0]?.message ||
        "Invalid task import JSON";
      return { ok: false, error: msg };
    }
    return {
      ok: true,
      data: {
        mode: "single",
        weekKey: parsed.data.weekKey,
        internId: parsed.data.internId,
        internEmail: parsed.data.internEmail,
        tasks: parsed.data.tasks,
      },
    };
  }

  return {
    ok: false,
    error: 'JSON must include a "tasks" array or "assignments" for bulk import',
  };
}

export const TASK_IMPORT_EXAMPLE = `{
  "weekKey": "2026-W26",
  "internEmail": "intern@intelliforge.tech",
  "tasks": [
    {
      "title": "Set up dev environment",
      "description": "Clone repo, install deps, run locally",
      "hours": 2
    },
    {
      "title": "Read API docs",
      "hours": 1
    }
  ]
}`;

export const TASK_BULK_IMPORT_EXAMPLE = `{
  "weekKey": "2026-W26",
  "assignments": [
    {
      "internEmail": "alice@intelliforge.tech",
      "tasks": [
        { "title": "Build login page", "hours": 4 },
        { "title": "Write unit tests", "hours": 2 }
      ]
    },
    {
      "internEmail": "bob@intelliforge.tech",
      "tasks": [
        { "title": "Design database schema", "hours": 3 }
      ]
    }
  ]
}`;
