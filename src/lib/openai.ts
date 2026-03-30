import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set — AI features will fail");
}

const globalForOpenAI = globalThis as unknown as { openai?: OpenAI };

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

if (process.env.NODE_ENV !== "production") {
  globalForOpenAI.openai = openai;
}
