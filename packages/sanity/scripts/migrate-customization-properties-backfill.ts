/**
 * PROD-2250 — carry the five deprecated per-facet property fields on
 * customizationOption into the single generic `properties[]`.
 *
 * Source fields (all references to `propertyValue`), superseded by `properties`:
 *   materialSource       (single ref)   — 4 options on prod
 *   physicalProperties   (array)        — 8
 *   aesthetic            (array)        — 8
 *   colors               (array)        — 4
 *   sustainability       (array)        — 5
 *
 * The union of their `_ref`s is written to `properties[]`, deduped, with
 * deterministic `_key`s (`pv-<ref>`) so re-runs converge — nothing is ever
 * duplicated. Existing `properties` entries are preserved.
 *
 * ⚠️ This does NOT unset the five source fields — they stay deprecated/read-only
 * until a follow-up PR removes them, once this backfill is verified in the Studio.
 * Run this BEFORE that follow-up. Written by an agent, RUN BY A HUMAN.
 *
 *   pnpm --filter @pakfactory/sanity migrate:customization-properties-backfill --dataset development
 *   ... --confirm
 *   ... --dataset production --confirm --yes-production
 *   ... --verify        # print each option's field counts, write nothing
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
const verify = has('verify')
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
const write = confirm && !verify

type Ref = { _ref?: string }
type Opt = {
  _id: string
  properties?: Ref[]
  materialSource?: Ref
  physicalProperties?: Ref[]
  aesthetic?: Ref[]
  colors?: Ref[]
  sustainability?: Ref[]
}

const ARRAY_SOURCES = ['physicalProperties', 'aesthetic', 'colors', 'sustainability'] as const

function refsFor(o: Opt): string[] {
  const out: string[] = []
  if (o.materialSource?._ref) out.push(o.materialSource._ref)
  for (const key of ARRAY_SOURCES) {
    for (const r of o[key] ?? []) if (r?._ref) out.push(r._ref)
  }
  return out
}

async function main() {
  console.log(`PROD-2250 properties backfill — ${projectId}/${dataset}, mode ${verify ? 'VERIFY' : write ? 'WRITE' : 'DRY-RUN'}\n`)

  const opts = await client.fetch<Opt[]>(
    `*[_type == "customizationOption"]{
      _id, properties, materialSource, physicalProperties, aesthetic, colors, sustainability
    }`,
    {},
    { perspective: 'raw' },
  )

  let changed = 0
  for (const o of opts) {
    const existing = (o.properties ?? []).map((r) => r._ref).filter(Boolean) as string[]
    const incoming = refsFor(o)
    const union = Array.from(new Set([...existing, ...incoming]))

    if (verify) {
      if (incoming.length || existing.length)
        console.log(`  ${o._id}: properties ${existing.length} + sources ${incoming.length} → ${union.length}`)
      continue
    }

    // Nothing to add — already a superset.
    if (union.length === existing.length) continue

    changed++
    const value = union.map((ref) => ({ _type: 'reference' as const, _key: `pv-${ref}`, _ref: ref }))
    console.log(`  ${o._id}: properties ${existing.length} → ${union.length}`)
    if (write) await client.patch(o._id).set({ properties: value }).commit({ visibility: 'async' })
  }

  console.log('')
  if (verify) console.log('VERIFY — no writes.')
  else if (!changed) console.log('✓ Nothing to backfill — every option already holds its source refs.')
  else console.log(write ? `✓ Done — ${changed} option(s) updated.` : `DRY-RUN — ${changed} option(s) would change. Re-run with --confirm.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
