import { describe, expect, it, vi } from "vitest";
import { getHRAlertRecipients } from "@/lib/agentmail";

vi.mock("agentmail", () => ({ AgentMailClient: class {} }));

describe("getHRAlertRecipients", () => {
  it("falls back to the default recipient when unset or blank", () => {
    expect(getHRAlertRecipients(undefined)).toEqual(["gen.girish@gmail.com"]);
    expect(getHRAlertRecipients(" , ")).toEqual(["gen.girish@gmail.com"]);
  });

  it("parses a comma-separated list", () => {
    expect(getHRAlertRecipients("a@example.com, b@example.com")).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });
});
