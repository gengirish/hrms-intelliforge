import { clerkClient, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { normalizeOrgAdminRole } from "@/lib/org-admin-roles";
import { readHrmsFromPublicMetadata } from "@/lib/hrms-clerk-public-metadata";

const COOKIE_NAME = "hrms-session";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/reset-password(.*)",
  "/create-org(.*)",
  "/accept-admin-invite(.*)",
  "/auth/complete-clerk(.*)",
  "/careers(.*)",
  "/pricing(.*)",
]);

const isPublicApiRoute = createRouteMatcher([
  "/api/auth/(.*)",
  "/api/webhooks/(.*)",
  "/api/cron/(.*)",
  "/api/careers(.*)",
  "/api/org/admins/invite/(.*)",
]);

function isPublic(req: NextRequest) {
  return isPublicRoute(req) || isPublicApiRoute(req);
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

function applyMentorRestrictions(
  pathname: string,
  method: string,
  role: string,
  adminOrgRoleUpper: string,
  requestUrl: string
): NextResponse | null {
  if (role !== "admin" || adminOrgRoleUpper !== "MENTOR") return null;

  if (
    pathname.startsWith("/dashboard/settings") ||
    pathname.startsWith("/dashboard/hiring")
  ) {
    return NextResponse.redirect(new URL("/dashboard", requestUrl));
  }
  if (pathname.startsWith("/api/billing") || pathname.startsWith("/api/jobs")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (pathname === "/api/org" && method === "PUT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const teamMemberPatch =
    method === "PATCH" &&
    /^\/api\/org\/admins\/(?!promote-intern)[^/]+\/?$/.test(pathname);
  const isOrgAdminsMutation =
    (pathname === "/api/org/admins" && method === "POST") ||
    teamMemberPatch ||
    (pathname === "/api/org/admins/promote-intern" && method === "POST");
  if (isOrgAdminsMutation) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  if (isPublic(request)) {
    return NextResponse.next();
  }

  let clearStaleJwtCookie = false;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = getJwtSecret();
  if (token && secret) {
    try {
      const { payload } = await jwtVerify(token, secret);
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", payload.sub as string);
      requestHeaders.set("x-user-role", payload.role as string);
      requestHeaders.set("x-user-email", payload.email as string);
      if (payload.orgId) {
        requestHeaders.set("x-user-org-id", payload.orgId as string);
      }
      const adminOrgRole = String(
        (payload as { adminOrgRole?: string }).adminOrgRole ?? "ADMIN"
      ).toUpperCase();
      requestHeaders.set("x-user-admin-org-role", adminOrgRole);

      const mentorBlock = applyMentorRestrictions(
        pathname,
        request.method,
        payload.role as string,
        adminOrgRole,
        request.url
      );
      if (mentorBlock) {
        return mentorBlock;
      }

      return NextResponse.next({ request: { headers: requestHeaders } });
    } catch {
      clearStaleJwtCookie = true;
    }
  }

  const { userId, sessionClaims } = await auth();
  if (userId) {
    try {
      const claimsMeta = sessionClaims as Record<string, unknown> | undefined;
      let hrms = readHrmsFromPublicMetadata(
        (claimsMeta?.metadata as Record<string, unknown> | undefined) ??
          (claimsMeta?.publicMetadata as Record<string, unknown> | undefined)
      );

      if (!hrms) {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        hrms = readHrmsFromPublicMetadata(
          user.publicMetadata as Record<string, unknown>
        );
      }

      if (hrms) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-user-id", hrms.userId);
        requestHeaders.set("x-user-role", hrms.role);
        requestHeaders.set("x-user-email", hrms.email);
        if (hrms.orgId) {
          requestHeaders.set("x-user-org-id", hrms.orgId);
        }
        const adminOrgRole =
          hrms.role === "admin"
            ? normalizeOrgAdminRole(hrms.adminOrgRole).toUpperCase()
            : "ADMIN";
        requestHeaders.set("x-user-admin-org-role", adminOrgRole);

        const mentorBlock = applyMentorRestrictions(
          pathname,
          request.method,
          hrms.role,
          adminOrgRole,
          request.url
        );
        if (mentorBlock) {
          return mentorBlock;
        }

        const res = NextResponse.next({ request: { headers: requestHeaders } });
        if (clearStaleJwtCookie) {
          res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
        }
        return res;
      }

      if (pathname.startsWith("/api/")) {
        const res = NextResponse.json(
          {
            error: "Complete HRMS setup",
            code: "HRMS_CLERK_INCOMPLETE",
          },
          { status: 403 }
        );
        if (clearStaleJwtCookie) {
          res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
        }
        return res;
      }

      const complete = new URL("/auth/complete-clerk", request.url);
      complete.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(complete);
      if (clearStaleJwtCookie) {
        res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
      }
      return res;
    } catch (err) {
      console.error("Clerk middleware getUser failed:", err);
    }
  }

  if (pathname.startsWith("/api/")) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (clearStaleJwtCookie) {
      res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
    }
    return res;
  }

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("redirect", pathname);
  const res = NextResponse.redirect(signInUrl);
  if (clearStaleJwtCookie) {
    res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  }
  return res;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
