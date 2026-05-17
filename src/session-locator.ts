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
