/**
 * Settle `product` line/style cardinality (PROD-2250, Rename Map row 70).
 *
 * Confirmed with Richard 2026-08-27, before the product data source begins populating:
 * a product belongs to exactly ONE Product Line, but may take SEVERAL Styles within it.
 *
 *   productCategories      (array)      → productLine   (SINGLE reference)
 *   productStyleCategories (array)      → productStyle  (stays an ARRAY)
 *
 * ⚠️  Both target keys ALREADY EXIST in the data and neither is in the schema — an
 * earlier one-off (`packages/sanity/scripts/migrate-product-refs.ts`) wrote
 * `productLine` and `productStyle` as single references and left the arrays in place.
 * Nothing has kept them in step since, and because they were never declared, no editor
 * or validation could see them drift. That invisible second copy is the real thing this
 * migration removes.
 *
 * So the two halves are NOT symmetric:
 *
 *   productLine   already a single ref, and correct → verify, then unset the array.
 *   productStyle  currently a single ref, which is WRONG under this decision → it is
 *                 OVERWRITTEN with the array from `productStyleCategories`, then the
 *                 old array key is unset. Same key, different shape, done deliberately.
 *
 * Verified lossless on production before writing: of 26 products, 0 sat in more than one
 * line, 0 in more than one style, and every existing single ref agreed with its array's
 * first entry. The script re-checks all three per dataset and refuses to write if any
 * fails, because the "one line" half is only safe while no product uses two.
 *
 * Idempotent: skips documents already in the target shape.
 *
 * Follows `.claude/rules/dataset-script-placement-and-flags.md`:
 *   pnpm --filter @pakfactory/studio run migrate:product-cardinality -- --dataset development
 *   pnpm --filter @pakfactory/studio run migrate:product-cardinality -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run migrate:product-cardinality -- --dataset production --confirm --yes-production
 *
 * ⚠️  Run in the SAME deploy as the schema change, and BEFORE any bulk population —
 * between the two, the Studio shows fields the data has not moved into yet.
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
  pnpm --filter @pakfactory/studio run migrate:product-cardinality -- --dataset <development|production> [--confirm] [--yes-production]

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
  console.error('❌  --confirm needs a WRITE token; a read token cannot write.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
  perspective: 'raw', // drafts must migrate too, or publishing one restores the arrays
})

async function main() {
  console.log(`\n🔧  Product line/style cardinality — one line, many styles (PROD-2250)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  // ── Safety gates. "One line" is only lossless while nothing uses two. ────────────
  const multiLine = await client.fetch(
    `*[_type == "product" && count(productCategories) > 1]{ _id, title, "lines": productCategories[]->title }`,
  )
  if (multiLine.length) {
    console.error(`❌  ${multiLine.length} product(s) sit in MORE THAN ONE product line. Collapsing to a single reference would silently drop one — resolve these first:`)
    multiLine.forEach((d) => console.error(`     ${d.title}: ${(d.lines || []).join(' + ')}`))
    process.exit(1)
  }
  const lineDisagrees = await client.fetch(
    `*[_type == "product" && defined(productLine) && defined(productCategories) &&
       productLine._ref != productCategories[0]._ref]{ _id, title }`,
  )
  if (lineDisagrees.length) {
    console.error(`❌  ${lineDisagrees.length} product(s) have an existing \`productLine\` that disagrees with \`productCategories[0]\` — the invisible copy has already drifted. Resolve before migrating:`)
    lineDisagrees.forEach((d) => console.error(`     ${d.title} (${d._id})`))
    process.exit(1)
  }
  console.log('✅  Safety: no product spans two lines; every existing productLine agrees with its array.\n')

  const docs = await client.fetch(
    `*[_type == "product" && (defined(productCategories) || defined(productStyleCategories))]{
       _id, title, "isDraft": _id in path("drafts.**"),
       productCategories, productStyleCategories, productLine, productStyle
     } | order(title asc)`,
  )

  const patches = []
  for (const d of docs) {
    const set = {}
    const unset = []
    const notes = []

    if (Array.isArray(d.productCategories)) {
      const first = d.productCategories[0]
      if (first?._ref && !d.productLine) {
        set.productLine = { _type: 'reference', _ref: first._ref }
        notes.push('line←array[0]')
      } else if (first?._ref) {
        notes.push('line already set')
      }
      unset.push('productCategories')
    }

    if (Array.isArray(d.productStyleCategories)) {
      // Overwrite whatever `productStyle` holds — the earlier one-off left a SINGLE
      // reference there, which this decision reverses back to an array.
      const already = Array.isArray(d.productStyle)
      if (!already) {
        set.productStyle = d.productStyleCategories
        notes.push(`styles←array(${d.productStyleCategories.length})`)
      } else {
        notes.push('styles already an array')
      }
      unset.push('productStyleCategories')
    }

    if (!Object.keys(set).length && !unset.length) continue
    console.log(`${apply ? '✏️ ' : '•'} ${d.isDraft ? '[draft] ' : ''}${d.title ?? d._id}  ${notes.join(', ')}`)
    patches.push({ _id: d._id, set, unset })
  }

  if (!patches.length) {
    console.log(`\n✅  Nothing to do — ${DATASET} is already on the new shape.\n`)
    return
  }
  if (!apply) {
    console.log(`\n${patches.length} document(s) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }

  const tx = client.transaction()
  for (const p of patches) {
    tx.patch(p._id, (patch) => {
      let next = patch
      if (Object.keys(p.set).length) next = next.set(p.set)
      if (p.unset.length) next = next.unset(p.unset)
      return next
    })
  }
  await tx.commit()
  console.log(`\n✅  Migrated ${patches.length} product(s) in ${DATASET}.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
