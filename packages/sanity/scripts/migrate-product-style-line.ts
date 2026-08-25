/**
 * PROD-2291 — populate `productStyle.productLine` from the undeclared
 * `productCategories[]` array, and drop the legacy array.
 *
 * The schema declares a single reference `productLine` (one line per style), but
 * the data sits in an undeclared array `productCategories` — null in the declared
 * field on all 8 documents (verified on production 2026-08-19). Queries written
 * against the schema return nothing until this runs. Each style has exactly one
 * entry, so `productLine = productCategories[0]`.
 *
 * Additive-safe and idempotent: only touches styles that have `productCategories`
 * and no `productLine`; sets the reference and unsets the legacy array in one
 * patch. Re-running is a no-op.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/sanity migrate:product-style-line --dataset development
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

const FILTER = `*[_type == "productStyle" && defined(productCategories) && !defined(productLine)]`

type Row = { _id: string; firstRef: string | null }

async function main() {
  console.log(
    `PROD-2291 productStyle productCategories → productLine — ${projectId}/${dataset}, mode ${verifyOnly ? 'VERIFY' : write ? 'WRITE' : 'DRY-RUN'}`,
  )
  const docs = await client.fetch<Row[]>(
    `${FILTER}{ _id, "firstRef": productCategories[0]._ref }`,
    {},
    { perspective: 'raw' },
  )
  console.log(`\n${docs.length} style doc(s) need productLine set.`)

  const bad = docs.filter((d) => !d.firstRef)
  if (bad.length) {
    console.log(`⚠️  ${bad.length} have productCategories but no usable first ref — skipped: ${bad.map((d) => d._id).join(', ')}`)
  }
  const actionable = docs.filter((d) => d.firstRef)

  if (verifyOnly || actionable.length === 0) {
    if (docs.length === 0) console.log('✓ Nothing to migrate — every style already has productLine.')
    return
  }
  if (!write) {
    for (const d of actionable) console.log(`  would set productLine = ${d.firstRef} and unset productCategories on ${d._id}`)
    console.log('\nDRY-RUN — re-run with --confirm to apply.')
    return
  }

  for (let i = 0; i < actionable.length; i += 50) {
    const tx = client.transaction()
    for (const d of actionable.slice(i, i + 50)) {
      tx.patch(
        client
          .patch(d._id)
          .setIfMissing({ productLine: { _type: 'reference', _ref: d.firstRef! } })
          .unset(['productCategories']),
      )
    }
    await tx.commit({ visibility: 'async' })
    console.log(`  migrated ${Math.min(i + 50, actionable.length)}/${actionable.length}`)
  }
  console.log('\n✓ Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
