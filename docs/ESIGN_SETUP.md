# Digio E-Sign Setup (Offer Letters)

IntelliForge HRMS can send internship offer letters for **Aadhaar-based electronic signing** via [Digio](https://www.digio.in/). E-sign is **optional** — the existing email + web acceptance flow continues to work without Digio.

## Environment variables

Add to `.env` (see `.env.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `DIGIO_CLIENT_ID` | Production | Digio API client ID |
| `DIGIO_CLIENT_SECRET` | Production | Digio API client secret |
| `DIGIO_WEBHOOK_SECRET` | Production | HMAC secret for webhook verification |
| `DIGIO_BASE_URL` | No | Defaults to sandbox `https://ext.digio.in:8443`; use `https://api.digio.in` in production |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL used for webhook callback |

**Dev / mock mode:** If `DIGIO_CLIENT_ID` and `DIGIO_CLIENT_SECRET` are unset, the server returns a fake signing URL (`/offer?mock_esign=...`) so you can test the admin and intern UI without Digio credentials.

## Digio dashboard

1. Create a Digio account (sandbox for testing).
2. Generate API credentials (Client ID + Secret).
3. Register the webhook URL:

   ```
   https://<your-hrms-domain>/api/webhooks/digio
   ```

4. Enable events for document signing (e.g. `doc.signed`, `doc.sign.declined`, `doc.expired`, `doc.sign.failed`).
5. Copy the webhook signing secret into `DIGIO_WEBHOOK_SECRET`.

Official references:

- [Digio environments](https://documentation.digio.in/digienvironments/)
- [eSign webhooks](https://documentation.digio.in/digisign/api_integration/webhooks/)
- [Webhooks general](https://documentation.digio.in/webhooks/)

## Admin flow

1. Set stipend on a **PENDING** intern in the dashboard.
2. Click **Send for E-Sign** (or continue using **Send Offer Letter** for email-only).
3. HRMS generates the offer PDF, uploads it to Digio, and stores an `OfferEsignRequest` row.
4. Intern status becomes **OFFERED** when the Digio request is sent successfully.

## Intern flow

1. Intern visits `/offer` while status is **OFFERED**.
2. If an e-sign request is **SENT**, they see **Sign electronically** linking to Digio.
3. After Aadhaar signing, Digio calls the webhook; HRMS sets the request to **SIGNED** and moves the intern to **ACTIVE** (same as web/email acceptance).

## API endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/offer/esign` | Admin | Create signing request |
| `GET` | `/api/offer/esign/[internId]` | Admin or intern (own id) | Latest e-sign status |
| `POST` | `/api/webhooks/digio` | Digio HMAC | Status updates |

## Webhook events handled

| Event / status | `OfferEsignRequest.status` | Intern action |
|----------------|---------------------------|---------------|
| Signed / completed | `SIGNED` | `OFFERED` → `ACTIVE`, learning provision scheduled |
| Declined / rejected | `DECLINED` | No status change |
| Expired | `EXPIRED` | No status change |
| Failed | `FAILED` | No status change |

## Database

Migration `20260629120100_offer_esign` adds:

- Enum `EsignStatus`
- Table `offer_esign_requests` (mapped from `OfferEsignRequest`)

Run:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Troubleshooting

- **502 on Send for E-Sign:** Check Digio credentials, base URL (sandbox vs production), and that the PDF renders (stipend must be set).
- **401 on webhook:** Verify `DIGIO_WEBHOOK_SECRET` matches Digio dashboard; ensure the route receives the raw body (no JSON re-serialization).
- **Intern stuck on OFFERED:** Confirm webhook URL is reachable from Digio; check server logs for `[digio webhook]`.
- **Mock mode:** Use admin **Send for E-Sign** without credentials; intern sees a placeholder link on `/offer`.
