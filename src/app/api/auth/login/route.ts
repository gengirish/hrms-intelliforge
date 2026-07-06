import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signJWT, setAuthCookie } from "@/lib/auth";
import { normalizeOrgAdminRole } from "@/lib/org-admin-roles";
import { loginSchema } from "@/lib/validations";
import { errorResponse, serverError } from "@/lib/api-utils";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!(await rateLimitAsync(ip, 5, 60000))) {
      return errorResponse("Too many login attempts. Try again in a minute.", 429);
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid email or password", 400);
    }

    const { email, password } = parsed.data;

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (admin) {
      if (!admin.passwordHash) {
        return errorResponse(
          "No password is set for this account. Use Forgot password or contact your workspace admin.",
          401
        );
      }
      const valid = await verifyPassword(password, admin.passwordHash);
      if (!valid) return errorResponse("Invalid email or password", 401);

      if (!admin.orgId) {
        return errorResponse(
          "Your admin account isn't attached to an organization. Please create or join one at /create-org.",
          403
        );
      }

      const token = await signJWT({
        userId: admin.id,
        role: "admin",
        email,
        orgId: admin.orgId ?? undefined,
        adminOrgRole: normalizeOrgAdminRole(admin.role),
      });
      const response = NextResponse.json({
        user: { id: admin.id, email: admin.email, role: "admin", orgId: admin.orgId },
      });
      setAuthCookie(response, token);
      return response;
    }

    const intern = await prisma.intern.findUnique({ where: { email } });
    if (intern?.passwordHash) {
      const valid = await verifyPassword(password, intern.passwordHash);
      if (!valid) return errorResponse("Invalid email or password", 401);

      const token = await signJWT({ userId: intern.id, role: "intern", email });
      const response = NextResponse.json({
        user: { id: intern.id, email: intern.email, role: "intern", name: intern.name },
      });
      setAuthCookie(response, token);
      return response;
    }

    return errorResponse("Invalid email or password", 401);
  } catch (err) {
    return serverError(err, "login");
  }
}
