/**
 * PROD-2291 — backfill `product.productLine` / `product.productStyle` (single
 * references) from the deprecated `productCategories[]` / `productStyleCategories[]`
 * arrays.
 *
 * Product pt 3 introduced single line/style references and deprecated the arrays,
 * on the plan that the mock products would be re-seeded. Until that re-seed runs,
 * the new fields read empty while the association still sits in the old arrays —
 * so a product shows under its style (the old-array view) but its Product line /
 * Product style field is blank. This bridges the gap.
 *
 * Verified on production 2026-08-19: 28 products need a line, 27 need a style, and
 * NONE has more than one entry in either array, so copying index [0] is
 * unambiguous. The legacy arrays are left in place (a Studio view still reads
 * them); the re-seed later replaces both with clean data.
 *
 * Additive-safe and idempotent: only sets a field that is missing. Handles drafts.
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/sanity migrate:product-refs --dataset development
 *   ... --confirm                                        # apply (dry-run is default)
 *   ... --dataset production --confirm --yes-production
 *   ... --dataset production --verify                    # read-only
 */

import { createClient, type SanityClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: join(__dirname, '../../../.env.local') })
loadEnv({ path: join(__dirname, '../../../.env') })

const args = process.argv.slice(2)
const flag = (n: string) => {
  const i = args.indexOf(`--${n}`)
  return i === -1 ? undefined : args[i + 1]
}
const has = (n: string) => args.includes(`--${n}`)

const dataset = flag('dataset')
const confirm = has('confirm')
const verifyOnly = has('verify')
const yesProduction = has('yes-production')

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || ''
const token = process.env.SANITY_API_WRITE_TOKEN || ''
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01'

function fail(msg: string): never {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}
if (!dataset) fail('--dataset is required.')
if (!projectId) fail('No project id in env.')
if (!token) fail('No SANITY_API_WRITE_TOKEN in env.')
if (dataset === 'production' && confirm && !yesProduction)
  fail('Refusing to write to production without --yes-production.')

const client: SanityClient = createClient({ projectId, dataset: dataset!, apiVersion, token, useCdn: false })
const write = confirm && !verifyOnly

const FILTER = `*[_type == "product" && (
  (defined(productCategories) && !defined(productLine)) ||
  (defined(productStyleCategories) && !defined(productStyle))
)]`

type Row = { _id: string; firstLine: string | null; firstStyle: string | null; hasLine: boolean; hasStyle: boolean }

function ref(id: string) {
  return { _type: 'reference' as const, _ref: id }
}

async function main() {
  console.log(
    `PROD-2291 product line/style backfill — ${projectId}/${dataset}, mode ${verifyOnly ? 'VERIFY' : write ? 'WRITE' : 'DRY-RUN'}`,
  )
  const docs = await client.fetch<Row[]>(
    `${FILTER}{
      _id,
      "firstLine": productCategories[0]._ref,
      "firstStyle": productStyleCategories[0]._ref,
      "hasLine": defined(productLine),
      "hasStyle": defined(productStyle)
    }`,
    {},
    { perspective: 'raw' },
  )
  console.log(`\n${docs.length} product doc(s) need a line and/or style backfilled.`)

  if (verifyOnly || docs.length === 0) {
    if (docs.length === 0) console.log('✓ Nothing to backfill.')
    return
  }
  if (!write) {
    for (const d of docs) {
      const sets: string[] = []
      if (!d.hasLine && d.firstLine) sets.push(`productLine=${d.firstLine}`)
      if (!d.hasStyle && d.firstStyle) sets.push(`productStyle=${d.firstStyle}`)
      console.log(`  ${sets.length ? `would set ${sets.join(', ')}` : 'nothing to set'} on ${d._id}`)
    }
    console.log('\nDRY-RUN — re-run with --confirm to apply.')
    return
  }

  for (let i = 0; i < docs.length; i += 50) {
    const tx = client.transaction()
    for (const d of docs.slice(i, i + 50)) {
      const set: Record<string, unknown> = {}
      if (!d.hasLine && d.firstLine) set.productLine = ref(d.firstLine)
      if (!d.hasStyle && d.firstStyle) set.productStyle = ref(d.firstStyle)
      if (Object.keys(set).length) tx.patch(client.patch(d._id).setIfMissing(set))
    }
    await tx.commit({ visibility: 'async' })
    console.log(`  backfilled ${Math.min(i + 50, docs.length)}/${docs.length}`)
  }
  console.log('\n✓ Done. Legacy arrays left in place; the product re-seed replaces both later.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
