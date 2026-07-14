import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { isFullOrgAdminRole } from "@/lib/org-admin-roles";

async function getDirectoryStatus(orgId: string) {
  const [total, publicCount] = await Promise.all([
    prisma.mentorProfile.count({ where: { orgId } }),
    prisma.mentorProfile.count({ where: { orgId, isPublic: true } }),
  ]);
  return {
    total,
    publicCount,
    hiddenCount: total - publicCount,
  };
}

/** Org admin: mentor directory visibility counts for this workspace. */
export async function GET() {
  try {
    const admin = await getAuthAdmin();
    if (!admin?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isFullOrgAdminRole(admin.role)) {
      return NextResponse.json(
        { error: "Only organization admins can manage the mentor directory." },
        { status: 403 }
      );
    }

    const status = await getDirectoryStatus(admin.orgId);
    return NextResponse.json(status);
  } catch (err) {
    return serverError(err, "Mentor directory status GET");
  }
}

/** Org admin: publish every mentor profile in this workspace to /mentors. */
export async function POST() {
  try {
    const admin = await getAuthAdmin();
    if (!admin?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isFullOrgAdminRole(admin.role)) {
      return NextResponse.json(
        { error: "Only organization admins can publish mentors." },
        { status: 403 }
      );
    }

    const result = await prisma.mentorProfile.updateMany({
      where: { orgId: admin.orgId, isPublic: false },
      data: { isPublic: true },
    });

    const status = await getDirectoryStatus(admin.orgId);
    return NextResponse.json({
      updated: result.count,
      ...status,
    });
  } catch (err) {
    return serverError(err, "Mentor publish-all POST");
  }
}
