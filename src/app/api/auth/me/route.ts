import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { errorResponse } from "@/lib/api-utils";
import { normalizeOrgAdminRole } from "@/lib/org-admin-roles";

export async function GET() {
  const session = await getSession();
  if (!session?.sub) {
    return errorResponse("Not authenticated", 401);
  }

  if (session.role === "admin") {
    const admin = await prisma.admin.findUnique({
      where: { id: session.sub },
      select: { id: true, email: true, role: true, orgId: true },
    });
    if (!admin) return errorResponse("Account not found", 404);
    if (!admin.orgId) {
      return errorResponse(
        "Your admin account isn't attached to an organization. Please create or join one at /create-org.",
        403
      );
    }
    const orgAdminRole = normalizeOrgAdminRole(admin.role);
    return NextResponse.json({
      user: {
        ...admin,
        accountType: "admin",
        orgAdminRole,
      },
    });
  }

  const intern = await prisma.intern.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, role: true, photoUrl: true },
  });
  if (!intern) return errorResponse("Account not found", 404);
  return NextResponse.json({ user: { ...intern, accountType: "intern" } });
}
