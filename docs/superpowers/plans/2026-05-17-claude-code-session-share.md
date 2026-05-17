# Claude Code Session Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js CLI that exports a Claude Code session transcript into a static web viewer and optionally publishes it through PinMe.

**Architecture:** The CLI is a thin command router over focused modules: session discovery, JSONL parsing, redaction, static rendering, and PinMe publishing. The static viewer is generated as `index.html`, `assets/style.css`, `assets/app.js`, and `transcript.json`, with transcript data redacted before it is written.

**Tech Stack:** Node.js 20+, TypeScript, Vitest, npm package scripts, built-in `node:fs`, `node:path`, `node:readline`, and `node:child_process`.

---

## File Structure

- Create `package.json` for package metadata, bin entry, and scripts.
- Create `tsconfig.json` for strict TypeScript compilation to `dist/`.
- Create `vitest.config.ts` for tests under `tests/**/*.test.ts`.
- Create `src/types.ts` for normalized transcript and CLI option types.
- Create `src/session-locator.ts` for Claude directory and transcript lookup.
- Create `src/transcript-parser.ts` for JSONL parsing and event normalization.
- Create `src/redactor.ts` for default and custom redaction rules.
- Create `src/renderer.ts` for static viewer generation.
- Create `src/publisher.ts` for PinMe command execution and URL parsing.
- Create `src/cli.ts` for argument parsing, prompts, command orchestration, and process exit behavior.
- Create `src/index.ts` for public exports used by tests and package consumers.
- Create `tests/fixtures/*.jsonl` for representative Claude Code transcript samples.
- Create `tests/*.test.ts` for unit and integration coverage.
- Create `README.md` for usage, PinMe setup, and public sharing warnings.
- Create `.gitignore` for Node outputs and generated exports.

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/index.ts`

- [ ] **Step 1: Create failing scaffold verification**

Create `tests/scaffold.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as api from "../src/index";

