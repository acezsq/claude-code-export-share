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
  if (value === undefined) {
    return { value, count: 0 };
  }
  const serialized = JSON.stringify(value, null, 2);
  const redacted = redactString(serialized, rules);
  return { value: JSON.parse(redacted.value) as unknown, count: redacted.count };
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
