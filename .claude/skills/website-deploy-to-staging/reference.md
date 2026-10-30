# www-new-release — binding rules (skill reference)

Short extract of [`AGENTS.md`](../../../AGENTS.md) for agents running **website-deploy-to-staging**. Prefer AGENTS.md if anything conflicts.

**Name note:** “staging” in the skill name is stakeholder staging ([staging.pakfactory.com](https://staging.pakfactory.com)), which tracks **`www-new-release`**. PR base for this skill is **`www-new-release`**, never git branch `staging`.

## Trunk

- Live path: blog / studio / current www → `staging` → `main`.
- Rebuild path: www rebuild tickets → branch from `origin/www-new-release` → PR **`--base www-new-release`**.
- Launch (separate, not this skill): one PR `www-new-release` → `staging`, then auto `staging` → `main`. Never `www-new-release` → `main`.

## Branch names

CI allowlist prefixes: `feat/` `feature/` `features/` `fix/` `bugfix/` `hotfix/` `chore/` + slug. Prefer `feat/PROD-###-short-slug`.

## Vercel

- Public pakfactory.com production stays on `main`.
- Non-prod www project `pakfactory-com` Production Branch stays **`main`**.
- QA rebuild at stable git-branch alias:  
  https://pakfactory-com-git-www-new-release-pakfactory-projects-00b54385.vercel.app  
  Do not change Production Branch to `www-new-release`.
- Stakeholder staging: https://staging.pakfactory.com — same `www-new-release` build, fixed link,
  gated by Vercel Authentication (team seat). Preview deployment of `pakfactory-com` on purpose;
  never promote it. Details + access requests: AGENTS.md § www rebuild trunk → Stakeholder staging.

## Shared packages

If blog/studio need `packages/ui`, `packages/sanity`, lockfile, or turbo changes: land on `staging` first, then merge `staging` → `www-new-release`. www-only changes may land only on the rebuild trunk.

## Remotes

Canonical GitHub repo: `dotdirectinc/pakfactory.com`. If local `origin` still uses the legacy `dotdirect/pakfactory.com` URL, push to a remote `gh` can create PRs against (often `dotdirectinc`) and pass `--repo dotdirectinc/pakfactory.com` when needed.

## Handoff order (AGENTS.md)

1. Cut from `origin/www-new-release`.
2. Implement.
3. Jira comment when AC met.
4. Push + PR only when the user asks to wrap up / ship (this skill).