describe("package exports", () => {
  it("exports the core modules", () => {
    expect(Object.keys(api).sort()).toEqual([
      "DEFAULT_REDACTION_RULES",
      "encodeClaudeProjectPath",
      "exportStaticSite",
      "findTranscript",
      "parseTranscript",
      "parsePinmeOutput",
      "redactTranscript",
    ]);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/scaffold.test.ts`

Expected: command fails because `package.json` and the exported modules do not exist.

- [ ] **Step 3: Add npm and TypeScript scaffold**

Create `package.json`:

```json
{
  "name": "claude-code-export-share",
  "version": "0.1.0",
  "description": "Export and publish Claude Code sessions as static share pages.",
  "type": "module",
  "bin": {
    "claude-share": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "engines": {
    "node": ">=20"
  },
  "devDependencies": {
    "@types/node": "^20.12.12",
    "typescript": "^5.6.3",
    "vitest": "^2.1.9"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "types": ["node", "vitest"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
.claude-share/
coverage/
*.log
```

Create `src/index.ts` with scaffold exports that will be replaced by real modules in subsequent tasks:

```ts
export const DEFAULT_REDACTION_RULES = [];
export const encodeClaudeProjectPath = (projectPath: string) => projectPath;
export const exportStaticSite = async () => undefined;
export const findTranscript = async () => undefined;
export const parseTranscript = async () => undefined;
export const parsePinmeOutput = () => undefined;
export const redactTranscript = () => undefined;
```

- [ ] **Step 4: Install dependencies and verify GREEN**

Run: `npm install`

Run: `npm test -- tests/scaffold.test.ts`

Expected: scaffold test passes.

- [ ] **Step 5: Commit**

Run:

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore src/index.ts tests/scaffold.test.ts
git commit -m "chore: scaffold TypeScript CLI project"
```

## Task 2: Session Locator

**Files:**
- Create: `src/session-locator.ts`
- Create: `src/types.ts`
- Test: `tests/session-locator.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing locator tests**

Create `tests/session-locator.test.ts`:

```ts
import { mkdtemp, mkdir, writeFile, utimes } from "node:fs/promises";
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
```

- [ ] **Step 2: Run locator tests and verify RED**

Run: `npm test -- tests/session-locator.test.ts`

Expected: fails because `src/session-locator.ts` does not exist.

- [ ] **Step 3: Implement locator types and module**

Create `src/types.ts`:

```ts
export type TranscriptLocation = {
  path: string;
  sessionId: string;
  projectPath?: string;
  modifiedAt: Date;
};

export type FindTranscriptOptions = {
  claudeDir?: string;
  projectPath?: string;
  sessionId?: string;
  current?: boolean;
};
```

Create `src/session-locator.ts`:

```ts
import { readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FindTranscriptOptions, TranscriptLocation } from "./types.js";

export function getClaudeDir(override?: string): string {
  return path.resolve(override ?? process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude"));
}

export function encodeClaudeProjectPath(projectPath: string): string {
  return path.resolve(projectPath).replaceAll(path.sep, "-").replace(/[^A-Za-z0-9_.-]/g, "-");
}

export async function listProjectTranscripts(options: FindTranscriptOptions): Promise<TranscriptLocation[]> {
  if (!options.projectPath) {
    throw new Error("projectPath is required when listing project transcripts");
  }

  const claudeDir = getClaudeDir(options.claudeDir);
  const projectDir = path.join(claudeDir, "projects", encodeClaudeProjectPath(options.projectPath));
  let entries: string[];
  try {
    entries = await readdir(projectDir);
  } catch {
    return [];
  }

  const transcripts = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".jsonl"))
      .map(async (entry) => {
        const transcriptPath = path.join(projectDir, entry);
        const stats = await stat(transcriptPath);
        return {
          path: transcriptPath,
          sessionId: entry.replace(/\.jsonl$/, ""),
          projectPath: options.projectPath,
          modifiedAt: stats.mtime,
        };
      }),
  );

  return transcripts.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}

async function findTranscriptBySessionId(claudeDir: string, sessionId: string): Promise<TranscriptLocation | undefined> {
  const projectsDir = path.join(claudeDir, "projects");
  let projects: string[];
  try {
    projects = await readdir(projectsDir);
  } catch {
    return undefined;
  }

  for (const project of projects) {
    const candidate = path.join(projectsDir, project, `${sessionId}.jsonl`);
    try {
      const stats = await stat(candidate);
      return { path: candidate, sessionId, modifiedAt: stats.mtime };
    } catch {
      continue;
    }
  }

  return undefined;
}

export async function findTranscript(options: FindTranscriptOptions): Promise<TranscriptLocation> {
  const claudeDir = getClaudeDir(options.claudeDir);

  if (options.sessionId) {
    const found = await findTranscriptBySessionId(claudeDir, options.sessionId);
    if (!found) {
      throw new Error(`No Claude Code transcript found for session ${options.sessionId}`);
    }
    return found;
  }

  const projectPath = options.projectPath ?? process.cwd();
  const transcripts = await listProjectTranscripts({ ...options, claudeDir, projectPath });
  if (transcripts.length === 0) {
    throw new Error(`No Claude Code transcripts found for project ${projectPath}`);
  }

  return transcripts[0];
}
```

Update `src/index.ts`:

```ts
export * from "./types.js";
export * from "./session-locator.js";
export const DEFAULT_REDACTION_RULES = [];
export const exportStaticSite = async () => undefined;
export const parseTranscript = async () => undefined;
export const parsePinmeOutput = () => undefined;
export const redactTranscript = () => undefined;
```

- [ ] **Step 4: Run locator tests and verify GREEN**

Run: `npm test -- tests/session-locator.test.ts`

Expected: locator tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/types.ts src/session-locator.ts src/index.ts tests/session-locator.test.ts
git commit -m "feat: locate Claude Code transcripts"
```

## Task 3: Transcript Parser

**Files:**
- Create: `src/transcript-parser.ts`
- Create: `tests/fixtures/basic-session.jsonl`
- Create: `tests/transcript-parser.test.ts`
- Modify: `src/types.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing parser tests and fixture**

Create `tests/fixtures/basic-session.jsonl`:

```jsonl
{"type":"file-history-snapshot","messageId":"ignored","snapshot":{}}
{"type":"user","sessionId":"s1","cwd":"/repo","timestamp":"2026-05-17T01:00:00.000Z","uuid":"u1","message":{"role":"user","content":"Please inspect the repo"}}
{"type":"assistant","sessionId":"s1","cwd":"/repo","timestamp":"2026-05-17T01:00:01.000Z","uuid":"a1","parentUuid":"u1","message":{"role":"assistant","content":[{"type":"text","text":"I will look."},{"type":"tool_use","id":"toolu_1","name":"Bash","input":{"command":"ls"}}],"usage":{"input_tokens":10,"output_tokens":5}}}
{"type":"user","sessionId":"s1","cwd":"/repo","timestamp":"2026-05-17T01:00:02.000Z","uuid":"u2","parentUuid":"a1","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_1","content":"README.md\nsrc"}]}}
not json
```

Create `tests/transcript-parser.test.ts`:

```ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseTranscript } from "../src/transcript-parser";

describe("parseTranscript", () => {
  it("normalizes Claude Code JSONL into shareable messages", async () => {
    const transcript = await parseTranscript(path.join("tests", "fixtures", "basic-session.jsonl"));

    expect(transcript.sessionId).toBe("s1");
    expect(transcript.projectPath).toBe("/repo");
    expect(transcript.stats.messageCount).toBe(3);
    expect(transcript.stats.toolCallCount).toBe(1);
    expect(transcript.stats.warningCount).toBe(1);
    expect(transcript.messages.map((message) => message.role)).toEqual(["user", "assistant", "tool"]);
    expect(transcript.messages[1].blocks).toEqual([
      { type: "text", text: "I will look." },
      { type: "tool_call", id: "toolu_1", name: "Bash", input: { command: "ls" } },
    ]);
    expect(transcript.messages[2].blocks).toEqual([
      { type: "tool_result", toolUseId: "toolu_1", content: "README.md\nsrc" },
    ]);
  });
});
```

- [ ] **Step 2: Run parser tests and verify RED**

Run: `npm test -- tests/transcript-parser.test.ts`

Expected: fails because `parseTranscript` is not implemented.

- [ ] **Step 3: Add transcript types and parser**

Extend `src/types.ts` with:

```ts
export type MessageRole = "user" | "assistant" | "system" | "tool";

export type MessageBlock =
  | { type: "text"; text: string }
  | { type: "tool_call"; id: string; name: string; input: unknown }
  | { type: "tool_result"; toolUseId?: string; content: string };

export type TranscriptMessage = {
  id: string;
  parentId?: string;
  role: MessageRole;
  timestamp?: string;
  blocks: MessageBlock[];
};

export type TranscriptStats = {
  messageCount: number;
  toolCallCount: number;
  warningCount: number;
  redactionCount: number;
};

export type Transcript = {
  sessionId: string;
  projectPath?: string;
  startedAt?: string;
  exportedAt: string;
  messages: TranscriptMessage[];
  stats: TranscriptStats;
  warnings: string[];
};
```

Create `src/transcript-parser.ts`:

```ts
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { MessageBlock, Transcript, TranscriptMessage } from "./types.js";

type RawEvent = {
  type?: string;
  sessionId?: string;
  cwd?: string;
  timestamp?: string;
  uuid?: string;
  parentUuid?: string;
  message?: {
    role?: string;
    content?: unknown;
  };
};

function stringifyToolResult(content: unknown): string {
  if (typeof content === "string") return content;
  return JSON.stringify(content, null, 2);
}

function normalizeBlocks(content: unknown): MessageBlock[] {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }

  if (!Array.isArray(content)) {
    return [{ type: "text", text: stringifyToolResult(content) }];
  }

  const blocks: MessageBlock[] = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const block = item as Record<string, unknown>;
    if (block.type === "text" && typeof block.text === "string") {
      blocks.push({ type: "text", text: block.text });
    }
    if (block.type === "tool_use" && typeof block.id === "string" && typeof block.name === "string") {
      blocks.push({ type: "tool_call", id: block.id, name: block.name, input: block.input });
    }
    if (block.type === "tool_result") {
      blocks.push({
        type: "tool_result",
        toolUseId: typeof block.tool_use_id === "string" ? block.tool_use_id : undefined,
        content: stringifyToolResult(block.content ?? ""),
      });
    }
  }

  return blocks;
}

