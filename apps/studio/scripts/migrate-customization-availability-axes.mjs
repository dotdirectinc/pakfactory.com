/**
 * Migrate `customizationOption` onto the four availability axes, and backfill
 * `customizationType.cardinality` (PROD-2250, D47 §1+§4 / ADR-017 build steps 2 and 4).
 *
 * This is a DATA migration, not a rename. Renaming a key in the schema does not move
 * the values — it strands them under a key nothing reads any more:
 *
 *   appliesTo        → availableOnProducts              8 of 33 populated
 *   except           → exceptProducts                   0 of 33
 *   incompatibleWith → incompatibleWithCustomizations   0 of 33
 *   relatedCustomizations → (unset — hard removed)      0 of 33
 *
 * Verified on production 2026-08-27. Only `appliesTo` actually carries data, and every
 * one of its 8 documents targets `productLine` only, so nothing lands on a target the
 * new field does not accept.
 *
 * `exceptProducts` no longer accepts `productLine` (D47 §1 narrows it to Style and
 * Product: a carve-out at line grain says the same thing as not listing that line in
 * `availableOnProducts`). Values are still carried over verbatim rather than filtered —
 * a stranded reference shows in the Studio as an invalid one, which is visible, whereas
 * a silently dropped carve-out is not. The run reports any it finds.
 *
 * `cardinality` is required with `initialValue: 'single'`, which only applies to Types
 * CREATED after the field ships, so all 22 existing Types need the backfill or they
 * fail required-validation the moment an editor opens one.
 *
 * Cardinality comes from Eric's `Capabilities Flow` diagram: Materials carry a blanket
 * "Single Selection (Within Each Type)", and `multiple` is the marked exception —
 * only the Types badged "Multiple Selection (Within Each Type)" get it. In the diagram
 * that is Embossing & Debossing, Opening & Access, Closures, Reinforcement & Utility,
 * Embellishments and Technology; the last two have no Sanity Type yet, and the
 * diagram's "Opening & Access" is this dataset's "Pulls & Lifts" (Ribbon Pull, Thumb
 * Notch). Everything else — every Material and Printing Type, plus Foiling, Lamination,
 * Coating, Food-Safe Treatment, Windows/Window Patching, Die Cutting — is `single`.
 *
 * Idempotent: every step checks current state first, so a second run is a no-op. It
 * never overwrites a `cardinality` an editor has already set. Drafts are migrated
 * alongside their published documents — publishing a stale draft would otherwise
 * restore the old keys.
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 *   pnpm --filter @pakfactory/studio run migrate:availability-axes -- --dataset development
 *   pnpm --filter @pakfactory/studio run migrate:availability-axes -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run migrate:availability-axes -- --dataset production --confirm --yes-production
 *
 * ⚠️  Run this in the SAME deploy as the schema change. Between the schema shipping and
 * this running, the 8 populated options show an empty "Available on products" while
 * their data sits under `appliesTo`.
 *
 * Follows the `packages/sanity/scripts/` convention: `--dataset` is required always,
 * `--confirm` writes, and production additionally needs `--yes-production`.
 *
 * ⚠️  The development dataset is nightly-synced from production, so a dev-only apply is
 * wiped overnight. Run development first to verify, then production to make it stick.
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
  pnpm --filter @pakfactory/studio run migrate:availability-axes -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`
const args = parseScriptArgs({ usage: USAGE })
const { confirm: apply } = args
/** old key → new key. A key with no new name is unset outright. */
const RENAMES = [
  ['appliesTo', 'availableOnProducts'],
  ['except', 'exceptProducts'],
  ['incompatibleWith', 'incompatibleWithCustomizations'],
]
const DROPS = ['relatedCustomizations']

/** Type slugs a customer may pick SEVERAL options from. Everything else is `single`. */
const MULTIPLE_SELECT_TYPE_SLUGS = new Set([
  'embossing-debossing',
  'closures',
  'reinforcement-utility',
  'pulls-lifts', // the diagram's "Opening & Access"
])

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
// Straight from the flag — `--dataset` is required, so there is nothing to fall back to.
const DATASET = args.dataset

const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local (SANITY_API_WRITE_TOKEN)')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error('❌  --confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN); a read token cannot write.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
  // Explicit, because the default flipped: on apiVersion >= 2025-02-19 the client
  // defaults to `published`, which silently drops every draft from query results —
  // and this repo's .env.local carries 2025-09-25. Drafts must be migrated too.
  perspective: 'raw',
})

