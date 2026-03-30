import { createHmac, timingSafeEqual } from "crypto";

if (!process.env.WHATSAPP_ACCESS_TOKEN) {
  console.warn("WHATSAPP_ACCESS_TOKEN is not set — WhatsApp features will fail");
}

const GRAPH_VERSION = "v21.0";

export function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return `+${digits}`;
}

function graphToPhone(to: string): string {
  return formatPhoneE164(to).replace(/^\+/, "");
}

export function verifyWhatsAppSignature(rawBody: string, signature: string): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signature) return false;
  const expectedHex = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const prefix = "sha256=";
  if (!signature.startsWith(prefix)) return false;
  const receivedHex = signature.slice(prefix.length);
  if (receivedHex.length !== expectedHex.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(receivedHex, "hex"),
      Buffer.from(expectedHex, "hex")
    );
  } catch {
    return false;
  }
}

export async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  languageCode: string,
  parameters: string[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { success: false, error: "WhatsApp is not configured" };
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to: graphToPhone(phone),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(parameters.length > 0
        ? {
            components: [
              {
                type: "body",
                parameters: parameters.map((text) => ({ type: "text", text })),
              },
            ],
          }
        : {}),
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      const errMsg = data.error?.message ?? res.statusText;
      console.error("WhatsApp template send failed:", errMsg, data);
      return { success: false, error: errMsg };
    }
    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (e) {
    console.error("WhatsApp template send error:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export async function sendWhatsAppText(
  phone: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { success: false, error: "WhatsApp is not configured" };
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: graphToPhone(phone),
    type: "text",
    text: { body: text },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      const errMsg = data.error?.message ?? res.statusText;
      console.error("WhatsApp text send failed:", errMsg, data);
      return { success: false, error: errMsg };
    }
    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (e) {
    console.error("WhatsApp text send error:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
