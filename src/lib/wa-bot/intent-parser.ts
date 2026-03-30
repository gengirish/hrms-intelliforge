import { openai } from "@/lib/openai";

export type BotIntent =
  | { action: "PUNCH_IN"; mode?: "WFH" | "Office" }
  | { action: "PUNCH_OUT" }
  | { action: "LOG_TASK"; title: string; hours: number; status: "TODO" | "IN_PROGRESS" | "DONE" }
  | { action: "QUERY_TASKS" }
  | { action: "QUERY_ATTENDANCE" }
  | { action: "QUERY_STIPEND" }
  | { action: "QUERY_STATUS" }
  | { action: "ACCEPT_OFFER" }
  | { action: "HELP" }
  | { action: "UNKNOWN"; raw: string };

const SYSTEM_PROMPT = `You are an intent classifier for an HR WhatsApp bot. Parse the user's message into exactly one JSON action.

Possible actions:
- PUNCH_IN: User wants to log attendance (punch in). Extract mode as "WFH" or "Office" if mentioned, otherwise omit mode.
  Examples: "punching in", "I'm at office", "logging in from home", "WFH today", "punch in office"
- PUNCH_OUT: User wants to punch out / log out for the day.
  Examples: "punching out", "logging off", "done for the day", "signing off"
- LOG_TASK: User wants to log a task. Extract title (string), hours (number), status ("TODO", "IN_PROGRESS", or "DONE").
  Default status to "DONE" if not specified. Default hours to 1 if not specified.
  Examples: "log task: built auth module, 4 hours", "completed the API docs 2h", "task: fix bug 1.5 hours in progress"
- QUERY_TASKS: User wants to see their tasks.
  Examples: "show my tasks", "what are my tasks", "task list", "tasks this week"
- QUERY_ATTENDANCE: User wants to see their attendance.
  Examples: "show attendance", "my attendance", "attendance this week", "how many days did I work"
- QUERY_STIPEND: User wants to know their stipend amount.
  Examples: "what's my stipend", "stipend amount", "how much do I get paid", "salary"
- QUERY_STATUS: User wants to know their internship status.
  Examples: "what's my status", "internship status", "am I active", "my details"
- ACCEPT_OFFER: User wants to accept an internship offer.
  Examples: "I accept", "yes", "I agree", "confirm", "accept offer"
- HELP: User wants to know what commands are available.
  Examples: "help", "what can you do", "commands", "menu", "hi", "hello"
- UNKNOWN: Cannot determine intent.

Respond with ONLY valid JSON. No markdown, no explanation.
Examples of valid responses:
{"action":"PUNCH_IN","mode":"WFH"}
{"action":"LOG_TASK","title":"Built auth module","hours":4,"status":"DONE"}
{"action":"QUERY_TASKS"}
{"action":"HELP"}`;

function keywordFallback(text: string): BotIntent {
  const lower = text.toLowerCase().trim();

  if (/\b(i\s+accept|agree|confirm)\b/i.test(text) || lower === "yes") {
    return { action: "ACCEPT_OFFER" };
  }
  if (/\b(punch\s*out|log\s*off|sign\s*off|done\s+for\s+the\s+day)\b/.test(lower)) {
    return { action: "PUNCH_OUT" };
  }
  if (/\b(punch\s*in|log\s*in|logging\s+in|clocking\s+in)\b/.test(lower)) {
    const mode = /\b(wfh|work\s*from\s*home|home)\b/.test(lower) ? "WFH" as const
      : /\b(office)\b/.test(lower) ? "Office" as const
      : undefined;
    return { action: "PUNCH_IN", mode };
  }
  if (/\b(show|my|list|view)\b.*\b(task|tasks)\b/.test(lower) || lower === "tasks") {
    return { action: "QUERY_TASKS" };
  }
  if (/\b(show|my|list|view)\b.*\b(attendance)\b/.test(lower) || lower === "attendance") {
    return { action: "QUERY_ATTENDANCE" };
  }
  if (/\b(stipend|salary|pay|paid)\b/.test(lower)) {
    return { action: "QUERY_STIPEND" };
  }
  if (/\b(status|details|my\s+info)\b/.test(lower)) {
    return { action: "QUERY_STATUS" };
  }
  if (/\b(help|hi|hello|hey|menu|commands?)\b/.test(lower)) {
    return { action: "HELP" };
  }
  return { action: "UNKNOWN", raw: text };
}

export async function parseIntent(text: string): Promise<BotIntent> {
  if (!process.env.OPENAI_API_KEY) {
    return keywordFallback(text);
  }

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 150,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    });

    const content = res.choices[0]?.message?.content?.trim();
    if (!content) return keywordFallback(text);

    const parsed = JSON.parse(content) as Record<string, unknown>;
    const action = parsed.action as string;

    switch (action) {
      case "PUNCH_IN":
        return {
          action: "PUNCH_IN",
          mode: parsed.mode === "WFH" || parsed.mode === "Office" ? parsed.mode : undefined,
        };
      case "PUNCH_OUT":
        return { action: "PUNCH_OUT" };
      case "LOG_TASK":
        return {
          action: "LOG_TASK",
          title: String(parsed.title || "Untitled task"),
          hours: Math.min(40, Math.max(0.5, Number(parsed.hours) || 1)),
          status: (["TODO", "IN_PROGRESS", "DONE"].includes(String(parsed.status))
            ? String(parsed.status)
            : "DONE") as "TODO" | "IN_PROGRESS" | "DONE",
        };
      case "QUERY_TASKS":
        return { action: "QUERY_TASKS" };
      case "QUERY_ATTENDANCE":
        return { action: "QUERY_ATTENDANCE" };
      case "QUERY_STIPEND":
        return { action: "QUERY_STIPEND" };
      case "QUERY_STATUS":
        return { action: "QUERY_STATUS" };
      case "ACCEPT_OFFER":
        return { action: "ACCEPT_OFFER" };
      case "HELP":
        return { action: "HELP" };
      default:
        return { action: "UNKNOWN", raw: text };
    }
  } catch (e) {
    console.error("OpenAI intent parse failed, using keyword fallback:", e);
    return keywordFallback(text);
  }
}
