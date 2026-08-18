/**
 * PROD-2306 follow-up — unset the legacy applicability fields on
 * customizationOption after their values were backfilled into `appliesTo`.
 *
 * `applicableProductCategories` and `applicableProductStyleCategories` were
 * removed from the schema (PROD-2306). Schema-on-read leaves their values in the
 * dataset as orphaned data; this drops them. Additive-safe and idempotent —
 * `appliesTo` already holds the same references (verified 8/8 on production).
 *
 * Run AFTER migrate:customization-applies-to. Written by an agent, RUN BY A HUMAN
 * (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/sanity migrate:unset-legacy-applies --dataset development
 *   ... --confirm                                      # apply (dry-run is default)
 *   ... --dataset production --confirm --yes-production
 *   ... --dataset production --verify                  # read-only
 *
 * Env: SANITY_API_WRITE_TOKEN. Project id from NEXT_PUBLIC_SANITY_PROJECT_ID /
 * SANITY_STUDIO_PROJECT_ID.
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

const LEGACY_FIELDS = ['applicableProductCategories', 'applicableProductStyleCategories']

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

const FILTER = `*[_type == "customizationOption" && (${LEGACY_FIELDS.map((f) => `defined(${f})`).join(' || ')})]`

async function main() {
  console.log(`PROD-2306 unset legacy applies fields — ${projectId}/${dataset}, mode ${verifyOnly ? 'VERIFY' : write ? 'WRITE' : 'DRY-RUN'}`)
  const docs = await client.fetch<{ _id: string }[]>(`${FILTER}{ _id }`, {}, { perspective: 'raw' })
  console.log(`\n${docs.length} customizationOption doc(s) still carry a legacy applies field.`)
  if (verifyOnly || docs.length === 0) {
    if (docs.length === 0) console.log('✓ Nothing to unset.')
    return
  }
  if (!write) {
    for (const d of docs) console.log(`  would unset on ${d._id}`)
    console.log('\nDRY-RUN — re-run with --confirm to apply.')
    return
  }
  for (let i = 0; i < docs.length; i += 50) {
    const tx = client.transaction()
    for (const d of docs.slice(i, i + 50)) tx.patch(client.patch(d._id).unset(LEGACY_FIELDS))
    await tx.commit({ visibility: 'async' })
    console.log(`  unset ${Math.min(i + 50, docs.length)}/${docs.length}`)
  }
  console.log('\n✓ Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
