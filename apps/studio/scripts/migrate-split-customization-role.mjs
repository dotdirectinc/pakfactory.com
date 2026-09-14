#!/usr/bin/env node
/**
 * PROD-2482 / D55 — split `customizationOption.role` into `configuratorRole` + `hasPage`.
 *
 * `role` answered two independent questions with one value:
 *
 *   configurable  =  a customer picks this   AND  this has no URL
 *   reference     =  technical, never picked AND  this has a library page
 *
 * The schema stated those as inverse, and across the 33 mock Options they were, so
 * the assumption went unexamined. The Notion Demo import falsified it: `Detail Page`
 * is checked on 102 of 113 rows, because the content team gives detail pages to
 * things customers ALSO pick — Magnetic Closure, Hot Foil Stamping, Spot UV, SBS.
 * "Pickable AND has a page" is the majority of the catalogue and had nowhere to be
 * recorded. D54 flagged it and left it open; D55 closes it.
 *
 * ── What this writes ────────────────────────────────────────────────────────
 *
 *   configuratorRole  ←  role, verbatim. A straight copy on all 126.
 *   hasPage           ←  Notion's `Detail Page` for the 113 imported Options,
 *                        read from the committed export next to this script.
 *                        ←  role == 'reference' for the 13 with no Notion row,
 *                        which preserves today's behaviour exactly.
 *
 * The `hasPage` values are therefore RECOVERED AUTHORED DATA, not a value invented
 * at migration time. That is the whole point of the split — the column already held
 * the answer and the model had no field for it.
 *
 * ⚠️ ADDITIVE ONLY. `role` is NOT unset here. Conventions §4.3: never remove a
 * populated field in the change that stops using it. It stays deployed, read-only
 * and deprecated, until the split is verified; removal is a later sweep through
 * `migrate:unset-removed-deprecated`.
 *
 * Drafts included (`perspective: 'raw'`) — publishing a stale draft would otherwise
 * restore the pre-split shape on a document this script had already fixed.
 * Idempotent: re-running writes the same values.
 *
 * `--verify` re-reads the dataset and compares VALUES, not counts. Transactions can
 * return before the dataset settles, so a script's own closing tally is not evidence
 * (D53 territory — it has bitten this series three times).
 *
 * Title matching against the Notion export is exact, with the same TITLE_ALIASES
 * the importer uses. Any Option that matches no Notion row falls to the `role`
 * rule and is REPORTED, so a silent mismatch cannot pass as a deliberate fallback.
 *
 * ⚠️ THE 13 UNMATCHED ARE NOT A MATCHING BUG — checked, not assumed. They are the
 * 13 pre-existing mock Options the import deliberately left untouched because no
 * Demo row replaced them. Several have a near-namesake in the Notion set that is a
 * DIFFERENT document: Sanity `Spot UV` vs Notion `Spot UV / Spot Gloss`; Sanity
 * `Blind Embossing & Debossing` vs Notion `Blind Embossing`. That is the
 * "Notion splits what Sanity merges" problem the import plan recorded, and
 * collapsing them is a content decision, not something a migration should guess.
 *
 * One pair is correct BY DESIGN and must not be collapsed: Notion `Gloss`
 * (hasPage false) is the simplified customer-facing leaf, Sanity `Gloss Lamination`
 * (hasPage true) is the technical option that `achieves` it. D46 working exactly as
 * intended — the split page decision is the point, not a discrepancy.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/studio run migrate:split-customization-role -- --dataset development
 *   ...                                                                     --dataset development --confirm
 *   ...                                                                     --dataset production --confirm --yes-production
 *   ...                                                                     --dataset production --verify
 *
 * ⚠️ Run in the SAME deploy as the schema change.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run migrate:split-customization-role -- --dataset <development|production> [--confirm] [--yes-production] [--verify]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.
  --verify          Read-only. Re-read and compare values; writes nothing.`

const args = parseScriptArgs({ usage: USAGE, flags: ['verify'] })
const { confirm: apply, verify } = args

/** Same alias table the importer uses — Sanity and Notion expand CCNB differently. */
const TITLE_ALIASES = { 'CCNB (Clay-Coated News Back)': 'CCNB (Coated Chip Natural Back)' }

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

/** Notion `Detail Page`, keyed by the title the importer wrote into Sanity. */
function loadDetailPageByTitle() {
  const raw = JSON.parse(
    readFileSync(join(__dirname, 'data/notion-customization-demo.json'), 'utf8'),
  )
  const map = new Map()
  for (const db of raw.databases) {
    for (const row of db.rows) {
      map.set(row.title, Boolean(row.detailPage))
      // The importer patched an existing document whose title differs; record both
      // spellings so the lookup matches whichever one the dataset actually holds.
      const alias = TITLE_ALIASES[row.title]
      if (alias) map.set(alias, Boolean(row.detailPage))
    }
  }
  return map
}

