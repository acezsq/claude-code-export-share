import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseTranscript } from "../src/transcript-parser.js";

describe("parseTranscript", () => {
  it("normalizes Claude Code JSONL into shareable messages", async () => {
    const transcript = await parseTranscript(path.join("tests", "fixtures", "basic-session.jsonl"));

    expect(transcript.sessionId).toBe("s1");
    expect(transcript.projectPath).toBe("/repo");
    expect(transcript.stats.messageCount).toBe(3);
    expect(transcript.stats.toolCallCount).toBe(1);
    expect(transcript.stats.warningCount).toBe(1);
    expect(transcript.messages.map((message: { role: string }) => message.role)).toEqual(["user", "assistant", "tool"]);
    expect(transcript.messages[1].blocks).toEqual([
      { type: "text", text: "I will look." },
      { type: "tool_call", id: "toolu_1", name: "Bash", input: { command: "ls" } },
    ]);
    expect(transcript.messages[2].blocks).toEqual([
      { type: "tool_result", toolUseId: "toolu_1", content: "README.md\nsrc" },
    ]);
  });
});
