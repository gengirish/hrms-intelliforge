# RazorpayX Stipend Payouts

IntelliForge HRMS pays intern stipends via **RazorpayX** (India). SaaS billing remains on Stripe; do not mix the two.

## Prerequisites

1. Razorpay account with **RazorpayX** enabled and a funded business account.
2. API keys (Test mode for development, Live for production).
3. Interns in `ACTIVE` status with `stipendPaise > 0`.
4. **Intern payout profiles** — one row per intern in `intern_payout_profiles` with bank or UPI details.

## Environment variables

Add to `.env` (see `.env.example`):

| Variable | Description |
|----------|-------------|
| `RAZORPAY_KEY_ID` | API key id (`rzp_test_...` or `rzp_live_...`) |
| `RAZORPAY_KEY_SECRET` | API key secret |
| `RAZORPAY_ACCOUNT_NUMBER` | RazorpayX customer identifier / account number |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signing secret from the Razorpay dashboard |

If any payout env var is missing, admin payout APIs return **503** and the UI still loads.

## Webhook

1. Razorpay Dashboard → **Webhooks** → Add endpoint.
2. URL: `https://<your-hrms-domain>/api/webhooks/razorpay`
3. Events: `payout.processed`, `payout.failed`, `payout.reversed`, `payout.pending` (or all payout events).
4. Copy the **secret** into `RAZORPAY_WEBHOOK_SECRET`.

The handler verifies `X-Razorpay-Signature` (HMAC SHA256) and updates `stipend_payouts` + batch status.

## Intern payout profiles

Before creating a batch, seed payout recipient data per intern. `recipientJson` format:

**UPI (VPA):**
```json
{ "type": "vpa", "address": "intern@upi" }
```

**Bank account:**
```json
{
  "type": "bank",
  "name": "Intern Full Name",
  "ifsc": "HDFC0001234",
  "accountNumber": "1234567890"
}
```

Example SQL (replace ids):

```sql
INSERT INTO intern_payout_profiles (id, "internId", "recipientJson", "createdAt", "updatedAt")
VALUES (
  'cuid_here',
  'intern_id_here',
  '{"type":"vpa","address":"intern@upi"}',
  NOW(),
  NOW()
);
```

On first process, HRMS creates Razorpay **contact** and **fund account** and stores ids on the profile for reuse.

## Admin workflow

1. Open **Dashboard → Stipend Payouts** (`/dashboard/payouts`).
2. **Create batch** — builds a `DRAFT` batch for the current IST month (`YYYY-MM`) from eligible interns.
3. **Process** — submits each payout to RazorpayX; statuses move to `PROCESSING` until webhooks confirm.
4. Monitor batch/payout status in the table or via API.

## API reference

All admin routes require an authenticated admin session (`getAuthAdmin`).

### `POST /api/payouts/batches`

Create a monthly batch.

**Body (optional):**
```json
{ "month": "2026-06" }
```

**Response `201` / `200`:**
```json
{
  "batch": { "id", "orgId", "month", "status", "totalPaise", "payouts": [...] },
  "skippedNoProfile": 0
}
```

**Errors:** `409` if a DRAFT/PROCESSING batch exists for that month; `400` if no eligible interns.

### `GET /api/payouts/batches`

List batches for the admin's organization (newest first), including payout summaries.

### `POST /api/payouts/batches/:id/process`

Trigger RazorpayX payouts for a `DRAFT` batch.

**Response:**
```json
{
  "batch": { ... },
  "results": [{ "payoutId", "status", "razorpayPayoutId?", "error?" }],
  "failedCount": 0
}
```

**Errors:** `503` if Razorpay not configured; `404` cross-tenant; `400` if batch not `DRAFT`.

### `POST /api/webhooks/razorpay`

Razorpay webhook (no auth cookie; signature verified). Returns `{ "received": true }`.

## Database

Migration: `prisma/migrations/20260629120000_stipend_payouts`

Tables: `stipend_payout_batches`, `stipend_payouts`, `intern_payout_profiles`.

Apply locally:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Test mode

Use Razorpay **Test** keys and test fund accounts. Payouts in test mode do not move real money but exercise the full flow including webhooks (use Razorpay's webhook tester or ngrok for local dev).

## Security notes

- Never commit live secrets.
- Webhook endpoint must use HTTPS in production.
- Admin-only routes; interns cannot trigger payouts.
- Amounts are stored in **paise** (integer) end-to-end.
