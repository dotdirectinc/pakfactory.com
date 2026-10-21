#!/usr/bin/env bash
# Exit 0 when every file changed between two commits is documentation, 1 otherwise.
# Usage: scripts/ci/docs-only.sh <base> [<head>=HEAD]
#
# "Documentation" = any *.md file, anything under a docs/ folder, and agent config
# (.claude/, .cursor/). No app reads these at build time (checked 2026-10-21: the
# only .md mentions in apps/*/src and packages/*/src are comments). *.mdx is NOT
# docs — it can be compiled content.
#
# Used by the Vercel ignored build step (vercel-ignore-build.sh) and the branch-name
# check (a docs/ branch may only touch docs). When in doubt it answers "not docs-only"
# (exit 1): a missing commit, an empty diff or any other git error means "build".
set -uo pipefail

base="${1:-}"
head="${2:-HEAD}"
[ -n "$base" ] || { echo "usage: $0 <base> [<head>]" >&2; exit 2; }

root="$(git rev-parse --show-toplevel)" || exit 1
changed="$(git -C "$root" diff --name-only "$base" "$head" 2>/dev/null)" || {
  echo "docs-only: cannot diff $base..$head — treating as code" >&2
  exit 1
}
[ -n "$changed" ] || { echo "docs-only: no changes in $base..$head" >&2; exit 1; }

DOCS_RE='(^|/)docs/|\.md$|(^|/)\.claude/|(^|/)\.cursor/'
code="$(printf '%s\n' "$changed" | grep -Ev "$DOCS_RE" || true)"
if [ -n "$code" ]; then
  echo "docs-only: non-documentation changes:" >&2
  printf '  %s\n' $code >&2
  exit 1
fi
echo "docs-only: $(printf '%s\n' "$changed" | wc -l | tr -d ' ') documentation file(s), nothing else"
exit 0
