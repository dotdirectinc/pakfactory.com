#!/usr/bin/env node
/**
 * Seed Product Line Page layout versions + Product style row (listSource = Line styles).
 *
 * Upserts two listable `productLinePage` layouts:
 *   - `productLinePage` — Default (stack shell; most lines)
 *   - `productLinePage.bottomBar` — Bottom bar shell (rigid-boxes)
 *
 * Prepends (or refreshes) a `productStylesRow` with stable `_key` so www inherit
 * fills cards from each product line's styles. Sets `template` on customer-facing
 * lines that are missing it (Stack), and points `rigid-boxes` at Bottom bar.
 * Preserves any Studio-uploaded `previewImage` on existing layouts.
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

const STACK_ID = 'productLinePage'
const BOTTOM_BAR_ID = 'productLinePage.bottomBar'
const STYLES_KEY = 'product-line-styles'
const RIGID_SLUG = 'rigid-boxes'

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

async function fetchLayout(id) {
  return client.fetch(
    `*[_id == $id || _id == "drafts." + $id] | order(_updatedAt desc)[0]{
      _id,
      _type,
      title,
      heroLayout,
      previewImage,
      sections
    }`,
    {id},
  )
}

async function seed() {
  console.log(
    `\n🌱  Product Line Page layouts → ${DATASET} (${PROJECT_ID})\n`,
  )

  const [stackExisting, bottomExisting, linesMissingTemplate, rigidLines] =
    await Promise.all([
      fetchLayout(STACK_ID),
      fetchLayout(BOTTOM_BAR_ID),
      client.fetch(
        `*[_type == "productLine" && customerFacing == true && !defined(template)]{
          _id,
          title,
          "slug": slug.current
        }`,
      ),
      client.fetch(
        `*[_type == "productLine" && slug.current == $slug]{
          _id,
          title,
          "slug": slug.current,
          "templateRef": template._ref
        }`,
        {slug: RIGID_SLUG},
      ),
    ])

  const stackSections = mergeSections(stackExisting?.sections)
  const bottomSections = mergeSections(
    bottomExisting?.sections?.length
      ? bottomExisting.sections
      : stackSections,
  )

  const stackDoc = {
    _id: STACK_ID,
    _type: 'productLinePage',
    title: 'Default',
    heroLayout: 'stack',
    sections: stackSections,
    ...(stackExisting?.previewImage
      ? {previewImage: stackExisting.previewImage}
      : {}),
  }
  const bottomDoc = {
    _id: BOTTOM_BAR_ID,
    _type: 'productLinePage',
    title: 'Bottom bar',
    heroLayout: 'bottomBar',
    sections: bottomSections,
    ...(bottomExisting?.previewImage
      ? {previewImage: bottomExisting.previewImage}
      : {}),
  }

  const rigidNeedingBottomBar = rigidLines.filter(
    (line) => line.templateRef !== BOTTOM_BAR_ID,
  )

  // Patch only IDs returned by the query (never invent published from draft-only).
  const unsetIds = [
    ...new Set(
      [...linesMissingTemplate, ...rigidLines].map((line) => line._id),
    ),
  ]

  console.log(
    `  Default ${STACK_ID}: ${stackExisting ? 'exists' : 'missing (will create)'}`,
  )
  console.log(
    `  Bottom bar ${BOTTOM_BAR_ID}: ${bottomExisting ? 'exists' : 'missing (will create)'}`,
  )
  console.log(
    `  Default sections after merge: ${stackSections.length} (styles key=${STYLES_KEY})`,
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
  console.log(
    `  rigid-boxes → Bottom bar: ${rigidNeedingBottomBar.length} doc(s) to point`,
  )

  if (!apply) {
    console.log(
      `\n  DRY-RUN on dataset=${DATASET} — nothing written. Re-run with --confirm.\n`,
    )
    return
  }

  const tx = client.transaction()
  tx.createOrReplace(stackDoc)
  tx.createOrReplace(bottomDoc)

  for (const line of linesMissingTemplate) {
    tx.patch(line._id, (p) =>
      p.set({
        template: {_type: 'reference', _ref: STACK_ID},
      }),
    )
  }

  for (const line of rigidNeedingBottomBar) {
    tx.patch(line._id, (p) =>
      p.set({
        template: {_type: 'reference', _ref: BOTTOM_BAR_ID},
      }),
    )
  }

  // Drop retired per-line heroLayout if still present (shell lives on the layout).
  for (const id of unsetIds) {
    tx.patch(id, (p) => p.unset(['heroLayout']))
  }

  await tx.commit()

  const verify = await client.fetch(
    `*[_id in $ids]{
      _id,
      title,
      heroLayout,
      "sectionCount": count(sections),
      "hasStyles": count(sections[_type == "productStylesRow"]) > 0
    }`,
    {ids: [STACK_ID, BOTTOM_BAR_ID]},
  )

  for (const row of verify ?? []) {
    console.log(`  ✓  ${row._id}`)
    console.log(`     title: ${row.title}`)
    console.log(`     heroLayout: ${row.heroLayout}`)
    console.log(`     sections: ${row.sectionCount ?? 0}`)
    console.log(`     productStylesRow: ${row.hasStyles ? 'yes' : 'no'}`)
  }
  console.log(
    `  ✓  template set on ${linesMissingTemplate.length} product line(s) (Default)`,
  )
  console.log(
    `  ✓  rigid-boxes pointed at Bottom bar (${rigidNeedingBottomBar.length} patch(es))`,
  )
  console.log(
    '\n✅  Done. Publish Product Line Pages in Studio if needed, then check /products/rigid-boxes\n',
  )
}

seed().catch((err) => {
  console.error('❌  Product Line Page layouts seed failed:', err.message)
  process.exit(1)
})
