import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth-email";
import { serverError } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizeOrgAdminRole } from "@/lib/org-admin-roles";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!rateLimit(ip, 40, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const token = req.nextUrl.searchParams.get("t")?.trim();
    if (!token || token.length < 16) {
      return NextResponse.json({ valid: false });
    }

    const invite = await prisma.adminInvite.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { org: { select: { name: true } } },
    });

    if (!invite || invite.expiresAt < new Date()) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      email: invite.email,
      organizationName: invite.org.name,
      role: normalizeOrgAdminRole(invite.role),
      isPromotion: !!invite.internId,
    });
  } catch (err) {
    return serverError(err, "Invite preview");
  }
}
