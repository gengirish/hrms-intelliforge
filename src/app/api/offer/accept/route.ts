import { NextRequest, NextResponse } from "next/server";
import { getAuthIntern } from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { acceptOffer } from "@/lib/offer-acceptance";

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 20)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const intern = await getAuthIntern();
    if (!intern) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await acceptOffer({ internId: intern.id, source: "PORTAL" });

    switch (result.outcome) {
      case "accepted":
        return NextResponse.json({ ok: true, status: "ACTIVE" });
      case "already_active":
        return NextResponse.json({ ok: true, status: "ACTIVE", alreadyActive: true });
      case "not_found":
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      case "deactivated":
        return NextResponse.json(
          { error: "Your account is deactivated. Contact your administrator." },
          { status: 403 }
        );
      case "invalid_status":
        return NextResponse.json(
          { error: `Cannot accept offer in ${result.intern.status} status` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("Accept error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
