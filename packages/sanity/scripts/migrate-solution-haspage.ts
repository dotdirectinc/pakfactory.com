/**
 * Backfill `solution.hasPage`.
 *
 * `hasPage` is an editorial judgement — does this term deserve a landing page —
 * authored, never derived. Nothing has ever written it, so it reads false (or
 * undefined) on all 40 published Solutions. That is the opposite of the intent:
 * ship a /solutions route against it today and every page 404s by design.
 *
 * The rule (Eric, 2026-09-10): TRUE for the solutions on the Notion "Solutions
 * LP" list, FALSE for every other Solution. The list below is that page's 32
 * rows minus the one marked Status = "Remove", exported 2026-09-09 to
 * `Sanity/_scratch/notion-pages/` in the content-model vault.
 *
 * ⚠️ NOTION IS THE SOURCE OF TRUTH for this list, not this file. The names are
 * inlined so the script is self-contained and reviewable in a PR, but if the
 * Notion page changes, update both. The count assertion below is deliberate:
 * silently backfilling 30 pages when the list holds 31 is exactly the failure
 * that would go unnoticed.
 *
 * Idempotent: re-running sets the same values. Safe to run repeatedly.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/sanity migrate:solution-haspage --dataset development
 *   ... --confirm                                        # apply (dry-run is default)
 *   ... --dataset production --confirm --yes-production
 *   ... --dataset production --verify                    # read-only
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

/** Notion "Solutions LP", Status != "Remove". 21 industry · 3 channel · 2 focus · 5 use case. */
const WITH_PAGES = [
  'Apparel & Fashion',
  'Automotive',
  'Bakery & Cake',
  'Beauty & Cosmetics',
  'Beer',
  'Beverage',
  'Candle & Home Fragrance',
  'Candy & Chocolate',
  'Cannabis, CBD & Vape',
  'Coffee',
  'Compliant & Child-Resistant',
  'E-commerce',
  'Electronics & Tech',
  'Gifting',
  'Jewelry',
  'Luxury & Premium',
  'Pet',
  'Pharmaceutical',
  'Promotional & PR',
  'Protective / Shipping',
  'Restaurants & Food Service',
  'Retail',
  'Smart / Connected',
  'Snacks & Packaged Food',
  'Soap & Bath',
  'Sustainable',
  'Tea',
  'Toys & Games',
  'Vitamins & Supplements',
  'Wholesale',
  'Wine & Spirits',
]
const EXPECTED = 31
if (WITH_PAGES.length !== EXPECTED)
  fail(`The list holds ${WITH_PAGES.length} names, expected ${EXPECTED}. Reconcile against Notion first.`)

/**
 * Where Sanity's title differs from Notion's. Keep this tiny and explicit — a
 * fuzzy matcher here would quietly pair the wrong documents, and a Solution
 * silently missing its page is not a failure anyone would notice for months.
 */
const ALIASES: Record<string, string> = {
  'Candle & Home Fragrance': 'Candles & Home Fragrance',
}

const sanityTitle = (notionName: string) => ALIASES[notionName] ?? notionName

type Doc = { _id: string; title?: string; hasPage?: boolean }

/** Published id for a doc that may be a draft — so drafts and published pair up. */
const baseId = (id: string) => id.replace(/^drafts\./, '')

async function loadSolutions(): Promise<Doc[]> {
  return client.fetch<Doc[]>(`*[_type == "solution"]{ _id, title, hasPage }`, {}, { perspective: 'raw' })
}

async function main() {
  console.log(
    `Solution hasPage backfill — ${projectId}/${dataset}, mode ${verifyOnly ? 'VERIFY' : write ? 'WRITE' : 'DRY-RUN'}`,
  )

  const docs = await loadSolutions()
  const byTitle = new Map<string, Doc[]>()
  for (const d of docs) {
    const t = (d.title ?? '').trim()
    if (!t) continue
    byTitle.set(t, [...(byTitle.get(t) ?? []), d])
  }

  // ── Gate: every listed name must resolve to exactly one Solution ──────────
  const missing: string[] = []
  const ambiguous: string[] = []
  const wanted = new Set<string>()
  for (const name of WITH_PAGES) {
    const title = sanityTitle(name)
    const hits = byTitle.get(title) ?? []
    if (hits.length === 0) {
      missing.push(`${name}${title !== name ? ` (looked for "${title}")` : ''}`)
      continue
    }
    if (new Set(hits.map((h) => baseId(h._id))).size > 1) {
      ambiguous.push(`${title} → ${hits.map((h) => h._id).join(', ')}`)
      continue
    }
    for (const h of hits) wanted.add(h._id)
  }

  if (missing.length || ambiguous.length) {
    if (missing.length) {
      console.error(`\n✖ ${missing.length} listed solution(s) have no matching document:`)
      for (const m of missing) console.error(`    ${m}`)
    }
    if (ambiguous.length) {
      console.error(`\n✖ ${ambiguous.length} title(s) match more than one document:`)
      for (const a of ambiguous) console.error(`    ${a}`)
    }
    fail(
      'Aborted — the list and the dataset disagree. Add an entry to ALIASES, or fix the title in\n' +
        '  Sanity, then re-run. Nothing has been changed.',
    )
  }
  console.log(`\n✓ All ${WITH_PAGES.length} listed solutions matched.`)

  const toTrue = docs.filter((d) => wanted.has(d._id) && d.hasPage !== true)
  const toFalse = docs.filter((d) => !wanted.has(d._id) && d.hasPage !== false)
  const offList = docs.filter((d) => !wanted.has(d._id))

  console.log(`\n${docs.length} solution doc(s) — ${wanted.size} on the list, ${offList.length} off it.`)
  console.log(`  hasPage → true : ${toTrue.length} to change`)
  console.log(`  hasPage → false: ${toFalse.length} to change`)

  if (offList.length) {
    console.log('\nOff the list (these get hasPage: false):')
    for (const d of offList) console.log(`    ${d.title ?? '(untitled)'}`)
  }

  if (verifyOnly) return
  if (!write) {
    console.log('\nDRY-RUN — re-run with --confirm to apply.')
    return
  }

  const batches: [Doc[], boolean][] = [
    [toTrue, true],
    [toFalse, false],
  ]
  let n = 0
  for (const [group, value] of batches) {
    for (let i = 0; i < group.length; i += 50) {
      const tx = client.transaction()
      for (const d of group.slice(i, i + 50)) tx.patch(client.patch(d._id).set({ hasPage: value }))
      await tx.commit({ visibility: 'async' })
      n += Math.min(50, group.length - i)
      console.log(`  set hasPage=${value}: ${Math.min(i + 50, group.length)}/${group.length}`)
    }
  }
  console.log(`\n✓ Done — ${n} document(s) patched.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
