import { NextResponse } from "next/server";
import { getAuthAdmin } from "@/lib/auth";
import { errorResponse, serverError } from "@/lib/api-utils";
import { getIntegrationsHealth } from "@/lib/integrations-health";

export async function GET() {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return errorResponse("Unauthorized", 401);
    }
    if (!admin.orgId) {
      return errorResponse(
        "Your admin account isn't attached to an organization. Contact support.",
        403
      );
    }

    const integrations = getIntegrationsHealth();
    const configuredCount = integrations.filter((i) => i.configured).length;

    return NextResponse.json({
      integrations,
      summary: {
        total: integrations.length,
        configured: configuredCount,
        missing: integrations.length - configuredCount,
      },
    });
  } catch (err: unknown) {
    return serverError(err, "Dashboard integrations health API error");
  }
}
