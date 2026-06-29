import crypto from "crypto";

const DEFAULT_DIGIO_BASE_URL = "https://ext.digio.in:8443";

export interface CreateSigningRequestInput {
  internName: string;
  email: string;
  offerPdfUrl?: string;
  offerPdfBuffer?: Buffer;
  callbackUrl: string;
  referenceId?: string;
}

export interface CreateSigningRequestResult {
  providerDocId: string;
  signingUrl: string;
}

export type SigningStatus =
  | "PENDING"
  | "SENT"
  | "SIGNED"
  | "DECLINED"
  | "EXPIRED"
  | "FAILED";

export interface SigningStatusResult {
  status: SigningStatus;
  signingUrl?: string;
  signedPdfUrl?: string;
}

function digioConfigured(): boolean {
  return !!(
    process.env.DIGIO_CLIENT_ID?.trim() &&
    process.env.DIGIO_CLIENT_SECRET?.trim()
  );
}

function digioBaseUrl(): string {
  return (process.env.DIGIO_BASE_URL || DEFAULT_DIGIO_BASE_URL).replace(/\/$/, "");
}

function digioAuthHeader(): string {
  const id = process.env.DIGIO_CLIENT_ID!.trim();
  const secret = process.env.DIGIO_CLIENT_SECRET!.trim();
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

async function resolvePdfBase64(
  input: CreateSigningRequestInput
): Promise<string> {
  if (input.offerPdfBuffer) {
    return input.offerPdfBuffer.toString("base64");
  }
  if (input.offerPdfUrl) {
    const res = await fetch(input.offerPdfUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch offer PDF (${res.status})`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.toString("base64");
  }
  throw new Error("offerPdfBuffer or offerPdfUrl is required");
}

function mapDigioAgreementStatus(raw: string | undefined): SigningStatus {
  const s = (raw ?? "").toLowerCase();
  if (s === "completed" || s === "signed") return "SIGNED";
  if (s === "declined" || s === "rejected") return "DECLINED";
  if (s === "expired") return "EXPIRED";
  if (s === "failed") return "FAILED";
  if (s === "requested" || s === "pending") return "SENT";
  return "PENDING";
}

export async function createSigningRequest(
  input: CreateSigningRequestInput
): Promise<CreateSigningRequestResult> {
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "");

  if (!digioConfigured()) {
    const providerDocId = `mock_${crypto.randomUUID()}`;
    return {
      providerDocId,
      signingUrl: `${appUrl}/offer?mock_esign=${providerDocId}`,
    };
  }

  const fileData = await resolvePdfBase64(input);
  const referenceNum = input.referenceId ?? `IF-OFFER-${Date.now()}`;

  const body = {
    signers: [
      {
        identifier: input.email.trim().toLowerCase(),
        name: input.internName,
        sign_type: "aadhaar",
        reason: "Internship offer letter acceptance",
      },
    ],
    expire_in_days: 30,
    display_on_page: "all",
    notify_signers: true,
    send_sign_link: true,
    file_name: "IntelliForge_Offer_Letter.pdf",
    file_data: fileData,
    callback: input.callbackUrl,
    reference_id: referenceNum,
  };

  const res = await fetch(`${digioBaseUrl()}/v2/client/document/uploadpdf`, {
    method: "POST",
    headers: {
      Authorization: digioAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    id?: string;
    document_id?: string;
    signing_parties?: Array<{ signing_url?: string }>;
    message?: string;
    error?: string;
  };

  if (!res.ok) {
    const msg =
      payload.message || payload.error || `Digio API error (${res.status})`;
    throw new Error(msg);
  }

  const providerDocId = payload.id ?? payload.document_id;
  if (!providerDocId) {
    throw new Error("Digio response missing document id");
  }

  const signingUrl = payload.signing_parties?.[0]?.signing_url;
  if (!signingUrl) {
    throw new Error("Digio response missing signing URL");
  }

  return { providerDocId, signingUrl };
}

export async function getSigningStatus(
  providerDocId: string
): Promise<SigningStatusResult> {
  if (providerDocId.startsWith("mock_")) {
    return { status: "SENT", signingUrl: undefined };
  }

  if (!digioConfigured()) {
    return { status: "SENT" };
  }

  const res = await fetch(
    `${digioBaseUrl()}/v2/client/document/${encodeURIComponent(providerDocId)}`,
    {
      headers: { Authorization: digioAuthHeader() },
    }
  );

  const payload = (await res.json().catch(() => ({}))) as {
    agreement_status?: string;
    status?: string;
    signing_parties?: Array<{ signing_url?: string }>;
    file_url?: string;
    signed_document_url?: string;
    message?: string;
    error?: string;
  };

  if (!res.ok) {
    const msg =
      payload.message || payload.error || `Digio status error (${res.status})`;
    throw new Error(msg);
  }

  const status = mapDigioAgreementStatus(
    payload.agreement_status ?? payload.status
  );

  return {
    status,
    signingUrl: payload.signing_parties?.[0]?.signing_url,
    signedPdfUrl: payload.signed_document_url ?? payload.file_url,
  };
}

export function verifyWebhookSignature(
  headers: Headers,
  rawBody: string
): boolean {
  const secret = process.env.DIGIO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // Dev/mock mode — allow unsigned webhooks when Digio credentials are absent
    return !digioConfigured();
  }

  const signature =
    headers.get("x-digio-hmac-sha256") ??
    headers.get("x-digio-signature") ??
    headers.get("x-webhook-signature") ??
    "";

  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature.trim(), "utf8"),
      Buffer.from(expected, "utf8")
    );
  } catch {
    return signature.trim() === expected;
  }
}

export function parseDigioWebhookEvent(rawBody: string): {
  eventType: string;
  providerDocId?: string;
  documentStatus?: string;
  signedPdfUrl?: string;
  signedAt?: Date;
} {
  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const eventType = String(
    body.event ?? body.event_type ?? body.type ?? "unknown"
  );

  const eventData = (body.payload ?? body.eventData ?? body.data ?? body) as Record<
    string,
    unknown
  >;

  const providerDocId = String(
    eventData.documentSignId ??
      eventData.document_id ??
      eventData.id ??
      eventData.documentId ??
      ""
  ).trim() || undefined;

  const documentStatus = String(
    eventData.documentStatus ?? eventData.agreement_status ?? eventData.status ?? ""
  ).trim() || undefined;

  const signedPdfUrl =
    (eventData.signed_document_url as string | undefined) ??
    (eventData.file_url as string | undefined) ??
    (typeof eventData.document === "string" && eventData.document.startsWith("http")
      ? eventData.document
      : undefined);

  const signedAtRaw = eventData.signedAt ?? eventData.signed_at;
  const signedAt =
    typeof signedAtRaw === "string" && !Number.isNaN(Date.parse(signedAtRaw))
      ? new Date(signedAtRaw)
      : undefined;

  return { eventType, providerDocId, documentStatus, signedPdfUrl, signedAt };
}
