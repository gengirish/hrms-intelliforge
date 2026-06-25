import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashPassword, signJWT, setAuthCookie } from "@/lib/auth";
import { ORG_ADMIN_ROLE } from "@/lib/org-admin-roles";
import { serverError } from "@/lib/api-utils";
import { z } from "zod";

const createOrgSchema = z.object({
  orgName: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminName: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().min(2).max(100).optional()
  ),
});

const updateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
  whatsappPhoneId: z.string().optional().nullable(),
  whatsappToken: z.string().optional().nullable(),
  agentmailInboxId: z.string().optional().nullable(),
  agentmailEmail: z.string().email().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createOrgSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { orgName, slug, adminEmail, adminPassword, adminName } = parsed.data;

    const existingSlug = await prisma.organization.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json({ error: "This slug is already taken" }, { status: 409 });
    }

    const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
    if (existingAdmin) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(adminPassword);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName, slug },
      });

      const admin = await tx.admin.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: adminName ?? orgName,
          orgId: org.id,
          emailVerified: true,
        },
      });

      return { org, admin };
    });

    const token = await signJWT({
      userId: result.admin.id,
      role: "admin",
      email: result.admin.email,
      orgId: result.org.id,
      adminOrgRole: ORG_ADMIN_ROLE.ADMIN,
    });

    const response = NextResponse.json({
      org: { id: result.org.id, name: result.org.name, slug: result.org.slug },
      user: { id: result.admin.id, email: result.admin.email, role: "admin" },
    });
    setAuthCookie(response, token);
    return response;
  } catch (err) {
    return serverError(err, "Create org error");
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin" || !session.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        logoUrl: true,
        plan: true,
        maxInterns: true,
        whatsappPhoneId: true,
        agentmailEmail: true,
        createdAt: true,
        _count: { select: { interns: true, admins: true } },
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({ org });
  } catch (err) {
    return serverError(err, "Get org error");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin" || !session.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateOrgSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) data[key] = value;
    }

    const org = await prisma.organization.update({
      where: { id: session.orgId },
      data,
    });

    return NextResponse.json({ org });
  } catch (err) {
    return serverError(err, "Update org error");
  }
}
