#!/usr/bin/env node
/**
 * Seed Product Line Page template with a Product style row (listSource = Line styles).
 *
 * Upserts the pinned singleton `productLinePage` and prepends (or refreshes) a
 * `productStylesRow` with stable `_key` so www inherit fills cards from each
 * product line's styles. Also sets `template` → productLinePage on customer-facing
 * product lines that are missing it.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:product-line-page-styles -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:product-line-page-styles -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:product-line-page-styles -- --dataset production --confirm --yes-production
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
  pnpm --filter @pakfactory/studio run seed:product-line-page-styles -- --dataset <development|production> [--confirm] [--yes-production]

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

const TEMPLATE_ID = 'productLinePage'
const STYLES_KEY = 'product-line-styles'

/** Chrome only — cards inherit from each product line's styles (listSource page). */
const PRODUCT_STYLES_ROW = {
  _type: 'productStylesRow',
  _key: STYLES_KEY,
  eyebrow: 'Styles',
  heading: 'Explore %title% styles',
  intro:
    'Compare constructions side by side before you add to a request.',
  listSource: 'page',
  align: 'left',
  showTopBorder: false,
  showBottomBorder: true,
}

function mergeSections(existing) {
  const sections = Array.isArray(existing) ? [...existing] : []
  const idx = sections.findIndex(
    (s) => s?._type === 'productStylesRow' && s?._key === STYLES_KEY,
  )
  if (idx >= 0) {
    sections[idx] = {...sections[idx], ...PRODUCT_STYLES_ROW}
    return sections
  }
  const withoutDupType = sections.filter((s) => s?._type !== 'productStylesRow')
  return [PRODUCT_STYLES_ROW, ...withoutDupType]
}

async function seed() {
  console.log(
    `\n🌱  Product Line Page styles → ${DATASET} (${PROJECT_ID})\n`,
  )

  const [template, linesMissingTemplate] = await Promise.all([
    client.fetch(
      `*[_id == $id || _id == "drafts." + $id] | order(_updatedAt desc)[0]{
        _id,
        _type,
        title,
        sections
      }`,
      {id: TEMPLATE_ID},
    ),
    client.fetch(
      `*[_type == "productLine" && customerFacing == true && !defined(template)]{
        _id,
        title,
        "slug": slug.current
      }`,
    ),
  ])

  const nextSections = mergeSections(template?.sections)
  const templateDoc = {
    _id: TEMPLATE_ID,
    _type: 'productLinePage',
    title: template?.title?.trim() || 'Product Line Page',
    sections: nextSections,
  }

  console.log(
    `  Template ${TEMPLATE_ID}: ${template ? 'exists' : 'missing (will create)'}`,
  )
  console.log(
    `  Sections after merge: ${nextSections.length} (styles key=${STYLES_KEY})`,
  )
  console.log(
    `  Customer-facing lines missing template: ${linesMissingTemplate.length}`,
  )
  for (const line of linesMissingTemplate.slice(0, 12)) {
    console.log(`    · ${line.slug || line._id} — ${line.title}`)
  }
  if (linesMissingTemplate.length > 12) {
    console.log(`    … +${linesMissingTemplate.length - 12} more`)
  }

  if (!apply) {
    console.log(
      `\n  DRY-RUN on dataset=${DATASET} — nothing written. Re-run with --confirm.\n`,
    )
    return
  }

  const tx = client.transaction()
  tx.createOrReplace(templateDoc)
  for (const line of linesMissingTemplate) {
    const publishedId = line._id.replace(/^drafts\./, '')
    tx.patch(publishedId, (p) =>
      p.set({
        template: {_type: 'reference', _ref: TEMPLATE_ID},
      }),
    )
    if (line._id.startsWith('drafts.')) {
      tx.patch(line._id, (p) =>
        p.set({
          template: {_type: 'reference', _ref: TEMPLATE_ID},
        }),
      )
    }
  }
  await tx.commit()

  const verify = await client.fetch(
    `*[_id == $id][0]{
      _id,
      "sectionCount": count(sections),
      "hasStyles": count(sections[_type == "productStylesRow"]) > 0,
      "stylesHeading": sections[_type == "productStylesRow"][0].heading,
      "listSource": sections[_type == "productStylesRow"][0].listSource
    }`,
    {id: TEMPLATE_ID},
  )

  console.log(`  ✓  ${TEMPLATE_ID}`)
  console.log(`     sections: ${verify?.sectionCount ?? 0}`)
  console.log(`     productStylesRow: ${verify?.hasStyles ? 'yes' : 'no'}`)
  console.log(`     heading: ${verify?.stylesHeading ?? '(none)'}`)
  console.log(`     listSource: ${verify?.listSource ?? '(none)'}`)
  console.log(
    `  ✓  template set on ${linesMissingTemplate.length} product line(s)`,
  )
  console.log(
    '\n✅  Done. Publish Product Line Page in Studio if needed, then check /products/rigid-boxes#styles\n',
  )
}

seed().catch((err) => {
  console.error('❌  Product Line Page styles seed failed:', err.message)
  process.exit(1)
})
