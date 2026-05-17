---
name: export-share
description: Export and publish the current Claude Code session as a public permanent PinMe/IPFS link. Use only when the user explicitly invokes /export-share.
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/export-share.sh *)
---

Run the bundled command router.

!`${CLAUDE_SKILL_DIR}/scripts/export-share.sh $ARGUMENTS`

Supported commands:

- No arguments or `publish-current`: publish the current session as a public, permanent PinMe/IPFS page.
- `export-current`: export the current session locally without publishing.
- `list`: list Claude Code sessions for the current project.
- `install-cli`: install the `claude-share` CLI from GitHub.
- `help`: show script help.

Reply with the script output. If publication fails, show the error and say no page was published.