function normalizeRole(event: RawEvent, blocks: MessageBlock[]): TranscriptMessage["role"] {
  if (blocks.length > 0 && blocks.every((block) => block.type === "tool_result")) {
    return "tool";
  }
  if (event.type === "assistant") return "assistant";
  if (event.type === "system") return "system";
  return "user";
}

export async function parseTranscript(filePath: string): Promise<Transcript> {
  const messages: TranscriptMessage[] = [];
  const warnings: string[] = [];
  let sessionId = "";
  let projectPath: string | undefined;
  let startedAt: string | undefined;
  let toolCallCount = 0;
  let lineNumber = 0;

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lineNumber += 1;
    if (!line.trim()) continue;

    let event: RawEvent;
    try {
      event = JSON.parse(line) as RawEvent;
    } catch {
      warnings.push(`Line ${lineNumber}: skipped malformed JSON`);
      continue;
    }

    if (!event.message || event.type === "file-history-snapshot" || event.type === "queue-operation") {
      continue;
    }

    const blocks = normalizeBlocks(event.message.content);
    if (blocks.length === 0) continue;
    toolCallCount += blocks.filter((block) => block.type === "tool_call").length;
    sessionId ||= event.sessionId ?? "";
    projectPath ||= event.cwd;
    startedAt ||= event.timestamp;

    messages.push({
      id: event.uuid ?? `${lineNumber}`,
      parentId: event.parentUuid,
      role: normalizeRole(event, blocks),
      timestamp: event.timestamp,
      blocks,
    });
  }

  if (messages.length === 0) {
    throw new Error("Transcript did not contain any shareable messages");
  }

  return {
    sessionId,
    projectPath,
    startedAt,
    exportedAt: new Date().toISOString(),
    messages,
    stats: {
      messageCount: messages.length,
      toolCallCount,
      warningCount: warnings.length,
      redactionCount: 0,
    },
    warnings,
  };
}
```

Update `src/index.ts` to export `parseTranscript` from the real module.

- [ ] **Step 4: Run parser tests and verify GREEN**

Run: `npm test -- tests/transcript-parser.test.ts`

Expected: parser tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/types.ts src/transcript-parser.ts src/index.ts tests/fixtures/basic-session.jsonl tests/transcript-parser.test.ts
git commit -m "feat: parse Claude Code transcripts"
```

