import { AgentMailClient } from "agentmail";
import { escapeHtml } from "@/lib/html-escape";

if (!process.env.AGENTMAIL_API_KEY) {
  console.warn("AGENTMAIL_API_KEY is not set — email features will fail");
}

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://hrms.intelliforge.tech")
  .trim()
  .replace(/<[^>]*>/g, "");

export const agentmail = new AgentMailClient({
  apiKey: process.env.AGENTMAIL_API_KEY!,
});

const HR_INBOX_ID = process.env.AGENTMAIL_HR_INBOX_ID?.trim();

if (!HR_INBOX_ID) {
  console.warn(
    "AGENTMAIL_HR_INBOX_ID is not set — set it to the hr@intelliforge.tech inbox ID from the AgentMail console"
  );
}

async function getHRInboxId(): Promise<string> {
  if (HR_INBOX_ID) return HR_INBOX_ID;
  throw new Error(
    "AGENTMAIL_HR_INBOX_ID environment variable is required. Get the inbox ID from https://console.agentmail.to"
  );
}

export async function sendWelcomeEmail(
  internEmail: string,
  internName: string,
  role: string
) {
  const inboxId = await getHRInboxId();
  await agentmail.inboxes.messages.send(inboxId, {
    to: internEmail,
    subject: `Welcome to IntelliForge AI, ${internName}!`,
    html: `
      <h2>Hi ${escapeHtml(internName)},</h2>
      <p>Thank you for registering on the IntelliForge HRMS portal!</p>
      <p>Your onboarding application for <strong>${escapeHtml(role)}</strong> has been received and is under review.</p>
      <p>Here's what happens next:</p>
      <ol>
        <li>Our team will review your application</li>
        <li>You'll receive an <strong>offer letter</strong> at this email address</li>
        <li>Reply <strong>"I Accept"</strong> to confirm your internship</li>
      </ol>
      <p>In the meantime, you can explore the portal:</p>
      <ul>
        <li><a href="${APP_URL}/attendance">Attendance Tracker</a></li>
        <li><a href="${APP_URL}/tasks">Task Logger</a></li>
      </ul>
      <br/>
      <p>— IntelliForge AI HR Team</p>
    `,
  });
}

export async function sendOfferLetter({
  internEmail,
  internName,
  role,
  stipendPaise,
  startDate,
  pdfBase64,
}: {
  internEmail: string;
  internName: string;
  role: string;
  stipendPaise: number;
  startDate: string;
  pdfBase64: string;
}) {
  const inboxId = await getHRInboxId();
  const stipendINR = (stipendPaise / 100).toLocaleString("en-IN");
  await agentmail.inboxes.messages.send(inboxId, {
    to: internEmail,
    subject: `Your Internship Offer — IntelliForge AI`,
    html: `
      <h2>Welcome to IntelliForge AI, ${escapeHtml(internName)}!</h2>
      <p>Role: <strong>${escapeHtml(role)}</strong></p>
      <p>Stipend: <strong>₹${escapeHtml(stipendINR)}/month</strong></p>
      <p>Start Date: <strong>${startDate}</strong></p>
      <p>Please <strong>reply to this email with "I Accept"</strong>
         to confirm your internship.</p>
      <br/><p>— IntelliForge AI HR Team</p>
    `,
    attachments: [
      {
        filename: "IntelliForge_Offer_Letter.pdf",
        content: pdfBase64,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function sendTaskReminder(
  internEmail: string,
  internName: string
) {
  const inboxId = await getHRInboxId();
  const today = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
  await agentmail.inboxes.messages.send(inboxId, {
    to: internEmail,
    subject: `📋 Weekly Task Log Reminder — ${today}`,
    html: `
      <p>Hi ${escapeHtml(internName)},</p>
      <p>Friendly reminder to log this week's tasks:</p>
      <p><a href="${APP_URL}/tasks">
        → Submit Weekly Tasks
      </a></p>
      <p>— IntelliForge AI</p>
    `,
  });
}

export async function sendAttendanceNudge(
  internEmail: string,
  internName: string
) {
  const inboxId = await getHRInboxId();
  await agentmail.inboxes.messages.send(inboxId, {
    to: internEmail,
    subject: `⏰ Attendance Not Logged Yet — ${new Date().toLocaleDateString("en-IN")}`,
    html: `
      <p>Hi ${escapeHtml(internName)},</p>
      <p>You haven't punched in today. Please log your attendance:</p>
      <p><a href="${APP_URL}/attendance">
        → Log Attendance
      </a></p>
      <p>— IntelliForge AI</p>
    `,
  });
}

export async function sendCompletionEmail(
  internEmail: string,
  internName: string,
  pdfBase64: string
) {
  const inboxId = await getHRInboxId();
  await agentmail.inboxes.messages.send(inboxId, {
    to: internEmail,
    subject: `🎓 Internship Completion Certificate — IntelliForge AI`,
    html: `
      <h2>Congratulations, ${escapeHtml(internName)}!</h2>
      <p>Your internship at IntelliForge AI is now complete.</p>
      <p>Please find your certificate attached.</p>
      <p>We wish you all the best ahead!</p>
      <br/><p>— IntelliForge AI</p>
    `,
    attachments: [
      {
        filename: "IntelliForge_Completion_Certificate.pdf",
        content: pdfBase64,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function sendNewApplicationAlert({
  jobTitle,
  candidateName,
  candidateEmail,
  candidatePhone,
  githubUrl,
  portfolioUrl,
  coverNote,
}: {
  jobTitle: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  coverNote?: string | null;
}) {
  const inboxId = await getHRInboxId();
  const links = [
    githubUrl ? `<a href="${escapeHtml(githubUrl)}">GitHub</a>` : null,
    portfolioUrl ? `<a href="${escapeHtml(portfolioUrl)}">Portfolio</a>` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  await agentmail.inboxes.messages.send(inboxId, {
    to: "hr@intelliforge.tech",
    subject: `New Application: ${candidateName} — ${jobTitle}`,
    html: `
      <h2>New Application Received</h2>
      <p><strong>Role:</strong> ${escapeHtml(jobTitle)}</p>
      <hr/>
      <p><strong>Name:</strong> ${escapeHtml(candidateName)}</p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(candidateEmail)}">${escapeHtml(candidateEmail)}</a></p>
      ${candidatePhone ? `<p><strong>Phone:</strong> ${escapeHtml(candidatePhone)}</p>` : ""}
      ${links ? `<p><strong>Links:</strong> ${links}</p>` : ""}
      ${coverNote ? `<p><strong>Cover Note:</strong></p><blockquote>${escapeHtml(coverNote)}</blockquote>` : ""}
      <br/>
      <p><a href="${APP_URL}/dashboard/hiring">→ View in Hiring Dashboard</a></p>
      <p>— IntelliForge HRMS</p>
    `,
  });
}

export { getHRInboxId };
