# Sanity dataset scripts — where they go, and how they take arguments

Any script that reads or writes a Sanity **dataset** must follow both halves of this
rule. It exists because of [BUG-0032](../../../my-knowledge-base/wiki/synthesis/bugs/BUG-0032-dataset-flag-ignored-write-reported-success.md):
a production migration reported success while pointed at `development`, and neither half
of what follows was in place to stop it.

## 1. Placement — decide by what the script *is*, not by what file you have open

| Kind of script | Home | Examples |
|---|---|---|
| **Content-model migration** — renaming/moving fields, backfilling a new required field, retyping documents | `packages/sanity/scripts/*.ts` (run via `tsx`) | `migrate-customization-applies-to.ts`, `migrate-product-style-line.ts`, `migrate-rename-commercial-types.ts` |
| **Operational** — seeds, redirect maintenance, structure/parity checks | `apps/studio/scripts/*.mjs` | `seed.mjs`, `check-structure-types.mjs`, `migrate-redirect-groups.mjs` |

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

## Reviewing your own run

A tick is a claim about the dataset the script *used*, not the one you *meant*. Read the
banner's `dataset=` before believing the result — that line was on screen and correct
during BUG-0032, and lost to three ✅ characters beneath it.

## Known gap

The 18 other env-var-only scripts in `apps/studio/scripts/` predate this rule and have not
been retrofitted. Treat any of them that writes as carrying the same hazard.
