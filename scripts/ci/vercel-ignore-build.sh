#!/usr/bin/env bash
# Vercel "Ignored Build Step" for every app (vercel.json ignoreCommand).
# Exit 0 = skip the build, exit 1 = build.
# Usage: bash scripts/ci/vercel-ignore-build.sh <deploy branch>...
#
# 1. Only the project's deploy branches build (unchanged from the old inline `case`).
# 2. On a deploy branch, a push that changes only documentation is skipped
#    (scripts/ci/docs-only.sh). It compares against VERCEL_GIT_PREVIOUS_SHA — the
#    last deployed commit — not HEAD^, so a push that lands code and then a docs
#    commit together still builds. No previous SHA, or one outside the clone → build.
set -uo pipefail

branch="${VERCEL_GIT_COMMIT_REF:-}"
deploy=false
for b in "$@"; do
  [ "$branch" = "$b" ] && deploy=true
done
if [ "$deploy" != true ]; then
  echo "Skip: '$branch' is not a deploy branch for this project ($*)."
  exit 0
fi

here="$(cd "$(dirname "$0")" && pwd)"
previous="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -n "$previous" ] && bash "$here/docs-only.sh" "$previous" HEAD; then
  echo "Skip: only documentation changed since the last deployment ($previous)."
  exit 0
fi

echo "Build: '$branch'."
exit 1
