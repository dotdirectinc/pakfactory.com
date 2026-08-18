/**
 * PROD-2306 (A11) — backfill `customizationOption.appliesTo` from the deprecated
 * `applicableProductCategories`.
 *
 * Adds each option's `applicableProductCategories` (Product Line refs) into the
 * new `appliesTo` array, de-duplicated by `_ref`. Additive and idempotent — it
 * never removes the deprecated field (that happens in the follow-up removal PR).
 * Production state (2026-08-17): 8 of 33 options have values; the rest are empty.
 *
 * ⚠️ ORDER: run this AFTER the A9 type rename migration
 * (migrate:rename-commercial), which is what turns `capability` docs into
 * `customizationOption`. On a dataset still on the old type this finds 0 docs.
 *
 * Written by an agent, RUN BY A HUMAN — AGENTS.md § Sanity content.
 *
 *   pnpm --filter @pakfactory/sanity migrate:customization-applies-to --dataset development
 *   ... --confirm                       # apply (dry-run is the default)
 *   ... --dataset production --confirm --yes-production
 *   ... --dataset production --verify   # read-only
 *
 * Env: SANITY_API_WRITE_TOKEN. Project id from NEXT_PUBLIC_SANITY_PROJECT_ID /
 * SANITY_STUDIO_PROJECT_ID.
 */

import { createClient, type SanityClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { randomUUID } from 'node:crypto'
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
if (!dataset) fail('--dataset is required (never inherited from env).')
if (!projectId) fail('No project id in env.')
if (!token) fail('No SANITY_API_WRITE_TOKEN in env.')
if (dataset === 'production' && confirm && !yesProduction)
  fail('Refusing to write to production without --yes-production.')

const client: SanityClient = createClient({ projectId, dataset: dataset!, apiVersion, token, useCdn: false })
const write = confirm && !verifyOnly

type Ref = { _ref?: string; _type?: string; _key?: string }
type Doc = { _id: string; appliesTo?: Ref[]; applicableProductCategories?: Ref[] }

async function verify() {
  const total = await client.fetch<number>(`count(*[_type == "customizationOption"])`)
  const withLegacy = await client.fetch<number>(
    `count(*[_type == "customizationOption" && count(applicableProductCategories) > 0])`,
  )
  const covered = await client.fetch<number>(
    `count(*[_type == "customizationOption" && count(applicableProductCategories) > 0 &&
       count(applicableProductCategories[@._ref in ^.appliesTo[]._ref]) == count(applicableProductCategories)])`,
  )
  console.log(`\nVerify on ${dataset}: options=${total}, with legacy field=${withLegacy}, fully copied into appliesTo=${covered}`)
  console.log(withLegacy === covered ? '✓ every legacy value is present in appliesTo.' : '⚠ some legacy values are not yet in appliesTo.')
}

async function main() {
  console.log(`PROD-2306 backfill appliesTo — project ${projectId}, dataset ${dataset}, mode ${verifyOnly ? 'VERIFY' : write ? 'WRITE' : 'DRY-RUN'}`)
  if (verifyOnly) return verify()

  const docs = await client.fetch<Doc[]>(
    `*[_type == "customizationOption" && count(applicableProductCategories) > 0]{ _id, appliesTo, applicableProductCategories }`,
    {},
    { perspective: 'raw' },
  )
  console.log(`\n${docs.length} option(s) with applicableProductCategories to fold into appliesTo.`)
  if (docs.length === 0) {
    console.log('Nothing to do (already migrated, or A9 rename not run yet).')
    return
  }

  let changed = 0
  const BATCH = 50
  for (let i = 0; i < docs.length; i += BATCH) {
    const slice = docs.slice(i, i + BATCH)
    const tx = client.transaction()
    for (const doc of slice) {
      const existing = Array.isArray(doc.appliesTo) ? doc.appliesTo : []
      const have = new Set(existing.map((r) => r._ref).filter(Boolean))
      const additions = (doc.applicableProductCategories ?? [])
        .filter((r) => r._ref && !have.has(r._ref))
        .map((r) => ({ _type: 'reference', _ref: r._ref!, _key: randomUUID() }))
      if (additions.length === 0) continue
      changed++
      const next = [...existing, ...additions]
      console.log(`  ${doc._id}: +${additions.length} → appliesTo has ${next.length}`)
      if (write) tx.patch(client.patch(doc._id).setIfMissing({ appliesTo: [] }).set({ appliesTo: next }))
    }
    if (write && changed) await tx.commit({ visibility: 'async' })
  }

  if (!write) {
    console.log(`\nDRY-RUN — nothing written (${changed} option(s) would change). Re-run with --confirm.`)
    return
  }
  console.log(`\n✓ Backfilled ${changed} option(s). The deprecated field is left in place — remove it in a follow-up once verified.`)
  await verify()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