## Task 4: Redaction

**Files:**
- Create: `src/redactor.ts`
- Create: `tests/redactor.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing redaction tests**

Create `tests/redactor.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Transcript } from "../src/types";
import { redactTranscript } from "../src/redactor";

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
          blocks: [{ type: "tool_call", id: "t1", name: "Bash", input: { command: "echo ghp_abcdefghijklmnopqrstuvwxyz0123456789ABCD" } }],
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
```

- [ ] **Step 2: Run redaction tests and verify RED**

Run: `npm test -- tests/redactor.test.ts`

Expected: fails because `src/redactor.ts` does not exist.

- [ ] **Step 3: Implement redactor**

Create `src/redactor.ts`:

```ts
import type { MessageBlock, Transcript } from "./types.js";

export type RedactionRule = {
  name: string;
  pattern: RegExp;
};

export const DEFAULT_REDACTION_RULES: RedactionRule[] = [
  { name: "env_secret", pattern: /\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*\s*=\s*["']?[^"'\s]+/gi },
  { name: "anthropic_key", pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { name: "openai_key", pattern: /\bsk-[A-Za-z0-9_-]{32,}\b/g },
  { name: "github_token", pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g },
  { name: "aws_access_key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "jwt", pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g },
  { name: "ssh_private_key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
];

function redactString(value: string, rules: RedactionRule[]): { value: string; count: number } {
  let result = value;
  let count = 0;
  for (const rule of rules) {
    result = result.replace(rule.pattern, () => {
      count += 1;
      return `[REDACTED:${rule.name}]`;
    });
  }
  return { value: result, count };
}

function redactUnknown(value: unknown, rules: RedactionRule[]): { value: unknown; count: number } {
  const serialized = JSON.stringify(value, null, 2);
  const redacted = redactString(serialized, rules);
  return { value: JSON.parse(redacted.value), count: redacted.count };
}

function redactBlock(block: MessageBlock, rules: RedactionRule[]): { block: MessageBlock; count: number } {
  if (block.type === "text") {
    const redacted = redactString(block.text, rules);
    return { block: { ...block, text: redacted.value }, count: redacted.count };
  }
  if (block.type === "tool_result") {
    const redacted = redactString(block.content, rules);
    return { block: { ...block, content: redacted.value }, count: redacted.count };
  }
  const redacted = redactUnknown(block.input, rules);
  return { block: { ...block, input: redacted.value }, count: redacted.count };
}

export function redactTranscript(transcript: Transcript, extraRules: RedactionRule[] = []): Transcript {
  const rules = [...DEFAULT_REDACTION_RULES, ...extraRules];
  let redactionCount = 0;

  const messages = transcript.messages.map((message) => ({
    ...message,
    blocks: message.blocks.map((block) => {
      const redacted = redactBlock(block, rules);
      redactionCount += redacted.count;
      return redacted.block;
    }),
  }));

  return {
    ...transcript,
    messages,
    stats: {
      ...transcript.stats,
      redactionCount,
    },
  };
}
```

Update `src/index.ts` to export from `src/redactor.ts`.

- [ ] **Step 4: Run redaction tests and verify GREEN**

Run: `npm test -- tests/redactor.test.ts`

Expected: redaction tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/redactor.ts src/index.ts tests/redactor.test.ts
git commit -m "feat: redact transcript secrets"
```

## Task 5: Static Renderer

**Files:**
- Create: `src/renderer.ts`
- Create: `tests/renderer.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing renderer tests**

Create `tests/renderer.test.ts`:

```ts
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Transcript } from "../src/types";
import { exportStaticSite } from "../src/renderer";

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
  it("writes a static viewer and escaped transcript JSON", async () => {
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
```

- [ ] **Step 2: Run renderer tests and verify RED**

Run: `npm test -- tests/renderer.test.ts`

Expected: fails because `src/renderer.ts` does not exist.

- [ ] **Step 3: Implement renderer**

Create `src/renderer.ts` with:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Transcript } from "./types.js";

export type ExportResult = {
  outDir: string;
  files: string[];
};

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Claude Code Session Share</title>
  <link rel="stylesheet" href="./assets/style.css" />
</head>
<body>
  <main>
    <header class="topbar">
      <div>
        <p class="eyebrow">Claude Code Session</p>
        <h1 id="session-title">Loading session...</h1>
        <p id="session-meta" class="meta"></p>
      </div>
      <div class="actions">
        <input id="search" type="search" aria-label="Search transcript" />
        <button id="expand-tools" type="button">Expand tools</button>
        <button id="collapse-tools" type="button">Collapse tools</button>
      </div>
    </header>
    <section class="notice">This is a public exported transcript. Redaction is best-effort and does not guarantee that all sensitive data was removed.</section>
    <section id="messages" class="messages" aria-live="polite"></section>
  </main>
  <script type="module" src="./assets/app.js"></script>
</body>
</html>
`;

const css = `:root {
  color-scheme: light;
  --bg: #f7f5ef;
  --panel: #ffffff;
  --ink: #17202a;
  --muted: #68707a;
  --line: #ded8cc;
  --user: #0f766e;
  --assistant: #7c3aed;
  --tool: #92400e;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--ink); }
main { width: min(1120px, calc(100vw - 32px)); margin: 0 auto; padding: 32px 0; }
.topbar { display: flex; gap: 20px; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--line); padding-bottom: 20px; }
.eyebrow { margin: 0 0 6px; color: var(--muted); font-size: 13px; text-transform: uppercase; letter-spacing: 0; }
h1 { margin: 0; font-size: 28px; line-height: 1.2; }
.meta { color: var(--muted); margin: 8px 0 0; font-size: 14px; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
input, button { height: 36px; border-radius: 6px; border: 1px solid var(--line); background: white; color: var(--ink); padding: 0 12px; font: inherit; }
button { cursor: pointer; }
.notice { margin: 20px 0; border: 1px solid #f0c36a; background: #fff7db; color: #5f4308; padding: 12px 14px; border-radius: 6px; font-size: 14px; }
.messages { display: grid; gap: 14px; }
.message { background: var(--panel); border: 1px solid var(--line); border-left: 5px solid var(--muted); border-radius: 8px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
.message.user { border-left-color: var(--user); }
.message.assistant { border-left-color: var(--assistant); }
.message.tool { border-left-color: var(--tool); }
.role { margin: 0 0 10px; color: var(--muted); font-size: 13px; font-weight: 700; text-transform: uppercase; }
.block { white-space: pre-wrap; line-height: 1.55; overflow-wrap: anywhere; }
details { margin-top: 8px; }
summary { cursor: pointer; color: var(--tool); font-weight: 700; }
pre { overflow: auto; background: #151a22; color: #edf2f7; padding: 12px; border-radius: 6px; font-size: 13px; line-height: 1.5; }
.hidden { display: none; }
@media (max-width: 760px) {
  main { width: min(100vw - 20px, 1120px); padding: 18px 0; }
  .topbar { display: block; }
  .actions { justify-content: flex-start; margin-top: 16px; }
  input { width: 100%; }
}
`;

const js = `const messagesEl = document.querySelector("#messages");
const searchEl = document.querySelector("#search");
const titleEl = document.querySelector("#session-title");
const metaEl = document.querySelector("#session-meta");
const expandTools = document.querySelector("#expand-tools");
const collapseTools = document.querySelector("#collapse-tools");

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function renderBlock(block) {
  if (block.type === "text") return \`<div class="block">\${escapeHtml(block.text)}</div>\`;
  if (block.type === "tool_call") {
    return \`<details><summary>Tool call: \${escapeHtml(block.name)}</summary><pre>\${escapeHtml(JSON.stringify(block.input, null, 2))}</pre></details>\`;
  }
  return \`<details><summary>Tool result</summary><pre>\${escapeHtml(block.content)}</pre></details>\`;
}

function renderMessage(message) {
  const text = JSON.stringify(message).toLowerCase();
  return \`<article class="message \${message.role}" data-search="\${escapeHtml(text)}">
    <p class="role">\${escapeHtml(message.role)}\${message.timestamp ? " · " + escapeHtml(message.timestamp) : ""}</p>
    \${message.blocks.map(renderBlock).join("")}
  </article>\`;
}

function applySearch() {
  const query = searchEl.value.trim().toLowerCase();
  for (const item of messagesEl.querySelectorAll(".message")) {
    item.classList.toggle("hidden", query.length > 0 && !item.dataset.search.includes(query));
  }
}

const transcript = await fetch("./transcript.json").then((response) => response.json());
titleEl.textContent = transcript.sessionId || "Untitled session";
metaEl.textContent = [
  transcript.projectPath,
  \`\${transcript.stats.messageCount} messages\`,
  \`\${transcript.stats.toolCallCount} tool calls\`,
  \`\${transcript.stats.redactionCount} redactions\`,
].filter(Boolean).join(" · ");
messagesEl.innerHTML = transcript.messages.map(renderMessage).join("");
searchEl.addEventListener("input", applySearch);
expandTools.addEventListener("click", () => messagesEl.querySelectorAll("details").forEach((item) => item.open = true));
collapseTools.addEventListener("click", () => messagesEl.querySelectorAll("details").forEach((item) => item.open = false));
`;

export async function exportStaticSite(transcript: Transcript, outDir: string): Promise<ExportResult> {
  const assetsDir = path.join(outDir, "assets");
  await mkdir(assetsDir, { recursive: true });
  const files = [
    ["index.html", html],
    ["assets/style.css", css],
    ["assets/app.js", js],
    ["transcript.json", JSON.stringify(transcript, null, 2)],
  ] as const;

  for (const [relativePath, content] of files) {
    await writeFile(path.join(outDir, relativePath), content, "utf8");
  }

  return { outDir, files: files.map(([relativePath]) => relativePath) };
}
```

Update `src/index.ts` to export from `src/renderer.ts`.

- [ ] **Step 4: Run renderer tests and verify GREEN**

Run: `npm test -- tests/renderer.test.ts`

Expected: renderer tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/renderer.ts src/index.ts tests/renderer.test.ts
git commit -m "feat: render static transcript viewer"
```

## Task 6: PinMe Publisher

**Files:**
- Create: `src/publisher.ts`
- Create: `tests/publisher.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing publisher tests**

Create `tests/publisher.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parsePinmeOutput } from "../src/publisher";

describe("parsePinmeOutput", () => {
  it("extracts an https URL and CID from PinMe output", () => {
    const parsed = parsePinmeOutput("CID: bafyabc123\nURL: https://bafyabc123.ipfs.pinme.dev\n");

    expect(parsed.url).toBe("https://bafyabc123.ipfs.pinme.dev");
    expect(parsed.cid).toBe("bafyabc123");
  });

  it("returns undefined fields when output has no URL", () => {
    expect(parsePinmeOutput("login required")).toEqual({});
  });
});
```

- [ ] **Step 2: Run publisher tests and verify RED**

Run: `npm test -- tests/publisher.test.ts`

Expected: fails because `src/publisher.ts` does not exist.

- [ ] **Step 3: Implement publisher**

Create `src/publisher.ts`:

```ts
import { spawn } from "node:child_process";

export type PinmeUploadResult = {
  url?: string;
  cid?: string;
  stdout: string;
  stderr: string;
};

export function parsePinmeOutput(output: string): { url?: string; cid?: string } {
  const url = output.match(/https:\/\/[^\s)]+/i)?.[0];
  const cid = output.match(/\b(?:bafy|Qm)[A-Za-z0-9]+\b/)?.[0];
  return { ...(url ? { url } : {}), ...(cid ? { cid } : {}) };
}

export async function uploadWithPinme(outDir: string): Promise<PinmeUploadResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn("pinme", ["upload", outDir], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(new Error(`Failed to run pinme: ${error.message}`));
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`pinme upload failed with exit code ${code}\n${stdout}\n${stderr}`));
        return;
      }
      resolve({ ...parsePinmeOutput(`${stdout}\n${stderr}`), stdout, stderr });
    });
  });
}
```

Update `src/index.ts` to export from `src/publisher.ts`.

- [ ] **Step 4: Run publisher tests and verify GREEN**

Run: `npm test -- tests/publisher.test.ts`

Expected: publisher tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/publisher.ts src/index.ts tests/publisher.test.ts
git commit -m "feat: add PinMe publisher"
```

