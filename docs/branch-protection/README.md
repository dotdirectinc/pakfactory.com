# Branch protection — apply guide

Enforces **feature → staging → main** for `dotdirect/pakfactory.com`, with affected-only
CI, CODEOWNERS review routing, and per-app PR labels.

The workflows in `.github/` only *report* pass/fail. The rulesets below make those reports
*block* merges. Both are needed.

## Order of operations

1. **Merge the `.github/` workflows into `staging` first.** Status checks only appear in the
   ruleset picker after they've run at least once.
2. **Create the labels:** Actions tab → **Setup labels** → *Run workflow* (one-time; creates
   `app:blog`, `app:www`, `app:studio`, `pkg:ui`, `pkg:sanity`, `pkg:seo`, `functions`).
3. **Apply the two rulesets** (UI or `gh`, below).

## Required status checks (the names the rules reference)

| Check | Produced by | On |
|---|---|---|
| `ci-success` | `ci.yml` (affected-only gate) | staging + main |
| `Validate branch name` | `branch-name-lint.yml` | staging + main |
| `Only staging can merge into main` | `enforce-branch-flow.yml` | main only |

## Apply via GitHub UI

Repo → **Settings → Rules → Rulesets → New branch ruleset** — do this twice:

**protect-main** → target `main`; enable *Require a pull request* (approvals **0**, *Require
review from Code Owners* ✅), *Require status checks* (`ci-success`, `Validate branch name`,
`Only staging can merge into main`; ✅ up to date), *Block force pushes*, *Restrict deletions*.

**protect-staging** → target `staging`; same but status checks are just `ci-success` and
`Validate branch name`.

## Apply via gh CLI (from an authenticated machine)

```bash
gh api -X POST repos/dotdirect/pakfactory.com/rulesets --input docs/branch-protection/protect-main.ruleset.json
gh api -X POST repos/dotdirect/pakfactory.com/rulesets --input docs/branch-protection/protect-staging.ruleset.json
```

## Notes

- **Approvals = 0, but Code Owner review is required** (`require_code_owner_review: true`).
  So no *number* of approvals is forced, yet the owning team is still auto-requested on PRs.
  If you want zero review entirely, set `require_code_owner_review` to `false`.
- **Org handle:** the ruleset commands target `dotdirect/pakfactory.com` (the repo remote).
  Confirm the CODEOWNERS team org matches — see the note in `.github/CODEOWNERS`.
- Rulesets let repo **admins bypass** by default; leave the ruleset Bypass list empty to
  apply to everyone.

## Resulting flow

| Action | Result |
|---|---|
| Direct push to `main` / `staging` | ❌ blocked |
| `feat/…` → PR into `staging` | ✅ once `ci-success` + branch-name pass |
| `feat/…` → PR into `main` | ❌ `Only staging can merge into main` fails |
| `staging` → PR into `main` | ✅ once checks pass |
