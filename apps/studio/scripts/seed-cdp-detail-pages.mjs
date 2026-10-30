#!/usr/bin/env node
/**
 * Seed Customization Detail Page templates (PROD-3112 / PROD-3124 / PROD-3126 /
 * PROD-3127 / PROD-3128).
 *
 * CREATE-ONLY for missing layout docs. If a CDP layout already exists (any
 * published or draft id), this script leaves it untouched — no band inserts,
 * retitles, or chrome patches. Editors own existing templates.
 *
 * New stubs get `customizationOverview` (no layout field) plus host-inherited
 * bands in this order:
 *   customizationOverview
 *   → customizationBenefitsSpecs (Get to know / Key properties)
 *   → customizationWorksWith (omitted on Knowledge)
 *   → customizationCompatibleOptions
 *   → customizationCompare
 *   → customizationShowcase
 *
 * www injects Benefits & specs when a live template omits the band but the
 * option has why/specs copy — so existing Knowledge layouts still show Get to
 * know without a seed rewrite.
 *
 * Stable `_key`s on new stubs. Creates Default / Learn-first / Knowledge /
 * Achieves when absent.
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
  --yes-production  Second gate; required to write to production.

  Existing CDP layout docs are never modified — only missing ids are created.`

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

const BENEFITS_SPECS_KEY = 'cdp-benefits-specs'
const WORKS_WITH_KEY = 'cdp-works-with'
const COMPATIBLE_OPTIONS_KEY = 'cdp-compatible-options'
const COMPARE_KEY = 'cdp-compare'
const SHOWCASE_KEY = 'cdp-showcase'
const OVERVIEW_KEY = 'cdp-overview'

/** Chrome-only stubs — www host fills option data; headings fall back in React. */
const REMAINING_BANDS = [
  {
    _type: 'customizationBenefitsSpecs',
    _key: BENEFITS_SPECS_KEY,
  },
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

const DEFAULT_OVERVIEW = {
  _type: 'customizationOverview',
  _key: OVERVIEW_KEY,
  showCta: true,
  showBookmark: true,
  configurationSource: 'properties',
}

const TARGETS = [
  {
    id: 'customizationDetailPage',
    type: 'customizationDetailPage',
    title: 'Customization Detail Page — Default',
    showStickyNav: false,
    includeWorksWith: true,
    overview: {...DEFAULT_OVERVIEW},
  },
  {
    id: 'customizationDetailPageLearnFirst',
    type: 'customizationDetailPage',
    title: 'Customization Detail Page — Learn-first',
    showStickyNav: false,
    includeWorksWith: true,
    overview: {...DEFAULT_OVERVIEW},
  },
  {
    id: 'customizationDetailPageKnowledge',
    type: 'customizationDetailPage',
    title: 'Customization Detail Page — Knowledge',
    showStickyNav: false,
    includeWorksWith: false,
    overview: {
      ...DEFAULT_OVERVIEW,
      showCta: false,
    },
  },
  {
    id: 'customizationDetailPageAchieves',
    type: 'customizationDetailPage',
    title: 'Customization Detail Page — Achieves',
    showStickyNav: false,
    includeWorksWith: true,
    overview: {
      ...DEFAULT_OVERVIEW,
      configurationSource: 'achieves',
    },
  },
]

function bandsForTarget(target) {
  return target.includeWorksWith
    ? REMAINING_BANDS
    : REMAINING_BANDS.filter((band) => band._type !== 'customizationWorksWith')
}

/** Full section stack for a brand-new stub only. */
function stubSections(target) {
  const sections = []
  if (target.overview) sections.push({...target.overview})
  for (const band of bandsForTarget(target)) {
    sections.push({...band})
  }
  return sections
}

async function seed() {
  console.log(`\n🌱  CDP detail pages → ${DATASET} (${PROJECT_ID})\n`)
  console.log(
    '  Policy: existing layout docs are skipped; only missing ids are created.\n',
  )

  const plans = []
  for (const target of TARGETS) {
    const doc = await client.fetch(
      `*[_id == $id || _id == "drafts." + $id] | order(_updatedAt desc)[0]{
        _id,
        _type,
        title,
        "sectionCount": count(sections)
      }`,
      {id: target.id},
    )

    if (doc) {
      plans.push({
        target,
        isCreate: false,
        changed: false,
        nextDoc: null,
        existingId: doc._id,
        sectionCount: doc.sectionCount ?? 0,
      })
      continue
    }

    plans.push({
      target,
      isCreate: true,
      changed: true,
      nextDoc: {
        _id: target.id,
        _type: target.type,
        title: target.title,
        showStickyNav: target.showStickyNav,
        sections: stubSections(target),
      },
      existingId: null,
      sectionCount: 0,
    })
  }

  for (const plan of plans) {
    if (!plan.isCreate) {
      console.log(
        `  [SKIP] ${plan.target.id} — already exists (${plan.existingId}, ${plan.sectionCount} section(s))`,
      )
      continue
    }
    console.log(
      `  [CREATE] ${plan.target.id} (${plan.target.type}) — sections: ${plan.nextDoc.sections.length}`,
    )
  }

  if (!apply) {
    console.log(
      `\nDry run on dataset=${DATASET} — pass --confirm to write.\n`,
    )
    return
  }

  const toWrite = plans.filter((plan) => plan.changed && plan.nextDoc)
  if (toWrite.length === 0) {
    console.log(`\nNothing to do on dataset=${DATASET}.\n`)
    return
  }

  if (DATASET === 'production' && !args.yesProduction) {
    console.error('❌  Production writes need --yes-production.')
    process.exit(1)
  }

  const tx = client.transaction()
  for (const plan of toWrite) {
    tx.createOrReplace(plan.nextDoc)
  }
  await tx.commit()
  console.log(
    `\n✅  Created ${toWrite.length} CDP detail page template(s). Existing layouts unchanged.\n`,
  )
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
