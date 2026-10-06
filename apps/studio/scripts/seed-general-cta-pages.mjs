#!/usr/bin/env node
/**
 * Seed General CTA (`generalCta`) onto Main Website page templates.
 *
 * Appends a closing collaborate band (footer-style CTA) with stable `_key`
 * `general-cta-closing` when missing. Creates stub docs if absent (including
 * both Product Line Page layout versions).
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:general-cta-pages -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:general-cta-pages -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:general-cta-pages -- --dataset production --confirm --yes-production
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
  pnpm --filter @pakfactory/studio run seed:general-cta-pages -- --dataset <development|production> [--confirm] [--yes-production]

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

const CTA_KEY = 'general-cta-closing'

const GENERAL_CTA = {
  _type: 'generalCta',
  _key: CTA_KEY,
  heading: "Let's collaborate and craft your vision",
  link: {
    label: "Let's talk packaging",
    linkType: 'path',
    relativePath: '/contact',
  },
}

/** Fixed-id page layouts + default Studio titles / _type. */
const TARGETS = [
  {
    id: 'productCatalogPage',
    type: 'productCatalogPage',
    title: 'Default',
  },
  {
    id: 'productLinePage',
    type: 'productLinePage',
    title: 'Default',
  },
  {
    id: 'productLinePage.bottomBar',
    type: 'productLinePage',
    title: 'Bottom bar',
  },
  {
    id: 'productStylePage',
    type: 'productStylePage',
    title: 'Default',
  },
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
  {
    id: 'customizationCatalogPage',
    type: 'customizationCatalogPage',
    title: 'Default',
  },
  {
    id: 'customizationDetailPage',
    type: 'customizationDetailPage',
    title: 'Default',
  },
  {
    id: 'solutionIndustryPage',
    type: 'solutionIndustryPage',
    title: 'Default',
  },
  {
    id: 'solutionStylePage',
    type: 'solutionStylePage',
    title: 'Default',
  },
]

/** Layout types that carry optional Studio-only previewImage. */
const PREVIEW_IMAGE_TYPES = new Set([
  'productLinePage',
  'productDetailPage',
  'solutionProductDetailPage',
  'productStylePage',
  'productCatalogPage',
  'customizationCatalogPage',
  'customizationDetailPage',
  'solutionIndustryPage',
  'solutionStylePage',
])

function appendGeneralCta(existing) {
  const sections = Array.isArray(existing) ? [...existing] : []
  if (sections.some((s) => s?._key === CTA_KEY)) {
    return {sections, changed: false}
  }
  return {sections: [...sections, GENERAL_CTA], changed: true}
}

async function seed() {
  console.log(`\n🌱  General CTA pages → ${DATASET} (${PROJECT_ID})\n`)

  const plans = []
  for (const target of TARGETS) {
    const doc = await client.fetch(
      `*[_id == $id || _id == "drafts." + $id] | order(_updatedAt desc)[0]{
        _id,
        _type,
        title,
        heroLayout,
        previewImage,
        sections
      }`,
      {id: target.id},
    )
    const {sections, changed} = appendGeneralCta(doc?.sections)
    const nextDoc = {
      _id: target.id,
      _type: target.type,
      title: doc?.title?.trim() || target.title,
      sections,
    }
    if (target.type === 'productLinePage') {
      nextDoc.heroLayout =
        doc?.heroLayout === 'bottomBar' || doc?.heroLayout === 'stack'
          ? doc.heroLayout
          : target.id === 'productLinePage.bottomBar'
            ? 'bottomBar'
            : 'stack'
    }
    if (PREVIEW_IMAGE_TYPES.has(target.type) && doc?.previewImage) {
      nextDoc.previewImage = doc.previewImage
    }
    plans.push({
      ...target,
      exists: Boolean(doc),
      changed,
      sectionCount: sections.length,
      nextDoc,
    })
  }

  for (const plan of plans) {
    const status = !plan.exists
      ? 'create + CTA'
      : plan.changed
        ? 'append CTA'
        : 'skip (already has key)'
    console.log(
      `  ${plan.id}: ${status} → ${plan.sectionCount} section(s)`,
    )
  }

  const toWrite = plans.filter((p) => !p.exists || p.changed)
  if (!apply) {
    console.log(
      `\n  DRY-RUN on dataset=${DATASET} — would write ${toWrite.length} doc(s). Re-run with --confirm.\n`,
    )
    return
  }

  if (toWrite.length === 0) {
    console.log('\n✅  Nothing to write — all targets already have the General CTA.\n')
    return
  }

  const tx = client.transaction()
  for (const plan of toWrite) {
    tx.createOrReplace(plan.nextDoc)
  }
  await tx.commit()

  console.log(`\n  ✓  Wrote ${toWrite.length} layout doc(s)`)
  console.log(
    '\n✅  Done. Publish each Default layout in Studio if draft, then check catalog / LP / PDP pages.\n',
  )
}

seed().catch((err) => {
  console.error('❌  General CTA pages seed failed:', err.message)
  process.exit(1)
})
