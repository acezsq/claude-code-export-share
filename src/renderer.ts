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
  <script type="module" src="./assets/app.js" data-transcript="./transcript.json"></script>
</body>
</html>
`;

const css = `:root {
  color-scheme: light;
  --bg: #f6f7f9;
  --panel: #ffffff;
  --ink: #17202a;
  --muted: #667085;
  --line: #d8dee8;
  --user: #0f766e;
  --assistant: #6d28d9;
  --tool: #9a3412;
  --warning-bg: #fff7db;
  --warning-line: #e7b84f;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--ink);
}
main {
  width: min(1120px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 32px 0;
}
.topbar {
  display: flex;
  gap: 20px;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--line);
  padding-bottom: 20px;
}
.eyebrow {
  margin: 0 0 6px;
  color: var(--muted);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0;
}
h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
}
.meta {
  color: var(--muted);
  margin: 8px 0 0;
  font-size: 14px;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
input,
button {
  height: 36px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink);
  padding: 0 12px;
  font: inherit;
}
button {
  cursor: pointer;
}
.notice {
  margin: 20px 0;
  border: 1px solid var(--warning-line);
  background: var(--warning-bg);
  color: #5f4308;
  padding: 12px 14px;
  border-radius: 6px;
  font-size: 14px;
}
.messages {
  display: grid;
  gap: 14px;
}
.message {
  background: var(--panel);
  border: 1px solid var(--line);
  border-left: 5px solid var(--muted);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, .04);
}
.message.user { border-left-color: var(--user); }
.message.assistant { border-left-color: var(--assistant); }
.message.tool { border-left-color: var(--tool); }
.role {
  margin: 0 0 10px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}
.block {
  white-space: pre-wrap;
  line-height: 1.55;
  overflow-wrap: anywhere;
}
details {
  margin-top: 8px;
}
summary {
  cursor: pointer;
  color: var(--tool);
  font-weight: 700;
}
pre {
  overflow: auto;
  background: #151a22;
  color: #edf2f7;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
}
.hidden {
  display: none;
}
@media (max-width: 760px) {
  main {
    width: min(100vw - 20px, 1120px);
    padding: 18px 0;
  }
  .topbar {
    display: block;
  }
  .actions {
    justify-content: flex-start;
    margin-top: 16px;
  }
  input {
    width: 100%;
  }
}
`;

const appJs = `const messagesEl = document.querySelector("#messages");
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
  if (block.type === "text") {
    return \`<div class="block">\${escapeHtml(block.text)}</div>\`;
  }
  if (block.type === "tool_call") {
    return \`<details><summary>Tool call: \${escapeHtml(block.name)}</summary><pre>\${escapeHtml(JSON.stringify(block.input, null, 2))}</pre></details>\`;
  }
  return \`<details><summary>Tool result</summary><pre>\${escapeHtml(block.content)}</pre></details>\`;
}

function renderMessage(message) {
  const text = JSON.stringify(message).toLowerCase();
  return \`<article class="message \${message.role}" data-search="\${escapeHtml(text)}">
    <p class="role">\${escapeHtml(message.role)}\${message.timestamp ? " / " + escapeHtml(message.timestamp) : ""}</p>
    \${message.blocks.map(renderBlock).join("")}
  </article>\`;
}

function applySearch() {
  const query = searchEl.value.trim().toLowerCase();
  for (const item of messagesEl.querySelectorAll(".message")) {
    item.classList.toggle("hidden", query.length > 0 && !item.dataset.search.includes(query));
  }
}

async function loadTranscript() {
  const script = document.querySelector("script[data-transcript]");
  const transcriptPath = script?.dataset.transcript ?? "./transcript.json";
  const response = await fetch(transcriptPath);
  if (!response.ok) {
    throw new Error(\`Failed to load \${transcriptPath}: \${response.status}\`);
  }
  return await response.json();
}

try {
  const transcript = await loadTranscript();
  titleEl.textContent = transcript.sessionId || "Untitled session";
  metaEl.textContent = [
    transcript.projectPath,
    \`\${transcript.stats.messageCount} messages\`,
    \`\${transcript.stats.toolCallCount} tool calls\`,
    \`\${transcript.stats.redactionCount} redactions\`,
  ].filter(Boolean).join(" / ");
  messagesEl.innerHTML = transcript.messages.map(renderMessage).join("");
  searchEl.addEventListener("input", applySearch);
  expandTools.addEventListener("click", () => messagesEl.querySelectorAll("details").forEach((item) => { item.open = true; }));
  collapseTools.addEventListener("click", () => messagesEl.querySelectorAll("details").forEach((item) => { item.open = false; }));
} catch (error) {
  titleEl.textContent = "Unable to load session";
  messagesEl.innerHTML = \`<article class="message"><div class="block">\${escapeHtml(error instanceof Error ? error.message : String(error))}</div></article>\`;
}
`;

export async function exportStaticSite(transcript: Transcript, outDir: string): Promise<ExportResult> {
  const assetsDir = path.join(outDir, "assets");
  await mkdir(assetsDir, { recursive: true });
  const files = [
    ["index.html", html],
    ["assets/style.css", css],
    ["assets/app.js", appJs],
    ["transcript.json", JSON.stringify(transcript, null, 2)],
  ] as const;

  for (const [relativePath, content] of files) {
    await writeFile(path.join(outDir, relativePath), content, "utf8");
  }

  return { outDir, files: files.map(([relativePath]) => relativePath) };
}
