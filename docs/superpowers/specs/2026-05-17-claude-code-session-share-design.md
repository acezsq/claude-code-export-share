# Claude Code Session Share Design

## Goal

Build a local CLI tool that lets a Claude Code user export the current conversation with a one-line command and publish it as a public, permanent static web page. The first release targets PinMe/IPFS deployment and returns a shareable URL.

## Product Shape

The MVP is a Node.js CLI named `claude-share`. It can be invoked directly from a terminal or wrapped by a Claude Code slash command or skill.

Primary command:

```bash
claude-share publish --current
```

Expected user flow:

1. User runs a one-line command inside Claude Code.
2. The CLI locates the current or most recent Claude Code session transcript.
3. The CLI parses the transcript and generates a static viewer.
4. The CLI performs default sensitive-data redaction.
5. The CLI asks for confirmation before public, permanent publishing.
6. The CLI uploads the generated static directory with PinMe.
7. The CLI prints the public URL.

## Scope

### In Scope

- Read Claude Code transcripts from `~/.claude/projects/<project>/<session>.jsonl`.
- Respect `CLAUDE_CONFIG_DIR` when it is set.
- Support selecting the latest session for the current working directory.
- Support publishing a specific session by ID.
- Render a static, searchable HTML viewer.
- Collapse tool calls and tool results by default.
- Redact common secrets before rendering.
- Publish through `pinme upload <export-dir>`.
- Provide clear terminal output with session metadata and the final URL.

### Out of Scope for MVP

- Private links, expiring links, password protection, or access control.
- Server-side storage, backend APIs, or account management.
- Editing a published share after upload.
- Multi-provider deployment beyond PinMe.
- Perfect reconstruction of Claude Code's terminal UI.
- Guaranteed removal from IPFS after publication.

## User Interface

### CLI Commands

```bash
claude-share list
claude-share export --current --out ./dist
claude-share export --session <session-id> --out ./dist
claude-share publish --current
claude-share publish --session <session-id>
```

Optional flags:

```bash
--claude-dir <path>       Override Claude config directory.
--project <path>          Select a project path explicitly.
--out <path>              Choose export directory.
--no-redact               Disable default redaction.
--redact-pattern <regex>  Add a custom redaction pattern.
--yes                     Skip confirmation prompts.
--keep-temp               Keep generated files after publishing.
```

### Confirmation Prompt

Before publishing, the CLI shows:

```text
Project: /path/to/project
Session: e92f8f11-14b9-412d-9a31-a46e61a7c32e
Started: 2026-05-17 13:09
Messages: 42
Tool calls: 18
Redactions: 3

This will publish a public, permanent page through PinMe/IPFS.
Continue? [y/N]
```

`--yes` skips this prompt, intended for users who understand the permanence of public publication.

## Architecture

The implementation is split into small modules with clear boundaries.

### `session-locator`

Responsibilities:

- Resolve Claude data directory from `CLAUDE_CONFIG_DIR` or `~/.claude`.
- Encode a project path to Claude Code's project directory naming convention.
- Find transcript files for a project.
- Choose the most recently modified transcript for `--current`.
- Resolve a transcript by session ID.

Inputs:

- Current working directory.
- Optional `--claude-dir`, `--project`, or `--session`.

Output:

- Absolute path to one `.jsonl` transcript.

### `transcript-parser`

Responsibilities:

- Stream-read JSONL safely.
- Ignore non-conversation events such as file history snapshots.
- Normalize user, assistant, system, tool call, and tool result events.
- Preserve timestamps, UUIDs, session IDs, cwd, model metadata, and token usage when present.
- Handle malformed lines with warnings instead of crashing the whole export.

Output data model:

```ts
type Transcript = {
  sessionId: string;
  projectPath?: string;
  startedAt?: string;
  exportedAt: string;
  messages: Message[];
  stats: TranscriptStats;
};

type Message = {
  id: string;
  parentId?: string;
  role: "user" | "assistant" | "system" | "tool";
  timestamp?: string;
  blocks: MessageBlock[];
};
```

### `redactor`

Responsibilities:

