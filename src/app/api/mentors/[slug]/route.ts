import { NextRequest, NextResponse } from "next/server";
import { getPublicMentor } from "@/lib/public-listings";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const mentor = await getPublicMentor(slug);
    if (!mentor) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }
    return NextResponse.json({ mentor });
  } catch (err) {
    console.error("Public mentor detail GET error:", err);
    return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
  }
}
