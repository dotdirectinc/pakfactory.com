/**
 * Retire `customizationOption.category` and rename `whyChooseBlock` → `benefits`
 * (PROD-2250, Rename Map "Still to do — fields").
 *
 * Two rows from the map, both on `customizationOption`:
 *
 *   category        RETIRE — the Category is reachable as `type->category`, and a second
 *                   stored path to the same fact is how the two drift apart.
 *   whyChooseBlock  → `benefits`, matching Product and Product Style (D33). "Block"
 *                   named the mechanism (rich text), not the meaning.
 *   whatIsBlock     retired in the schema (deprecated, not deleted) — no data move; the
 *                   definition belongs to the Glossary Term, which has no surface yet.
 *
 * Verified on production 2026-08-27 BEFORE the field was removed from the schema:
 * all 33 Options had `category` equal to `type->category`, **0 drift**, and no Option's
 * Type lacked a category. The value is therefore reconstructible for every document and
 * nothing is lost by unsetting it. Re-run that check on any dataset this has not been
 * applied to yet — the script does it itself and refuses to unset where it fails.
 *
 * `benefits` is copied, not moved: `whyChooseBlock` stays in place carrying
 * `deprecateField()`, which is steps 1-4 of the Rename Map's procedure. Step 5 —
 * removing the old field — is a later sweep, once nothing reads it.
 *
 * Idempotent: only unsets `category` where it is still present, and only writes
 * `benefits` where it is absent and `whyChooseBlock` has content. Never overwrites an
 * editor's `benefits`.
 *
 * Follows the `packages/sanity/scripts/` convention (see
 * `.claude/rules/dataset-script-placement-and-flags.md`):
 *   pnpm --filter @pakfactory/studio run migrate:option-category-benefits -- --dataset development
 *   pnpm --filter @pakfactory/studio run migrate:option-category-benefits -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run migrate:option-category-benefits -- --dataset production --confirm --yes-production
 *
 * ⚠️  The development dataset is nightly-synced from production, so a dev-only apply is
 * wiped overnight. Run development first to verify, then production to make it stick.
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
  pnpm --filter @pakfactory/studio run migrate:option-category-benefits -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`
const args = parseScriptArgs({ usage: USAGE })
const { confirm: apply } = args

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
const DATASET = args.dataset
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local (SANITY_API_WRITE_TOKEN)')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error('❌  --confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN); a read token cannot write.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
  // Explicit: on apiVersion >= 2025-02-19 the client defaults to `published`, which
  // drops drafts from query results. Drafts must be migrated too, or publishing one
  // restores the retired key.
  perspective: 'raw',
})

async function main() {
  console.log(`\n🔧  Retire customizationOption.category + whyChooseBlock → benefits (PROD-2250)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  // ── 1. Safety gate — the retire is only lossless if the value is reconstructible ──
  // This is the whole justification for unsetting a field populated on every document,
  // so it is re-checked per dataset rather than trusted from the production reading.
  const drift = await client.fetch(
    `*[_type == "customizationOption" && defined(category) &&
       category->title != type->category->title]{
       _id, title, "own": category->title, "viaType": type->category->title }`,
  )
  if (drift.length) {
    console.error(`❌  ${drift.length} Option(s) have a \`category\` that does NOT match \`type->category\`. Unsetting would lose information — resolve these first:`)
    drift.forEach((d) => console.error(`     ${d.title}: own="${d.own ?? '—'}" vs via type="${d.viaType ?? '—'}"`))
    process.exit(1)
  }
  console.log('✅  Safety check: every `category` matches `type->category` — the value is reconstructible.\n')

  // ── 2. category → unset ──────────────────────────────────────────────────────────
  const withCategory = await client.fetch(
    `*[_type == "customizationOption" && defined(category)]{
       _id, title, "isDraft": _id in path("drafts.**") } | order(title asc)`,
  )

  // ── 3. whyChooseBlock → benefits ─────────────────────────────────────────────────
  const toCopy = await client.fetch(
    `*[_type == "customizationOption" && defined(whyChooseBlock) && !defined(benefits)]{
       _id, title, whyChooseBlock, "isDraft": _id in path("drafts.**") } | order(title asc)`,
  )

  if (!withCategory.length) console.log('✅  No Option still carries `category`.')
  else {
    console.log(`${withCategory.length} Option(s) to unset \`category\` on:`)
    withCategory.forEach((d) => console.log(`${apply ? '   ✏️ ' : '   •'} ${d.isDraft ? '[draft] ' : ''}${d.title}`))
  }

  console.log('')
  if (!toCopy.length) console.log('✅  No `whyChooseBlock` left to copy into `benefits`.')
  else {
    console.log(`${toCopy.length} Option(s) to copy whyChooseBlock → benefits:`)
    toCopy.forEach((d) => console.log(`${apply ? '   ✏️ ' : '   •'} ${d.isDraft ? '[draft] ' : ''}${d.title}`))
  }

  if (!withCategory.length && !toCopy.length) {
    console.log(`\n✅  Nothing to do — ${DATASET} is already migrated.\n`)
    return
  }
  if (!apply) {
    console.log(`\n${withCategory.length + toCopy.length} write(s) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }

  const tx = client.transaction()
  for (const d of withCategory) tx.patch(d._id, (p) => p.unset(['category']))
  for (const d of toCopy) {
    // Copy, don't move: `whyChooseBlock` keeps its data and its deprecation notice
    // until a later sweep removes the field (Rename Map step 5).
    tx.patch(d._id, (p) => p.set({ benefits: d.whyChooseBlock }))
  }
  await tx.commit()
  console.log(`\n✅  Unset \`category\` on ${withCategory.length} and copied benefits on ${toCopy.length} in ${DATASET}.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
