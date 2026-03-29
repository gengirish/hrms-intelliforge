import { AgentMailClient } from "agentmail";

export const agentmail = new AgentMailClient({
  apiKey: process.env.AGENTMAIL_API_KEY!,
});

export async function createInternInbox(internName: string, internId: string) {
  const slug = internName.toLowerCase().replace(/\s+/g, ".");
  const shortId = internId.slice(-6);
  const username = `${slug}.${shortId}`;
  const inbox = await agentmail.inboxes.create({
    username,
    domain: "agentmail.to",
    displayName: `${internName} — IntelliForge Intern`,
    clientId: `intern-${internId}`,
  });
  return { inboxId: inbox.inboxId, address: inbox.email };
}

export async function sendOfferLetter({
  inboxId,
  internEmail,
  internName,
  role,
  stipendPaise,
  startDate,
  pdfBase64,
}: {
  inboxId: string;
  internEmail: string;
  internName: string;
  role: string;
  stipendPaise: number;
  startDate: string;
  pdfBase64: string;
}) {
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
  inboxId: string,
  internEmail: string,
  internName: string
) {
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
  inboxId: string,
  internEmail: string,
  internName: string
) {
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
  inboxId: string,
  internEmail: string,
  internName: string,
  pdfBase64: string
) {
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

export async function getInternMessages(inboxId: string) {
  const result = await agentmail.inboxes.messages.list(inboxId, { limit: 20 });
  return result.messages;
}
