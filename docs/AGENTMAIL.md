# AgentMail — IntelliForge HRMS

This document describes how **IntelliForge HRMS** uses [AgentMail](https://www.agentmail.to/) and how to connect an AgentMail inbox from **desktop or mobile email clients** using standard protocols.

**Official references** (source of truth for protocol details and changes):

- [AgentMail documentation](https://docs.agentmail.to/)
- [IMAP & SMTP](https://docs.agentmail.to/imap-smtp)
- [AgentMail Console](https://console.agentmail.to/)

---

## How HRMS uses AgentMail

| Item | Value |
|------|--------|
| Integration | TypeScript SDK (`agentmail` package) |
| Email transport | [`src/lib/agentmail.ts`](../src/lib/agentmail.ts) |
| Orchestrator | [`src/lib/notifications.ts`](../src/lib/notifications.ts) — routes to email + WhatsApp |
| Shared inbox | `hr@intelliforge.tech` (created automatically if missing, `clientId: hrms-hr-inbox`) |
| Environment | `AGENTMAIL_API_KEY` (see [`.env.example`](../.env.example)) |
| Outbound | All sends go through the **API** (no SMTP relay in this app) |
| Inbound / replies | Webhook — register URL below in the console for this inbox |

### Unified Notification Orchestrator

All notification call sites (onboard, dashboard actions, cron jobs) now go through `notify()` in `src/lib/notifications.ts` instead of calling AgentMail functions directly. The orchestrator:

1. Sends the email via AgentMail (`src/lib/agentmail.ts`)
2. Sends a WhatsApp template if the intern opted in (`src/lib/whatsapp.ts`)
3. Logs both to the `NotificationLog` database table with delivery status tracking

The AgentMail functions (`sendWelcomeEmail`, `sendOfferLetter`, etc.) are still the email transport layer — they are called by the orchestrator, not by API routes directly.

**Webhook URL** (production):

```text
https://hrms.intelliforge.tech/api/webhooks/agentmail
```

Incoming `message.received` events are used to match **offer acceptance** replies (sender email + body). See [README.md](../README.md#communication-system).

---

## Optional: read/send mail from a phone or desktop client

AgentMail supports **SMTP** for sending and documents **IMAP** for reading in traditional clients. Check the [official IMAP & SMTP page](https://docs.agentmail.to/imap-smtp) for the latest status: as of that doc, **IMAP may still be rolling out**; if your client cannot connect, use the API/console until IMAP is enabled for your account.

### Credentials (from AgentMail Console)

1. **Username (IMAP/SMTP):** your full inbox address (e.g. `hr@intelliforge.tech`).
2. **Password:** your **API key** (same as `AGENTMAIL_API_KEY`). Treat it like a secret; anyone with it can use your AgentMail account.

### IMAP (incoming — sync inbox in the mail app)

SSL/TLS is **required**.

| Setting | Value |
|--------|--------|
| Host | `imap.agentmail.to` |
| Port | `993` |
| Encryption | SSL/TLS |
| Username | Full inbox email |
| Password | API key |

**Limitation (per AgentMail):** often only the **INBOX** folder is exposed over IMAP; other folders may require the API.

### SMTP (outgoing)

SSL/TLS is **required**. The **From** address must match your inbox address or delivery may fail.

| Setting | Value |
|--------|--------|
| Host | `smtp.agentmail.to` |
| Port | `465` |
| Encryption | SSL/TLS |
| Username | Full inbox email |
| Password | API key |

If authentication fails, re-check the [official IMAP & SMTP](https://docs.agentmail.to/imap-smtp) page for any updated username rules.

---

## Android

Typical flow:

1. Open your mail app (**Gmail** → Settings → Add account → **Other** / **Personal (IMAP)**; or **Samsung Email**, **Outlook**, **FairEmail**, **K-9 Mail**, etc.).
2. Choose **Manual setup** or **IMAP** when offered.
3. Enter the **IMAP** settings above, then the **SMTP** settings.
4. Ensure **SSL/TLS** is on for both incoming and outgoing.

Many apps require **both** IMAP and SMTP to add a full account; SMTP alone is usually not enough for a normal inbox experience.

---

## iOS (iPhone / iPad)

1. **Settings** → **Mail** → **Accounts** → **Add Account** → **Other** → **Add Mail Account**.
2. Enter name, **email** (inbox address), **password** (API key), description → **Next**.
3. Choose **IMAP** and enter server hostnames: incoming `imap.agentmail.to`, outgoing `smtp.agentmail.to`; use the same username (full email) and password (API key); enable SSL.

---

## Security notes

- The mail client stores or handles your **API key**. Use only trusted devices and apps; **rotate the key** in the console if a device is lost or the account is removed from the phone.
- For HRMS automation, prefer the **SDK/API** in the app over sharing keys across many clients.

---

## Related docs

- [README — Communication system](../README.md#communication-system)
- [WhatsApp Business setup](./whatsapp-business-setup-guide.md)
- [Beta testing — email scenarios](./BETA_TESTING_PLAN.md#77-email-automation-agentmail)
