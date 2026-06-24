import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { errorResponse } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const sendSchema = z.object({
  internId: z.string().min(1),
  type: z.enum([
    "WELCOME",
    "OFFER_LETTER",
    "TASK_REMINDER",
    "ATTENDANCE_NUDGE",
    "DAILY_PLAN_NUDGE",
    "COMPLETION_CERT",
    "CUSTOM",
  ]),
  subject: z.string().optional(),
  body: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 20, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!admin.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization. Contact support." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    const { internId, type, subject, body: messageBody } = parsed.data;

    const intern = await prisma.intern.findUnique({
      where: { id: internId },
      select: { orgId: true },
    });
    if (!intern || intern.orgId !== admin.orgId) {
      return errorResponse("Intern not found", 404);
    }

    await notify(internId, type, { subject, body: messageBody });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Notification send error:", err);
    return errorResponse(message, 500);
  }
}