const publishedId = (id) => id.replace(/^drafts\./, '')

async function main() {
  console.log('\n🔀  Split customizationOption.role → configuratorRole + hasPage (PROD-2482 / D55)')
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const detailPage = loadDetailPageByTitle()
  const docs = await client.fetch(
    `*[_type == "customizationOption"]{
       _id, title, role, configuratorRole, hasPage,
       "isDraft": _id in path("drafts.**")
     } | order(title asc)`,
  )

  if (!docs.length) {
    console.log(`✅  Nothing to do — ${DATASET} holds no customizationOption documents.\n`)
    return
  }

  // ── The gate: `role` is the only source for `configuratorRole`. A document
  //    without it cannot be split, and guessing would invent a customer-facing
  //    decision. Abort rather than default.
  const missingRole = docs.filter((d) => !d.role && !d.configuratorRole)
  if (missingRole.length) {
    console.error(`❌  ${missingRole.length} Option(s) carry no \`role\` to split, and no \`configuratorRole\` already:`)
    missingRole.forEach((d) => console.error(`     ${d._id}  ${d.title}`))
    console.error('    `role` is required in the schema, so this means the data diverged from it.')
    console.error('    Set them by hand, or decide the default deliberately. Nothing written.')
    process.exit(1)
  }

  const plan = docs.map((d) => {
    const fromNotion = detailPage.get(d.title)
    return {
      ...d,
      nextRole: d.role ?? d.configuratorRole,
      nextHasPage: fromNotion !== undefined ? fromNotion : (d.role ?? d.configuratorRole) === 'reference',
      source: fromNotion !== undefined ? 'notion' : 'role',
    }
  })

  if (verify) {
    const wrong = plan.filter(
      (p) => p.configuratorRole !== p.nextRole || p.hasPage !== p.nextHasPage,
    )
    console.log(`Checked ${plan.length} Option(s) against the intended split.`)
    if (!wrong.length) {
      console.log('✅  Every Option matches — configuratorRole and hasPage are correct.\n')
      return
    }
    console.error(`❌  ${wrong.length} Option(s) differ from the intended values:`)
    wrong.forEach((p) =>
      console.error(
        `     ${p.title}: configuratorRole=${JSON.stringify(p.configuratorRole)} (want ${JSON.stringify(p.nextRole)})` +
          ` hasPage=${JSON.stringify(p.hasPage)} (want ${JSON.stringify(p.nextHasPage)})`,
      ),
    )
    process.exit(1)
  }

  const fromNotion = plan.filter((p) => p.source === 'notion')
  const fromRole = plan.filter((p) => p.source === 'role')
  console.log(`${plan.length} Option(s): ${fromNotion.length} take hasPage from Notion's Detail Page, ` +
    `${fromRole.length} fall back to role == 'reference'.\n`)

  console.log(`hasPage from Notion — ${fromNotion.filter((p) => p.nextHasPage).length} true, ` +
    `${fromNotion.filter((p) => !p.nextHasPage).length} false:`)
  fromNotion.filter((p) => !p.nextHasPage).forEach((p) => console.log(`   ✗ no page: ${p.title}`))

  console.log(`\nNo Notion row — hasPage derived from role (reported so a mismatch cannot pass silently):`)
  fromRole.forEach((p) =>
    console.log(`   ${p.nextHasPage ? '✓' : '✗'} ${p.title}  (role=${p.nextRole})`),
  )

  const tx = client.transaction()
  let writes = 0
  for (const p of plan) {
    if (p.configuratorRole === p.nextRole && p.hasPage === p.nextHasPage) continue
    tx.patch(p._id, (patch) =>
      patch.set({ configuratorRole: p.nextRole, hasPage: p.nextHasPage }),
    )
    writes++
  }

  if (!writes) {
    console.log(`\n✅  Nothing to do — ${DATASET} already carries the split values.\n`)
    return
  }
  if (!apply) {
    console.log(`\n${writes} patch(es) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }

  // `visibility: 'sync'` — an async commit returns before the dataset settles, so
  // the verification below would read stale state and report success either way.
  await tx.commit({ visibility: 'sync' })
  console.log(`\n✅  Applied ${writes} patch(es) in ${DATASET}.`)

  const after = await client.fetch(
    `count(*[_type == "customizationOption" && defined(configuratorRole) && defined(hasPage)])`,
  )
  const expected = new Set(docs.map((d) => publishedId(d._id))).size
  console.log(`    ${after} document(s) now carry both fields (${docs.length} incl. drafts, ${expected} published ids).`)
  console.log(`    \`role\` is untouched and still deployed — removal is a later sweep.`)
  console.log(`    Re-run with \`--verify\` to compare values rather than counts.\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