## Task 7: CLI Orchestration

**Files:**
- Create: `src/cli.ts`
- Create: `tests/cli.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing CLI argument tests**

Create `tests/cli.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseCliArgs } from "../src/cli";

describe("parseCliArgs", () => {
  it("parses publish current with yes", () => {
    expect(parseCliArgs(["publish", "--current", "--yes"])).toMatchObject({
      command: "publish",
      current: true,
      yes: true,
    });
  });

  it("parses export session with output path", () => {
    expect(parseCliArgs(["export", "--session", "s1", "--out", "share"])).toMatchObject({
      command: "export",
      sessionId: "s1",
      out: "share",
    });
  });
});
```

- [ ] **Step 2: Run CLI tests and verify RED**

Run: `npm test -- tests/cli.test.ts`

Expected: fails because `src/cli.ts` does not exist.

- [ ] **Step 3: Implement CLI**

Create `src/cli.ts` with:

```ts
#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { findTranscript, listProjectTranscripts } from "./session-locator.js";
import { parseTranscript } from "./transcript-parser.js";
import { redactTranscript, type RedactionRule } from "./redactor.js";
import { exportStaticSite } from "./renderer.js";
import { uploadWithPinme } from "./publisher.js";

export type CliCommand = "list" | "export" | "publish" | "help";

