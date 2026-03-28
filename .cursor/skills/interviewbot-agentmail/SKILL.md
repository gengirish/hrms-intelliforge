---
name: interviewbot-agentmail
description: Integrate AgentMail (agentmail.to) for AI-powered email in the Interview Bot. Use when sending interview invitations, completion notifications, candidate follow-ups, managing per-org inboxes, handling email replies via webhooks/websockets, or attaching reports. Based on the official AgentMail skill (skills.sh/agentmail-to/agentmail-skills/agentmail).
---

# AgentMail Integration for Interview Bot

AgentMail is an API-first email platform for AI agents. This skill covers the full SDK surface tailored to Interview Bot use cases: multi-tenant org inboxes, interview invitations, completion notifications, candidate reply handling, report attachments, and real-time events.

**Docs**: https://docs.agentmail.to
**Console**: https://console.agentmail.to
**Official Skill**: https://skills.sh/agentmail-to/agentmail-skills/agentmail
**Base URL**: `https://api.agentmail.to/v0/`

## Current State

Already implemented and deployed:
- `agentmail` SDK in `backend/pyproject.toml`
- `AGENTMAIL_API_KEY` and `AGENTMAIL_DEFAULT_DOMAIN` in `config.py`
- `agentmail_client.py` service with `create_org_inbox()`, `send_email()`, `list_inbox_messages()`
- `agentmail_inbox_id` / `agentmail_email` columns on `Organization` table
- `notifications.py` uses AgentMail API first, SMTP (`smtp.agentmail.to:465`) as fallback
- `POST /organizations/email/setup` and `GET /organizations/email/status` endpoints
- Settings > Email tab in frontend dashboard
- Custom domain: `intelliforge.tech` (from: `hire-with-giri@intelliforge.tech`)

## Environment Variables

```
AGENTMAIL_API_KEY=am_...                    # Required
AGENTMAIL_DEFAULT_DOMAIN=intelliforge.tech  # Custom domain
SMTP_HOST=smtp.agentmail.to                 # SMTP relay fallback
SMTP_PORT=465                               # SSL
SMTP_USER=hire-with-giri@intelliforge.tech
SMTP_PASSWORD=am_...                        # Same as API key
FROM_EMAIL=hire-with-giri@intelliforge.tech
```

## SDK Setup

```python
# Python
from agentmail import AgentMail
client = AgentMail(api_key="YOUR_API_KEY")
```

```typescript
// TypeScript
import { AgentMailClient } from "agentmail";
const client = new AgentMailClient({ apiKey: "YOUR_API_KEY" });
```

## Inboxes

Each organization gets a dedicated inbox via `create_org_inbox()`. Uses `client_id` for idempotent retries.

```python
# Create inbox with custom domain
inbox = client.inboxes.create(
    username="interviews-org123",
    domain="intelliforge.tech",
    display_name="Acme Corp Interviews",
    client_id="org-<uuid>",  # Idempotent - safe to retry
)

# List, get, delete
inboxes = client.inboxes.list()
inbox = client.inboxes.get(inbox_id="inbox@intelliforge.tech")
client.inboxes.delete(inbox_id="inbox@intelliforge.tech")
```

```typescript
const inbox = await client.inboxes.create({
  username: "interviews-org123",
  domain: "intelliforge.tech",
  displayName: "Acme Corp Interviews",
  clientId: "org-<uuid>",
});

const inboxes = await client.inboxes.list();
const fetched = await client.inboxes.get({ inboxId: "inbox@intelliforge.tech" });
await client.inboxes.delete({ inboxId: "inbox@intelliforge.tech" });
```

## Messages

Always send both `text` and `html` for best deliverability. Use labels to categorize interview emails.

