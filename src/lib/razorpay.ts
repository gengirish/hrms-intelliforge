/**
 * RazorpayX client for intern stipend payouts (India-only).
 *
 * Configure:
 *   RAZORPAY_KEY_ID
 *   RAZORPAY_KEY_SECRET
 *   RAZORPAY_ACCOUNT_NUMBER  — RazorpayX business account number
 *
 * Stripe handles SaaS billing; this module is separate.
 */

const API_BASE = "https://api.razorpay.com/v1";

export class RazorpayApiError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "RazorpayApiError";
    this.status = status;
    this.body = body;
  }
}

export interface RazorpayContact {
  id: string;
  name: string;
  email?: string;
  contact?: string;
  type: string;
  reference_id?: string;
}

export interface RazorpayFundAccount {
  id: string;
  contact_id: string;
  account_type: string;
  active: boolean;
}

export interface RazorpayPayout {
  id: string;
  entity: string;
  fund_account_id: string;
  amount: number;
  currency: string;
  status: string;
  mode?: string;
  purpose?: string;
  reference_id?: string;
  failure_reason?: string;
}

export type RecipientVpa = { type: "vpa"; address: string };
export type RecipientBank = {
  type: "bank";
  name: string;
  ifsc: string;
  accountNumber: string;
};
export type PayoutRecipient = RecipientVpa | RecipientBank;

export function isRazorpayConfigured(): boolean {
  return !!(
    process.env.RAZORPAY_KEY_ID?.trim() &&
    process.env.RAZORPAY_KEY_SECRET?.trim() &&
    process.env.RAZORPAY_ACCOUNT_NUMBER?.trim()
  );
}

function getCredentials(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new RazorpayApiError(
      503,
      "Razorpay integration is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing)"
    );
  }
  return { keyId, keySecret };
}

function getAccountNumber(): string {
  const accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER?.trim();
  if (!accountNumber) {
    throw new RazorpayApiError(
      503,
      "Razorpay integration is not configured (RAZORPAY_ACCOUNT_NUMBER missing)"
    );
  }
  return accountNumber;
}

function authHeader(): string {
  const { keyId, keySecret } = getCredentials();
  const token = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return `Basic ${token}`;
}

async function razorpayFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const msg =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error?: { description?: string } }).error?.description ===
        "string"
        ? (body as { error: { description: string } }).error.description
        : `Razorpay API error (${res.status})`;
    throw new RazorpayApiError(res.status, msg, body);
  }

  return body as T;
}

/** Lazily validated RazorpayX client handle (credentials probe). */
export function getRazorpay(): { configured: true } {
  getCredentials();
  getAccountNumber();
  return { configured: true };
}

export async function createContact(input: {
  name: string;
  email: string;
  phone: string;
  referenceId: string;
}): Promise<RazorpayContact> {
  getRazorpay();
  return razorpayFetch<RazorpayContact>("/contacts", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      contact: input.phone,
      type: "employee",
      reference_id: input.referenceId,
    }),
  });
}

export async function createFundAccount(input: {
  contactId: string;
  recipient: PayoutRecipient;
}): Promise<RazorpayFundAccount> {
  getRazorpay();

  if (input.recipient.type === "vpa") {
    return razorpayFetch<RazorpayFundAccount>("/fund_accounts", {
      method: "POST",
      body: JSON.stringify({
        contact_id: input.contactId,
        account_type: "vpa",
        vpa: { address: input.recipient.address },
      }),
    });
  }

  return razorpayFetch<RazorpayFundAccount>("/fund_accounts", {
    method: "POST",
    body: JSON.stringify({
      contact_id: input.contactId,
      account_type: "bank_account",
      bank_account: {
        name: input.recipient.name,
        ifsc: input.recipient.ifsc,
        account_number: input.recipient.accountNumber,
      },
    }),
  });
}

export async function createPayout(input: {
  fundAccountId: string;
  amountPaise: number;
  referenceId: string;
  mode: "UPI" | "IMPS" | "NEFT" | "RTGS";
  narration?: string;
}): Promise<RazorpayPayout> {
  getRazorpay();
  return razorpayFetch<RazorpayPayout>("/payouts", {
    method: "POST",
    body: JSON.stringify({
      account_number: getAccountNumber(),
      fund_account_id: input.fundAccountId,
      amount: input.amountPaise,
      currency: "INR",
      mode: input.mode,
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: input.referenceId,
      narration: input.narration ?? "IntelliForge stipend",
    }),
  });
}

export function payoutModeForRecipient(
  recipient: PayoutRecipient
): "UPI" | "IMPS" {
  return recipient.type === "vpa" ? "UPI" : "IMPS";
}

export function parseRecipientJson(json: string): PayoutRecipient | null {
  try {
    const data = JSON.parse(json) as Record<string, unknown>;
    if (data.type === "vpa" && typeof data.address === "string") {
      return { type: "vpa", address: data.address };
    }
    if (
      data.type === "bank" &&
      typeof data.name === "string" &&
      typeof data.ifsc === "string" &&
      typeof data.accountNumber === "string"
    ) {
      return {
        type: "bank",
        name: data.name,
        ifsc: data.ifsc,
        accountNumber: data.accountNumber,
      };
    }
    return null;
  } catch {
    return null;
  }
}
