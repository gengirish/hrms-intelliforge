import { AgentMailClient } from "agentmail";

export const agentmail = new AgentMailClient({
  apiKey: process.env.AGENTMAIL_API_KEY!,
});

let _hrInboxId: string | null = null;

async function getHRInboxId(): Promise<string> {
  if (_hrInboxId) return _hrInboxId;

  const inboxes = await agentmail.inboxes.list({ limit: 50 });
  const existing = inboxes.inboxes?.find(
    (ib: { email?: string; username?: string; domain?: string }) =>
      ib.email?.toLowerCase() === "hr@intelliforge.tech" ||
      (ib.username === "hr" && ib.domain === "intelliforge.tech")
  );
  if (existing) {
    _hrInboxId = existing.inboxId;
    return _hrInboxId;
  }

  const inbox = await agentmail.inboxes.create({
    username: "hr",
    domain: "intelliforge.tech",
    displayName: "IntelliForge AI — HR Team",
    clientId: "hrms-hr-inbox",
  });
  _hrInboxId = inbox.inboxId;
  return _hrInboxId;
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
      <h2>Hi ${internName},</h2>
      <p>Thank you for registering on the IntelliForge HRMS portal!</p>
      <p>Your onboarding application for <strong>${role}</strong> has been received and is under review.</p>
      <p>Here's what happens next:</p>
      <ol>
        <li>Our team will review your application</li>
        <li>You'll receive an <strong>offer letter</strong> at this email address</li>
        <li>Reply <strong>"I Accept"</strong> to confirm your internship</li>
      </ol>
      <p>In the meantime, you can explore the portal:</p>
      <ul>
        <li><a href="https://hrms.intelliforge.tech/attendance">Attendance Tracker</a></li>
        <li><a href="https://hrms.intelliforge.tech/tasks">Task Logger</a></li>
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
      <h2>Welcome to IntelliForge AI, ${internName}!</h2>
      <p>Role: <strong>${role}</strong></p>
      <p>Stipend: <strong>₹${stipendINR}/month</strong></p>
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
      <p>Hi ${internName},</p>
      <p>Friendly reminder to log this week's tasks:</p>
      <p><a href="https://hrms.intelliforge.tech/tasks">
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
      <p>Hi ${internName},</p>
      <p>You haven't punched in today. Please log your attendance:</p>
      <p><a href="https://hrms.intelliforge.tech/attendance">
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
      <h2>Congratulations, ${internName}!</h2>
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

export { getHRInboxId };
