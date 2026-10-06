#!/usr/bin/env node
/**
 * PROD-2732 — merge `customizationOption.configuratorRole` + `hasPage` into `appearsIn`.
 *
 * Two booleans answered one question between them — where a customer meets this
 * option — and an editor had to hold both in their head to know what they got.
 * The grid they spanned, on published production when this was written:
 *
 *                    hasPage: true   hasPage: false
 *   configurable          102              18
 *   reference               6               0
 *
 * Three occupied cells, three values:
 *
 *   configurable + hasPage   →  configurable-with-page
 *   reference    + hasPage   →  not-configurable-with-page
 *   configurable + no page   →  configurable-no-page
 *   reference    + no page   →  nothing written. See below.
 *
 * ⚠️ THIS IS NOT A RETURN TO `role` (PROD-2482 / D55). That field could not express
 * "pickable AND has a page", which is 102 of 126 — the majority of the catalogue
 * had nowhere to be recorded, which is why D55 split it. Every OCCUPIED cell is
 * representable here; only the empty one is dropped.
 *
 * ── The fourth cell is left EMPTY, on purpose ───────────────────────────────
 *
 * A technical option with no page has no customer surface at all, so the model has
 * no value for it. `appearsIn` is therefore required only while an option is ACTIVE
 * — on something no customer can reach, the question does not arise, and forcing an
 * answer would write a value that is simply untrue.
 *
 * It was empty on production when this was designed, and "empty today" is EXACTLY
 * the evidence that failed last time: the assumption behind `role` held across 33
 * mock options and went unexamined until a real import falsified it. So it was
 * checked rather than remembered — and development holds 39, every one of them
 * coming-soon or discontinued, none active. Retired materials: pouch films, boards,
 * foams. Nothing a customer can reach, which is why leaving the field empty is the
 * honest answer rather than a gap.
 *
 * 🔴 An ACTIVE option in that cell still aborts. That one a migration cannot place:
 * it is reachable, so it has to say where it appears, and only a person can decide
 * which. Zero exist today on either dataset.
 *
 * ── Why an unset `appearsIn` is safe, but not acceptable ────────────────────
 *
 * Every reader tests for the values it WANTS — `isConfigurable`, `hasDetailPage`,
 * `HAS_DETAIL_PAGE` — so a document this script has not reached is hidden rather
 * than leaked. It is invisible, not wrong. Run this before the deploy all the same:
 * invisible means the customization library is empty.
 *
 * That same property is what lets the fourth cell stay empty deliberately, rather
 * than needing a value of its own.
 *
 * 🔴 IF YOU RE-IMPORT INSTEAD OF BACKFILLING, the importer must write `appearsIn`.
 * `import-notion-customization-demo.mjs` does, as of this ticket. An import written
 * against the old two fields writes nothing here and empties the library silently.
 *
 * ⚠️ ADDITIVE ONLY. `configuratorRole` and `hasPage` are NOT unset here, even though
 * their fields leave the schema in the same PR. Removing a field from a schema leaves
 * its data untouched, and that data is the rollback path — the only irreversible step
 * is sweeping it, which is `migrate:unset-verified-deprecations` territory and a
 * separate deliberate act (Conventions §4.3).
 *
 * Drafts included (`perspective: 'raw'`) — publishing a stale draft would otherwise
 * restore the pre-merge shape on a document this script had already fixed.
 * Idempotent: re-running writes the same values.
 *
 * `--verify` re-reads the dataset and compares VALUES, not counts. Transactions can
 * return before the dataset settles, so a script's own closing tally is not evidence.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 * 🔴 Run it through the register, not the command below:
 *   pnpm sanity:migrate up --dataset <development|production> \
 *     --only 20260930-appears-in --confirm
 *
 * `migrate.mjs` writes the ledger row; this script does not. A direct run applies
 * the same changes but records NOTHING. See MIGRATIONS.md.
 *
 * The invocation below is this script's own interface, and is still the right way
 * to take a dry run:
 *   pnpm --filter @pakfactory/studio run migrate:appears-in -- --dataset development
 *   ...                                                       --dataset development --confirm
 *   ...                                                       --dataset production --confirm --yes-production
 *   ...                                                       --dataset production --verify
 *
 * ⚠️ Run in the SAME deploy as the schema change.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run migrate:appears-in -- --dataset <development|production> [--confirm] [--yes-production] [--verify]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.
  --verify          Read-only. Re-read and compare values; writes nothing.`

const args = parseScriptArgs({ usage: USAGE, flags: ['verify'] })
const { confirm: apply, verify } = args

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
const DATASET = args.dataset
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error('❌  --confirm needs a WRITE token.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
  perspective: 'raw',
})

const label = (d) => `${d.title || d._id}${d.isDraft ? ' (draft)' : ''}`

/** The whole mapping, in one place. `null` means "no value exists for this pair". */
function appearsInFor(configuratorRole, hasPage) {
  const pickable = configuratorRole !== 'reference'
  if (hasPage === true) return pickable ? 'configurable-with-page' : 'not-configurable-with-page'
  return pickable ? 'configurable-no-page' : null
}