```python
# Send interview invitation
client.inboxes.messages.send(
    inbox_id="interviews-org123@intelliforge.tech",
    to="candidate@example.com",
    subject="Interview Invitation: Senior Python Developer at Acme",
    text="Hi Jane, you've been invited to interview...",
    html="<p>Hi Jane, you've been invited...</p>",
    labels=["invitation", "pending"],
)

# Reply to candidate message
client.inboxes.messages.reply(
    inbox_id="interviews-org123@intelliforge.tech",
    message_id="msg_123",
    text="Thank you for completing your interview!",
)

# List received messages (candidate replies)
messages = client.inboxes.messages.list(
    inbox_id="interviews-org123@intelliforge.tech",
    labels=["received"],
)
for msg in messages.messages:
    print(msg.subject, msg.extracted_text or msg.text)

# Get specific message
message = client.inboxes.messages.get(
    inbox_id="interviews-org123@intelliforge.tech",
    message_id="msg_123",
)

# Update labels after processing
client.inboxes.messages.update(
    inbox_id="interviews-org123@intelliforge.tech",
    message_id="msg_123",
    add_labels=["replied", "processed"],
    remove_labels=["pending"],
)
```

```typescript
await client.inboxes.messages.send({
  inboxId: "interviews-org123@intelliforge.tech",
  to: "candidate@example.com",
  subject: "Interview Invitation: Senior Python Developer at Acme",
  text: "Hi Jane, you've been invited to interview...",
  html: "<p>Hi Jane, you've been invited...</p>",
  labels: ["invitation", "pending"],
});

await client.inboxes.messages.reply({
  inboxId: "interviews-org123@intelliforge.tech",
  messageId: "msg_123",
  text: "Thank you for completing your interview!",
});

const messages = await client.inboxes.messages.list({
  inboxId: "interviews-org123@intelliforge.tech",
  labels: ["received"],
});

await client.inboxes.messages.update({
  inboxId: "interviews-org123@intelliforge.tech",
  messageId: "msg_123",
  addLabels: ["replied"],
  removeLabels: ["pending"],
});
```

## Threads

Threads group related messages in a conversation. Useful for tracking multi-step candidate communication (invitation → reminder → completion → follow-up).

```python
# List threads with unreplied candidate messages
threads = client.inboxes.threads.list(
    inbox_id="interviews-org123@intelliforge.tech",
    labels=["unreplied"],
)

# Get full thread details
thread = client.inboxes.threads.get(
    inbox_id="interviews-org123@intelliforge.tech",
    thread_id="thd_123",
)

# Org-wide thread listing (across all inboxes)
all_threads = client.threads.list()
```

```typescript
const threads = await client.inboxes.threads.list({
  inboxId: "interviews-org123@intelliforge.tech",
  labels: ["unreplied"],
});

const thread = await client.inboxes.threads.get({
  inboxId: "interviews-org123@intelliforge.tech",
  threadId: "thd_123",
});

const allThreads = await client.threads.list();
```

## Attachments

Send interview reports as PDF/CSV attachments.

```python
import base64

# Send completion report as attachment
with open("report.pdf", "rb") as f:
    content = base64.b64encode(f.read()).decode()

client.inboxes.messages.send(
    inbox_id="interviews-org123@intelliforge.tech",
    to="hiring-manager@acme.com",
    subject="Interview Report: Jane Doe - Senior Python Developer",
    text="Please find the interview report attached.",
    html="<p>Please find the interview report attached.</p>",
    attachments=[{
        "content": content,
        "filename": "interview_report_jane_doe.pdf",
        "content_type": "application/pdf",
    }],
    labels=["report", "completed"],
)

# Retrieve attachment from received message
file_data = client.inboxes.messages.get_attachment(
    inbox_id="interviews-org123@intelliforge.tech",
    message_id="msg_123",
    attachment_id="att_456",
)
```

```typescript
const content = Buffer.from(reportBytes).toString("base64");
await client.inboxes.messages.send({
  inboxId: "interviews-org123@intelliforge.tech",
  to: "hiring-manager@acme.com",
  subject: "Interview Report: Jane Doe - Senior Python Developer",
  text: "Please find the interview report attached.",
  attachments: [
    { content, filename: "interview_report_jane_doe.pdf", contentType: "application/pdf" },
  ],
  labels: ["report", "completed"],
});

const fileData = await client.inboxes.messages.getAttachment({
  inboxId: "interviews-org123@intelliforge.tech",
  messageId: "msg_123",
  attachmentId: "att_456",
});
```