export type CliOptions = {
  command: CliCommand;
  current?: boolean;
  sessionId?: string;
  projectPath?: string;
  claudeDir?: string;
  out?: string;
  noRedact?: boolean;
  yes?: boolean;
  keepTemp?: boolean;
  redactPatterns: string[];
};

export function parseCliArgs(argv: string[]): CliOptions {
  const [commandRaw = "help", ...rest] = argv;
  const command = ["list", "export", "publish"].includes(commandRaw) ? (commandRaw as CliCommand) : "help";
  const options: CliOptions = { command, redactPatterns: [] };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    const next = rest[index + 1];
    if (arg === "--current") options.current = true;
    else if (arg === "--session" && next) { options.sessionId = next; index += 1; }
    else if (arg === "--project" && next) { options.projectPath = next; index += 1; }
    else if (arg === "--claude-dir" && next) { options.claudeDir = next; index += 1; }
    else if (arg === "--out" && next) { options.out = next; index += 1; }
    else if (arg === "--redact-pattern" && next) { options.redactPatterns.push(next); index += 1; }
    else if (arg === "--no-redact") options.noRedact = true;
    else if (arg === "--yes") options.yes = true;
    else if (arg === "--keep-temp") options.keepTemp = true;
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  return options;
}

function usage(): string {
  return `Usage:
  claude-share list [--project <path>] [--claude-dir <path>]
  claude-share export --current [--out <path>]
  claude-share export --session <id> [--out <path>]
  claude-share publish --current [--yes]
  claude-share publish --session <id> [--yes]`;
}

