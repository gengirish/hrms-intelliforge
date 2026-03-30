import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthAdmin } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { errorResponse } from "@/lib/api-utils";

const sendSchema = z.object({
  internId: z.string().min(1),
  type: z.enum([
    "WELCOME",
    "OFFER_LETTER",
    "TASK_REMINDER",
    "ATTENDANCE_NUDGE",
    "COMPLETION_CERT",
    "CUSTOM",
  ]),
  subject: z.string().optional(),
  body: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    await notify(internId, type, { subject, body: messageBody });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Notification send error:", err);
    return errorResponse(message, 500);
  }
}
