import { mkdir, mkdtemp, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { encodeClaudeProjectPath, findTranscript, listProjectTranscripts } from "../src/session-locator";

describe("encodeClaudeProjectPath", () => {
  it("matches Claude Code project directory naming for absolute paths", () => {
    expect(encodeClaudeProjectPath("/Users/zsq/ai/demo")).toBe("-Users-zsq-ai-demo");
  });
});

describe("findTranscript", () => {
  it("finds the newest transcript for the selected project", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "claude-share-"));
    const projectPath = "/Users/zsq/ai/demo";
    const projectDir = path.join(root, "projects", encodeClaudeProjectPath(projectPath));
    await mkdir(projectDir, { recursive: true });
    const older = path.join(projectDir, "older.jsonl");
    const newer = path.join(projectDir, "newer.jsonl");
    await writeFile(older, "{}\n");
    await writeFile(newer, "{}\n");
    await utimes(older, new Date("2026-01-01"), new Date("2026-01-01"));
    await utimes(newer, new Date("2026-01-02"), new Date("2026-01-02"));

    const found = await findTranscript({ claudeDir: root, projectPath, current: true });

    expect(found.path).toBe(newer);
    expect(found.sessionId).toBe("newer");
    expect(found.projectPath).toBe(projectPath);
  });

  it("resolves an explicit session id across projects", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "claude-share-"));
    const projectDir = path.join(root, "projects", "-Users-zsq-ai-demo");
    await mkdir(projectDir, { recursive: true });
    await writeFile(path.join(projectDir, "abc-123.jsonl"), "{}\n");

    const found = await findTranscript({ claudeDir: root, sessionId: "abc-123" });

    expect(found.path.endsWith("abc-123.jsonl")).toBe(true);
  });
});

describe("listProjectTranscripts", () => {
  it("returns transcript metadata sorted newest first", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "claude-share-"));
    const projectPath = "/repo";
    const projectDir = path.join(root, "projects", encodeClaudeProjectPath(projectPath));
    await mkdir(projectDir, { recursive: true });
    await writeFile(path.join(projectDir, "a.jsonl"), "{}\n");
    await writeFile(path.join(projectDir, "b.jsonl"), "{}\n");

    const transcripts = await listProjectTranscripts({ claudeDir: root, projectPath });

    expect(transcripts.map((item) => item.sessionId).sort()).toEqual(["a", "b"]);
  });
});
