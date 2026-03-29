import { NextRequest, NextResponse } from "next/server";
import { getAuthIntern } from "@/lib/auth";
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

    return NextResponse.json({
      id: intern.id,
      name: intern.name,
      role: intern.role,
      stipendPaise: intern.stipendPaise,
      startDate: intern.startDate,
      durationWeeks: intern.durationWeeks,
      mentorId: intern.mentorId,
      status: intern.status,
      college: intern.college,
    });
  } catch (err: unknown) {
    return serverError(err, "Offer GET error");
  }
}
