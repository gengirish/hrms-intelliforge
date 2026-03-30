import {
  NotificationChannel,
  NotificationStatus,
  NotificationType as DbNotificationType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  sendWelcomeEmail,
  sendOfferLetter,
  sendTaskReminder,
  sendAttendanceNudge,
  sendCompletionEmail,
} from "@/lib/agentmail";
import { sendWhatsAppTemplate, formatPhoneE164 } from "@/lib/whatsapp";
import { formatINR } from "@/lib/utils";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://hrms.intelliforge.tech")
  .trim()
  .replace(/<[^>]*>/g, "");

export type NotificationType =
  | "WELCOME"
  | "OFFER_LETTER"
  | "OFFER_ACCEPTED"
  | "TASK_REMINDER"
  | "ATTENDANCE_NUDGE"
  | "COMPLETION_CERT"
  | "CUSTOM";

export interface NotificationData {
  stipendPaise?: number;
  startDate?: string;
  pdfBase64?: string;
  subject?: string;
  body?: string;
}

function logFieldsForType(
  type: DbNotificationType,
  intern: { name: string; role: string; email: string },
  data: NotificationData,
  appUrl: string
): { subject?: string; body: string } {
  switch (type) {
    case DbNotificationType.WELCOME:
      return {
        subject: `Welcome, ${intern.name}`,
        body: `Welcome notification for ${intern.name} (${intern.role}) at ${intern.email}`,
      };
    case DbNotificationType.OFFER_LETTER:
      return {
        subject: `Offer letter — ${intern.name}`,
        body: `Offer letter: ${intern.name}, ${intern.role}, stipend ${data.stipendPaise != null ? formatINR(data.stipendPaise) : "—"}, start ${data.startDate ?? "—"}`,
      };
    case DbNotificationType.TASK_REMINDER:
      return {
        subject: `Task reminder — ${intern.name}`,
        body: `Task reminder for ${intern.name}; tasks URL: ${appUrl}/tasks`,
      };
    case DbNotificationType.ATTENDANCE_NUDGE:
      return {
        subject: `Attendance nudge — ${intern.name}`,
        body: `Attendance nudge for ${intern.name}; attendance URL: ${appUrl}/attendance`,
      };
    case DbNotificationType.COMPLETION_CERT:
      return {
        subject: `Completion certificate — ${intern.name}`,
        body: `Completion certificate sent for ${intern.name}${data.pdfBase64 ? " (PDF attached in email)" : ""}`,
      };
    case DbNotificationType.OFFER_ACCEPTED:
      return {
        subject: `Offer accepted — ${intern.name}`,
        body: `Offer accepted notification for ${intern.name}; start ${data.startDate ?? "—"}`,
      };
    case DbNotificationType.CUSTOM:
    default:
      return {
        subject: data.subject,
        body: data.body ?? "",
      };
  }
}

function toDbType(t: NotificationType): DbNotificationType {
  return t as unknown as DbNotificationType;
}

export interface NotifyResult {
  emailSent: boolean;
  emailError?: string;
}

