/**
 * Thin HTTP client for the central IntelliForge WhatsApp hub.
 *
 * HRMS is a tenant (`WHATSAPP_TENANT_ID`, default "hrms") rather than a direct
 * Meta integration: the hub owns the WABA, the access token and the app secret,
 * and fans inbound events back out to each product. When this is configured,
 * `src/lib/whatsapp.ts` routes sends here instead of graph.facebook.com.
 *
 * Returns null config rather than throwing at import time, so the app boots with
 * these unset — check `isWhatsAppHubConfigured()` before calling.
 */

const DEFAULT_HUB_URL = "https://intelliforge-whatsapp-hub.fly.dev";
const DEFAULT_TENANT_ID = "hrms";

function getHubConfig() {
  const baseUrl = (process.env.WHATSAPP_HUB_URL ?? DEFAULT_HUB_URL).replace(/\/$/, "");
  const apiKey = process.env.WHATSAPP_HUB_API_KEY;
  const tenantId = process.env.WHATSAPP_TENANT_ID ?? DEFAULT_TENANT_ID;
  if (!apiKey) return null;
  return { baseUrl, apiKey, tenantId };
}

export function isWhatsAppHubConfigured(): boolean {
  return getHubConfig() !== null;
}

/** The tenant this deployment answers to; used to reject foreign forwards. */
export function whatsAppHubTenantId(): string {
  return process.env.WHATSAPP_TENANT_ID ?? DEFAULT_TENANT_ID;
}

export type HubSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

async function hubPost(
  path: string,
  body: Record<string, unknown>
): Promise<HubSendResult> {
  const cfg = getHubConfig();
  if (!cfg) return { success: false, error: "WhatsApp hub is not configured" };

  try {
    const res = await fetch(`${cfg.baseUrl}${path}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
        "X-Tenant-Id": cfg.tenantId,
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      waMessageId?: string;
      error?: string;
      message?: string;
    };

    if (!res.ok || data.ok !== true) {
      const errMsg = data.message ?? data.error ?? `hub HTTP ${res.status}`;
      console.error("[whatsapp-hub] send failed:", errMsg);
      return { success: false, error: errMsg };
    }

    return { success: true, messageId: data.waMessageId };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    console.error("[whatsapp-hub] request error:", errMsg);
    return { success: false, error: errMsg };
  }
}

export function hubSendTemplate(input: {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParams?: string[];
}): Promise<HubSendResult> {
  return hubPost("/v1/messages/template", {
    to: input.to,
    templateName: input.templateName,
    languageCode: input.languageCode ?? "en",
    bodyParams: input.bodyParams ?? [],
  });
}

export function hubSendText(to: string, body: string): Promise<HubSendResult> {
  return hubPost("/v1/messages/text", { to, body });
}

/**
 * The hub requires a contact to be opted in before it will send to them.
 * Best-effort: a failure here is logged, never fatal to the calling flow.
 */
export async function hubOptIn(phoneE164: string): Promise<HubSendResult> {
  const result = await hubPost("/v1/contacts/opt-in", { phone: phoneE164 });
  if (!result.success) {
    console.warn("[whatsapp-hub] opt-in failed for", phoneE164, "-", result.error);
  }
  return result;
}

export async function pingWhatsAppHub(): Promise<{ ok: boolean }> {
  const cfg = getHubConfig();
  if (!cfg) return { ok: false };
  try {
    const res = await fetch(`${cfg.baseUrl}/health`, { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return { ok: res.ok && body.ok === true };
  } catch {
    return { ok: false };
  }
}
