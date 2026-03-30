# WhatsApp Business API Setup Guide

A step-by-step guide to setting up Meta Business Account, WhatsApp Business API, phone number registration, and message template submissions for IntelliForge HRMS.

---

## Table of Contents

1. [Meta Business Account](#1-meta-business-account)
2. [WhatsApp Business API Setup](#2-whatsapp-business-api-setup)
3. [Phone Number Registration](#3-phone-number-registration)
4. [Message Template Submissions](#4-message-template-submissions)
5. [Quick Checklist](#5-quick-checklist)

---

## 1. Meta Business Account

### Steps

1. Go to [business.facebook.com](https://business.facebook.com)
2. Click **Create Account**
3. Enter your **business name**, **your name**, and **business email**
4. Fill in business details (address, website, etc.)
5. **Verify your business** — Meta requires document verification (business registration, utility bill, etc.). This can take 1–5 business days.

> **Note:** Business verification is required before you can send messages at scale or use the WhatsApp Business API.

---

## 2. WhatsApp Business API Setup

### Choosing the Right Option

| Feature                | WhatsApp Business App (Free)                  | WhatsApp Business API (Cloud/On-Premise)         |
| ---------------------- | --------------------------------------------- | ------------------------------------------------ |
| Best for               | Small businesses                              | Medium-to-large / SaaS integration               |
| Automation             | Limited (quick replies, away messages)        | Full (bots, webhooks, programmatic messaging)     |
| Setup                  | Download from Play Store / App Store          | Via Meta Developer Portal                         |

### Setting Up the WhatsApp Business API

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a **Meta App** (type: "Business")
3. In the app dashboard, add the **WhatsApp** product
4. Link your **Meta Business Account** to the app
5. You'll get a **test phone number** and **temporary access token** to start with

### Generating a Permanent Access Token

1. In the Meta Developer Portal, go to **Business Settings** → **System Users**
2. Create a system user (Admin role recommended)
3. Assign the WhatsApp app to the system user
4. Generate a token with the following permissions:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
5. Store the token securely (e.g., environment variable, secrets manager)

---

## 3. Phone Number Registration

### Using the Test Number

Meta provides a free test phone number in the Developer Portal under **WhatsApp → Getting Started**. This is useful for development and testing.

### Registering Your Own Number

1. In the Meta Developer Portal → WhatsApp → **Configuration** → **Phone Numbers**
2. Click **Add Phone Number**
3. The number must **not** be currently registered with WhatsApp or WhatsApp Business App
4. Enter the number and verify via **SMS or Voice Call** (you'll receive a 6-digit OTP)
5. Set a **display name** (must comply with Meta's naming guidelines — reviewed within 24h)
6. After verification, the number is linked to your WhatsApp Business Account (WABA)

### Important Notes

- Once a number is registered with the API, it **cannot** be used with the regular WhatsApp or WhatsApp Business app simultaneously.
- To migrate a number from the WhatsApp Business App to the API, you must first delete it from the app.
- Each WABA can hold up to **20 phone numbers** (more available upon request).

---

## 4. Message Template Submissions

WhatsApp requires **pre-approved templates** for any business-initiated messages (messages sent outside the 24-hour customer reply window).

### Creating a Template

#### Via Meta Business Suite (UI)

1. Go to **Meta Business Suite** → **WhatsApp Manager** → **Message Templates**
2. Click **Create Template**
3. Fill in the template details (see fields below)

#### Via API

```http
POST https://graph.facebook.com/v21.0/{whatsapp-business-account-id}/message_templates

{
  "name": "interview_scheduled",
  "language": "en",
  "category": "UTILITY",
  "components": [
    {
      "type": "BODY",
      "text": "Hello {{1}}, your interview for the {{2}} position has been scheduled.\n\nDate: {{3}}\nTime: {{4}}\nFormat: {{5}}\n\nPlease confirm your availability by replying to this message."
    },
    {
      "type": "FOOTER",
      "text": "IntelliForge HRMS"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "QUICK_REPLY", "text": "Confirm" },
        { "type": "QUICK_REPLY", "text": "Reschedule" }
      ]
    }
  ]
}
```

### Template Fields

| Field        | Description                                                     |
| ------------ | --------------------------------------------------------------- |
| **Name**     | Lowercase, underscores only (e.g., `interview_invitation`)     |
| **Category** | `UTILITY`, `MARKETING`, or `AUTHENTICATION`                    |
| **Language** | Target language code (e.g., `en`, `es`, `fr`)                  |
| **Header**   | Optional — text, image, video, or document                     |
| **Body**     | Message text with placeholders like `{{1}}`, `{{2}}`           |
| **Footer**   | Optional — small text at the bottom                            |
| **Buttons**  | Optional — call-to-action or quick reply buttons (max 3)       |

### Template Categories

| Category           | Use Case                                    | Examples                                   |
| ------------------ | ------------------------------------------- | ------------------------------------------ |
| `UTILITY`          | Transactional / service updates             | Interview confirmations, status updates    |
| `MARKETING`        | Promotional messages                        | Job alerts, company newsletters            |
| `AUTHENTICATION`   | OTP / login verification codes              | Two-factor authentication                  |

### Example Templates for HRMS

#### Interview Scheduled

```
Name: interview_scheduled
Category: UTILITY
Language: en

Body:
Hello {{1}}, your interview for the {{2}} position has been scheduled.

Date: {{3}}
Time: {{4}}
Format: {{5}}

Please confirm your availability by replying to this message.

Footer: IntelliForge HRMS
Buttons: [Confirm] [Reschedule]
```

#### Application Status Update

```
Name: application_status_update
Category: UTILITY
Language: en

Body:
Hi {{1}}, there's an update on your application for {{2}} at {{3}}.

Status: {{4}}

{{5}}

Footer: IntelliForge HRMS
Buttons: [View Details]
```

#### Interview Reminder

```
Name: interview_reminder
Category: UTILITY
Language: en

Body:
Reminder: Hi {{1}}, your interview for {{2}} is coming up.

Date: {{3}}
Time: {{4}}

Please be ready 5 minutes before the scheduled time.

Footer: IntelliForge HRMS
```

### Template Review Process

1. Submit the template via UI or API
2. Meta reviews it (usually **within minutes to 24 hours**)
3. Status will be one of:
   - **APPROVED** — ready to use
   - **REJECTED** — violates policy (you can edit and resubmit)
   - **PENDING** — still under review
4. Check status via API:

```http
GET https://graph.facebook.com/v21.0/{whatsapp-business-account-id}/message_templates?name={template_name}
```

### Common Rejection Reasons

- Requesting sensitive information (passwords, financial data, government IDs)
- Misleading or deceptive content
- Using URL shorteners (use full URLs instead)
- Missing variable placeholders where personalization is expected
- Abusive or threatening language
- Content that violates WhatsApp Commerce Policy

### Tips for Approval

- Keep messages clear, professional, and concise
- Use full URLs instead of shorteners
- Include all necessary context in the template body
- Match the category to the actual use case
- Provide sample values for variables when submitting

---

## 5. Quick Checklist

| #  | Step                                         | Status |
| -- | -------------------------------------------- | ------ |
| 1  | Create Meta Business Account                 | [ ]    |
| 2  | Verify Business (document submission)        | [ ]    |
| 3  | Create Meta Developer App                    | [ ]    |
| 4  | Add WhatsApp product to app                  | [ ]    |
| 5  | Register & verify phone number               | [ ]    |
| 6  | Generate permanent system user access token  | [ ]    |
| 7  | Create & submit message templates            | [ ]    |
| 8  | Set up webhook for incoming messages          | [ ]    |
| 9  | Test with sandbox number                     | [ ]    |
| 10 | Go live with production number               | [ ]    |

---

## Useful Links

- [Meta Business Suite](https://business.facebook.com)
- [Meta Developer Portal](https://developers.facebook.com)
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Message Template Guidelines](https://developers.facebook.com/docs/whatsapp/message-templates)
- [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy)
- [WhatsApp Pricing](https://developers.facebook.com/docs/whatsapp/pricing)
