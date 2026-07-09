#!/usr/bin/env bash
# Check or switch the commit-scope mode (one-app-per-commit <-> mix-commiter).
# The two modes are mutually exclusive; setting one clears the other.
#
# Usage:
#   ./.claude/commit-mode.sh            # print the current mode
#   ./.claude/commit-mode.sh one        # enable one-app-per-commit (disables mix-commiter)
#   ./.claude/commit-mode.sh mix        # enable mix-commiter        (pauses one-app-per-commit)
set -euo pipefail

# The mode file lives next to this script (.claude/commit-mode).
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FILE="$DIR/commit-mode"

read_mode() { tr -d '[:space:]' < "$FILE" 2>/dev/null || true; }

case "${1:-}" in
  "")
    mode="$(read_mode)"
    : "${mode:=one-app-per-commit}"   # safe default when unset
    if [ "$mode" = "mix-commiter" ]; then
      echo "commit mode: mix-commiter  ->  one-app-per-commit is PAUSED (multi-app commits allowed)"
    else
      echo "commit mode: one-app-per-commit  ->  mix-commiter is OFF (one app per branch/commit)"
    fi
    ;;
  one|one-app-per-commit)
    printf 'one-app-per-commit\n' > "$FILE"
    echo "switched -> one-app-per-commit (mix-commiter disabled)"
    ;;
  mix|mix-commiter)
    printf 'mix-commiter\n' > "$FILE"
    echo "switched -> mix-commiter (one-app-per-commit paused)"
    ;;
  *)
    echo "usage: ./.claude/commit-mode.sh [one|mix]" >&2
    exit 2
    ;;
esac
