import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { exportStaticSite, parseTranscript, redactTranscript } from "../src/index.js";

describe("local export integration", () => {
  it("parses, redacts, and writes a static site", async () => {
    const transcript = await parseTranscript(path.join("tests", "fixtures", "basic-session.jsonl"));
    const redacted = redactTranscript(transcript);
    const outDir = await mkdtemp(path.join(tmpdir(), "claude-share-e2e-"));

    await exportStaticSite(redacted, outDir);

    await stat(path.join(outDir, "index.html"));
    const data = JSON.parse(await readFile(path.join(outDir, "transcript.json"), "utf8")) as {
      stats: { messageCount: number };
      messages: Array<{ role: string }>;
    };
    expect(data.stats.messageCount).toBe(3);
    expect(data.messages.some((message) => message.role === "tool")).toBe(true);
  });
});
