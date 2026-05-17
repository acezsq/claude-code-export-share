---
name: export-share
description: Export and publish the current Claude Code session as a public permanent PinMe/IPFS link. Use when the user explicitly invokes /export-share or explicitly asks in natural language to export, share, or publish the current Claude Code session.
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/export-share.sh *)
---

Use the bundled command router at `${CLAUDE_SKILL_DIR}/scripts/export-share.sh`.

Choose exactly one script command from the user's request:

- If the user invokes `/export-share` with no arguments, run `publish-current`.
- If the user asks to publish, share, or create a public link for the current session, run `publish-current`.
- If the user asks to export locally without publishing, run `export-current`.
- If the user asks to list sessions, run `list`.
- If the user asks to install or repair the CLI, run `install-cli`.
- If the user asks for usage help, run `help`.

Run the selected command with Bash:

```bash
${CLAUDE_SKILL_DIR}/scripts/export-share.sh <command>
```

Supported commands:

- `publish-current`: publish the current session as a public, permanent PinMe/IPFS page.
- `export-current`: export the current session locally without publishing.
- `list`: list Claude Code sessions for the current project.
- `install-cli`: install the `claude-share` CLI from GitHub.
- `help`: show script help.

Reply with the script output. If publication fails, show the error and say no page was published. Do not publish unless the user explicitly requested publishing, sharing, or `/export-share` with no arguments.
