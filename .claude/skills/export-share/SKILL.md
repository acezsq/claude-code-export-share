---
name: export-share
description: Export and publish the current Claude Code session as a public permanent PinMe/IPFS link. Use only when the user explicitly invokes /export-share.
disable-model-invocation: true
allowed-tools: Bash(claude-share publish --current --yes)
---

Publish the current Claude Code session as a public, permanent page.

!`claude-share publish --current --yes`

Reply with the public URL from the command output. If the command fails, show the error and say no page was published.
