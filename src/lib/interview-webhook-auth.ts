export type WebhookAuthResult =
  | { authorized: true }
  | { authorized: false; status: 401 | 503; message: string };

export function verifyInterviewWebhookAuth(
  authHeader: string | null,
  secret: string | undefined,
  isProduction: boolean
): WebhookAuthResult {
  if (!secret) {
    if (isProduction) {
      return {
        authorized: false,
        status: 503,
        message: "Webhook not configured",
      };
    }
    return { authorized: true };
  }

  if (authHeader !== `Bearer ${secret}`) {
    return { authorized: false, status: 401, message: "Unauthorized" };
  }

  return { authorized: true };
}
