import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { errorResponse, serverError } from "@/lib/api-utils";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(req: NextRequest) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error("BLOB_READ_WRITE_TOKEN is not configured");
      return errorResponse("File storage is not configured", 503);
    }

    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse("Only PDF and Word documents are accepted", 400);
    }

    if (file.size > MAX_SIZE) {
      return errorResponse("File must be under 5 MB", 400);
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const pathname = `resumes/${timestamp}-${safeName}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      token,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    return serverError(err, "Resume upload error");
  }
}
