/**
 * Data changes for Eric's schema review (D48) — PROD-2250.
 *
 * Three unrelated fixes that share one deploy, because each is the data half of a
 * schema change landing in the same PR.
 *
 * ── 1. `customizationType.cardinality`: single|multiple → one|many ───────────
 * `property.cardinality` shipped `one`/`many`; this one shipped `single`/`multiple`.
 * Two fields with the same name storing different vocabularies, which is invisible in
 * the Studio (the labels are identical) and only bites in code.
 *
 * ⚠️ The review says "no data migration — the documents are mock". They are not mock
 * to the Studio: `cardinality` is REQUIRED, so leaving 23 live Types on the old words
 * fails validation the moment an editor opens one. The values also feed the registry
 * projection (`spec_attribute.multi_select`), so they are read, not decorative.
 *
 * ── 2. `customizationOption.faqs` member type ───────────────────────────────
 * `faqs` returns as the shared `faqsField({ mode: 'mixed' })` — the same call Guide
 * and Post make. The three existing entries were written against an ANONYMOUS object
 * member and carry no `_type`, so the helper cannot render them: they show as unknown.
 * Stamping `_type: 'faqItem'` is what makes the review's "no migration" claim true.
 *
 * ── 3. Orphaned `show*Table` keys ───────────────────────────────────────────
 * `showThicknessTable`, `showFluteTypeTable` and `showColorRange` were removed from
 * the schema long ago and the review correctly lists them as gone. They are still on
 * the DOCUMENTS — the review scoped documents out, so it could not see them. Same
 * orphaned-key hygiene as the six unset in Rename Map step 5.
 *
 * Idempotent throughout; drafts included, since publishing one restores the old shape.
 *
 * Follows `.claude/rules/dataset-script-placement-and-flags.md`:
 *   pnpm --filter @pakfactory/studio run migrate:schema-review-d48 -- --dataset development
 *   pnpm --filter @pakfactory/studio run migrate:schema-review-d48 -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run migrate:schema-review-d48 -- --dataset production --confirm --yes-production
 *
 * ⚠️ Run in the SAME deploy as the schema change — between them, every Customization
 * Type holds a `cardinality` value its own schema rejects.
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
  pnpm --filter @pakfactory/studio run migrate:schema-review-d48 -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`
const args = parseScriptArgs({ usage: USAGE })
const { confirm: apply } = args

const CARDINALITY = { single: 'one', multiple: 'many' }
const ORPHANED_FLAGS = ['showThicknessTable', 'showFluteTypeTable', 'showColorRange']

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
  console.log(`\n🔧  Schema review data fixes (D48, PROD-2250)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)
  const tx = client.transaction()
  let writes = 0

  // ── 1. cardinality vocabulary ─────────────────────────────────────────────
  const types = await client.fetch(
    `*[_type == "customizationType" && cardinality in $old]{ _id, title, cardinality, "isDraft": _id in path("drafts.**") } | order(title asc)`,
    { old: Object.keys(CARDINALITY) },
  )
  const unknown = await client.fetch(
    `*[_type == "customizationType" && defined(cardinality) && !(cardinality in $all)]{ _id, title, cardinality }`,
    { all: [...Object.keys(CARDINALITY), ...Object.values(CARDINALITY)] },
  )
  if (unknown.length) {
    console.error(`❌  ${unknown.length} Type(s) hold a cardinality that is neither vocabulary — resolve before migrating:`)
    unknown.forEach((d) => console.error(`     ${d.title}: "${d.cardinality}"`))
    process.exit(1)
  }
  console.log(`1. cardinality single|multiple → one|many  (${types.length} Type(s))`)
  types.forEach((d) => {
    console.log(`   ${apply ? '✏️ ' : '•'} ${d.isDraft ? '[draft] ' : ''}${d.title}: ${d.cardinality} → ${CARDINALITY[d.cardinality]}`)
    tx.patch(d._id, (p) => p.set({ cardinality: CARDINALITY[d.cardinality] })); writes++
  })
  if (!types.length) console.log('   ✅ none left on the old vocabulary')

  // ── 2. faqs member type ───────────────────────────────────────────────────
  const withFaqs = await client.fetch(
    `*[_type == "customizationOption" && count(faqs) > 0]{ _id, title, faqs, "isDraft": _id in path("drafts.**") } | order(title asc)`,
  )
  const needStamp = withFaqs
    .map((d) => ({ ...d, untyped: (d.faqs ?? []).filter((f) => !f._type).length }))
    .filter((d) => d.untyped)
  console.log(`\n2. faqs entries needing \`_type: 'faqItem'\`  (${needStamp.length} document(s))`)
  needStamp.forEach((d) => {
    console.log(`   ${apply ? '✏️ ' : '•'} ${d.isDraft ? '[draft] ' : ''}${d.title}: ${d.untyped} entr${d.untyped === 1 ? 'y' : 'ies'}`)
    // Rewrite the whole array — a per-key patch cannot add `_type` to an existing
    // member, and every entry keeps its `_key` so references and history survive.
    const next = (d.faqs ?? []).map((f) => (f._type ? f : { ...f, _type: 'faqItem' }))
    tx.patch(d._id, (p) => p.set({ faqs: next })); writes++
  })
  if (!needStamp.length) console.log('   ✅ every entry already carries a member type')

  // ── 3. orphaned flags ─────────────────────────────────────────────────────
  const flagged = await client.fetch(
    `*[_type == "customizationOption" && (${ORPHANED_FLAGS.map((f) => `defined(${f})`).join(' || ')})]{
       _id, title, "isDraft": _id in path("drafts.**"), ${ORPHANED_FLAGS.join(', ')} } | order(title asc)`,
  )
  console.log(`\n3. orphaned show*Table keys  (${flagged.length} document(s))`)
  flagged.forEach((d) => {
    const keys = ORPHANED_FLAGS.filter((f) => d[f] !== undefined && d[f] !== null)
    console.log(`   ${apply ? '✏️ ' : '•'} ${d.isDraft ? '[draft] ' : ''}${d.title}: unset ${keys.join(', ')}`)
    tx.patch(d._id, (p) => p.unset(keys)); writes++
  })
  if (!flagged.length) console.log('   ✅ none carry them')

  if (!writes) { console.log(`\n✅  Nothing to do — ${DATASET} is already consistent.\n`); return }
  if (!apply) {
    console.log(`\n${writes} patch(es) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }
  await tx.commit()
  console.log(`\n✅  Applied ${writes} patch(es) in ${DATASET}.\n`)
}

main().catch((e) => { console.error(e); process.exit(1) })
