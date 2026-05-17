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
