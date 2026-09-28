#!/usr/bin/env node
/**
 * Seed 3 inspiration products for Beauty's `beauty-pouches` solutionStyle
 * (keyword filter) so `/solutions/beauty-cosmetics/beauty-pouches` shows a grid.
 *
 * Does not create the style or industry LP — run Beauty LP seed first.
 * Products match via title keywords (`beauty pouches*`) + Beauty in solutions[].
 * Inspiration availableCustomizations are copied (preselected) from basedOn.
 *
 * Stable ids for cleanup:
 *   product.beauty-pouches-seed-* / slug beauty-pouches-seed-* / sku BEAUTY-POUCHES-*
 *
 * Requires: Beauty solution + beauty-pouches solutionStyle, and at least one
 * existing standard product (for basedOn).
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents
 * (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:beauty-style-products -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:beauty-style-products -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:beauty-style-products -- --dataset production --confirm --yes-production
 *
 * Cleanup (human):
 *   *[_id match "product.beauty-pouches-seed-*" || sku match "BEAUTY-POUCHES-*"]
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { createReadStream, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:beauty-style-products -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`

const args = parseScriptArgs({ usage: USAGE })
const { confirm: apply } = args

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

const SOLUTION_ID = 'solution.beauty-cosmetics'
const STYLE_ID = 'solutionStyle.beauty-beauty-pouches'
const STYLE_SLUG = 'beauty-pouches'
const PUBLIC_DIR = join(
  repoRoot,
  'apps/www/public/solutions/beauty-cosmetics',
)
const MAX_PRESELECTED_CUSTOMIZATIONS = 4

/** Hero tile image used for Beauty Pouches on the industry LP. */
const CARD = {
  image: 'hero/tile-myko.png',
  alt: 'Printed stand-up pouch with a silver foil interior',
}

const PRODUCT_SPECS = [1, 2, 3].map((i) => ({
  id: `product.beauty-pouches-seed-${i}`,
  slug: `beauty-pouches-seed-${i}`,
  sku: `BEAUTY-POUCHES-00${i}`,
  title: `Beauty Pouches — Seed ${i}`,
  image: CARD.image,
  alt: CARD.alt,
}))

const CLEANUP_GROQ =
  '*[_id match "product.beauty-pouches-seed-*" || sku match "BEAUTY-POUCHES-*"]'

const BASED_ON_BASE = /* groq */ `
  _type == "product" &&
  kind == "standard" &&
  !(_id in path("drafts.**")) &&
  defined(slug.current) &&
  defined(productLine._ref) &&
  count(productStyle) > 0
`

