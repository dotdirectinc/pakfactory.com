/**
 * PROD-2291 — normalise product `kind` and drop the short-lived single line/style
 * refs.
 *
 * Two corrections to the mock product data so the Studio UI demonstrates properly:
 *
 *  1. `kind` — the enum is now `standard` · `inspiration`. Three docs still carry
 *     the retired value `both` (and any missing default to standard), which shows
 *     as a blank "Product type" radio. Map everything that isn't `inspiration` to
 *     `standard`.
 *  2. `productLine` / `productStyle` — a product belongs to MORE THAN ONE line and
 *     style (Crystal's design), so those fields went back to the arrays
 *     `productCategories` / `productStyleCategories`. The single references added
 *     briefly (and backfilled by migrate:product-refs) are removed here; the
 *     arrays already hold the real data.
 *
 * Idempotent: only sets `kind` where it isn't already standard/inspiration, and
 * only unsets the single refs where they exist. Handles drafts.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/sanity migrate:product-normalize --dataset development
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
  !(kind in ["standard", "inspiration"]) ||
  defined(productLine) ||
  defined(productStyle)
)]`

type Row = { _id: string; kind: string | null; hasSingleLine: boolean; hasSingleStyle: boolean }

async function main() {
  console.log(
    `PROD-2291 product normalise (kind + drop single refs) — ${projectId}/${dataset}, mode ${verifyOnly ? 'VERIFY' : write ? 'WRITE' : 'DRY-RUN'}`,
  )
  const docs = await client.fetch<Row[]>(
    `${FILTER}{ _id, kind, "hasSingleLine": defined(productLine), "hasSingleStyle": defined(productStyle) }`,
    {},
    { perspective: 'raw' },
  )
  console.log(`\n${docs.length} product doc(s) need normalising.`)

  if (verifyOnly || docs.length === 0) {
    if (docs.length === 0) console.log('✓ Nothing to do.')
    return
  }
  if (!write) {
    for (const d of docs) {
      const acts: string[] = []
      if (d.kind !== 'standard' && d.kind !== 'inspiration') acts.push(`kind ${d.kind ?? 'missing'} → standard`)
      if (d.hasSingleLine) acts.push('unset productLine')
      if (d.hasSingleStyle) acts.push('unset productStyle')
      console.log(`  ${acts.join(', ') || 'nothing'} on ${d._id}`)
    }
    console.log('\nDRY-RUN — re-run with --confirm to apply.')
    return
  }

  for (let i = 0; i < docs.length; i += 50) {
    const tx = client.transaction()
    for (const d of docs.slice(i, i + 50)) {
      let patch = client.patch(d._id)
      if (d.kind !== 'standard' && d.kind !== 'inspiration') patch = patch.set({ kind: 'standard' })
      const unset: string[] = []
      if (d.hasSingleLine) unset.push('productLine')
      if (d.hasSingleStyle) unset.push('productStyle')
      if (unset.length) patch = patch.unset(unset)
      tx.patch(patch)
    }
    await tx.commit({ visibility: 'async' })
    console.log(`  normalised ${Math.min(i + 50, docs.length)}/${docs.length}`)
  }
  console.log('\n✓ Done. Every product now has a valid kind; line/style live in the arrays.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