## Drafts

Create drafts for human-in-the-loop approval before sending interview communications.

```python
# Create draft invitation for review
draft = client.inboxes.drafts.create(
    inbox_id="interviews-org123@intelliforge.tech",
    to="candidate@example.com",
    subject="Interview Invitation: Senior Developer",
    text="Hi, you've been invited to interview...",
    html="<p>Hi, you've been invited...</p>",
)

# Hiring manager reviews and approves → send
client.inboxes.drafts.send(
    inbox_id="interviews-org123@intelliforge.tech",
    draft_id=draft.draft_id,
)
```

```typescript
const draft = await client.inboxes.drafts.create({
  inboxId: "interviews-org123@intelliforge.tech",
  to: "candidate@example.com",
  subject: "Interview Invitation: Senior Developer",
  text: "Hi, you've been invited to interview...",
});

await client.inboxes.drafts.send({
  inboxId: "interviews-org123@intelliforge.tech",
  draftId: draft.draftId,
});
```

## Pods (Multi-Tenant Isolation)

Each Interview Bot customer org can be isolated in a pod. Pods provide complete data separation.

```python
# Create pod per customer org
pod = client.pods.create(client_id=f"org-{org_id}")

# Create inbox within pod
inbox = client.inboxes.create(pod_id=pod.pod_id)

# List inboxes scoped to pod
inboxes = client.inboxes.list(pod_id=pod.pod_id)
```

```typescript
const pod = await client.pods.create({ clientId: `org-${orgId}` });
const inbox = await client.inboxes.create({ podId: pod.podId });
const inboxes = await client.inboxes.list({ podId: pod.podId });
```

## Webhooks (Real-Time Events)

Register a webhook to receive events when candidates reply to invitation emails or emails bounce. Backend already has a `/api/v1/webhooks` router that can be extended.

```python
# Register webhook for interview email events
webhook = client.webhooks.create(
    url="https://interview-with-giri-api.fly.dev/api/v1/agentmail/webhook",
    event_types=["message.received", "message.bounced"],
)

# List / delete
webhooks = client.webhooks.list()
client.webhooks.delete(webhook_id=webhook.webhook_id)
```

### Webhook Payload Structure

```json
{
  "type": "event",
  "event_type": "message.received",
  "event_id": "evt_123abc",
  "message": {
    "inbox_id": "interviews-org123@intelliforge.tech",
    "thread_id": "thd_789",
    "message_id": "msg_123",
    "from": [{"name": "Jane Doe", "email": "jane@example.com"}],
    "to": [{"email": "interviews-org123@intelliforge.tech"}],
    "subject": "Re: Interview Invitation",
    "text": "Thank you, I'll attend the interview at 3pm.",
    "labels": ["received"],
    "created_at": "2026-03-13T10:00:00Z"
  }
}
```

### Webhook Event Types

| Event | Use Case |
|-------|----------|
| `message.received` | Candidate replied to invitation/follow-up |
| `message.sent` | Confirmation that email was sent |
| `message.delivered` | Email delivered to recipient's server |
| `message.bounced` | Invalid candidate email, mark session |
| `message.complained` | Recipient marked as spam |
| `message.rejected` | Email rejected before sending |

### FastAPI Webhook Handler

