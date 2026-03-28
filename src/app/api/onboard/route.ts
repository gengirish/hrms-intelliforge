import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { createInternInbox } from "@/lib/agentmail";
async function uploadFile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  file: File,
  folder: string,
  email: string
): Promise<string | null> {
  try {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${email.replace(/[@.]/g, "_")}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabase.storage
      .from("hrms-docs")
      .upload(path, buffer, { contentType: file.type });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("hrms-docs")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const college = formData.get("college") as string;
    const branch = formData.get("branch") as string;
    const year = formData.get("year") as string;
    const role = formData.get("role") as string;
    const startDate = formData.get("startDate") as string;
    const durationWeeks = parseInt(formData.get("durationWeeks") as string, 10);

    if (!name || !email || !phone || !college || !branch || !year || !role || !startDate || !durationWeeks) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const existing = await prisma.intern.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    let aadharUrl: string | null = null;
    let panUrl: string | null = null;
    let photoUrl: string | null = null;

    const supabase = createSupabaseAdmin();
    const aadharFile = formData.get("aadhar") as File | null;
    const panFile = formData.get("pan") as File | null;
    const photoFile = formData.get("photo") as File | null;

    if (aadharFile && aadharFile.size > 0) {
      aadharUrl = await uploadFile(supabase, aadharFile, "aadhar", email);
    }
    if (panFile && panFile.size > 0) {
      panUrl = await uploadFile(supabase, panFile, "pan", email);
    }
    if (photoFile && photoFile.size > 0) {
      photoUrl = await uploadFile(supabase, photoFile, "photos", email);
    }

    const intern = await prisma.intern.create({
      data: {
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
      const inbox = await createInternInbox(name, intern.id);
      await prisma.intern.update({
        where: { id: intern.id },
        data: {
          agentmailInboxId: inbox.inboxId,
          agentmailAddress: inbox.address,
        },
      });
    } catch (err) {
      console.error("AgentMail inbox creation failed:", err);
    }

    return NextResponse.json({ id: intern.id, status: "PENDING" });
  } catch (err) {
    console.error("Onboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
