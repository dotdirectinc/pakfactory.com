#!/usr/bin/env node
/**
 * Migrate Finder fullscreen `defaultRail` from fixed seats → flexible item array.
 *
 * Reads every page that already has a `heroFinderFullscreen` section, keeps all
 * other section fields intact, and rewrites only `defaultRail` when it is still
 * the legacy object shape (`product` / `solution` / … / `promo` seats with
 * `fillMode`). Already-migrated arrays are left alone.
 *
 * Seat → item mapping:
 *   catalogue seats with `item` ref  → source: catalogue + kindLabel + bannerType image
 *   promo seat with `campaign`       → source: campaign + title/description/link/bannerImage
 *   Auto newest/popular with no item → omitted (log a note; editor can re-add)
 *
 * 🔴 Run it through the register, not only the USAGE line below:
 *   pnpm sanity:migrate up --dataset <development|production> \
 *     --only 20260930-finder-fs-default-rail --confirm
 *
 * Or directly:
 *   pnpm --filter @pakfactory/studio run migrate:finder-fs-default-rail -- --dataset development
 *   pnpm --filter @pakfactory/studio run migrate:finder-fs-default-rail -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run migrate:finder-fs-default-rail -- --dataset production --confirm --yes-production
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 */

import {createClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'
import {randomBytes} from 'node:crypto'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseScriptArgs, describeMode} from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({path: join(repoRoot, '.env.local')})
loadEnv({path: join(repoRoot, '.env')})
loadEnv({path: join(repoRoot, 'apps/studio/.env.local'), override: true})

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run migrate:finder-fs-default-rail -- --dataset <development|production> [--confirm] [--yes-production] [--verify]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.
  --verify          Read-only. Assert no legacy seat-shaped defaultRail remains.`

const args = parseScriptArgs({usage: USAGE, flags: ['verify']})
const {confirm: apply, verify} = args

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  '8293wrxp'
const DATASET = args.dataset
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error('❌  --confirm needs a WRITE token.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
  perspective: 'raw',
})

/** Legacy object seats in display order. */
const SEAT_ORDER = [
  {name: 'product', kindLabel: 'Product'},
  {name: 'solution', kindLabel: 'Solution'},
  {name: 'expertise', kindLabel: 'Expertise'},
  {name: 'customization', kindLabel: 'Customization'},
  {name: 'caseStudy', kindLabel: 'Case study'},
  {name: 'blog', kindLabel: 'Blog'},
  {name: 'promo', kindLabel: 'Promo'},
]

function newKey(prefix) {
  return `${prefix}-${randomBytes(4).toString('hex')}`
}

/** True when defaultRail is still the fixed-seat object. */
function isLegacyRail(rail) {
  if (!rail || Array.isArray(rail) || typeof rail !== 'object') return false
  return SEAT_ORDER.some(({name}) => {
    const seat = rail[name]
    return Boolean(seat && typeof seat === 'object' && 'fillMode' in seat)
  })
}

/**
 * Convert one legacy seat object → flexible finderRailItem entries.
 * @returns {{items: object[], notes: string[]}}
 */
function convertRail(rail, sectionKey) {
  const items = []
  const notes = []

  for (const {name, kindLabel} of SEAT_ORDER) {
    const seat = rail[name]
    if (!seat || typeof seat !== 'object') continue

    const mode = typeof seat.fillMode === 'string' ? seat.fillMode : 'manual'

    if (name === 'promo') {
      const campaign = seat.campaign
      if (mode === 'manual' && campaign && typeof campaign === 'object') {
        const title =
          typeof campaign.title === 'string' ? campaign.title.trim() : ''
        if (!title) {
          notes.push(`${sectionKey}: promo seat has campaign without title — skipped`)
          continue
        }
        items.push({
          _key: newKey('rail-promo'),
          _type: 'finderRailItem',
          kindLabel,
          source: 'campaign',
          title,
          ...(typeof campaign.description === 'string' && campaign.description.trim()
            ? {description: campaign.description.trim()}
            : {}),
          ...(campaign.link ? {link: campaign.link} : {}),
          bannerType: 'image',
          ...(campaign.image ? {bannerImage: campaign.image} : {}),
        })
      } else if (mode !== 'manual') {
        notes.push(
          `${sectionKey}: promo fillMode=${mode} has no campaign payload — skipped`,
        )
      }
      continue
    }

    const itemRef = seat.item
    const hasRef =
      itemRef &&
      typeof itemRef === 'object' &&
      typeof itemRef._ref === 'string' &&
      itemRef._ref.length > 0

    if (hasRef) {
      items.push({
        _key: newKey(`rail-${name}`),
        _type: 'finderRailItem',
        kindLabel,
        source: 'catalogue',
        item: {
          _type: 'reference',
          _ref: itemRef._ref,
          ...(itemRef._weak ? {_weak: true} : {}),
        },
        bannerType: 'image',
      })
      if (mode !== 'manual') {
        notes.push(
          `${sectionKey}: ${kindLabel} was fillMode=${mode} — kept manual item ref (auto pool dropped)`,
        )
      }
      continue
    }

    if (mode === 'newest' || mode === 'popular') {
      notes.push(
        `${sectionKey}: ${kindLabel} fillMode=${mode} with no item ref — omitted (re-add in Studio)`,
      )
    }
  }

  return {items, notes}
}

const PAGE_QUERY = /* groq */ `*[
  defined(sections) &&
  count(sections[_type == "heroFinderFullscreen"]) > 0
] | order(_id asc) {
  _id,
  title,
  "sections": sections
}`

/** Docs still carrying the legacy seat object (homePage or any sections host). */
const LEGACY_PROBE = /* groq */ `count(*[
  defined(sections) &&
  count(sections[
    _type == "heroFinderFullscreen" &&
    defined(defaultRail.product.fillMode)
  ]) > 0
])`

async function runVerify() {
  const left = await client.fetch(LEGACY_PROBE)
  if (left === 0) {
    console.log(
      `✓  verify ok on dataset=${DATASET} — no heroFinderFullscreen still has seat-shaped defaultRail.\n`,
    )
    return
  }
  console.error(
    `✖  verify failed on dataset=${DATASET}: ${left} doc(s) still have defaultRail.product.fillMode.\n`,
  )
  process.exit(1)
}

async function main() {
  console.log(
    `\nFinder fullscreen defaultRail seats → flexible array\n` +
      `  project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`,
  )

  if (verify) return runVerify()

  const pages = await client.fetch(PAGE_QUERY)
  console.log(`  Found ${pages.length} doc(s) with heroFinderFullscreen on dataset=${DATASET}.\n`)

  const plans = []
  const allNotes = []

  for (const page of pages) {
    const sections = Array.isArray(page.sections) ? page.sections : []
    let changed = false
    const nextSections = sections.map((section) => {
      if (!section || section._type !== 'heroFinderFullscreen') return section
      const rail = section.defaultRail
      if (Array.isArray(rail)) {
        allNotes.push(
          `${page._id} §${section._key ?? '?'}: already an array (${rail.length} item(s)) — skipped`,
        )
        return section
      }
      if (!isLegacyRail(rail)) {
        allNotes.push(
          `${page._id} §${section._key ?? '?'}: no legacy seats — skipped`,
        )
        return section
      }
      const {items, notes} = convertRail(rail, `${page._id} §${section._key ?? '?'}`)
      allNotes.push(...notes)
      changed = true
      return {...section, defaultRail: items}
    })

    if (changed) {
      plans.push({
        id: page._id,
        title: page.title || page._id,
        sections: nextSections,
        itemCount: nextSections
          .filter((s) => s?._type === 'heroFinderFullscreen')
          .flatMap((s) => (Array.isArray(s.defaultRail) ? s.defaultRail : []))
          .length,
      })
    }
  }

  for (const note of allNotes) console.log(`  · ${note}`)

  if (plans.length === 0) {
    console.log(`\n  Nothing to write on dataset=${DATASET}.\n`)
    return
  }

  console.log(`\n  Would patch ${plans.length} doc(s):`)
  for (const plan of plans) {
    console.log(`    ${plan.id} (${plan.title}) → ${plan.itemCount} rail item(s)`)
  }

  if (!apply) {
    console.log(
      `\n  DRY-RUN on dataset=${DATASET} — nothing written. Re-run with --confirm.\n`,
    )
    return
  }

  const tx = client.transaction()
  for (const plan of plans) {
    tx.patch(plan.id, (p) => p.set({sections: plan.sections}))
  }
  await tx.commit({visibility: 'async'})
  console.log(
    `\n✅  Wrote ${plans.length} doc(s) on dataset=${DATASET}. Open Studio → Home → Finder fullscreen to review the rail.\n`,
  )
}

main().catch((err) => {
  console.error(`❌  Migration failed on dataset=${DATASET}:`, err.message)
  process.exit(1)
})