```python
# backend/src/interviewbot/routers/agentmail_webhook.py
import hashlib
import hmac

from fastapi import APIRouter, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from interviewbot.dependencies import get_db
from interviewbot.models.tables import InterviewSession

router = APIRouter(prefix="/agentmail", tags=["AgentMail Webhook"])

@router.post("/webhook")
async def handle_agentmail_webhook(
    request: Request,
    x_agentmail_signature: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
):
    payload = await request.json()
    event_type = payload.get("event_type")

    if event_type == "message.received":
        # Candidate replied to an interview email
        message = payload.get("message", {})
        from_email = message.get("from", [{}])[0].get("email")
        if from_email:
            result = await db.execute(
                select(InterviewSession)
                .where(InterviewSession.candidate_email == from_email)
                .order_by(InterviewSession.created_at.desc())
            )
            session = result.scalar_one_or_none()
            if session:
                logger.info("candidate_reply", email=from_email, session=str(session.id))

    elif event_type == "message.bounced":
        # Mark the candidate email as invalid
        message = payload.get("message", {})
        logger.warning("email_bounced", message_id=message.get("message_id"))

    return {"status": "ok"}
```

### Webhook Signature Verification

```python
def verify_agentmail_signature(
    payload: bytes, signature: str, secret: str
) -> bool:
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
```

## WebSockets (Real-Time Events)

For local development or when no public URL is available. No ngrok needed.

```python
from agentmail import AgentMail, Subscribe, MessageReceivedEvent

client = AgentMail(api_key="YOUR_API_KEY")

with client.websockets.connect() as socket:
    socket.send_subscribe(Subscribe(
        inbox_ids=["interviews-org123@intelliforge.tech"],
        event_types=["message.received"],
    ))

    for event in socket:
        if isinstance(event, MessageReceivedEvent):
            print(f"Reply from: {event.message.from_}")
            print(f"Subject: {event.message.subject}")
            print(f"Body: {event.message.text}")
```

### Async WebSocket (for FastAPI background tasks)

```python
import asyncio
from agentmail import AsyncAgentMail, Subscribe, MessageReceivedEvent

client = AsyncAgentMail(api_key="YOUR_API_KEY")

async def listen_for_replies(inbox_ids: list[str]):
    async with client.websockets.connect() as socket:
        await socket.send_subscribe(Subscribe(inbox_ids=inbox_ids))
        async for event in socket:
            if isinstance(event, MessageReceivedEvent):
                await process_candidate_reply(event.message)
```

### WebSocket vs Webhook Comparison

| Feature | Webhook | WebSocket |
|---------|---------|-----------|
| Setup | Requires public URL | No external tools |
| Connection | HTTP request per event | Persistent |
| Latency | HTTP round-trip | Instant streaming |
| Firewall | Must expose port | Outbound only |
| Best for | Production | Local dev / real-time UI |

## Idempotency

Use `client_id` for safe retries on all create operations. Prevents duplicate inboxes when network errors occur.

```python
inbox = client.inboxes.create(client_id=f"org-{org_id}")
# Retrying with same client_id returns the original inbox, not a duplicate
```

## Interview Bot Email Labels Convention

| Label | Applied When |
|-------|-------------|
| `invitation` | Interview invitation sent |
| `reminder` | Follow-up reminder sent |
| `completion` | Interview completion notification |
| `report` | Report attached and sent |
| `pending` | Awaiting candidate action |
| `replied` | Candidate has replied |
| `processed` | Reply has been handled |
| `bounced` | Email delivery failed |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Interview Bot Backend (FastAPI)                                │
│                                                                 │
│  ┌──────────────────┐    ┌────────────────────────────────────┐ │
│  │  notifications.py │───>│  agentmail_client.py               │ │
│  │  (invitation,     │    │  - create_org_inbox() [pods]       │ │
│  │   completion)     │    │  - send_email() [labels, html]     │ │
│  └──────────────────┘    │  - list_inbox_messages() [threads]  │ │
│                           │  - send_with_attachment() [reports] │ │
│  ┌──────────────────┐    └─────────┬──────────────────────────┘ │
│  │  organizations.py │             │                             │
│  │  POST /email/setup│             │                             │
│  │  GET /email/status│             │                             │
│  └──────────────────┘             │                             │
│                                    │                             │
│  ┌──────────────────┐             │                             │
│  │ agentmail_webhook │<────── webhooks (message.received,       │
│  │  POST /webhook    │        message.bounced)                  │
│  └──────────────────┘             │                             │
│                                    │                             │
│  Falls back to SMTP               │                             │
│  (smtp.agentmail.to:465)          │                             │
└────────────────────────────────────┼─────────────────────────────┘
                                     │
                                     ▼
                           ┌──────────────────┐
                           │  AgentMail API    │
                           │  api.agentmail.to │
                           │                  │
                           │  Domain:         │
                           │  intelliforge.tech│
                           └──────────────────┘