function customRules(patterns: string[]): RedactionRule[] {
  return patterns.map((pattern, index) => ({ name: `custom_${index + 1}`, pattern: new RegExp(pattern, "g") }));
}

async function confirmPublish(options: CliOptions, summary: string): Promise<boolean> {
  if (options.yes) return true;
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`${summary}\n\nThis will publish a public, permanent page through PinMe/IPFS.\nContinue? [y/N] `);
  rl.close();
  return answer.trim().toLowerCase() === "y";
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const options = parseCliArgs(argv);
  if (options.command === "help") {
    console.log(usage());
    return;
  }

  if (options.command === "list") {
    const transcripts = await listProjectTranscripts({ claudeDir: options.claudeDir, projectPath: options.projectPath ?? process.cwd() });
    for (const transcript of transcripts) {
      console.log(`${transcript.sessionId}\t${transcript.modifiedAt.toISOString()}\t${transcript.path}`);
    }
    return;
  }

  const location = await findTranscript({
    claudeDir: options.claudeDir,
    projectPath: options.projectPath ?? process.cwd(),
    sessionId: options.sessionId,
    current: options.current,
  });
  const parsed = await parseTranscript(location.path);
  const transcript = options.noRedact ? parsed : redactTranscript(parsed, customRules(options.redactPatterns));
  const outDir = path.resolve(options.out ?? path.join(".claude-share", transcript.sessionId || location.sessionId));
  await mkdir(outDir, { recursive: true });
  await exportStaticSite(transcript, outDir);

  const summary = [
    `Project: ${transcript.projectPath ?? location.projectPath ?? "unknown"}`,
    `Session: ${transcript.sessionId || location.sessionId}`,
    `Started: ${transcript.startedAt ?? "unknown"}`,
    `Messages: ${transcript.stats.messageCount}`,
    `Tool calls: ${transcript.stats.toolCallCount}`,
    `Redactions: ${transcript.stats.redactionCount}`,
    `Output: ${outDir}`,
  ].join("\n");

  if (options.command === "export") {
    console.log(summary);
    return;
  }

  if (!(await confirmPublish(options, summary))) {
    console.log("Publish cancelled.");
    return;
  }

  const upload = await uploadWithPinme(outDir);
  console.log(upload.url ?? upload.stdout.trim());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
