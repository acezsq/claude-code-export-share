#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process, { stdin as input, stdout as output } from "node:process";
import readline from "node:readline/promises";
import { uploadWithPinme } from "./publisher.js";
import { redactTranscript, type RedactionRule } from "./redactor.js";
import { exportStaticSite } from "./renderer.js";
import { findTranscript, listProjectTranscripts } from "./session-locator.js";
import { parseTranscript } from "./transcript-parser.js";

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
    else if (arg === "--session" && next) {
      options.sessionId = next;
      index += 1;
    } else if (arg === "--project" && next) {
      options.projectPath = next;
      index += 1;
    } else if (arg === "--claude-dir" && next) {
      options.claudeDir = next;
      index += 1;
    } else if (arg === "--out" && next) {
      options.out = next;
      index += 1;
    } else if (arg === "--redact-pattern" && next) {
      options.redactPatterns.push(next);
      index += 1;
    } else if (arg === "--no-redact") options.noRedact = true;
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
    const transcripts = await listProjectTranscripts({
      claudeDir: options.claudeDir,
      projectPath: options.projectPath ?? process.cwd(),
    });
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