const BASED_ON_PROJ = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  "optionRefs": availableCustomizations[defined(customization)].customization._ref
}`

function imageField(assetId, alt, key) {
  return {
    _type: 'image',
    ...(key ? { _key: key } : {}),
    asset: { _type: 'reference', _ref: assetId },
    ...(alt ? { alt } : {}),
  }
}

function ref(id, key) {
  return {
    _type: 'reference',
    _ref: id,
    ...(key ? { _key: key } : {}),
  }
}

/** @type {Map<string, string>} */
const assetCache = new Map()

async function resolveAsset(relativePath) {
  if (assetCache.has(relativePath)) return assetCache.get(relativePath)
  const abs = join(PUBLIC_DIR, relativePath)
  if (!existsSync(abs)) {
    throw new Error(`Missing asset file: ${abs}`)
  }
  const filename = relativePath.split('/').pop()
  const existing = await client.fetch(
    `*[_type == "sanity.imageAsset" && originalFilename == $filename][0]._id`,
    { filename },
  )
  if (existing) {
    assetCache.set(relativePath, existing)
    return existing
  }
  const doc = await client.assets.upload('image', createReadStream(abs), {
    filename,
  })
  assetCache.set(relativePath, doc._id)
  return doc._id
}

/**
 * Prefer a standard product with ≥3 available customizations; fall back to any
 * valid standard. Returns { basedOn, optionRefs }.
 */
async function resolveBasedOn() {
  const withCust = await client.fetch(
    `*[${BASED_ON_BASE} && count(availableCustomizations) >= 3][0]${BASED_ON_PROJ}`,
  )
  if (withCust?._id) {
    return {
      basedOn: withCust,
      optionRefs: (withCust.optionRefs ?? [])
        .filter(Boolean)
        .slice(0, MAX_PRESELECTED_CUSTOMIZATIONS),
    }
  }

  const any = await client.fetch(`*[${BASED_ON_BASE}][0]${BASED_ON_PROJ}`)
  if (!any?._id) {
    return { basedOn: null, optionRefs: [] }
  }
  const refs = (any.optionRefs ?? [])
    .filter(Boolean)
    .slice(0, MAX_PRESELECTED_CUSTOMIZATIONS)
  return { basedOn: any, optionRefs: refs }
}

function buildPreselectedCustomizations(optionRefs) {
  return optionRefs.map((optionId, i) => ({
    _type: 'availableCustomization',
    _key: `cust-${i}`,
    customization: { _type: 'reference', _ref: optionId },
    preselected: true,
  }))
}

async function main() {
  console.log(`\nSeed Beauty Pouches style products — ${describeMode(args)}\n`)

  const beauty = await client.fetch(
    `*[_id == $solutionId][0]{
      _id,
      "slug": slug.current,
      hasPage,
      "style": *[_id == $styleId && solution._ref == $solutionId][0]{
        _id,
        "slug": slug.current,
        filter
      }
    }`,
    { solutionId: SOLUTION_ID, styleId: STYLE_ID },
  )

  if (!beauty?._id) {
    console.error(
      `❌  Missing ${SOLUTION_ID}. Run Beauty LP seed first:\n` +
        `    pnpm --filter @pakfactory/studio run seed:beauty-solution-lp -- --dataset ${DATASET} --confirm`,
    )
    process.exit(1)
  }
  if (!beauty.hasPage) {
    console.error(
      `❌  ${SOLUTION_ID} has hasPage != true. Fix in Studio or re-run Beauty LP seed.`,
    )
    process.exit(1)
  }
  if (!beauty.style?._id) {
    console.error(
      `❌  Missing ${STYLE_ID} (slug ${STYLE_SLUG}). Run Beauty LP seed first.`,
    )
    process.exit(1)
  }
  console.log(
    `Beauty: ${beauty.slug} · style: ${beauty.style.slug} (${beauty.style._id})`,
  )

  const { basedOn, optionRefs } = await resolveBasedOn()
  if (!basedOn?._id) {
    console.error(
      '❌  No standard product found for basedOn. Seed/import a standard product first.',
    )
    process.exit(1)
  }
  console.log(`basedOn: ${basedOn.title} (${basedOn._id})`)
  if (optionRefs.length === 0) {
    console.warn(
      '⚠️  No availableCustomizations on any eligible standard product — preview dialog may have empty customizations.',
    )
  } else {
    console.log(`Preselected customizations: ${optionRefs.length}`)
  }

  await resolveAsset(CARD.image)

  const preselectedCustomizations = buildPreselectedCustomizations(optionRefs)

  /** @type {{ kind: string, id: string, detail: string }[]} */
  const planned = PRODUCT_SPECS.map((p) => ({
    kind: 'createOrReplace',
    id: p.id,
    detail: `inspiration ${p.sku} — ${p.title}`,
  }))

  console.log(`\nProducts: ${PRODUCT_SPECS.length}`)
  console.log(`\nPlanned writes (${planned.length}):`)
  for (const row of planned) {
    console.log(`  ${row.kind.padEnd(14)} ${row.id} — ${row.detail}`)
  }
  console.log(`\nCleanup: ${CLEANUP_GROQ}`)

  if (!apply) {
    console.log(
      `\n${planned.length} write(s) pending on ${DATASET}. DRY-RUN — re-run with \`--confirm\`.\n`,
    )
    return
  }

  const tx = client.transaction()
  const imageId = assetCache.get(CARD.image)

  for (const spec of PRODUCT_SPECS) {
    /** @type {Record<string, unknown>} */
    const doc = {
      _id: spec.id,
      _type: 'product',
      title: spec.title,
      slug: { _type: 'slug', current: spec.slug },
      kind: 'inspiration',
      status: 'active',
      customerFacing: true,
      sku: spec.sku,
      shortDescription:
        'Fixture inspiration product for Beauty Pouches solutionStyle catalog.',
      basedOn: { _type: 'reference', _ref: basedOn._id },
      solutions: [ref(SOLUTION_ID, 'sol-beauty')],
      media: [imageField(imageId, spec.alt, `media-${spec.slug}`)],
    }
    if (preselectedCustomizations.length > 0) {
      doc.availableCustomizations = preselectedCustomizations
    }
    tx.createOrReplace(doc)
  }

  await tx.commit({ visibility: 'sync' })
  console.log(`\n✅  Applied Beauty Pouches style products on ${DATASET}.`)
  console.log(`    Products: ${PRODUCT_SPECS.length}`)
  console.log(`    basedOn: ${basedOn._id}`)
  console.log(
    `    Preselected customizations: ${preselectedCustomizations.length}`,
  )
  console.log(
    `    Verify: /solutions/beauty-cosmetics/${STYLE_SLUG} (revalidate ~60s).\n`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
