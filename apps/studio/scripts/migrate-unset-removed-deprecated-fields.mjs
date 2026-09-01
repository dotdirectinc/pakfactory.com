/**
 * Unset the deprecated fields removed from the schema in the same PR — PROD-2250.
 *
 * Source: Eric's `Deprecated fields — removal plan` (2026-09-01). Fourteen deprecated
 * fields were audited; nine come out now, and this script sweeps the keys the schema
 * removal leaves orphaned on the documents. Removing a field from the schema does NOT
 * remove it from stored documents — that is exactly how `showThicknessTable` and its
 * siblings survived on 33 Options long after the schema forgot them (D48 §3).
 *
 * ── What is being discarded, and on whose authority ─────────────────────────
 *
 * `customizationOption.whatIsBlock` (8 docs) is the only one with authored prose:
 * written definitions of SBS, FBB, CCNB, Kraft and the four laminations. 🔴 Eric read
 * them and chose to DISCARD, not migrate — glossary content will be written fresh in
 * PakFactory's voice. The earlier plan in `Rename Map.md:64` and
 * `Entities/Glossary Term.md:47` (move them into Glossary Terms first) is SUPERSEDED.
 * This is a deliberate loss, and it is the only one here.
 *
 * Everything else is references or mock copy:
 *   customizationOption.comparedAgainst  8 docs · 3 refs each, no prose
 *   product.whatIsBlock / whyChooseBlock / comparedAgainst · all 26 products are mock
 *     and due for wholesale replacement
 *   solution.internalTitle  30 docs · `migrate:solution-titles` already copied every
 *     value to `title` and they match exactly — verified before unsetting, below
 *   product.cardName · product.showcaseImages · solution.relevantCapabilities — 0 docs
 *     each; listed so a straggler in drafts is swept rather than missed
 *
 * ⚠️ `solution.internalTitle` is guarded: the script REFUSES to unset any Solution
 * whose `title` is missing or differs from `internalTitle`, and reports it instead.
 * The unset is only safe because the copy is complete, so it verifies that rather
 * than assuming it.
 *
 * Drafts included (`perspective: 'raw'`) — publishing a draft would otherwise restore
 * the old keys. Idempotent.
 *
 * Follows `.claude/rules/dataset-script-placement-and-flags.md`:
 *   pnpm --filter @pakfactory/studio run migrate:unset-removed-deprecated -- --dataset development
 *   pnpm --filter @pakfactory/studio run migrate:unset-removed-deprecated -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run migrate:unset-removed-deprecated -- --dataset production --confirm --yes-production
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
  pnpm --filter @pakfactory/studio run migrate:unset-removed-deprecated -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`
const args = parseScriptArgs({ usage: USAGE })
const { confirm: apply } = args

/** Plain unsets — no content decision left to make on any of these. */
const REMOVED = {
  customizationOption: ['whatIsBlock', 'comparedAgainst'],
  product: ['cardName', 'whatIsBlock', 'whyChooseBlock', 'showcaseImages', 'comparedAgainst'],
  solution: ['relevantCapabilities'],
}

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
const DATASET = args.dataset
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN

if (!TOKEN) { console.error('❌  Missing Sanity token in .env.local'); process.exit(1) }
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error('❌  --confirm needs a WRITE token.'); process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID, dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN, useCdn: false, perspective: 'raw',
})

async function main() {
  console.log(`\n🧹  Unset deprecated fields removed from the schema (PROD-2250)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)
  const tx = client.transaction()
  let writes = 0

  // ── 1. Plain unsets ───────────────────────────────────────────────────────
  for (const [type, fields] of Object.entries(REMOVED)) {
    const docs = await client.fetch(
      `*[_type == $t && (${fields.map((f) => `defined(${f})`).join(' || ')})]{
         _id, title, "isDraft": _id in path("drafts.**"), ${fields.join(', ')} } | order(title asc)`,
      { t: type },
    )
    console.log(`${type} — ${fields.join(', ')}  (${docs.length} document(s))`)
    for (const d of docs) {
      const keys = fields.filter((f) => d[f] !== undefined && d[f] !== null)
      console.log(`   ${apply ? '✏️ ' : '•'} ${d.isDraft ? '[draft] ' : ''}${d.title ?? d._id}: unset ${keys.join(', ')}`)
      tx.patch(d._id, (p) => p.unset(keys)); writes++
    }
    if (!docs.length) console.log('   ✅ none carry them')
    console.log('')
  }

  // ── 2. solution.internalTitle — guarded ───────────────────────────────────
  // Only safe once `title` holds the same value. `migrate:solution-titles` copied it
  // but never unset the source, so this is the second half of that migration.
  const sols = await client.fetch(
    `*[_type == "solution" && defined(internalTitle)]{
       _id, title, internalTitle, "isDraft": _id in path("drafts.**") } | order(internalTitle asc)`,
  )
  const unsafe = sols.filter((d) => !d.title || d.title !== d.internalTitle)
  if (unsafe.length) {
    console.error(`❌  ${unsafe.length} Solution(s) would LOSE their only title — \`migrate:solution-titles\` did not finish for them:`)
    unsafe.forEach((d) => console.error(`     ${d._id}: title=${JSON.stringify(d.title)} internalTitle=${JSON.stringify(d.internalTitle)}`))
    console.error('    Run `migrate:solution-titles` first, or fix these by hand. Nothing written.')
    process.exit(1)
  }
  console.log(`solution — internalTitle  (${sols.length} document(s), title verified identical on every one)`)
  for (const d of sols) {
    console.log(`   ${apply ? '✏️ ' : '•'} ${d.isDraft ? '[draft] ' : ''}${d.title}: unset internalTitle`)
    tx.patch(d._id, (p) => p.unset(['internalTitle'])); writes++
  }
  if (!sols.length) console.log('   ✅ none carry it')

  if (!writes) { console.log(`\n✅  Nothing to do — ${DATASET} carries none of the removed keys.\n`); return }
  if (!apply) {
    console.log(`\n${writes} patch(es) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }
  await tx.commit()
  console.log(`\n✅  Applied ${writes} patch(es) in ${DATASET}.\n`)
}

main().catch((e) => { console.error(e); process.exit(1) })