- Apply default redaction patterns to message text, tool inputs, and tool outputs.
- Count redactions and include a summary in export metadata.
- Allow extra user-provided regex patterns.
- Allow opt-out via `--no-redact`.

Default patterns:

- Common API key formats for Anthropic, OpenAI, GitHub, AWS, and npm.
- JWT-like tokens.
- SSH private key blocks.
- `.env` style assignments for names containing `KEY`, `TOKEN`, `SECRET`, or `PASSWORD`.
- Long high-entropy strings where false positives are acceptable.

The redactor replaces matched values with `[REDACTED:<kind>]`.

### `renderer`

Responsibilities:

- Generate a static site directory.
- Write `index.html`, `assets/style.css`, `assets/app.js`, and `transcript.json`.
- Escape all user and assistant content to prevent script injection.
- Render Markdown and code blocks in a controlled way.
- Provide client-side search and filtering.

Viewer behavior:

- User and assistant messages are expanded.
- Tool calls and results are collapsed by default.
- Search filters visible messages.
- Buttons support expanding all tools, collapsing all tools, and copying the page URL.
- Metadata header shows session ID, project, exported time, message count, and redaction count.

### `publisher`

Responsibilities:

- Detect whether `pinme` is available.
- Run `pinme upload <export-dir>`.
- Parse the resulting URL and CID from stdout when possible.
- Preserve full PinMe output for debugging when URL parsing fails.

The publisher does not own authentication. If PinMe requires login, it surfaces PinMe's message and suggests:

```bash
pinme login
```

## Data Flow

```text
CLI args
  -> session-locator
  -> transcript-parser
  -> redactor
  -> renderer
  -> publisher
  -> terminal URL output
```

The renderer consumes already-redacted normalized data. Raw transcript lines are never copied into the static export directory.

## Error Handling

- No Claude data directory: explain where the CLI looked and how to use `--claude-dir`.
- No project transcripts: show the expected encoded project directory and suggest `claude-share list`.
- Ambiguous session: show candidates and ask the user to choose unless `--session` is provided.
- Malformed JSONL line: warn with line number, skip the line, continue.
- Empty parsed conversation: fail before rendering.
- Redaction regex failure: show the invalid pattern and exit.
- Missing PinMe CLI: suggest `npm install -g pinme`.
- PinMe authentication failure: surface PinMe output and suggest `pinme login`.
- PinMe upload failure: keep generated export directory and print its path.

## Security and Privacy

The tool is designed for public, permanent sharing. It must make that explicit every time it publishes unless `--yes` is passed.

Security defaults:

- Redaction is enabled by default.
- Generated HTML escapes transcript content.
- Tool results are collapsed by default.
- Raw JSONL transcript files are not copied to the output.
- The output includes a visible note that redaction is best-effort, not a guarantee.

The tool must not imply that content can be fully deleted from IPFS after publication.

## Testing Strategy

Unit tests:

- Project path encoding.
- Session discovery.
- JSONL parsing for user, assistant, tool use, tool result, and system events.
- Redaction rules.
- HTML escaping.
- PinMe output URL parsing.

Fixture tests:

- Minimal transcript.
- Transcript with tool calls.
- Transcript with malformed lines.
- Transcript containing secrets.
- Large transcript with many tool outputs.

Integration tests:

- Export a fixture transcript to a temp directory.
- Verify generated files exist.
- Verify `transcript.json` contains normalized, redacted content.
- Verify `index.html` can load the JSON asset path.

Manual verification:

- Run `claude-share export --current`.
- Open the generated `index.html` locally.
- Run `claude-share publish --current` after `pinme login`.
- Confirm the returned URL loads the same page.

## Milestones

1. Project scaffold and CLI shell.
2. Session locator and list command.
3. Transcript parser with fixtures.
4. Redaction module.
5. Static renderer.
6. Local export command.
7. PinMe publisher.
8. Claude Code slash command documentation.
9. End-to-end verification.

## Open Decisions Resolved

- First release uses public, permanent links.
- PinMe/IPFS is the default publisher.
- The static viewer uses a small generated site rather than a single HTML file.
- Redaction is enabled by default even though publication is public.
- Private sharing and deletion semantics are explicitly deferred.
