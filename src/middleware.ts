import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "hrms-session";

const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/sign-up",
  "/reset-password",
  "/create-org",
  "/accept-admin-invite",
  "/pricing",
  "/about",
];

const PUBLIC_PATH_PREFIXES = ["/careers", "/internships", "/mentors"];

const INTERN_PORTAL_PREFIXES = [
  "/intern-onboarding",
  "/attendance",
  "/tasks",
  "/weekly-progress",
  "/offer",
  "/daily-plan",
];

const PROTECTED_PAGE_PREFIXES = ["/dashboard", ...INTERN_PORTAL_PREFIXES];

const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/webhooks/",
  "/api/cron/",
  "/api/careers",
  "/api/internships",
  "/api/mentors",
  "/api/orgs/",
  "/api/org/admins/invite/",
];

function isPublicRoute(pathname: string, method?: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  if (pathname === "/api/org" && method === "POST") return true;
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function requiresAuthPage(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function redirectToSignIn(request: NextRequest, pathname: string) {
  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(signInUrl);
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname, request.method)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (requiresAuthPage(pathname)) {
      return redirectToSignIn(request, pathname);
    }
    return NextResponse.next();
  }

  const secret = getJwtSecret();
  if (!secret) {
    console.error("JWT_SECRET not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

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

    if (payload.role === "admin" && adminOrgRole === "MENTOR") {
      if (
        pathname.startsWith("/dashboard/settings") ||
        pathname.startsWith("/dashboard/hiring") ||
        pathname.startsWith("/dashboard/mentor-applications")
      ) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      if (pathname.startsWith("/api/billing") || pathname.startsWith("/api/jobs")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (pathname === "/api/org" && request.method === "PUT") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const teamMemberPatch =
        request.method === "PATCH" &&
        /^\/api\/org\/admins\/(?!promote-intern)[^/]+\/?$/.test(pathname);
      const isOrgAdminsMutation =
        (pathname === "/api/org/admins" && request.method === "POST") ||
        (pathname === "/api/org/admins/direct" && request.method === "POST") ||
        teamMemberPatch ||
        (pathname === "/api/org/admins/promote-intern" && request.method === "POST");
      if (isOrgAdminsMutation) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(signInUrl);
    response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
