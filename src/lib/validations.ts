import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  name: z.string().min(1).max(200),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const magicLinkSchema = z.object({
  email: z.string().email(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export const actionSchema = z.object({
  internId: z.string().min(1),
  action: z.enum(["update_stipend", "send_offer", "send_reminder", "mark_complete", "deactivate", "reactivate"]),
  stipendPaise: z.number().int().min(0).max(10000000).optional(),
});

export const attendanceSchema = z.object({
  type: z.enum(["in", "out"]),
  mode: z.enum(["WFH", "Office"]).optional().default("WFH"),
});

export const taskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(2000),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  hours: z.coerce.number().min(0.5).max(40),
  week: z.string().optional(),
});

export const onboardSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  college: z.string().min(1).max(300),
  branch: z.string().min(1).max(200),
  year: z.enum(["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduated"]),
  role: z.enum(["AI Intern", "Dev Intern", "Research Intern"]),
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  durationWeeks: z.coerce.number().int().min(4).max(52),
  whatsappOptIn: z.coerce.boolean().default(false),
});
