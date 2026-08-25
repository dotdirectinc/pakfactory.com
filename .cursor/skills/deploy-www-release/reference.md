# www-new-release — binding rules (skill reference)

Short extract of [`AGENTS.md`](../../../AGENTS.md) for agents running **deploy-www-release**. Prefer AGENTS.md if anything conflicts.

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

## Shared packages

If blog/studio need `packages/ui`, `packages/sanity`, lockfile, or turbo changes: land on `staging` first, then merge `staging` → `www-new-release`. www-only changes may land only on the rebuild trunk.

## Handoff order (AGENTS.md)

1. Cut from `origin/www-new-release`.
2. Implement.
3. Jira comment when AC met.
4. Push + PR only when the user asks to wrap up / ship (this skill).
