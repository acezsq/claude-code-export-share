import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { exportStaticSite } from "../src/renderer.js";
import type { Transcript } from "../src/types.js";

const transcript: Transcript = {
  sessionId: "s1",
  projectPath: "/repo",
  startedAt: "2026-05-17T01:00:00.000Z",
  exportedAt: "2026-05-17T01:10:00.000Z",
  messages: [
    { id: "u1", role: "user", timestamp: "2026-05-17T01:00:00.000Z", blocks: [{ type: "text", text: "<script>alert(1)</script>" }] },
    { id: "a1", role: "assistant", blocks: [{ type: "tool_call", id: "t1", name: "Bash", input: { command: "ls" } }] },
  ],
  stats: { messageCount: 2, toolCallCount: 1, warningCount: 0, redactionCount: 1 },
  warnings: [],
};

describe("exportStaticSite", () => {
  it("writes a static viewer and keeps transcript content out of index html", async () => {
    const outDir = await mkdtemp(path.join(tmpdir(), "claude-share-site-"));

    const result = await exportStaticSite(transcript, outDir);

    await stat(path.join(outDir, "index.html"));
    await stat(path.join(outDir, "assets", "style.css"));
    await stat(path.join(outDir, "assets", "app.js"));
    const json = await readFile(path.join(outDir, "transcript.json"), "utf8");
    const html = await readFile(path.join(outDir, "index.html"), "utf8");
    expect(result.outDir).toBe(outDir);
    expect(JSON.parse(json).sessionId).toBe("s1");
    expect(html).toContain("transcript.json");
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
