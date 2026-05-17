# Claude Code Export Share

Export a Claude Code session transcript into a static web page and publish it as a public, permanent PinMe/IPFS link.

## Install

Install the CLI directly from GitHub:

```bash
npm install -g github:acezsq/claude-code-export-share
```

Or clone the repo and link it locally:

```bash
git clone https://github.com/acezsq/claude-code-export-share.git
cd claude-code-export-share
npm install
npm run build
npm link
```

For PinMe publishing:

```bash
npm install -g pinme
pinme login
```

Verify the CLI:

```bash
claude-share
```

## Usage

List sessions for the current project:

```bash
claude-share list
```

Export the latest session for the current project:

```bash
claude-share export --current
```

Export a known session:

```bash
claude-share export --session <session-id> --claude-dir ~/.claude --out .claude-share/<session-id>
```

Publish the latest session:

```bash
claude-share publish --current
```

Publish a known session without the confirmation prompt:

```bash
claude-share publish --session <session-id> --yes
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

## Claude Code Skill

This repo includes a Claude Code skill at `.claude/skills/export-share/SKILL.md`.

Install it for your user:

```bash
mkdir -p ~/.claude/skills
cp -R .claude/skills/export-share ~/.claude/skills/export-share
```

Or install it directly from GitHub:

```bash
mkdir -p ~/.claude/skills/export-share/scripts
curl -fsSL https://raw.githubusercontent.com/acezsq/claude-code-export-share/main/.claude/skills/export-share/SKILL.md \
  -o ~/.claude/skills/export-share/SKILL.md
curl -fsSL https://raw.githubusercontent.com/acezsq/claude-code-export-share/main/.claude/skills/export-share/scripts/export-share.sh \
  -o ~/.claude/skills/export-share/scripts/export-share.sh
chmod +x ~/.claude/skills/export-share/scripts/export-share.sh
```

If Claude Code was already running and `~/.claude/skills` did not exist before, restart Claude Code once so it picks up the new skill directory.

Then use `/export-share` inside Claude Code.

The skill runs:

```bash
${CLAUDE_SKILL_DIR}/scripts/export-share.sh
```

That defaults to:

```bash
claude-share publish --current --yes
```

That means invoking `/export-share` is an explicit confirmation to publish the current session as a public, permanent PinMe/IPFS page.

You can also pass a skill command:

```text
/export-share list
/export-share export-current
/export-share install-cli
/export-share help
```
