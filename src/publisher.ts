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