```

Update `src/index.ts` to export CLI helpers if useful:

```ts
export * from "./types.js";
export * from "./session-locator.js";
export * from "./transcript-parser.js";
export * from "./redactor.js";
export * from "./renderer.js";
export * from "./publisher.js";
```

- [ ] **Step 4: Run CLI tests and verify GREEN**

Run: `npm test -- tests/cli.test.ts`

Expected: CLI tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/cli.ts src/index.ts tests/cli.test.ts
git commit -m "feat: add claude-share CLI"
```

## Task 8: End-to-End Export and Documentation

**Files:**
- Create: `tests/export-integration.test.ts`
- Create: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Write failing integration test**

Create `tests/export-integration.test.ts`:

```ts
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseTranscript, redactTranscript, exportStaticSite } from "../src/index";

describe("local export integration", () => {
  it("parses, redacts, and writes a static site", async () => {
    const transcript = await parseTranscript(path.join("tests", "fixtures", "basic-session.jsonl"));
    const redacted = redactTranscript(transcript);
    const outDir = await mkdtemp(path.join(tmpdir(), "claude-share-e2e-"));

    await exportStaticSite(redacted, outDir);

    await stat(path.join(outDir, "index.html"));
    const data = JSON.parse(await readFile(path.join(outDir, "transcript.json"), "utf8"));
    expect(data.stats.messageCount).toBe(3);
    expect(data.messages.some((message: { role: string }) => message.role === "tool")).toBe(true);
  });
});
```

- [ ] **Step 2: Run integration test and verify RED or existing GREEN reason**

Run: `npm test -- tests/export-integration.test.ts`

Expected: if earlier tasks are complete, this may pass immediately because it verifies assembled behavior. If it fails, the failure should point to missing integration wiring and must be fixed in Step 3.

- [ ] **Step 3: Add README and final script polish**

Create `README.md`:

```md
# Claude Code Export Share

Export a Claude Code session transcript into a static web page and publish it as a public, permanent PinMe/IPFS link.

## Install

```bash
npm install
npm run build
```

For PinMe publishing:

```bash
npm install -g pinme
pinme login
```

## Usage

List sessions for the current project:

```bash
npm run build
node dist/cli.js list
```

Export the latest session for the current project:

```bash
node dist/cli.js export --current
```

Publish the latest session:

```bash
node dist/cli.js publish --current
```

Publish a known session without the confirmation prompt:

```bash
node dist/cli.js publish --session <session-id> --yes
```

## Public Sharing Warning

Published pages are public and intended to be permanent. Claude Code transcripts are plaintext and can contain prompts, file contents, command output, tool results, and secrets. This tool redacts common secret patterns by default, but redaction is best-effort and cannot guarantee that every sensitive value is removed.

## Claude Code Slash Command

Create a project command such as `.claude/commands/export-share.md`:

```md
Run the local exporter and publish the current Claude Code conversation:

\```bash
node /absolute/path/to/claude-code-export-share/dist/cli.js publish --current
\```
```

Then use `/export-share` inside Claude Code.
```

Ensure `package.json` keeps `bin.claude-share` pointing at `./dist/cli.js`.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all commands exit with code 0.

- [ ] **Step 5: Manual local export smoke test**

Run:

```bash
node dist/cli.js export --session e92f8f11-14b9-412d-9a31-a46e61a7c32e --claude-dir /Users/zsq/.claude --out .claude-share/smoke
```

Expected: command prints session metadata and `.claude-share/smoke/index.html` exists. If the session ID is unavailable on the current machine, run `node dist/cli.js list --project /Users/zsq` and use a listed session ID.

- [ ] **Step 6: Commit**

Run:

```bash
git add tests/export-integration.test.ts README.md package.json
git commit -m "docs: document export and publish workflow"
```

## Self-Review Notes

- Spec coverage: the plan covers transcript discovery, JSONL parsing, redaction, static rendering, PinMe publishing, CLI commands, public permanence warning, and tests.
- Scope check: private sharing, expiring links, and non-PinMe providers remain outside the MVP.
- Type consistency: `Transcript`, `TranscriptMessage`, `MessageBlock`, `TranscriptStats`, and `TranscriptLocation` are introduced before use by subsequent modules.
