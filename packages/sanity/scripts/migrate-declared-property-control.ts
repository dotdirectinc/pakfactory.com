/**
 * Backfill `control` / `valuesPerItem` on Customization Type declared properties
 * (selectable rows only). Stated rows are left alone.
 *
 * For each `properties[]` item with `usage == "selectable"` and no `control`:
 *   - `swatch` / `one` when any Property Value of that property has an image,
 *     a known swatch color slug, or slug `custom-color`
 *   - otherwise `chip` / `one`
 *
 * Written by an agent, RUN BY A HUMAN. Do not run from an agent session.
 *
 *   pnpm --filter @pakfactory/sanity migrate:declared-property-control -- --dataset development
 *   pnpm --filter @pakfactory/sanity migrate:declared-property-control -- --dataset development --confirm
 *   pnpm --filter @pakfactory/sanity migrate:declared-property-control -- --dataset production --confirm --yes-production
 */

import {createClient, type SanityClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({path: join(__dirname, '../../../.env.local')})
loadEnv({path: join(__dirname, '../../../.env')})

const args = process.argv.slice(2)
const flag = (n: string) => {
  const i = args.indexOf(`--${n}`)
  return i === -1 ? undefined : args[i + 1]
}
const has = (n: string) => args.includes(`--${n}`)

const dataset = flag('dataset')
const confirm = has('confirm')
const yesProduction = has('yes-production')

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  ''
const token = process.env.SANITY_API_WRITE_TOKEN || ''
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01'

function fail(msg: string): never {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}
if (!dataset) fail('--dataset is required.')
if (!projectId) fail('No project id in env.')
if (!token) fail('No SANITY_API_WRITE_TOKEN in env.')
if (dataset === 'production' && confirm && !yesProduction) {
  fail('Refusing to write to production without --yes-production.')
}

const client: SanityClient = createClient({
  projectId,
  dataset: dataset!,
  apiVersion,
  token,
  useCdn: false,
})
const write = confirm

/** Mirrors apps/www swatch-colors.ts — keep in sync for backfill inference. */
const SWATCH_SLUGS = new Set([
  'color-white',
  'color-black',
  'color-brown',
  'color-gold',
  'color-silver',
  'color-copper',
  'color-blue',
  'color-pink',
  'white',
  'black',
  'brown',
  'gold',
  'silver',
  'copper',
  'blue',
  'pink',
  'custom-color',
])

type DeclaredRow = {
  _key: string
  usage?: string
  control?: string
  valuesPerItem?: string
  property?: {_ref?: string}
}

type TypeDoc = {
  _id: string
  title?: string
  properties?: DeclaredRow[]
}

type ValueDoc = {
  propertyId?: string
  slug?: string
  hasImage?: boolean
}

function inferControl(values: ValueDoc[]): 'swatch' | 'chip' {
  for (const v of values) {
    if (v.hasImage) return 'swatch'
    const slug = v.slug?.trim()
    if (slug && SWATCH_SLUGS.has(slug)) return 'swatch'
  }
  return 'chip'
}

async function main() {
  console.log(
    `Declared-property control backfill — ${projectId}/${dataset}, mode ${
      write ? 'WRITE' : 'DRY-RUN'
    }\n`,
  )

  const types = await client.fetch<TypeDoc[]>(
    `*[_type == "customizationType"]{ _id, title, properties[]{ _key, usage, control, valuesPerItem, property } }`,
    {},
    {perspective: 'raw'},
  )

  const values = await client.fetch<ValueDoc[]>(
    `*[_type == "propertyValue"]{
      "propertyId": property._ref,
      "slug": slug.current,
      "hasImage": defined(image.asset)
    }`,
    {},
    {perspective: 'raw'},
  )

  const byProperty = new Map<string, ValueDoc[]>()
  for (const v of values) {
    const id = v.propertyId?.trim()
    if (!id) continue
    const list = byProperty.get(id) ?? []
    list.push(v)
    byProperty.set(id, list)
  }

  let patched = 0
  let skipped = 0

  for (const doc of types) {
    const rows = doc.properties ?? []
    if (rows.length === 0) continue

    const patches: {path: string; control: string; valuesPerItem: string}[] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!
      if (row.usage !== 'selectable') {
        skipped++
        continue
      }
      if (row.control) {
        skipped++
        continue
      }
      const propRef = row.property?._ref
      const control = inferControl(propRef ? (byProperty.get(propRef) ?? []) : [])
      patches.push({
        path: `properties[_key=="${row._key}"]`,
        control,
        valuesPerItem: 'one',
      })
    }

    if (patches.length === 0) continue

    console.log(
      `${doc.title ?? doc._id}: set control on ${patches.length} selectable row(s)`,
    )
    for (const p of patches) {
      console.log(`  · ${p.path} → ${p.control} / ${p.valuesPerItem}`)
    }

    if (write) {
      let tx = client.patch(doc._id)
      for (const p of patches) {
        tx = tx
          .set({[`${p.path}.control`]: p.control})
          .set({[`${p.path}.valuesPerItem`]: p.valuesPerItem})
      }
      await tx.commit({autoGenerateArrayKeys: false})
    }
    patched += patches.length
  }

  console.log(
    `\n${write ? 'Wrote' : 'Would write'} ${patched} row(s); skipped ${skipped}.`,
  )
  if (!write) {
    console.log('Re-run with --confirm to apply.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
