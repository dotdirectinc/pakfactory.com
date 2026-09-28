# Sanity dataset scripts — where they go, and how they take arguments

Any script that reads or writes a Sanity **dataset** must follow both halves of this
rule. It exists because of [BUG-0032](../../../my-knowledge-base/wiki/synthesis/bugs/BUG-0032-dataset-flag-ignored-write-reported-success.md):
a production migration reported success while pointed at `development`, and neither half
of what follows was in place to stop it.

## 1. Placement — decide by what the script *is*, not by what file you have open

| Kind of script | Home | Examples |
|---|---|---|
| **Content-model migration** — renaming/moving fields, backfilling a new required field, retyping documents | `packages/sanity/scripts/*.ts` (run via `tsx`) | `migrate-customization-applies-to.ts`, `migrate-product-style-line.ts`, `migrate-rename-commercial-types.ts` |
| **Operational** — seeds, redirect maintenance, structure/parity checks | `apps/studio/scripts/*.mjs` | `seed-blog-singleton-pages.mjs`, `check-structure-types.mjs`, `migrate-redirect-groups.mjs` |

**Before creating a script, look for its predecessor and sit next to it.** A migration that
renames a field almost always has a sibling that *populated* that field; find it and match
its directory. If you are already editing `apps/studio/schemas/` and reach for
`apps/studio/package.json` to register a task, that is the moment to stop and check — the
proximity of the file you have open is not evidence about where the script belongs, and it
is exactly how BUG-0032 landed three migrations in the operational directory.

## 2. Flags — `--dataset` / `--confirm` / `--yes-production`

Every dataset script takes these, matching `packages/sanity/scripts/`:

| Flag | Meaning |
|---|---|
| `--dataset <name>` | **Required, always. No environment fallback, not even for a dry run.** |
| `--confirm` | Actually write. Without it the run is a dry run. |
| `--yes-production` | Second gate. A write to `production` is refused without it. |

```
pnpm --filter <pkg> run <task> -- --dataset development
pnpm --filter <pkg> run <task> -- --dataset development --confirm
pnpm --filter <pkg> run <task> -- --dataset production --confirm --yes-production
```

**Never resolve the dataset from `NEXT_PUBLIC_SANITY_DATASET` for a write.** It is ambient:
loaded from three `.env` files, persistent between sessions, shared across worktrees, and
precisely what nobody re-reads before typing `--confirm`. The target belongs on the command
line, where it sits in shell history next to the thing it did.

**The required `--dataset` is the load-bearing part, not the flag names.** A dropped flag
with no fallback crashes, which is a fine outcome. A dropped flag *with* a default produces
a plausible substitute and a confident, wrong success message.

### Required behaviour

1. **An unrecognised argument is a hard exit**, never ignored. Ignoring a typo'd flag has
   exactly one failure mode: a write aimed at the wrong dataset that reports success.
2. **Skip the literal `--`** that `pnpm run x -- --flag` forwards into `argv`.
3. **Restate the resolved dataset next to any "nothing to do" message.** That phrase is the
   correct output for both *"the work is done"* and *"you are pointed at the wrong thing"*,
   so it must never appear without its target.
4. Reuse `apps/studio/scripts/lib/script-args.mjs` (`parseScriptArgs`, `describeMode`)
   rather than re-rolling `process.argv.includes`.

## 3. Register it — every one-shot migration goes in the manifest

A script that exists but is not in the register is invisible to the one command that answers
"what still needs to run against production?". Add an entry to
[`scripts/sanity/migrations.manifest.mjs`](../../scripts/sanity/migrations.manifest.mjs) in
the same change as the script:

```
pnpm sanity:migrate status --dataset production
pnpm sanity:migrate up     --dataset development --only <id> --confirm
```

Each entry needs a **probe** — a GROQ expression that is `true` once the migration's effect
is visible in the dataset. Write it to assert *the old shape is gone*, not that the new field
is populated: a later migration may remove the successor, and a probe that breaks is worse
than no probe. If you cannot write one honestly, set `probe: null` and say why in a comment —
`status` will print `unknown` and refuse to adopt it.

Seeds, imports and parity checks are **repeatable tasks**, not migrations. They are listed
under `TASKS` in the manifest and are never run by the runner.

See [`scripts/sanity/MIGRATIONS.md`](../../scripts/sanity/MIGRATIONS.md) for the full model —
why the ledger is a Sanity document rather than a file in git, and what the runner refuses
to do.

## Reviewing your own run

A tick is a claim about the dataset the script *used*, not the one you *meant*. Read the
banner's `dataset=` before believing the result — that line was on screen and correct
during BUG-0032, and lost to three ✅ characters beneath it.

## Known gap — closed

The env-var-only scripts in `apps/studio/scripts/` predated this rule. **All 15 have now
been retrofitted**; no script in the repo reads `NEXT_PUBLIC_SANITY_DATASET` or
`SANITY_STUDIO_DATASET` to decide what it writes to.

The retrofit found the hazard was worse than this section described. The 15 did not share
one convention — they had two **opposite** defaults:

- 7 took `--apply`, so a bare run was a safe dry run;
- **4 took `--dry-run`, so a bare run WROTE**;
- **2 seeds had no dry-run mode at all** and wrote the instant they were invoked.

Combined with the `'development'` fallback, `pnpm --filter @pakfactory/studio run
migrate:body-table` with no arguments wrote to whatever the ambient variable named. That is
a worse shape than BUG-0032, which at least required someone to type a write flag.

All 15 are now dry-run-by-default behind `--confirm`. `--dry-run` and `--apply` are both
still accepted as deprecated spellings — they appear in runbooks, and rejecting `--dry-run`
would fail a command whose intent was *"do not write"*.

The runner still **refuses** to execute anything marked `legacy-env`. Nothing carries that
marker today; it stays because the hazard is a property of the script shape, and the next
script copied from an old template will need catching.

**The placement table above is still the two-directory split, and is superseded in
principle.** [ADR-021](../../docs/adr/0021-sanity-migration-register.md) § Decision 5 settles
that Sanity scripts consolidate under `scripts/sanity/`, split *one-shot vs repeatable vs
dataset ops* rather than *content-model vs operational*. Until that move lands, keep following
§1 so new scripts sit with their predecessors rather than in a third arrangement.
