#!/bin/bash
# PostToolUse hook: mirrors agent skills between .claude/skills and .github/skills when one is edited.
# Instruction rules need no sync: AGENTS.md is the single source; CLAUDE.md and
# .github/copilot-instructions.md are one-line pointers to it.
# Claude Code passes tool info as JSON on stdin.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Parse file_path from stdin JSON (tool_input.file_path)
FILE=$(python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except Exception:
    print('')
" 2>/dev/null || true)

case "$FILE" in
  *.claude/skills/*/SKILL.md|*.github/skills/*/SKILL.md)
    bash "$ROOT/.claude/sync-skills.sh" "$FILE"
    ;;
esac
