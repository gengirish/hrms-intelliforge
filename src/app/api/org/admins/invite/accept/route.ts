import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { acceptAdminInvite } from "@/lib/admin-invite-flow";
import { signJWT, setAuthCookie } from "@/lib/auth";
import { normalizeOrgAdminRole } from "@/lib/org-admin-roles";
import { serverError } from "@/lib/api-utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!rateLimit(ip, 15, 60_000)) {
      return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await acceptAdminInvite(parsed.data.token, parsed.data.password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: result.adminId },
      select: { id: true, email: true, orgId: true, role: true },
    });
    if (!admin?.orgId) {
      return NextResponse.json(
        { error: "Account was created but workspace data is missing. Please contact support." },
        { status: 500 }
      );
    }

    const jwt = await signJWT({
      userId: admin.id,
      role: "admin",
      email: admin.email,
      orgId: admin.orgId,
      adminOrgRole: normalizeOrgAdminRole(admin.role),
    });

    const response = NextResponse.json({
      ok: true,
      email: result.email,
      message: "You're signed in. Redirecting to your dashboard…",
    });
    setAuthCookie(response, jwt);

    return response;
  } catch (err) {
    return serverError(err, "Accept admin invite");
  }
}
