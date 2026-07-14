import { z } from "zod";
import { chatJsonCompletion, hasAnyLlmProvider } from "@/lib/ai/llm-json-completion";

const LINKEDIN_PROFILE_RE =
  /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?(\?.*)?$/i;

export const linkedInMentorDraftSchema = z.object({
  name: z.string().min(1).max(200),
  headline: z.string().max(200).nullable(),
  bio: z.string().max(5000).nullable(),
  expertise: z.array(z.string().min(1).max(80)).max(20),
  yearsExperience: z.number().int().min(0).max(60).nullable(),
  linkedinUrl: z.string().url(),
  githubUrl: z.string().url().nullable(),
  avatarUrl: z.string().url().nullable(),
});

export type LinkedInMentorDraft = z.infer<typeof linkedInMentorDraftSchema>;

export function normalizeLinkedInProfileUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!url.hostname.replace(/^www\./, "").endsWith("linkedin.com")) return null;
    if (!url.pathname.startsWith("/in/")) return null;

    const slug = url.pathname.split("/").filter(Boolean)[1];
    if (!slug) return null;

    const normalized = `https://www.linkedin.com/in/${slug}/`;
    return LINKEDIN_PROFILE_RE.test(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

async function fetchLinkedInPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; IntelliForgeBot/1.0; +https://hrms.intelliforge.tech)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8_000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.length < 200) return null;
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12_000);
  } catch {
    return null;
  }
}

export async function extractMentorDraftFromLinkedIn(input: {
  linkedinUrl: string;
  profileText?: string | null;
}): Promise<{
  draft: LinkedInMentorDraft;
  source: "pasted" | "fetched" | "url-only";
  warning?: string;
}> {
  const linkedinUrl = normalizeLinkedInProfileUrl(input.linkedinUrl);
  if (!linkedinUrl) {
    throw new Error("Enter a valid LinkedIn profile URL (linkedin.com/in/username).");
  }

  if (!hasAnyLlmProvider()) {
    throw new Error(
      "No LLM API key configured — set GROQ_API_KEY, GOOGLE_API_KEY, NIM_API_KEY, or OPENAI_API_KEY."
    );
  }

  let sourceText = input.profileText?.trim() ?? "";
  let source: "pasted" | "fetched" | "url-only" = "pasted";

  if (!sourceText) {
    const fetched = await fetchLinkedInPageText(linkedinUrl);
    if (fetched) {
      sourceText = fetched;
      source = "fetched";
    } else {
      source = "url-only";
    }
  }

  const system = `You extract mentor profile fields for an internal internship program from LinkedIn profile information.
Return JSON only with keys: name, headline, bio, expertise, yearsExperience, linkedinUrl, githubUrl, avatarUrl.
Rules:
- name: full display name
- headline: short professional title line (max 200 chars)
- bio: 2-4 sentence mentoring-oriented summary from About + experience (max 500 words)
- expertise: 5-12 skill tags (technologies, domains, roles) — strings only
- yearsExperience: integer estimate from career history, or null if unknown
- linkedinUrl: use the provided canonical URL exactly
- githubUrl: only if clearly present in the source, else null
- avatarUrl: only if a direct image URL is present in source, else null
Do not invent employers, degrees, or contact details not supported by the source.`;

  const userContent =
    sourceText.length > 0
      ? `LinkedIn URL: ${linkedinUrl}\n\nProfile source text:\n${sourceText}`
      : `LinkedIn URL: ${linkedinUrl}\n\nNo profile body was available (LinkedIn often blocks automated fetch). Infer only a minimal draft: use the slug from the URL as a tentative name (title-cased, hyphen to space), leave headline/bio sparse, and expertise empty.`;

  const raw = await chatJsonCompletion(
    [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    0.2
  );
  if (!raw) {
    throw new Error("AI did not return profile data. Try pasting the LinkedIn About section.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Failed to parse AI response. Try again or paste profile text.");
  }

  const withUrl = {
    ...(parsed as Record<string, unknown>),
    linkedinUrl,
  };

  const draft = linkedInMentorDraftSchema.parse(withUrl);

  const warning =
    source === "url-only"
      ? "LinkedIn blocked automatic fetch. Paste profile text (About + Experience) for a richer mentor profile."
      : undefined;

  return { draft, source, warning };
}
