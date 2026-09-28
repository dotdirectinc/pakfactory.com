/**
 * Create the Help Center's categories. FAQs point at these through their required `category`;
 * `populate:faqs` maps Notion's "Help Category" column onto them by title.
 *
 * The list is the content model's eight (Entities/Help Category.md) with Crystal's changes of
 * 2026-09-28: "Pricing, MOQ & Lead Times" → "Pricing & MOQ" (lead times now sit under Production &
 * Timelines), plus Sustainability, Products & Customization and Services & Expertise for the
 * product-knowledge and service questions none of the eight covered. Eleven in all. Reorders &
 * Account and Billing have no FAQs yet, which is why Notion's select does not list them — they are
 * kept, not dropped. The content model still lists the eight — Eric to reconcile.
 *
 * ⚠️ SLUGS ARE PROPOSALS pending Eric. The spec gives one example, `/help/shipping`; the rest
 * follow the same short form. After the first run a slug is Studio's to edit — this never
 * overwrites one.
 *
 * Each category gets a stable id from its key (`helpCategory-<key>`) and is created only if
 * missing (`createIfNotExists`), so a re-run adds new entries and leaves edited ones alone. A
 * category already present under a different id with the same title is reported and skipped,
 * never duplicated. To add a category (the gap decision on the review page), add it to CATEGORIES
 * and re-run.
 *
 * From repo root (DRY RUN is the default — prints only, writes nothing):
 *   pnpm --filter @pakfactory/studio run seed:help-categories -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:help-categories -- --dataset development --confirm
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
  pnpm --filter @pakfactory/studio run seed:help-categories -- --dataset <name> [--confirm] [--yes-production]

  --dataset          REQUIRED. No env fallback.
  --confirm          Actually write. Without it the run is a dry run.
  --yes-production   Second gate; required to write to production.`

const args = parseScriptArgs({ usage: USAGE })
const { confirm: apply, yesProduction } = args
const DATASET = args.dataset

const fail = (msg) => {
  console.error(`\n❌  ${msg}`)
  process.exit(1)
}

/**
 * Titles must match Notion's Help Category options EXACTLY — populate:faqs matches by title and
 * stops on a value it cannot find. The first nine are Notion's options in Crystal's order; the
 * last two have no Notion option until an FAQ uses them. `slug` values are proposals (see header).
 */
const CATEGORIES = [
  { key: 'pricing', title: 'Pricing & MOQ', slug: 'pricing' },
  { key: 'proofs', title: 'Proofs & Approval', slug: 'proofs' },
  { key: 'sustainability', title: 'Sustainability', slug: 'sustainability' },
  { key: 'shipping', title: 'Shipping & Delivery', slug: 'shipping' },
  { key: 'production', title: 'Production & Timelines', slug: 'production' },
  { key: 'products', title: 'Products & Customization', slug: 'products' },
  { key: 'ordering', title: 'Ordering & Quotes', slug: 'ordering' },
  { key: 'services', title: 'Services & Expertise', slug: 'services' },
  { key: 'artwork', title: 'Artwork & Files', slug: 'artwork' },
  { key: 'reorders', title: 'Reorders & Account', slug: 'reorders' },
  { key: 'billing', title: 'Billing', slug: 'billing' },
]

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '8293wrxp'
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN
if (!TOKEN) fail('Missing Sanity token in .env.local (SANITY_API_WRITE_TOKEN).')
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  fail('--confirm needs a WRITE token; only a read token is set.')
}
if (apply && DATASET === 'production' && !yesProduction) fail('Refusing to write to production without --yes-production.')

const client = createClient({ projectId: PROJECT_ID, dataset: DATASET, token: TOKEN, apiVersion: '2024-10-01', useCdn: false })
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const norm = (s) => (s ?? '').trim().toLowerCase()

const existing = await client.fetch(`*[_type == "helpCategory"]{ _id, title, "slug": slug.current }`)
const byId = new Map(existing.map((d) => [d._id.replace(/^drafts\./, ''), d]))
const byTitle = new Map(existing.map((d) => [norm(d.title), d]))
const bySlug = new Map(existing.filter((d) => d.slug).map((d) => [d.slug, d]))

const create = []
const present = []
const skipped = []
for (const c of CATEGORIES) {
  const id = `helpCategory-${c.key}`
  if (byId.has(id)) {
    present.push(`${c.title}  (${id}, /help/${byId.get(id).slug ?? '—'})`)
    continue
  }
  const sameTitle = byTitle.get(norm(c.title))
  if (sameTitle) {
    skipped.push(`${c.title} — already exists as ${sameTitle._id}; not duplicated`)
    continue
  }
  const sameSlug = bySlug.get(c.slug)
  if (sameSlug) {
    skipped.push(`${c.title} — slug "${c.slug}" is taken by ${sameSlug._id} ("${sameSlug.title}")`)
    continue
  }
  create.push({ _id: id, _type: 'helpCategory', title: c.title, slug: { _type: 'slug', current: c.slug } })
}

console.log(`\n${describeMode({ dataset: DATASET, confirm: apply })}`)
console.log(`Create  ${plural(create.length, 'Help Category', 'Help Categories')}` + (create.length ? ':' : ''))
for (const d of create) console.log(`          ${d.title.padEnd(28)} /help/${d.slug.current}  ${d._id}`)
if (present.length) console.log(`Already there, left as is:\n          ${present.join('\n          ')}`)
if (skipped.length) console.log(`Skipped:\n   • ${skipped.join('\n   • ')}`)

if (!create.length) {
  console.log(`\nNothing to create on dataset=${DATASET}.`)
  process.exit(0)
}
if (!apply) {
  console.log(`\nDry run on dataset=${DATASET} — nothing written. Re-run with --confirm to apply.`)
  process.exit(0)
}

const tx = client.transaction()
for (const d of create) tx.createIfNotExists(d)
const result = await tx.commit({ visibility: 'sync' })
console.log(`\n✅  dataset=${DATASET}: committed transaction ${result.transactionId} — ${plural(result.results.length, 'mutation')}.`)
