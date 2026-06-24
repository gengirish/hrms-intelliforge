# Stripe Billing — IntelliForge HRMS

This document explains how to configure [Stripe](https://stripe.com/) subscription billing for **IntelliForge HRMS**: products/prices, webhooks, Vercel environment variables, and a test checkout flow.

**Code references:**

| Item | Location |
|------|----------|
| Plan limits & price ID env mapping | [`src/lib/stripe.ts`](../src/lib/stripe.ts) |
| Checkout API | [`src/app/api/billing/checkout/route.ts`](../src/app/api/billing/checkout/route.ts) |
| Customer portal API | [`src/app/api/billing/portal/route.ts`](../src/app/api/billing/portal/route.ts) |
| Webhook handler | [`src/app/api/webhooks/stripe/route.ts`](../src/app/api/webhooks/stripe/route.ts) |
| Admin billing UI | [`src/app/dashboard/settings/page.tsx`](../src/app/dashboard/settings/page.tsx) (Billing tab) |
| Env template | [`.env.example`](../.env.example) |
| Config validator | [`scripts/stripe-setup-check.mjs`](../scripts/stripe-setup-check.mjs) |

---

## Subscription plans

These tiers are defined in `src/lib/stripe.ts` and shown in **Dashboard → Settings → Billing**:

| Plan key | Display name | Monthly price | Max interns | Stripe env var |
|----------|--------------|---------------|-------------|----------------|
| `free` | Free | $0 | 5 | *(none — default)* |
| `starter` | Starter | $29 | 25 | `STRIPE_STARTER_PRICE_ID` |
| `growth` | Growth | $79 | 100 | `STRIPE_GROWTH_PRICE_ID` |
| `enterprise` | Enterprise | Your list price | Unlimited | `STRIPE_ENTERPRISE_PRICE_ID` |

Only **org admins** can start checkout or open the billing portal.

---

## 1. Create products and prices in Stripe

Use **Test mode** first (toggle in the Stripe Dashboard header). Repeat the same steps in **Live mode** when you go to production.

1. Open [Stripe Dashboard → Products](https://dashboard.stripe.com/products).
2. For each paid plan, click **Add product**:
   - **Name:** `IntelliForge HRMS — Starter` (or Growth / Enterprise)
   - **Pricing model:** Standard pricing
   - **Price:** Recurring, **Monthly**, amount matching the table above (USD unless you use another currency)
   - **Billing period:** Monthly
3. Save the product and copy each **Price ID** (starts with `price_`). You need one Price ID per paid tier.
4. Map them to environment variables:

   ```text
   STRIPE_STARTER_PRICE_ID=price_...
   STRIPE_GROWTH_PRICE_ID=price_...
   STRIPE_ENTERPRISE_PRICE_ID=price_...
   ```

> **Tip:** Create separate test and live products/prices. Test Price IDs only work with `sk_test_...`; live Price IDs only work with `sk_live_...`.

---

## 2. API keys

1. [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys)
2. Copy the **Secret key**:
   - Test: `sk_test_...` for Preview / local development
   - Live: `sk_live_...` for Production on Vercel only

Set:

```text
STRIPE_SECRET_KEY=sk_test_...   # or sk_live_... in production
```

This app uses server-side Stripe only (no publishable key on the frontend). Checkout is hosted by Stripe.

---

## 3. Webhook endpoint

Stripe notifies HRMS when checkout completes or subscriptions change.

### Production URL

```text
https://hrms.intelliforge.tech/api/webhooks/stripe
```

Replace the host if your `NEXT_PUBLIC_APP_URL` differs.

### Local testing (optional)

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI prints a webhook signing secret (`whsec_...`) — use that in `.env.local` while testing locally.

### Dashboard setup (Preview / Production)

1. [Developers → Webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**
2. **Endpoint URL:** URL above (use your Vercel preview URL for preview deployments if needed)
3. **Events to send** (minimum set used by HRMS):
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. After creating the endpoint, open it and reveal **Signing secret** → set:

   ```text
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

Create **separate** webhook endpoints (and secrets) for Test mode and Live mode.

---

## 4. Customer billing portal (optional but recommended)

The **Manage billing** button calls Stripe Customer Portal.

1. [Settings → Billing → Customer portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enable the portal and allow customers to update payment methods and cancel subscriptions
3. Save — no extra env var is required

---

## 5. Vercel environment variables

In [Vercel → Project → Settings → Environment Variables](https://vercel.com/docs/projects/environment-variables):

| Variable | Development | Preview | Production |
|----------|-------------|---------|------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_test_...` or `sk_live_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Test `whsec_...` | Matching mode secret | Live `whsec_...` |
| `STRIPE_STARTER_PRICE_ID` | Test `price_...` | Same mode as secret key | Live `price_...` |
| `STRIPE_GROWTH_PRICE_ID` | Test `price_...` | Same mode as secret key | Live `price_...` |
| `STRIPE_ENTERPRISE_PRICE_ID` | Test `price_...` | Same mode as secret key | Live `price_...` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Preview URL | `https://hrms.intelliforge.tech` |

**Rules:**

- Never commit real keys to git (`.env`, `.env.local`, and `.env.production` are gitignored).
- Redeploy after changing env vars so serverless functions pick up new values.
- Price IDs and secret keys must all be from the **same** Stripe mode (test or live).

Validate locally (no secrets printed):

```bash
npm run stripe:check
```

---

## 6. Test checkout flow

### Prerequisites

- All Stripe vars set in `.env.local` (copy from `.env.example`)
- `npm run stripe:check` exits 0
- App running: `npm run dev`
- Signed in as an **admin** user with an organization

### Steps

1. Go to **Dashboard → Settings → Billing**.
2. Click **Upgrade** on Starter (or Growth / Enterprise).
3. You should redirect to Stripe Checkout (test card: `4242 4242 4242 4242`, any future expiry, any CVC).
4. Complete payment → redirect to `/dashboard/settings?billing=success`.
5. Confirm the org plan updated (webhook `checkout.session.completed` sets `plan` and `maxInterns` in the database).
6. Click **Manage billing** → Stripe Customer Portal opens for the org’s Stripe customer.

### Webhook verification

- **Local:** keep `stripe listen` running and watch for `checkout.session.completed`.
- **Deployed:** Stripe Dashboard → Webhooks → your endpoint → **Event deliveries** should show `200` responses.

### Common failures

| Symptom | Likely cause |
|---------|----------------|
| Toast: plan unavailable / price ID not set | Missing `STRIPE_*_PRICE_ID` — redeploy after setting |
| 503 billing not configured | Missing `STRIPE_SECRET_KEY` |
| Webhook 400 Invalid signature | Wrong `STRIPE_WEBHOOK_SECRET` for this endpoint/mode |
| Checkout error from Stripe API | Test key with live price ID (or reverse) |
| Plan unchanged after payment | Webhook not reaching app; check URL and event types |

---

## 7. Production go-live checklist

Use this before enabling real charges:

- [ ] Live products/prices created in Stripe **Live mode** ($29 / $79 / enterprise)
- [ ] Live `STRIPE_SECRET_KEY` set on Vercel **Production** only
- [ ] Live `STRIPE_*_PRICE_ID` values set on Vercel **Production**
- [ ] Live webhook endpoint `https://hrms.intelliforge.tech/api/webhooks/stripe` with live signing secret
- [ ] Webhook listens for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] Customer portal configured in Stripe Live mode
- [ ] `NEXT_PUBLIC_APP_URL=https://hrms.intelliforge.tech` on Production
- [ ] Test checkout in Preview with **test** keys before switching Production to **live** keys
- [ ] `npm run stripe:check` passes against production env (pull with `vercel env pull` locally, never commit)

---

## Related docs

- [`.env.example`](../.env.example) — variable names and inline comments
- [`docs/BETA_TESTING_PLAN.md`](./BETA_TESTING_PLAN.md) — broader env var reference
