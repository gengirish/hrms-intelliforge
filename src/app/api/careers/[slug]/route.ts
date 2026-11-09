import { NextRequest, NextResponse } from "next/server";
import { getPublicJob } from "@/lib/public-listings";
import { serverError } from "@/lib/api-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const job = await getPublicJob(slug);

    if (!job) {
      return NextResponse.json({ error: "Job posting not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (err) {
    return serverError(err, "Public careers detail GET error");
  }
}
