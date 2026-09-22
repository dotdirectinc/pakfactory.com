# Sanity migrations — the register, the ledger, and the runner

Project `8293wrxp` · datasets `production` and `development` (the **staging Studio points at
`development`** — there is no third dataset, and the ledger therefore has two rows, not three).

For backup / restore / dataset ops see [`RUNBOOK.md`](./RUNBOOK.md). This file is about
**one-shot content migrations**: which ones exist, which have run where, and how to run the
rest.

---

## The one command

```bash
pnpm sanity:migrate status --dataset production      # what has run, what has not
pnpm sanity:migrate up     --dataset production      # dry run of everything pending
pnpm sanity:migrate up     --dataset production --confirm --yes-production
pnpm sanity:migrate up     --dataset production --only <id> --confirm --yes-production
pnpm sanity:migrate adopt  --dataset production --confirm --yes-production
```

A dry run is the default. `--dataset` is required with no environment fallback, and a write
to `production` needs `--yes-production` on top of `--confirm` — the same gates every script
in the register already carries, and for the same reason (BUG-0032).

> **Agents do not run the write commands.** `CLAUDE.md` § *Sanity content guardrails* is
> binding: agents edit schemas and scripts in git, humans run anything that writes documents.
> `status` and a dry-run `up` are read-only and safe for anyone.

---

## Why the ledger lives in the dataset

"Has this migration run against production?" is a fact about the **dataset**. Git holds the
same commit for everyone, while `production` and `development` have had different things
applied to them — so only the dataset can answer. A file in the repo would be a hand-kept
claim about a remote system, wrong the first time somebody ran a script without editing it.

So the ledger is a document type, [`migrationRun`](../../apps/studio/schemas/migrationRun.ts),
one row per migration per dataset, visible read-only in the Admin workspace under
**Migration Ledger**. Two consequences follow, both wanted:

- a restore from backup rolls the ledger back together with the data it describes;
- `pnpm sanity:sync-prod-to-dev` carries production's ledger into development, which is
  correct — after that sync, development *has* had those migrations applied.

Each row records `ranAt`, `ranBy`, `gitSha`, the script `checksum`, and **the run log**. That
last field matters more than it looks: `migrate:unset-verified-deprecations` prints the
documents it is about to discard and says *"the printed list is the record"*. Terminal
scrollback is not a record. The ledger is.

---

## Why every migration also carries a probe

A ledger on its own is *trusted* state — it says what somebody recorded, not what is true.
So each entry in [`migrations.manifest.mjs`](./migrations.manifest.mjs) carries a `probe`: a
GROQ expression that returns `true` when the migration's effect is already visible in the
dataset. `status` shows both columns and **flags disagreement instead of assuming**:

```
20260913-split-customization-role     —         ✓ applied   ⚠ ran outside the runner — `adopt` to record it
20260917-unset-verified-deprecations  —         · pending   → will run
```

This is what makes the register honest about work done before it existed, and it is why
`adopt` can seed the ledger without anyone hand-writing a baseline they could get wrong.

Three rules keep probes trustworthy:

1. **A probe asserts the old shape is GONE, not that the new one is populated.** A probe
   written as "the successor field is filled" breaks the day a later migration removes that
   field. `20260913-split-customization-role` probes *"nothing still has `role` without both
   successors"*, which stays true after PROD-2538 unset `role` entirely.
2. **A migration invalidated by a later one gets `supersededBy`,** not a rewritten probe. The
   runner never proposes it again.
3. **`probe: null` means "no honest probe exists yet".** `status` prints `unknown` and `adopt`
   refuses to touch it. A guessed probe writes a false ledger row, which is worse than none.

---

## What the runner refuses to do

| Refusal | Why |
|---|---|
| Execute a `legacy-env` script | It resolves its own dataset from `NEXT_PUBLIC_SANITY_DATASET`, so the runner cannot honour `--dataset` on its behalf. Setting that variable for it would rebuild the ambient default the rule exists to remove. Run it by hand, then `adopt`. |
| Run a migration whose `after:` is unapplied | Order is declared in the manifest and nowhere else. |
| Record a run whose probe still says `pending` | An exit code is a claim about a process; the probe is a fact about the dataset. A script that exits 0 without changing anything is the BUG-0032 shape. |
| Run anything without `--dataset` | No fallback, not even for a dry run. |

---

## Adding a migration

1. Write the script, reusing `apps/studio/scripts/lib/script-args.mjs` — `--dataset`,
   `--confirm`, `--yes-production`, dry-run default, unknown flag is a hard exit.
2. Register the npm task as today.
3. Add an entry to `migrations.manifest.mjs` **in date order**, with a probe that will still
   be true in a year. If you cannot write one honestly, set `probe: null` and say why.
4. Run `status` on `development`, then `up --only <id>` there, then production.

Seeds, imports and parity checks are **repeatable tasks**, not migrations. They stay
one-per-command and are listed under `TASKS` in the manifest so their absence from the
register is visibly a decision rather than an oversight.

---

## Known gaps (the honest list)

- **16 scripts are `legacy-env`** and cannot be driven by the runner until they take
  `--dataset`. `status` marks each one. That retrofit is Phase 2.
- **Two migrations have no probe** — `20260717-redirect-trailing-slashes` (a bare `/` is a
  legal `from`, so "already stripped" is indistinguishable from "never had one") and
  `20260826-split-coating-customization-type` (needs the script's own slug constants).
- **The 20 `packages/sanity/scripts/*.ts` migrations are HISTORIC.** They are the 2026
  content-model cutover, several of them targeting types that have since been renamed away
  by their own siblings. A probe against today's schema could not tell "this ran" from "this
  type never existed", so they are recorded for provenance and never run by the runner.
- **Scripts still live in three directories.** Consolidating them under `scripts/sanity/` is
  Phase 3; the ledger keys on migration `id`, not path, so the move costs nothing.
