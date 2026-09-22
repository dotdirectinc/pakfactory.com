# ADR-020: The Sanity migration register — ledger in the dataset, probe per migration

**Status:** Accepted (2026-09-22). Implemented by PR #599 (register, ledger, runner) and #603 (flag retrofit, mock-seed removal). Extends the flag half of `.claude/rules/dataset-script-placement-and-flags.md` and **supersedes its §1 placement table** (see Decision 5). Motivated by BUG-0032 and by the production sweep described below.

## Context

On 2026-09-22, immediately after a staging→main promotion and a production Studio deploy, the question *"which migrations still need to run against the production dataset?"* had no cheap answer. Answering it meant reading 63 scripts spread across three directories and hand-writing GROQ probes, one per asking.

That sweep was performed, and **it was wrong in both directions**:

- It missed **PROD-2199**. 171 posts had carried inert `aiTraining`/`aiAnswering` keys since July — the schema removed those fields, so the Studio had been showing them as "Unknown fields found" for two months. The sweep missed them because it only checked fields the *current release* touched.
- It missed **PROD-2151**. Ten case studies still held legacy `galleryImage` members. The hand-written probe used the field path `gallery[...]` when the real paths are `challenge[]`/`solution[].images`, so it returned a confident, meaningless zero.

The second failure is the more instructive one: a probe written from memory rather than from the script's own query returns *"nothing to do"* for both **"the work is done"** and **"you are looking in the wrong place"**, and those are indistinguishable at the call site.

Three structural facts made this inevitable:

1. **Nothing recorded what had been applied to which dataset.** `production` and `development` had diverged — `development` had already had PROD-2538 applied and `production` had not — and neither dataset nor repo could say so.
2. **Scripts lived in three directories** (`apps/studio/scripts/*.mjs`, `packages/sanity/scripts/*.ts`, `scripts/sanity/*.mjs`) split by *content-model vs operational*, an axis that answers a question nobody asks at run time.
3. **The flag conventions were not merely inconsistent, they were inverted.** Of the 15 env-var scripts, 7 treated a bare run as a dry run, **4 wrote immediately**, and **2 seeds had no dry-run mode at all**. All resolved their target from `NEXT_PUBLIC_SANITY_DATASET` with a `'development'` fallback — so `pnpm --filter @pakfactory/studio run migrate:body-table`, with no arguments, wrote to whatever that ambient variable happened to name. That is a worse shape than BUG-0032 itself, which at least required someone to type a write flag.

## Decision

### 1. The ledger is a document in the dataset, not a file in git

Applied-migration state is recorded as `migrationRun` documents — one per migration, per dataset, at a deterministic `_id` of `migration.<id>`.

*"Has this run against production?"* is a fact about the **dataset**. Git holds the same commit for everyone, while the datasets have had different things applied to them. A file in the repo would be a hand-kept claim about a remote system, and it would be wrong the first time somebody ran a script without remembering to edit it.

Two consequences follow from the placement, and both are wanted: a restore from backup rolls the ledger back **together with the data it describes**, and `sanity:sync-prod-to-dev` carries production's ledger into development — correct, because after that sync development *has* had those migrations applied.

Each row records `ranAt`, `ranBy`, `gitSha`, the script `checksum`, and **the captured stdout**. That last field is load-bearing rather than decorative: `migrate:unset-verified-deprecations` prints the documents it discards and states that *"the printed list is the record"*. Before the ledger, that record was terminal scrollback.

### 2. Every migration carries a probe, and a probe asserts the old shape is gone

A ledger alone is *trusted* state — it reports what someone recorded, not what is true. So each manifest entry carries a GROQ expression that evaluates true once the migration's effect is visible in the dataset. `status` then shows the ledger and the probe side by side and **flags disagreement instead of assuming**, and `adopt` can seed the register from reality rather than from a hand-written baseline.

**A probe must stay true forever once the migration has run.** Probes that assert *"the old key is gone"* satisfy that; probes that assert *"the new field is populated"* do not, because a later migration may remove the successor. PROD-2538 removing `role` would have broken a naive probe belonging to PROD-2482, the migration that created its replacements. Where a later migration genuinely invalidated an earlier one, the entry carries `supersededBy` and the runner never proposes it again.

**`probe: null` is a legitimate answer.** `status` prints `unknown` and `adopt` refuses to touch it. A guessed probe writes a false ledger row, which is strictly worse than an empty one — that is the PROD-2151 failure, encoded as a rule.

### 3. One-shot migrations are registered; repeatable tasks are not

The register covers migrations that move a dataset from one shape to the next and are then done. Seeds, imports and parity checks are **tasks**: they stay one-per-command and the runner never executes them. Sweeping a seed into a bulk `up` is how fixture data reaches live content.

Tasks are still *listed* in the manifest, so their absence from the register reads as a decision rather than an oversight.

### 4. `--dataset` is required everywhere, a dry run is the default, production needs a second gate

Every script that reads or writes a dataset takes `--dataset <name>` (**no environment fallback, not even for a dry run**), `--confirm` to write, and `--yes-production` on top of that for production. An unrecognised argument is a hard exit. This was already the rule; as of #603 it is also true of all 15 scripts that predated it.

`--apply` and `--dry-run` remain accepted as deprecated spellings, because both appear in runbooks and shell history. Their failure modes are not symmetric: rejecting `--dry-run` would fail a command whose entire intent was *"do not write"*.

A ✅ is a claim about what the dataset now contains, so **no script prints one for work it did not do**. `migrate:blog-i18n-en` printed `✅ Patched 223 document(s)` during a dry run with the disclaimer on the following line — the exact shape BUG-0032 took, where a correct banner was lost beneath three tick characters.

### 5. Placement is by lifecycle, not by subject matter

Sanity scripts consolidate under `scripts/sanity/`, split **one-shot (`migrations/`) vs repeatable (`tasks/`) vs dataset ops (`ops/`)**.

This replaces the *content-model vs operational* axis of `dataset-script-placement-and-flags.md` §1. That axis asked which directory a script's *subject* belonged to, a question with no bearing on anything the register needs; one-shot vs repeatable is the distinction the ledger actually turns on. Root `scripts/` rather than `packages/sanity/scripts/` because ADR-019 defines `packages/*` as libraries an app imports, and a migration is imported by nothing.

The ledger keys on migration `id` rather than path, so the move costs nothing and can land separately.

### 6. The runner refuses rather than guesses

It will not execute a script that resolves its own dataset from the environment; will not run a migration whose `after:` dependencies are unapplied; and **will not record a run whose probe still reports pending**, even on a clean exit. An exit code is a claim about a process; the probe is a fact about the dataset.

## Consequences

- `pnpm sanity:migrate status --dataset <name>` answers in seconds what previously took a manual sweep, and answers it for each dataset separately.
- Drift between `production` and `development` is visible rather than inferred.
- Writing a migration now costs an extra artefact: a manifest entry with an honest probe. That is the intended tax — a script outside the register is invisible to the only command that reports pending work.
- Adopted rows (`adopted: true`) are explicitly *not* claims that we ran anything; they record that the dataset was already in the migrated shape when the register arrived. Sixteen of production's seventeen rows are adopted.
- The register does not cover the 20 `packages/sanity/scripts/*.ts` cutover migrations. Several target types their own siblings have since renamed away, so a probe against today's schema could not distinguish *"this ran"* from *"this type never existed"*. They are marked HISTORIC — provenance only, never run.
- Two migrations carry no probe (`redirect-trailing-slashes`, `split-coating-type`) and need a human call. This is recorded rather than papered over, per Decision 2.
