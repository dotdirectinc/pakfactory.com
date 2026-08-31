/**
 * Unset the six fields removed from `customizationOption` (PROD-2250, Rename Map step 5).
 *
 * The Rename Map's five-step procedure ends at "remove the old field", and warns that
 * a field marked `deprecated()` is at step 1-4, not step 5 — those rows "read as done
 * and are not". Six had been sitting at step 4 for months.
 *
 *   materialSource · physicalProperties · aesthetic · colors · sustainability
 *     → superseded by `properties`
 *   whyChooseBlock
 *     → renamed to `benefits`
 *
 * VERIFIED LOSSLESS BEFORE THE SCHEMA CHANGE, not inferred from the deprecation:
 *
 *   - the five property fields held 33 references across 8 Options, and every one of
 *     the 33 was already present in that Option's `properties`. Zero gaps.
 *   - `whyChooseBlock` was populated on 8 Options, and all 8 have a populated
 *     `benefits` — the copy made by migrate:option-category-benefits is complete.
 *
 * Removing a field from the schema does not remove it from the documents. Without this
 * the dataset keeps six orphaned keys that nothing reads and the Studio cannot show —
 * the same undeclared-second-copy that `productLine`/`productStyle` demonstrated is how
 * two sources of one fact drift apart.
 *
 * The script RE-CHECKS both conditions per dataset and refuses to unset anything if
 * either fails, because "it was safe on production" is not a fact about development.
 *
 * THREE FIELDS ARE DELIBERATELY NOT TOUCHED — they are still in the schema:
 *   whatIsBlock      8 populated, destination `glossaryTerm` holds 0 documents
 *   comparedAgainst  8 populated, no successor field
 *   faqs             2 populated, not in the designed list, no successor
 * Each needs a decision about where the content goes. None is a migration.
 *
 * Follows `.claude/rules/dataset-script-placement-and-flags.md`:
 *   pnpm --filter @pakfactory/studio run migrate:unset-retired-fields -- --dataset development
 *   pnpm --filter @pakfactory/studio run migrate:unset-retired-fields -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run migrate:unset-retired-fields -- --dataset production --confirm --yes-production
 *
 * ⚠️  Run in the SAME deploy as the schema change.
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
  pnpm --filter @pakfactory/studio run migrate:unset-retired-fields -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`
const args = parseScriptArgs({ usage: USAGE })
const { confirm: apply } = args

/** Superseded by `properties`. */
const PROPERTY_FIELDS = ['materialSource', 'physicalProperties', 'aesthetic', 'colors', 'sustainability']
/** Renamed to `benefits`. */
const RENAMED = ['whyChooseBlock']
const ALL = [...PROPERTY_FIELDS, ...RENAMED]

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
const DATASET = args.dataset
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN

if (!TOKEN) { console.error('❌  Missing Sanity token in .env.local (SANITY_API_WRITE_TOKEN)'); process.exit(1) }
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error('❌  --confirm needs a WRITE token; a read token cannot write.'); process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
  perspective: 'raw', // drafts too — publishing one would restore the retired keys
})

async function main() {
  console.log(`\n🔧  Unset the six retired customizationOption fields (PROD-2250, Rename Map step 5)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  // ── Gate 1: every legacy property reference is already in `properties` ─────────
  const propGap = await client.fetch(
    `*[_type == "customizationOption" && (${PROPERTY_FIELDS.map((f) => `defined(${f})`).join(' || ')})]{
       _id, title,
       "legacy": [materialSource._ref] + physicalProperties[]._ref + aesthetic[]._ref + colors[]._ref + sustainability[]._ref,
       "props": properties[]._ref
     }`,
  )
  const uncovered = propGap
    .map((d) => ({ ...d, missing: (d.legacy ?? []).filter(Boolean).filter((r) => !(d.props ?? []).includes(r)) }))
    .filter((d) => d.missing.length)
  if (uncovered.length) {
    console.error(`❌  ${uncovered.length} Option(s) hold a property reference that is NOT in \`properties\`. Unsetting would lose it:`)
    uncovered.forEach((d) => console.error(`     ${d.title} — ${d.missing.length} reference(s) only in the retired fields`))
    process.exit(1)
  }

  // ── Gate 2: every whyChooseBlock has a populated benefits ─────────────────────
  const benefitGap = await client.fetch(
    `*[_type == "customizationOption" && defined(whyChooseBlock) &&
       !(defined(benefits.title) || count(benefits.body) > 0)]{ _id, title }`,
  )
  if (benefitGap.length) {
    console.error(`❌  ${benefitGap.length} Option(s) have \`whyChooseBlock\` but an empty \`benefits\` — the copy is incomplete. Run migrate:option-category-benefits first:`)
    benefitGap.forEach((d) => console.error(`     ${d.title}`))
    process.exit(1)
  }
  console.log('✅  Safety: every retired property reference is already in `properties`, and every `whyChooseBlock` has a populated `benefits`.\n')

  const docs = await client.fetch(
    `*[_type == "customizationOption" && (${ALL.map((f) => `defined(${f})`).join(' || ')})]{
       _id, title, "isDraft": _id in path("drafts.**"), ${ALL.join(', ')} } | order(title asc)`,
  )
  const patches = docs
    .map((d) => ({ _id: d._id, title: d.title, isDraft: d.isDraft, keys: ALL.filter((f) => d[f] !== undefined && d[f] !== null) }))
    .filter((p) => p.keys.length)

  if (!patches.length) {
    console.log(`✅  Nothing to unset — ${DATASET} carries none of the six retired keys.\n`)
    return
  }
  patches.forEach((p) => console.log(`${apply ? '✏️ ' : '•'} ${p.isDraft ? '[draft] ' : ''}${p.title}  unset: ${p.keys.join(', ')}`))
  console.log(`\n${patches.length} document(s) · ${patches.reduce((n, p) => n + p.keys.length, 0)} key(s) to unset`)

  if (!apply) {
    console.log(`\nDRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }
  const tx = client.transaction()
  for (const p of patches) tx.patch(p._id, (patch) => patch.unset(p.keys))
  await tx.commit()
  console.log(`\n✅  Unset ${patches.reduce((n, p) => n + p.keys.length, 0)} key(s) across ${patches.length} document(s) in ${DATASET}.\n`)
}

main().catch((err) => { console.error(err); process.exit(1) })