async function main() {
  console.log(`\n🔧  Migrate customization availability axes + cardinality (PROD-2250, D47 / ADR-017)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  // ── 1. Options — move the keys ────────────────────────────────────────────────
  const oldKeys = [...RENAMES.map(([from]) => from), ...DROPS]
  const options = await client.fetch(
    `*[_type == "customizationOption" && (${oldKeys.map((k) => `defined(${k})`).join(' || ')})]{
       _id, title, "isDraft": _id in path("drafts.**"),
       ${oldKeys.join(', ')},
       ${RENAMES.map(([, to]) => to).join(', ')}
     } | order(title asc)`,
  )

  const optionPatches = []
  const strandedLines = []

  for (const doc of options) {
    const set = {}
    const unset = []
    for (const [from, to] of RENAMES) {
      const value = doc[from]
      if (value === undefined || value === null) continue
      if (doc[to] !== undefined && doc[to] !== null) {
        // The new key already holds something — never clobber it. Drop the old key
        // only, and say so.
        console.log(`⚠️   ${doc.title}: both \`${from}\` and \`${to}\` are set — leaving \`${to}\` untouched and unsetting \`${from}\`.`)
        unset.push(from)
        continue
      }
      set[to] = value
      unset.push(from)
      if (from === 'except' && Array.isArray(value)) {
        const lines = value.filter((r) => typeof r?._ref === 'string' && r._ref.includes('line'))
        if (lines.length) strandedLines.push(`${doc.title} — ${lines.length} carve-out(s) may point at a Product Line, which exceptProducts no longer accepts`)
      }
    }
    for (const key of DROPS) {
      if (doc[key] !== undefined && doc[key] !== null) unset.push(key)
    }
    if (!Object.keys(set).length && !unset.length) continue

    const moved = Object.entries(set).map(([to, v]) => `${to}←${Array.isArray(v) ? v.length : 1}`)
    const dropped = unset.filter((k) => DROPS.includes(k))
    console.log(
      `${apply ? '✏️ ' : '•'} ${doc.isDraft ? '[draft] ' : ''}${doc.title}` +
        `${moved.length ? `  move: ${moved.join(', ')}` : ''}` +
        `${dropped.length ? `  drop: ${dropped.join(', ')}` : ''}`,
    )
    optionPatches.push({ _id: doc._id, set, unset })
  }

  if (!optionPatches.length) console.log('✅  No Option carries a legacy key — nothing to move.')

  // ── 2. Types — backfill cardinality ───────────────────────────────────────────
  const types = await client.fetch(
    `*[_type == "customizationType" && !defined(cardinality)]{
       _id, title, "slug": slug.current, "category": category->title,
       "isDraft": _id in path("drafts.**") } | order(category asc, title asc)`,
  )
  const typePatches = types.map((t) => ({
    _id: t._id,
    cardinality: MULTIPLE_SELECT_TYPE_SLUGS.has(t.slug) ? 'multiple' : 'single',
    label: `${t.isDraft ? '[draft] ' : ''}${t.category ?? '—'} › ${t.title}`,
  }))

  console.log('')
  if (!typePatches.length) {
    console.log('✅  Every Customization Type already has a cardinality.')
  } else {
    for (const t of typePatches) {
      console.log(`${apply ? '✏️ ' : '•'} ${t.cardinality === 'multiple' ? '☰' : '①'} ${t.cardinality.padEnd(9)} ${t.label}`)
    }
    const nMulti = typePatches.filter((t) => t.cardinality === 'multiple').length
    console.log(`\n${typePatches.length} Type(s) to backfill — ${typePatches.length - nMulti} single, ${nMulti} multiple`)
  }

  if (strandedLines.length) {
    console.log(`\n⚠️  Carve-outs that may not fit the narrowed \`exceptProducts\` (Style/Product only). Carried over as-is; check them in the Studio:`)
    strandedLines.forEach((l) => console.log(`     ${l}`))
  }

  if (!optionPatches.length && !typePatches.length) {
    console.log(`\n✅  Nothing to do — ${DATASET} is already migrated.\n`)
    return
  }
  if (!apply) {
    console.log(`\n${optionPatches.length + typePatches.length} document(s) pending. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`). Verify on DEVELOPMENT, then run PRODUCTION (dev is nightly-synced from prod).\n`)
    return
  }

  const tx = client.transaction()
  for (const p of optionPatches) {
    tx.patch(p._id, (patch) => {
      let next = patch
      if (Object.keys(p.set).length) next = next.set(p.set)
      if (p.unset.length) next = next.unset(p.unset)
      return next
    })
  }
  for (const t of typePatches) tx.patch(t._id, (patch) => patch.set({ cardinality: t.cardinality }))
  await tx.commit()
  console.log(`\n✅  Migrated ${optionPatches.length} Option(s) and ${typePatches.length} Type(s) in ${DATASET}.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
