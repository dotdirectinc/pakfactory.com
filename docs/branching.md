# Branching & PR flow

## The flow

```
feat/… ─┐
fix/…  ─┼─► PR ─► staging ─► PR ─► main
chore/…─┘
```

- **Feature branches** are cut from `staging` and merged back into `staging` via PR.
- **`staging`** is the integration branch. Only `staging` may open a PR into `main`.
- **`main`** is production. It never takes a PR from a feature branch directly — the
  `Only staging can merge into main` check blocks that.

## Branch naming (enforced)

Branches must start with one of:

| Prefix | For |
|---|---|
| `feat/`, `feature/`, `features/` | new feature or enhancement |
| `fix/`, `bugfix/`, `hotfix/` | bug fix |
| `chore/` | tooling, CI, docs, deps, refactors |

Include the Jira key where there is one: `feat/PROD-1957-algolia-search`,
`fix/blog-toc-card`, `chore/ci-branch-flow`. The **Validate branch name** check enforces the
prefix on every PR.

## Checks that gate a merge

- **`ci-success`** — affected-only typecheck (only the apps/packages your PR touched are
  checked; see `.github/workflows/ci.yml`). Lint returns once blog migrates off `next lint`
  (removed in Next 16); build returns once Sanity env is provided as CI secrets.
- **`Validate branch name`** — the naming rule above.
- **`Only staging can merge into main`** — on PRs into `main`.

Direct pushes and force-pushes to `staging` and `main` are blocked; changes land via PR.

## Working in the monorepo

- Apps: `apps/blog`, `apps/www`, `apps/studio` · Packages: `packages/{ui,sanity,seo}` ·
  Functions: `functions/*`. (`apps/studio-old` is legacy and excluded from CI/labels/owners.)
- PRs are **auto-labelled by area** (`app:blog`, `pkg:ui`, …) so history is filterable per
  app. Ownership + review routing is in `.github/CODEOWNERS`.
- Keep a PR scoped to one app/package where practical — it keeps CI fast and history clean.
