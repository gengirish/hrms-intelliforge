import OpenAI from "openai";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const GROQ_MODEL = "llama-3.3-70b-versatile";
const NIM_MODEL = "meta/llama-3.1-70b-instruct";
const GEMINI_MODEL = "gemini-2.0-flash";
const OPENAI_MODEL = "gpt-4o-mini";

function trimEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

export function hasAnyLlmProvider(): boolean {
  return !!(
    trimEnv("OPENAI_API_KEY") ||
    trimEnv("GROQ_API_KEY") ||
    trimEnv("GOOGLE_API_KEY") ||
    trimEnv("NIM_API_KEY")
  );
}

async function openAiCompatibleJsonCompletion(
  client: OpenAI,
  model: string,
  messages: ChatMessage[],
  temperature: number
): Promise<string> {
  const res = await client.chat.completions.create({
    model,
    temperature,
    response_format: { type: "json_object" },
    messages,
  });
  const content = res.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from model");
  }
  return content;
}

async function geminiJsonCompletion(
  apiKey: string,
  messages: ChatMessage[],
  temperature: number
): Promise<string> {
  const system = messages.find((m) => m.role === "system")?.content;
  const userParts = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n\n");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: [{ role: "user", parts: [{ text: userParts }] }],
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(30_000),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini request failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("Empty response from Gemini");
  }
  return content;
}

type Provider = {
  name: string;
  run: (messages: ChatMessage[], temperature: number) => Promise<string>;
};

function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  const groqKey = trimEnv("GROQ_API_KEY");
  if (groqKey) {
    const client = new OpenAI({
      apiKey: groqKey,
      baseURL: "https://api.groq.com/openai/v1",
    });
    providers.push({
      name: "groq",
      run: (messages, temperature) =>
        openAiCompatibleJsonCompletion(client, GROQ_MODEL, messages, temperature),
    });
  }

  const googleKey = trimEnv("GOOGLE_API_KEY");
  if (googleKey) {
    providers.push({
      name: "google-gemini",
      run: (messages, temperature) => geminiJsonCompletion(googleKey, messages, temperature),
    });
  }

  const nimKey = trimEnv("NIM_API_KEY");
  if (nimKey) {
    const client = new OpenAI({
      apiKey: nimKey,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });
    providers.push({
      name: "nvidia-nim",
      run: (messages, temperature) =>
        openAiCompatibleJsonCompletion(client, NIM_MODEL, messages, temperature),
    });
  }

  const openAiKey = trimEnv("OPENAI_API_KEY");
  if (openAiKey) {
    const client = new OpenAI({ apiKey: openAiKey });
    providers.push({
      name: "openai",
      run: (messages, temperature) =>
        openAiCompatibleJsonCompletion(client, OPENAI_MODEL, messages, temperature),
    });
  }

  return providers;
}

export async function chatJsonCompletion(
  messages: ChatMessage[],
  temperature = 0.2
): Promise<string> {
  const providers = buildProviders();
  if (providers.length === 0) {
    throw new Error(
      "No LLM API key configured. Set GROQ_API_KEY, GOOGLE_API_KEY, NIM_API_KEY, or OPENAI_API_KEY."
    );
  }

  let lastError: Error | undefined;
  for (const provider of providers) {
    try {
      return await provider.run(messages, temperature);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`LLM provider ${provider.name} failed:`, lastError.message);
    }
  }

  throw lastError ?? new Error("All LLM providers failed");
}