async function main() {
  console.log('\n🔀  Merge configuratorRole + hasPage → appearsIn (PROD-2732)')
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const docs = await client.fetch(
    `*[_type == "customizationOption"]{
       _id, title, configuratorRole, hasPage, appearsIn,
       "isDraft": _id in path("drafts.**")
     } | order(title asc)`,
  )

  if (!docs.length) {
    console.log(`✅  Nothing to do — ${DATASET} holds no customizationOption documents.\n`)
    return
  }

  // ── Gate 1: the source fields have to be there to merge. A document carrying
  //    neither successor nor source cannot be placed, and defaulting it would
  //    invent a customer-facing decision.
  const unplaceable = docs.filter(
    (d) => !d.appearsIn && !d.configuratorRole && d.hasPage === undefined,
  )
  if (unplaceable.length) {
    console.error(`❌  ${unplaceable.length} Option(s) carry neither source field, and no appearsIn already:`)
    unplaceable.forEach((d) => console.error(`     ${d._id}  ${label(d)}`))
    console.error('    Both were required in the schema, so the data diverged from it.')
    console.error('    Set them by hand, or decide the default deliberately. Nothing written.')
    process.exit(1)
  }

  const plan = docs.map((d) => ({
    ...d,
    next: d.appearsIn ?? appearsInFor(d.configuratorRole, d.hasPage),
  }))

  // ── Gate 2: the fourth cell, but only where it is REACHABLE.
  //
  //    "Reference with no page" has no `appearsIn` value, and that is fine on an
  //    option no customer can reach — the field is required only while active, so
  //    the honest answer is to write nothing. An ACTIVE one is different: it is
  //    reachable, so it has to say where it appears, and only a person can decide
  //    which of the three it is.
  const unreachableFourth = plan.filter((p) => p.next === null && p.status !== 'active')
  const activeFourth = plan.filter((p) => p.next === null && p.status === 'active')
  if (activeFourth.length) {
    console.error(`❌  ${activeFourth.length} ACTIVE Option(s) are "reference" with no page — a combination \`appearsIn\` cannot express:`)
    activeFourth.forEach((p) => console.error(`     ${p._id}  ${label(p)}`))
    console.error('')
    console.error('    An active option is reachable, so it has to say where it appears.')
    console.error('    Decide what each of these is, then re-run:')
    console.error('      • it should reach nobody          → status: not-active (PROD-2733)')
    console.error('      • it should have a page           → set hasPage true')
    console.error('      • a customer does pick it         → set configuratorRole configurable')
    console.error('')
    console.error('    Nothing written. This is the check, not a bug.')
    process.exit(1)
  }

  if (verify) {
    const wrong = plan.filter((p) => p.next !== null && p.appearsIn !== p.next)
    console.log(`Checked ${plan.length} Option(s) against the intended merge.`)
    if (!wrong.length) {
      console.log('✅  Every Option matches — appearsIn is correct.\n')
      return
    }
    console.error(`❌  ${wrong.length} Option(s) differ from the intended value:`)
    wrong.forEach((p) =>
      console.error(
        `     ${label(p)}: appearsIn=${JSON.stringify(p.appearsIn)} (want ${JSON.stringify(p.next)})` +
          `  [configuratorRole=${p.configuratorRole} hasPage=${p.hasPage}]`,
      ),
    )
    process.exit(1)
  }

  const tally = plan.reduce((acc, p) => ({ ...acc, [p.next]: (acc[p.next] ?? 0) + 1 }), {})
  console.log(`${plan.length} Option(s) (drafts included):`)
  console.log(`   Configurable + Detail Page      ${tally['configurable-with-page'] ?? 0}`)
  console.log(`   Not Configurable + Detail Page  ${tally['not-configurable-with-page'] ?? 0}`)
  console.log(`   Configurable + No Detail Page   ${tally['configurable-no-page'] ?? 0}`)
  console.log(`   (left empty — not reachable)    ${unreachableFourth.length}`)

  // Named individually — these are the two smaller groups, and a wrong one here is
  // a page that appears or disappears. Worth reading rather than counting.
  const notConfigurable = plan.filter((p) => p.next === 'not-configurable-with-page')
  const noPage = plan.filter((p) => p.next === 'configurable-no-page')
  if (notConfigurable.length) {
    console.log(`\nNot Configurable + Detail Page — library page only, never picked:`)
    notConfigurable.forEach((p) => console.log(`   • ${label(p)}`))
  }
  if (noPage.length) {
    console.log(`\nConfigurable + No Detail Page — in the configurator, no URL:`)
    noPage.forEach((p) => console.log(`   • ${label(p)}`))
  }

  const tx = client.transaction()
  let writes = 0
  for (const p of plan) {
    if (p.next === null) continue // the fourth cell: nothing to write, deliberately
    if (p.appearsIn === p.next) continue
    tx.patch(p._id, (patch) => patch.set({ appearsIn: p.next }))
    writes++
  }

  if (!writes) {
    console.log(`\n✅  Nothing to do — ${DATASET} already carries appearsIn on every Option.\n`)
    return
  }
  if (!apply) {
    console.log(`\n${writes} patch(es) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }

  // `visibility: 'sync'` — an async commit returns before the dataset settles, so
  // the check below would read stale state and report success either way.
  await tx.commit({ visibility: 'sync' })
  console.log(`\n✅  Applied ${writes} patch(es) in ${DATASET}.`)

  // Counts only the options that MUST carry a value. The unreachable fourth cell is
  // meant to have none, so a blanket "!defined(appearsIn)" count would report the
  // deliberate ones as failures.
  const after = await client.fetch(
    `count(*[_type == "customizationOption" && status == "active" && !defined(appearsIn)])`,
  )
  console.log(`    ${after} ACTIVE Option(s) still have no appearsIn (want 0).`)
  console.log(`    ${unreachableFourth.length} left empty on purpose — not reachable, so the question does not arise.`)
  console.log(`    \`configuratorRole\` and \`hasPage\` are untouched — that data is the rollback path.`)
  console.log(`    Re-run with \`--verify\` to compare values rather than counts.\n`)
  if (after > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
