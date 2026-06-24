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

export const actionSchema = z
  .object({
    internId: z.string().min(1),
    action: z.enum([
      "update_stipend",
      "send_offer",
      "approve_offer",
      "send_reminder",
      "mark_complete",
      "deactivate",
      "reactivate",
      "set_mentor",
    ]),
    stipendPaise: z.number().int().min(0).max(10000000).optional(),
    /** Required when action is `set_mentor`: mentor admin id, or `null` to clear. */
    mentorId: z.union([z.string().min(1), z.null()]).optional(),
  })
  .refine(
    (d) => d.action !== "set_mentor" || d.mentorId !== undefined,
    { message: "mentorId is required for set_mentor (use null to unassign)", path: ["mentorId"] }
  );

export const attendanceSchema = z.object({
  type: z.enum(["in", "out", "status"]),
  mode: z.enum(["WFH", "Office"]).optional().default("WFH"),
  dailyStatus: z.string().max(500).optional(),
});

export const taskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(2000),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  hours: z.coerce.number().min(0.5).max(40),
  week: z.string().optional(),
});

export const onboardSchema = z.object({
  phone: z.string().min(10).max(15),
  college: z.string().min(1).max(300),
  branch: z.string().min(1).max(200),
  year: z.enum(["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduated"]),
  role: z.enum(["AI Intern", "Dev Intern", "Research Intern"]),
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  durationWeeks: z.coerce.number().int().min(4).max(52),
  whatsappOptIn: z.coerce.boolean().default(false),
});

export const dailyPlanItemSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(1000).optional().default(""),
});

export const dailyPlanItemUpdateSchema = z.object({
  itemId: z.string().min(1),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
});

export const dailyPlanActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    title: z.string().min(1).max(300),
    description: z.string().max(1000).optional().default(""),
  }),
  z.object({
    action: z.literal("update"),
    itemId: z.string().min(1),
    title: z.string().min(1).max(300).optional(),
    description: z.string().max(1000).optional(),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  }),
  z.object({
    action: z.literal("delete"),
    itemId: z.string().min(1),
  }),
  z.object({
    action: z.literal("submit"),
  }),
]);

export const weeklyProgressBodySchema = z.object({
  accomplishments: z.string().max(8000),
  learningOutcomes: z.string().max(8000),
  challenges: z.string().max(8000),
});

export const weeklyProgressUpsertSchema = weeklyProgressBodySchema.extend({
  weekKey: z.string().min(4).max(16).optional(),
});

export const weeklyProgressFeedbackSchema = z.object({
  mentorFeedback: z.string().min(1).max(8000),
});

/** Submit requires each body field to be at least 10 characters after trim. */
export const weeklyProgressSubmitSchema = weeklyProgressBodySchema.refine(
  (data) =>
    data.accomplishments.trim().length >= 10 &&
    data.learningOutcomes.trim().length >= 10 &&
    data.challenges.trim().length >= 10,
  { message: "Each field must be at least 10 characters after trimming" }
);
