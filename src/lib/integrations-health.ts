export interface IntegrationHealth {
  id: string;
  name: string;
  configured: boolean;
  description: string;
  envVars: string[];
}

function envSet(...keys: string[]): boolean {
  return keys.every((key) => !!process.env[key]?.trim());
}

function envAnySet(...keys: string[]): boolean {
  return keys.some((key) => !!process.env[key]?.trim());
}

const INTEGRATIONS: Array<Omit<IntegrationHealth, "configured">> = [
  {
    id: "agentmail",
    name: "AgentMail",
    description: "Transactional email for offers, reminders, and team invites.",
    envVars: ["AGENTMAIL_API_KEY", "AGENTMAIL_HR_INBOX_ID"],
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "WhatsApp Business Cloud API for intern notifications.",
    envVars: [
      "WHATSAPP_ACCESS_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
      "WHATSAPP_VERIFY_TOKEN",
    ],
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "SaaS subscription billing and checkout.",
    envVars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  },
  {
    id: "openai",
    name: "LLM (AI features)",
    description: "LinkedIn import, document OCR, reviews, and WhatsApp bot replies.",
    envVars: [
      "OPENAI_API_KEY",
      "GROQ_API_KEY",
      "GOOGLE_API_KEY",
      "NIM_API_KEY",
    ],
  },
  {
    id: "learning",
    name: "Learning",
    description: "IntelliForge Learning course enrollment and progress sync.",
    envVars: ["LEARNING_API_KEY"],
  },
  {
    id: "interview-bot",
    name: "Interview Bot",
    description: "AI interview configs and candidate scoring reports.",
    envVars: ["INTERVIEW_BOT_API_KEY", "INTERVIEW_BOT_WEBHOOK_SECRET"],
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Interview and mentoring session scheduling.",
    envVars: [
      "GOOGLE_CALENDAR_CLIENT_ID",
      "GOOGLE_CALENDAR_CLIENT_SECRET",
      "GOOGLE_CALENDAR_REFRESH_TOKEN",
      "GOOGLE_CALENDAR_ID",
    ],
  },
  {
    id: "digio",
    name: "Digio",
    description: "Aadhaar eSign for offer letters and compliance documents.",
    envVars: ["DIGIO_CLIENT_ID", "DIGIO_CLIENT_SECRET"],
  },
  {
    id: "razorpay",
    name: "RazorpayX",
    description: "India stipend payouts via RazorpayX (separate from Stripe).",
    envVars: [
      "RAZORPAY_KEY_ID",
      "RAZORPAY_KEY_SECRET",
      "RAZORPAY_ACCOUNT_NUMBER",
    ],
  },
  {
    id: "upstash",
    name: "Upstash Redis",
    description: "Distributed rate limiting and caching (optional upgrade).",
    envVars: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  },
  {
    id: "sentry",
    name: "Sentry",
    description: "Error monitoring and performance tracing.",
    envVars: ["NEXT_PUBLIC_SENTRY_DSN"],
  },
  {
    id: "posthog",
    name: "PostHog",
    description: "Product analytics and session replay.",
    envVars: ["NEXT_PUBLIC_POSTHOG_KEY"],
  },
];

export function getIntegrationsHealth(): IntegrationHealth[] {
  return INTEGRATIONS.map((integration) => {
    let configured = false;

    switch (integration.id) {
      case "upstash":
        configured = envSet(...integration.envVars);
        break;
      case "stripe":
        configured =
          envSet("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET") &&
          envAnySet(
            "STRIPE_STARTER_PRICE_ID",
            "STRIPE_GROWTH_PRICE_ID",
            "STRIPE_ENTERPRISE_PRICE_ID"
          );
        break;
      case "interview-bot":
        configured = envSet("INTERVIEW_BOT_API_KEY");
        break;
      case "openai":
        configured = envAnySet(...integration.envVars);
        break;
      default:
        configured = envSet(...integration.envVars);
    }

    return { ...integration, configured };
  });
}
