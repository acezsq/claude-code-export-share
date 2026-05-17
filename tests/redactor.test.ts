import { describe, expect, it } from "vitest";
import { redactTranscript } from "../src/redactor.js";
import type { Transcript } from "../src/types.js";

function transcriptWith(text: string): Transcript {
  return {
    sessionId: "s1",
    exportedAt: "2026-05-17T00:00:00.000Z",
    messages: [{ id: "m1", role: "user", blocks: [{ type: "text", text }] }],
    stats: { messageCount: 1, toolCallCount: 0, warningCount: 0, redactionCount: 0 },
    warnings: [],
  };
}

describe("redactTranscript", () => {
  it("redacts common secrets in text blocks", () => {
    const redacted = redactTranscript(transcriptWith("ANTHROPIC_API_KEY=sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789"));

    expect(JSON.stringify(redacted)).toContain("[REDACTED:env_secret]");
    expect(redacted.stats.redactionCount).toBeGreaterThan(0);
  });

  it("redacts tool inputs and tool results", () => {
    const transcript: Transcript = {
      sessionId: "s1",
      exportedAt: "2026-05-17T00:00:00.000Z",
      messages: [
        {
          id: "m1",
          role: "assistant",
          blocks: [
            {
              type: "tool_call",
              id: "t1",
              name: "Bash",
              input: { command: "echo ghp_abcdefghijklmnopqrstuvwxyz0123456789ABCD" },
            },
          ],
        },
        {
          id: "m2",
          role: "tool",
          blocks: [{ type: "tool_result", toolUseId: "t1", content: "token=ghp_abcdefghijklmnopqrstuvwxyz0123456789ABCD" }],
        },
      ],
      stats: { messageCount: 2, toolCallCount: 1, warningCount: 0, redactionCount: 0 },
      warnings: [],
    };

    const redacted = redactTranscript(transcript);

    expect(JSON.stringify(redacted)).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz0123456789ABCD");
    expect(redacted.stats.redactionCount).toBe(2);
  });
});
