#!/usr/bin/env bash
set -euo pipefail

command_name="${1:-publish-current}"
if [[ $# -gt 0 ]]; then
  shift
fi

print_help() {
  cat <<'HELP'
Usage: export-share.sh [command] [args...]

Commands:
  publish-current  Publish the current Claude Code session with claude-share publish --current --yes
  export-current   Export the current Claude Code session locally with claude-share export --current
  list             List Claude Code sessions for the current project with claude-share list
  install-cli      Install the claude-share CLI from GitHub
  help             Show this help

When no command is provided, publish-current is used.
HELP
}

require_claude_share() {
  if command -v claude-share >/dev/null 2>&1; then
    return 0
  fi

  cat >&2 <<'ERROR'
claude-share CLI was not found.

Install it with:
  npm install -g github:acezsq/claude-code-export-share

Then run /export-share again.
ERROR
  exit 127
}

case "$command_name" in
  publish-current|publish|"")
    require_claude_share
    exec claude-share publish --current --yes "$@"
    ;;
  export-current|export)
    require_claude_share
    exec claude-share export --current "$@"
    ;;
  list|list-sessions)
    require_claude_share
    exec claude-share list "$@"
    ;;
  install-cli)
    exec npm install -g github:acezsq/claude-code-export-share "$@"
    ;;
  help|--help|-h)
    print_help
    ;;
  *)
    echo "Unknown export-share command: $command_name" >&2
    print_help >&2
    exit 2
    ;;
esac
