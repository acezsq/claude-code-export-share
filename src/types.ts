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
