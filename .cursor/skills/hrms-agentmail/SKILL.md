---
name: hrms-agentmail
description: AgentMail email in IntelliForge HRMS — the shared hr@intelliforge.tech inbox, send helpers in src/lib/agentmail.ts, notify() vs direct sends, the inbound webhook for offer-acceptance replies, and delivery pitfalls. Use when adding or debugging an email, an HR/admin alert, the AgentMail webhook, or "email not received" reports.
---

# AgentMail in IntelliForge HRMS

All app email goes through the AgentMail API (TypeScript SDK `agentmail`). There is no SMTP relay in the app.

## Setup

| Item | Value |
|---|---|
| Client + send helpers | `src/lib/agentmail.ts` (`agentmail` client, `getHRInboxId()`) |
| Auth emails (verify, reset, magic link, invites) | `src/lib/auth-email.ts` |
| Sending inbox | `hr@intelliforge.tech`, pre-created in the [AgentMail console](https://console.agentmail.to); set as `AGENTMAIL_HR_INBOX_ID` (trimmed; watch for trailing `\r\n` in Vercel) |
| Env | `AGENTMAIL_API_KEY`, `AGENTMAIL_HR_INBOX_ID`, `HR_ALERT_EMAILS`, `WEBHOOK_SECRET` |
| Inbound webhook | `POST /api/webhooks/agentmail` |
| Per-org fields | `Organization.agentmailInboxId` / `agentmailEmail` can be saved via `PUT /api/org`, but no send path reads them yet — every email uses the env inbox |

The app never creates inboxes at runtime.

## Delivery pitfall: never mail the HR inbox from itself

The `intelliforge.tech` MX record points at AgentMail (`inbound-smtp.us-east-1.amazonaws.com`), so `hr@intelliforge.tech` exists only inside AgentMail. A message sent from that inbox to `hr@intelliforge.tech` is logged with the `sent` label and is never delivered anywhere a person reads.

- Send HR/admin alerts to `getHRAlertRecipients()` (`HR_ALERT_EMAILS`, comma-separated; defaults to `gen.girish@gmail.com`).
- `sendNewApplicationAlert()` does this. **`sendNewMentorApplicationAlert()` still sends to `hr@intelliforge.tech`, so those alerts are not seen** — switch it to `getHRAlertRecipients()` when touching that code.

## Which path to use

| Recipient / purpose | Path |
|---|---|
| Intern lifecycle notifications (onboarding, offer, reminders, nudges, completion, course enrolled) | `notify(internId, type, data)` in `src/lib/notifications.ts` — fans out to email + WhatsApp, respects opt-in, writes `NotificationLog`. Routes and crons must not call these email helpers directly. |
| Candidates (application received, HR alert, contact candidate) | Direct helpers from the route: `sendApplicationReceivedEmail`, `sendNewApplicationAlert`; `jobs/[id]/candidates/[candidateId]/contact` uses the `agentmail` client |
| Mentor applications | `sendMentorApplicationReceived`, `sendNewMentorApplicationAlert`, `sendMentorApplicationDeclined` |
| Weekly progress (mentor ↔ intern) | `sendWeeklyProgressSubmittedToMentor`, `sendWeeklyProgressFeedbackToIntern` |
| Auth | `src/lib/auth-email.ts` |

## Writing a send helper

```ts
export async function sendSomethingEmail({ to, name }: { to: string; name: string }) {
  const inboxId = await getHRInboxId();
  await agentmail.inboxes.messages.send(inboxId, {
    to,                                   // string or string[]; cc/bcc also supported
    subject: `Something for ${name}`,
    html: `<p>Hi ${escapeHtml(name)},</p>`, // always escapeHtml() user-supplied values
  });
}
```

- Escape every interpolated user value with `escapeHtml()` (`src/lib/html-escape.ts`).
- Link back with `APP_URL` (from `NEXT_PUBLIC_APP_URL`, default `https://hrms.intelliforge.tech`).
- **Await sends in route handlers.** A fire-and-forget promise can be frozen when a Vercel function returns, delaying or dropping the email. Use `Promise.allSettled` so an email failure is logged with `console.error` without failing the request. (The mentor-application route still fires unawaited.)

## Inbound webhook

`POST /api/webhooks/agentmail`:

1. Requires `WEBHOOK_SECRET` (503 if unset) and a matching `x-webhook-secret` header (401 otherwise).
2. Dedupes with `claimWebhookEvent("agentmail", event_id)`; on failure `releaseWebhookEvent()` and 5xx so AgentMail retries.
3. For `message.received`, matches the sender email to an intern and, if `isAcceptanceReply()` passes (negations like "I don't accept" and quoted offer text are ignored), calls `acceptOffer({ internId, source: "EMAIL" })` from `src/lib/offer-acceptance.ts`.

Register `https://hrms.intelliforge.tech/api/webhooks/agentmail` for the HR inbox in the AgentMail console. Keep email and WhatsApp acceptance in sync by changing rules only in `offer-acceptance.ts`.

## Debugging "email not received"

1. Check Vercel runtime logs for `email failed` errors around the request time.
2. List what the inbox actually sent:
   ```js
   const r = await agentmail.inboxes.messages.list(process.env.AGENTMAIL_HR_INBOX_ID.trim(), { limit: 15 });
   r.messages.forEach((m) => console.log(m.timestamp, m.labels, m.to, m.subject));
   ```
   Run with `node --env-file=.env <script>.cjs`.
3. `sent` with `to: hr@intelliforge.tech` means the self-send pitfall above. `sent` to a real address means check that mailbox's spam folder. No message at all means the send never ran — look for an unawaited send or a thrown error.

## Reading the inbox from a mail client

IMAP `imap.agentmail.to:993` and SMTP `smtp.agentmail.to:465`, both SSL; username is the full inbox address, password is the API key. Step-by-step Android/iOS setup: `docs/AGENTMAIL.md`.
