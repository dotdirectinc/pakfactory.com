---
name: deploy-www-release
description: >-
  Ships PakFactory www rebuild work to www-new-release: verify apps/www, optional
  commit, Jira acceptance comment, push, and open a PR with --base www-new-release.
  Use when the user says deploy-www-release, wrap up / ship a www rebuild ticket,
  or open a PR into www-new-release.
disable-model-invocation: true
---

# deploy-www-release

Handoff skill for the **www rebuild** trunk. Invoke explicitly (e.g. “run deploy-www-release”).

**Deploy** here means: push so Vercel builds the branch/PR. Do **not** change Vercel Production Branch settings, merge the PR, or open `www-new-release` → `main`.

Canon: [`AGENTS.md`](../../../AGENTS.md) § www rebuild trunk / JIRA defaults. Extra detail: [`reference.md`](reference.md).

## Preconditions

- Repo: `pakfactory.com` monorepo.
- Branch: `feat/|fix/|chore/|bugfix/|hotfix/PROD-###-short-slug` cut from `origin/www-new-release` (CI allowlist).
- Package manager: **pnpm** only.
- PR base for this skill: **`www-new-release` only**. Refuse `staging` / `main` for www-only rebuild work.
- Shared packages (`packages/ui`, `packages/sanity`, lockfile) needed by blog/studio: those must already be on `staging` first; this skill does not deploy blog/studio.

## Phase 1 — Ticket + branch check

1. Resolve `PROD-###` from the branch name or the user.
2. Fetch Jira (`getJiraIssue`) when MCP is available; skim AC for the comment.
3. Confirm current branch is not `www-new-release`, `staging`, or `main`.
4. `git fetch origin www-new-release` and ensure the branch diverged from that trunk (not from `staging` alone for www rebuild).
5. `git status` / `git diff origin/www-new-release...HEAD` — refuse if there is nothing to ship (no commits and no intentional uncommitted work the user asked to include).

## Phase 2 — Verify

From repo root:

```bash
pnpm --filter @pakfactory/www typecheck
pnpm --filter @pakfactory/www build
```

Stop on failure; do not push or open a PR.

## Phase 3 — Commit (only if asked)

If the user asked to commit / ship and there are uncommitted changes:

1. Follow the user’s git commit protocol (status, diff, log; HEREDOC message; no `--no-verify`; no amend unless rules allow).
2. Message: `PROD-###: short summary` with `Refs: PROD-###` in the body when useful.
3. Do not commit secrets (`.env`, credentials).

If the user did **not** ask to commit, leave the working tree alone and only ship already-committed work (or ask once if nothing is committed).

## Phase 4 — Jira acceptance comment

When the story is ready to hand off, comment via Atlassian MCP (`addCommentToJiraIssue`) using this shape:

```text
Acceptance criteria met for www rebuild handoff.

Branch: {branch}
PR base: www-new-release
Key changes: {1–5 bullets — routes/files/behavior}
Verify:
- pnpm --filter @pakfactory/www typecheck && pnpm --filter @pakfactory/www build
- Local: apps/www (port 3000) — paths exercised: {paths}
- QA: https://pakfactory-com-git-www-new-release-pakfactory-projects-00b54385.vercel.app (trunk alias) and/or the PR preview after open
- Stakeholder staging (same branch, fixed link, Vercel-auth gated): https://staging.pakfactory.com
```

Optional: transition to **Request For Approval** (Product project transition id `51`, same as blog skill) when that status is appropriate for the ticket. Do not invent other transitions.

## Phase 5 — Push + PR

Only after verify succeeds and the user invoked this skill (or explicitly asked to ship / open the PR):

```bash
git push -u origin HEAD
gh pr create --base www-new-release --title "[PROD-###] Short description" --body "$(cat <<'EOF'
## Summary
- …

## Test plan
- [ ] `pnpm --filter @pakfactory/www typecheck`
- [ ] `pnpm --filter @pakfactory/www build`
- [ ] Spot-check: {routes}
- [ ] Preview / www-new-release alias QA

EOF
)"
```

PR title format: `[PROD-###] …`. Never `--base staging` or `--base main` for this skill.

## Phase 6 — Stop

Print for the user:

- PR URL
- Jira issue link
- Reminder: human merge + BA QA; no merge by the agent

## Out of scope (refuse)

- Merging the PR
- Changing any Vercel project’s Production Branch
- Opening `www-new-release` → `main` (or → `staging` unless the user is explicitly doing the **launch** PR — that is not this skill)
- Deploying blog/studio or “all Vercel projects”
- Force-push / rewriting shared trunk history
