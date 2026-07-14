import { afterEach, describe, expect, it } from "vitest";
import { hasAnyLlmProvider } from "@/lib/ai/llm-json-completion";

const ENV_KEYS = [
  "OPENAI_API_KEY",
  "GROQ_API_KEY",
  "GOOGLE_API_KEY",
  "NIM_API_KEY",
] as const;

function clearLlmEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

describe("hasAnyLlmProvider", () => {
  afterEach(() => {
    clearLlmEnv();
  });

  it("returns false when no provider keys are set", () => {
    clearLlmEnv();
    expect(hasAnyLlmProvider()).toBe(false);
  });

  it("returns true when any provider key is set", () => {
    clearLlmEnv();
    process.env.GROQ_API_KEY = "gsk_test";
    expect(hasAnyLlmProvider()).toBe(true);
  });
});
