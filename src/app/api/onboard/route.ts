import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { sendWelcomeEmail } from "@/lib/agentmail";
import { onboardSchema } from "@/lib/validations";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" exceeds 5MB limit`;
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `File "${file.name}" has unsupported type. Allowed: JPEG, PNG, WebP, PDF`;
  }
  return null;
}

async function uploadFile(
  file: File,
  folder: string,
  email: string
): Promise<string | null> {
  try {
    const ext = file.name.split(".").pop();
    const pathname = `hrms-docs/${folder}/${email.replace(/[@.]/g, "_")}_${Date.now()}.${ext}`;
    const blob = await put(pathname, file, { access: "public" });
    return blob.url;
  } catch (err) {
    console.error("Upload error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 5)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingClerk = await prisma.intern.findUnique({
      where: { clerkId: userId },
    });
    if (existingClerk) {
      return NextResponse.json({ error: "Already onboarded" }, { status: 409 });
    }

    const formData = await req.formData();

    const parsed = onboardSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      college: formData.get("college"),
      branch: formData.get("branch"),
      year: formData.get("year"),
      role: formData.get("role"),
      startDate: formData.get("startDate"),
      durationWeeks: formData.get("durationWeeks"),
    });

    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const {
      name,
      email,
      phone,
      college,
      branch,
      year,
      role,
      startDate,
      durationWeeks,
    } = parsed.data;

    const existingEmail = await prisma.intern.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    let aadharUrl: string | null = null;
    let panUrl: string | null = null;
    let photoUrl: string | null = null;

    const aadharFile = formData.get("aadhar") as File | null;
    const panFile = formData.get("pan") as File | null;
    const photoFile = formData.get("photo") as File | null;

    if (aadharFile && aadharFile.size > 0) {
      const err = validateFile(aadharFile);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      aadharUrl = await uploadFile(aadharFile, "aadhar", email);
    }
    if (panFile && panFile.size > 0) {
      const err = validateFile(panFile);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      panUrl = await uploadFile(panFile, "pan", email);
    }
    if (photoFile && photoFile.size > 0) {
      const err = validateFile(photoFile);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      photoUrl = await uploadFile(photoFile, "photos", email);
    }

    const intern = await prisma.intern.create({
      data: {
        clerkId: userId,
        name,
        email,
        phone,
        college,
        branch,
        year,
        role,
        startDate: new Date(startDate),
        durationWeeks,
        aadharUrl,
        panUrl,
        photoUrl,
        status: "PENDING",
      },
    });

    try {
      await sendWelcomeEmail(email, name, role);
    } catch (err) {
      console.error("Welcome email failed:", err);
    }

    return NextResponse.json({ id: intern.id, status: "PENDING" });
  } catch (err) {
    console.error("Onboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
