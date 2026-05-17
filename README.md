# Claude Code Export Share

Export a Claude Code session transcript into a static web page and publish it as a public, permanent PinMe/IPFS link.

## Install

```bash
npm install
npm run build
```

For PinMe publishing:

```bash
npm install -g pinme
pinme login
```

## Usage

List sessions for the current project:

```bash
npm run build
node dist/cli.js list
```

Export the latest session for the current project:

```bash
node dist/cli.js export --current
```

Export a known session:

```bash
node dist/cli.js export --session <session-id> --claude-dir ~/.claude --out .claude-share/<session-id>
```

Publish the latest session:

```bash
node dist/cli.js publish --current
```

Publish a known session without the confirmation prompt:

```bash
node dist/cli.js publish --session <session-id> --yes
```

## Local Preview

The generated viewer loads `transcript.json` with browser `fetch`, so preview it through a local web server instead of opening `index.html` directly:

```bash
cd .claude-share/<session-id>
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Public Sharing Warning

Published pages are public and intended to be permanent. Claude Code transcripts are plaintext and can contain prompts, file contents, command output, tool results, and secrets. This tool redacts common secret patterns by default, but redaction is best-effort and cannot guarantee that every sensitive value is removed.

Content published to IPFS-style systems may remain accessible even if a pin or gateway link is removed.

## Claude Code Slash Command

Create a project command such as `.claude/commands/export-share.md`:

````md
Run the local exporter and publish the current Claude Code conversation:

```bash
node /absolute/path/to/claude-code-export-share/dist/cli.js publish --current
```
````

Then use `/export-share` inside Claude Code.
