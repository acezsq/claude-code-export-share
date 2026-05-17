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

function stringifyContent(content: unknown): string {
  if (typeof content === "string") return content;
  const serialized = JSON.stringify(content, null, 2);
  return serialized ?? "";
}

function normalizeBlocks(content: unknown): MessageBlock[] {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }

  if (!Array.isArray(content)) {
    return [{ type: "text", text: stringifyContent(content) }];
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
        content: stringifyContent(block.content ?? ""),
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