export async function notify(
  internId: string,
  type: NotificationType,
  data: NotificationData = {}
): Promise<NotifyResult> {
  const prismaType = toDbType(type);
  const intern = await prisma.intern.findUnique({
    where: { id: internId },
    include: { notificationPref: true },
  });
  if (!intern) throw new Error(`Intern ${internId} not found`);

  const prefs = intern.notificationPref ?? { email: true, whatsapp: true };
  const { subject: logSubject, body: logBody } = logFieldsForType(
    prismaType,
    intern,
    data,
    APP_URL
  );

  let emailSent = false;
  let emailError: string | undefined;

  if (prefs.email) {
    if (type === "CUSTOM") {
      await prisma.notificationLog.create({
        data: {
          internId,
          channel: NotificationChannel.EMAIL,
          type: prismaType,
          subject: data.subject ?? logSubject,
          body: logBody || "(custom)",
          status: NotificationStatus.PENDING,
        },
      });
      emailSent = true;
    } else if (type !== "OFFER_ACCEPTED") {
      try {
        switch (type) {
          case "WELCOME":
            await sendWelcomeEmail(intern.email, intern.name, intern.role);
            break;
          case "OFFER_LETTER":
            await sendOfferLetter({
              internEmail: intern.email,
              internName: intern.name,
              role: intern.role,
              stipendPaise: data.stipendPaise!,
              startDate: data.startDate!,
              pdfBase64: data.pdfBase64!,
            });
            break;
          case "TASK_REMINDER":
            await sendTaskReminder(intern.email, intern.name);
            break;
          case "ATTENDANCE_NUDGE":
            await sendAttendanceNudge(intern.email, intern.name);
            break;
          case "COMPLETION_CERT":
            await sendCompletionEmail(
              intern.email,
              intern.name,
              data.pdfBase64!
            );
            break;
          default:
            break;
        }
        await prisma.notificationLog.create({
          data: {
            internId,
            channel: NotificationChannel.EMAIL,
            type: prismaType,
            subject: logSubject,
            body: logBody,
            status: NotificationStatus.SENT,
            sentAt: new Date(),
          },
        });
        emailSent = true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        emailError = msg;
        await prisma.notificationLog.create({
          data: {
            internId,
            channel: NotificationChannel.EMAIL,
            type: prismaType,
            subject: logSubject,
            body: logBody,
            status: NotificationStatus.FAILED,
            errorDetail: msg,
          },
        });
      }
    }
  }

  if (
    prefs.whatsapp &&
    intern.whatsappOptIn &&
    intern.phone &&
    type !== "CUSTOM"
  ) {
    const phone = formatPhoneE164(intern.phone);
    let result: { success: boolean; messageId?: string; error?: string } = {
      success: false,
      error: "Unsupported WhatsApp type",
    };

    try {
      switch (type) {
        case "WELCOME":
          result = await sendWhatsAppTemplate(phone, "intern_welcome", "en", [
            intern.name,
            intern.role,
            APP_URL,
          ]);
          break;
        case "OFFER_LETTER":
          result = await sendWhatsAppTemplate(phone, "offer_letter", "en", [
            intern.name,
            intern.role,
            formatINR(data.stipendPaise!),
            data.startDate!,
          ]);
          break;
        case "TASK_REMINDER":
          result = await sendWhatsAppTemplate(phone, "task_reminder", "en", [
            intern.name,
            `${APP_URL}/tasks`,
          ]);
          break;
        case "ATTENDANCE_NUDGE":
          result = await sendWhatsAppTemplate(
            phone,
            "attendance_nudge",
            "en",
            [intern.name, `${APP_URL}/attendance`]
          );
          break;
        case "COMPLETION_CERT":
          result = await sendWhatsAppTemplate(
            phone,
            "completion_cert",
            "en",
            [intern.name]
          );
          break;
        case "OFFER_ACCEPTED":
          result = await sendWhatsAppTemplate(phone, "offer_accepted", "en", [
            intern.name,
            data.startDate!,
          ]);
          break;
        default:
          break;
      }

      if (result.success) {
        await prisma.notificationLog.create({
          data: {
            internId,
            channel: NotificationChannel.WHATSAPP,
            type: prismaType,
            subject: logSubject,
            body: logBody,
            status: NotificationStatus.SENT,
            sentAt: new Date(),
            externalId: result.messageId,
          },
        });
      } else {
        await prisma.notificationLog.create({
          data: {
            internId,
            channel: NotificationChannel.WHATSAPP,
            type: prismaType,
            subject: logSubject,
            body: logBody,
            status: NotificationStatus.FAILED,
            errorDetail: result.error ?? "Unknown WhatsApp error",
          },
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await prisma.notificationLog.create({
        data: {
          internId,
          channel: NotificationChannel.WHATSAPP,
          type: prismaType,
          subject: logSubject,
          body: logBody,
          status: NotificationStatus.FAILED,
          errorDetail: msg,
        },
      });
    }
  }

  return { emailSent, emailError };
}
