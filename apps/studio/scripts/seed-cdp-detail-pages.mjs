#!/usr/bin/env node
/**
 * Seed Customization Detail Page templates (PROD-3112 / PROD-3124).
 *
 * Ensures Default + Learn-first layout docs exist and inserts the remaining
 * host-inherited bands when missing, in this order:
 *   customizationWorksWith
 *   → customizationCompatibleOptions (PROD-3124)
 *   → customizationCompare
 *   → customizationShowcase
 *
 * Missing bands are inserted relative to neighbours (after Works with /
 * before Compare), not blindly appended — so a re-run on already-seeded
 * templates puts compatible options in the right place.
 *
 * Does not seed overview or benefits (editors / other setup own those).
 * Stable `_key`s so re-runs are idempotent. Creates stub docs when missing.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:cdp-detail-pages -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:cdp-detail-pages -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:cdp-detail-pages -- --dataset production --confirm --yes-production
 */

import {createClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseScriptArgs} from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({path: join(repoRoot, '.env.local')})
loadEnv({path: join(repoRoot, '.env')})
loadEnv({path: join(repoRoot, 'apps/studio/.env.local'), override: true})

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:cdp-detail-pages -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`

const args = parseScriptArgs({usage: USAGE})
const {confirm: apply} = args

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
  console.error(
    '❌  --confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN).',
  )
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

const WORKS_WITH_KEY = 'cdp-works-with'
const COMPATIBLE_OPTIONS_KEY = 'cdp-compatible-options'
const COMPARE_KEY = 'cdp-compare'
const SHOWCASE_KEY = 'cdp-showcase'

/** Chrome-only stubs — www host fills option data; headings fall back in React. */
const REMAINING_BANDS = [
  {
    _type: 'customizationWorksWith',
    _key: WORKS_WITH_KEY,
  },
  {
    _type: 'customizationCompatibleOptions',
    _key: COMPATIBLE_OPTIONS_KEY,
  },
  {
    _type: 'customizationCompare',
    _key: COMPARE_KEY,
  },
  {
    _type: 'customizationShowcase',
    _key: SHOWCASE_KEY,
  },
]

const TARGETS = [
  {
    id: 'customizationDetailPage',
    type: 'customizationDetailPage',
    title: 'Default',
    showStickyNav: true,
  },
  {
    id: 'customizationDetailPageLearnFirst',
    type: 'customizationDetailPage',
    title: 'Learn-first',
    showStickyNav: false,
  },
]

function bandAlreadyPresent(sections, band) {
  return sections.some(
    (s) => s?._key === band._key || s?._type === band._type,
  )
}

/**
 * Insert `band` after the previous seeded neighbour, else before the next,
 * else append. Leaves existing order/chrome alone when the type or `_key`
 * is already on the template.
 */
function insertBand(sections, band) {
  if (bandAlreadyPresent(sections, band)) return false

  const bandIndex = REMAINING_BANDS.findIndex((b) => b._key === band._key)
  for (let i = bandIndex - 1; i >= 0; i--) {
    const prev = REMAINING_BANDS[i]
    const at = sections.findIndex(
      (s) => s?._key === prev._key || s?._type === prev._type,
    )
    if (at >= 0) {
      sections.splice(at + 1, 0, band)
      return true
    }
  }
  for (let i = bandIndex + 1; i < REMAINING_BANDS.length; i++) {
    const next = REMAINING_BANDS[i]
    const at = sections.findIndex(
      (s) => s?._key === next._key || s?._type === next._type,
    )
    if (at >= 0) {
      sections.splice(at, 0, band)
      return true
    }
  }
  sections.push(band)
  return true
}

function ensureRemainingBands(existing) {
  const sections = Array.isArray(existing) ? [...existing] : []
  let changed = false
  for (const band of REMAINING_BANDS) {
    if (insertBand(sections, band)) changed = true
  }
  return {sections, changed}
}

async function seed() {
  console.log(`\n🌱  CDP detail pages → ${DATASET} (${PROJECT_ID})\n`)

  const plans = []
  for (const target of TARGETS) {
    const doc = await client.fetch(
      `*[_id == $id || _id == "drafts." + $id] | order(_updatedAt desc)[0]{
        _id,
        _type,
        title,
        previewImage,
        showStickyNav,
        sections
      }`,
      {id: target.id},
    )
    const {sections, changed: bandsChanged} = ensureRemainingBands(doc?.sections)
    const stickyChanged = doc?.showStickyNav !== target.showStickyNav
    const nextDoc = {
      _id: target.id,
      _type: target.type,
      title: doc?.title?.trim() || target.title,
      showStickyNav: target.showStickyNav,
      sections,
    }
    if (doc?.previewImage) nextDoc.previewImage = doc.previewImage

    const isCreate = !doc
    const changed = isCreate || bandsChanged || stickyChanged
    plans.push({
      target,
      isCreate,
      changed,
      nextDoc,
      existingKeys: (doc?.sections ?? []).map((s) => s?._key).filter(Boolean),
    })
  }

  for (const plan of plans) {
    const label = plan.isCreate ? 'CREATE' : plan.changed ? 'PATCH' : 'OK'
    console.log(
      `  [${label}] ${plan.target.id} (${plan.target.type}) — sections: ${plan.nextDoc.sections.length}`,
    )
    if (plan.changed && !plan.isCreate) {
      const added = plan.nextDoc.sections
        .map((s) => s._key)
        .filter((k) => !plan.existingKeys.includes(k))
      if (added.length) console.log(`           insert keys: ${added.join(', ')}`)
    }
  }

  if (!apply) {
    console.log(
      `\nDry run on dataset=${DATASET} — pass --confirm to write.\n`,
    )
    return
  }

  const unchanged = plans.every((plan) => !plan.changed)
  if (unchanged) {
    console.log(`\nNothing to do on dataset=${DATASET}.\n`)
    return
  }

  if (DATASET === 'production' && !args.yesProduction) {
    console.error('❌  Production writes need --yes-production.')
    process.exit(1)
  }

  const tx = client.transaction()
  for (const plan of plans) {
    if (!plan.changed) continue
    tx.createOrReplace(plan.nextDoc)
  }
  await tx.commit()
  console.log('\n✅  CDP detail page templates written.\n')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
