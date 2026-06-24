import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createOrgForClerkUser,
  syncClerkUserToHrms,
} from "@/lib/clerk-hrms-metadata";

const createOrgSchema = z.object({
  createOrg: z
    .object({
      orgName: z.string().min(2).max(100),
      slug: z
        .string()
        .min(2)
        .max(50)
        .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
      adminName: z.string().min(1).max(100).optional(),
    })
    .optional(),
});

/**
 * Links the signed-in Clerk user to Prisma and pushes HRMS claims to Clerk publicMetadata.
 * Optionally creates a new organization when `createOrg` is supplied (post /create-org flow).
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof createOrgSchema> = {};
  try {
    const json = await req.json();
    const parsed = createOrgSchema.safeParse(json);
    if (!parsed.success) {
      const msg =
        Object.values(parsed.error.flatten().fieldErrors).flat()[0] ||
        "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    // Empty body is fine — link-only sync.
  }

  if (body.createOrg) {
    try {
      const hrms = await createOrgForClerkUser(userId, body.createOrg);
      return NextResponse.json({ ok: true, hrms });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "SLUG_TAKEN") {
        return NextResponse.json({ error: "This slug is already taken" }, { status: 409 });
      }
      if (msg === "ADMIN_EXISTS") {
        return NextResponse.json(
          { error: "You already have a workspace account. Sign in instead." },
          { status: 409 }
        );
      }
      if (msg === "CLERK_NO_EMAIL") {
        return NextResponse.json(
          { error: "Clerk account has no verified email." },
          { status: 400 }
        );
      }
      console.error("createOrgForClerkUser failed:", e);
      return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
    }
  }

  const hrms = await syncClerkUserToHrms(userId);
  if (!hrms) {
    return NextResponse.json(
      {
        error:
          "No HRMS account matches this Clerk user yet. Use an invited email or complete org onboarding.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, hrms });
}