```

## Existing Code Locations

| File | What It Does |
|------|-------------|
| `backend/src/interviewbot/config.py` | `agentmail_api_key`, `agentmail_default_domain` settings |
| `backend/src/interviewbot/services/agentmail_client.py` | SDK client, inbox creation, email sending |
| `backend/src/interviewbot/services/notifications.py` | AgentMail-first with SMTP fallback, SSL on port 465 |
| `backend/src/interviewbot/routers/organizations.py` | `/email/setup` and `/email/status` endpoints |
| `backend/src/interviewbot/models/tables.py` | `Organization.agentmail_inbox_id`, `.agentmail_email` |
| `backend/src/interviewbot/websocket/chat_handler.py` | Passes `org_inbox_id` to completion notifications |
| `backend/src/interviewbot/websocket/voice_handler.py` | Passes `org_inbox_id` to completion notifications |
| `backend/tests/test_agentmail.py` | 11 tests: client, fallback, API endpoints |
| `frontend/src/lib/api.ts` | `setupOrgEmail()`, `getEmailStatus()` |
| `frontend/src/app/dashboard/settings/page.tsx` | Email tab with inbox setup UI |

## Error Handling

- Always wrap AgentMail calls in try/except and log failures via structlog
- Fall back to SMTP when AgentMail API is not configured or fails
- Use `client_id` for idempotent inbox creation (safe to retry)
- Handle 429 rate limit responses with exponential backoff
- Check `error.body.message` (TS) or `str(e)` (Python) for detailed error info
- Use `asyncio.to_thread()` for sync SDK calls in async FastAPI handlers

## Full SDK Reference

| Method | Purpose |
|--------|---------|
| `client.inboxes.create(username?, domain?, display_name?, client_id?, pod_id?)` | Create inbox |
| `client.inboxes.list(pod_id?)` | List inboxes |
| `client.inboxes.get(inbox_id)` | Get inbox details |
| `client.inboxes.delete(inbox_id)` | Delete inbox |
| `client.inboxes.messages.send(inbox_id, to, subject, text, html?, labels?, attachments?)` | Send email |
| `client.inboxes.messages.reply(inbox_id, message_id, text, html?)` | Reply to message |
| `client.inboxes.messages.list(inbox_id, limit?, page_token?, labels?)` | List messages |
| `client.inboxes.messages.get(inbox_id, message_id)` | Get message |
| `client.inboxes.messages.update(inbox_id, message_id, add_labels?, remove_labels?)` | Update labels |
| `client.inboxes.messages.get_attachment(inbox_id, message_id, attachment_id)` | Get attachment |
| `client.inboxes.threads.list(inbox_id, labels?)` | List threads |
| `client.inboxes.threads.get(inbox_id, thread_id)` | Get thread |
| `client.threads.list()` | List all threads (org-wide) |
| `client.inboxes.drafts.create(inbox_id, to, subject, text, html?)` | Create draft |
| `client.inboxes.drafts.send(inbox_id, draft_id)` | Send draft |
| `client.pods.create(client_id?)` | Create pod |
| `client.pods.list()` | List pods |
| `client.webhooks.create(url, event_types?)` | Register webhook |
| `client.webhooks.list()` | List webhooks |
| `client.webhooks.delete(webhook_id)` | Delete webhook |
| `client.websockets.connect()` | Open WebSocket connection |

Messages include `extracted_text` / `extracted_html` for reply content without quoted history.
