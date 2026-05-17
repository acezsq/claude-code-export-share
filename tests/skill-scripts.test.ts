import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve(".claude/skills/export-share/scripts/export-share.sh");

function runScript(args: string[], env: NodeJS.ProcessEnv = {}): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(scriptPath, args, {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function makeFakeBin(name: string, body: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "claude-share-bin-"));
  const file = path.join(dir, name);
  await writeFile(file, `#!/usr/bin/env bash\n${body}\n`, { mode: 0o755 });
  return dir;
}

describe("export-share skill script", () => {
  it("shows command help", async () => {
    const result = await runScript(["help"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("publish-current");
    expect(result.stdout).toContain("install-cli");
  });

  it("routes publish-current to claude-share publish --current --yes", async () => {
    const binDir = await makeFakeBin("claude-share", 'printf "%s\\n" "$@"');

    const result = await runScript(["publish-current"], { PATH: `${binDir}:${process.env.PATH ?? ""}` });

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe("publish\n--current\n--yes");
  });

  it("routes list to claude-share list", async () => {
    const binDir = await makeFakeBin("claude-share", 'printf "%s\\n" "$@"');

    const result = await runScript(["list"], { PATH: `${binDir}:${process.env.PATH ?? ""}` });

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe("list");
  });

  it("prints install guidance when claude-share is missing", async () => {
    const result = await runScript(["publish-current"], { PATH: "/usr/bin:/bin" });

    expect(result.code).toBe(127);
    expect(result.stderr).toContain("npm install -g github:acezsq/claude-code-export-share");
  });

  it("install-cli runs npm global install for the GitHub package", async () => {
    const binDir = await makeFakeBin("npm", 'printf "%s\\n" "$@"');

    const result = await runScript(["install-cli"], { PATH: `${binDir}:${process.env.PATH ?? ""}` });

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe("install\n-g\ngithub:acezsq/claude-code-export-share");
  });

  it("is executable", async () => {
    const file = await stat(scriptPath);

    expect(file.mode & 0o111).toBeGreaterThan(0);
  });
});
