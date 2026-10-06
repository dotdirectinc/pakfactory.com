#!/usr/bin/env node
/**
 * Seed Product Detail Page + Solution Product Detail Page Defaults (PROD-2763).
 *
 * Ensures Default layout docs exist with lower-body bands after Specs +
 * Customization (route-owned on www):
 *   productsRow → testimonialsRow → faqSection → generalCta
 *
 * Stable `_key`s so re-runs are idempotent. Creates stub docs when missing.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:pdp-detail-pages -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:pdp-detail-pages -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:pdp-detail-pages -- --dataset production --confirm --yes-production
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
  pnpm --filter @pakfactory/studio run seed:pdp-detail-pages -- --dataset <development|production> [--confirm] [--yes-production]

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

const PRODUCTS_KEY = 'pdp-related-products'
const TESTIMONIALS_KEY = 'pdp-reviews'
const FAQ_KEY = 'pdp-faqs'
const CTA_KEY = 'general-cta-closing'

const DEFAULT_SECTIONS = [
  {
    _type: 'productsRow',
    _key: PRODUCTS_KEY,
    heading: 'People also like',
    listSource: 'page',
  },
  {
    _type: 'testimonialsRow',
    _key: TESTIMONIALS_KEY,
    heading: 'What our customers say',
  },
  {
    _type: 'faqSection',
    _key: FAQ_KEY,
    heading: 'Questions & Answers',
    listSource: 'page',
  },
  {
    _type: 'generalCta',
    _key: CTA_KEY,
    heading: "Let's collaborate and craft your vision",
    link: {
      label: "Let's talk packaging",
      linkType: 'path',
      relativePath: '/contact',
    },
  },
]

const TARGETS = [
  {
    id: 'productDetailPage',
    type: 'productDetailPage',
    title: 'Default',
  },
  {
    id: 'solutionProductDetailPage',
    type: 'solutionProductDetailPage',
    title: 'Default',
  },
]

/**
 * Ensure each default band is present (by `_key`). Append missing; leave
 * existing order/chrome alone when the key already exists.
 */
function ensureDefaultBands(existing) {
  const sections = Array.isArray(existing) ? [...existing] : []
  const keys = new Set(sections.map((s) => s?._key).filter(Boolean))
  let changed = false
  for (const band of DEFAULT_SECTIONS) {
    if (keys.has(band._key)) continue
    sections.push(band)
    keys.add(band._key)
    changed = true
  }
  return {sections, changed}
}

async function seed() {
  console.log(`\n🌱  PDP detail pages → ${DATASET} (${PROJECT_ID})\n`)

  const plans = []
  for (const target of TARGETS) {
    const doc = await client.fetch(
      `*[_id == $id || _id == "drafts." + $id] | order(_updatedAt desc)[0]{
        _id,
        _type,
        title,
        previewImage,
        sections
      }`,
      {id: target.id},
    )
    const {sections, changed} = ensureDefaultBands(doc?.sections)
    const nextDoc = {
      _id: target.id,
      _type: target.type,
      title: doc?.title?.trim() || target.title,
      sections,
    }
    if (doc?.previewImage) nextDoc.previewImage = doc.previewImage

    const isCreate = !doc
    plans.push({
      target,
      isCreate,
      changed: isCreate || changed,
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
      if (added.length) console.log(`           append keys: ${added.join(', ')}`)
    }
  }

  if (!apply) {
    console.log('\nDry run — pass --confirm to write.\n')
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
  console.log('\n✅  PDP detail page Defaults written.\n')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
