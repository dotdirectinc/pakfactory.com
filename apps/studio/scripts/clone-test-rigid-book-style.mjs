#!/usr/bin/env node
/**
 * Clone a minimal [Test] Rigid Boxes experience on a dataset:
 *   1 productLine  → [Test] Rigid Boxes / test-rigid-boxes
 *   1 productStyle → [Test] Book Style Rigid Boxes / test-book-style-rigid-boxes
 *   First 6 published standard products on the source Rigid Boxes line
 *
 * Cloned products get a shared kraft mock as images[0] (primary)
 * (apps/www/public/products/rigid-boxes/mock-rigid-box.png) and a shared
 * hover MP4 as videos[0] (…/hero-scrub.mp4).
 *
 * Customization options are NOT cloned — products keep live
 * availableCustomizations / customizationExceptions refs.
 *
 * Stable ids for cleanup:
 *   line.test-rigid-boxes
 *   style.test-book-style-rigid-boxes
 *   product.test-<source-slug>
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run clone:test-rigid-book-style -- --dataset development
 *   pnpm --filter @pakfactory/studio run clone:test-rigid-book-style -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run clone:test-rigid-book-style -- --dataset production --confirm --yes-production
 *
 * Cleanup (human):
 *   *[_id in ["line.test-rigid-boxes","style.test-book-style-rigid-boxes"] || _id match "product.test-*"]
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
  pnpm --filter @pakfactory/studio run clone:test-rigid-book-style -- --dataset <development|production> [--confirm] [--yes-production]

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
  perspective: 'published',
})

/** Source documents (published) on development as of the clone plan. */
const SOURCE_LINE_ID = 'line-3c0eb5db19ec8032b295ebc618320e76'
const SOURCE_STYLE_ID = 'style-3c0eb5db19ec80c7a144ec5f85cceffd'
/** How many standard products on the source line to clone (hero marquee density). */
const PRODUCT_CLONE_COUNT = 6

const CLONE_LINE_ID = 'line.test-rigid-boxes'
const CLONE_STYLE_ID = 'style.test-book-style-rigid-boxes'

const PUBLIC_DIR = join(repoRoot, 'apps/www/public')
/** Shared kraft still for all cloned product images[0] (primary). */
const MOCK_IMAGE_REL = 'products/rigid-boxes/mock-rigid-box.png'
const MOCK_IMAGE_ALT = 'Kraft rigid box with lid floating above base'
/** Shared hover-play MP4 for cloned product videos[0]. */
const MOCK_VIDEO_REL = 'products/rigid-boxes/hero-scrub.mp4'

const SYSTEM_KEYS = new Set([
  '_id',
  '_rev',
  '_createdAt',
  '_updatedAt',
  '_system',
  '_originalId',
])

const CLEANUP_GROQ =
  '*[_id in ["line.test-rigid-boxes","style.test-book-style-rigid-boxes"] || _id match "product.test-*"]'

function withTestTitle(value) {
  if (typeof value !== 'string' || !value.trim()) return value
  if (value.startsWith('[Test] ')) return value
  return `[Test] ${value}`
}

function withTestSlug(current) {
  if (typeof current !== 'string' || !current) return current
  if (current.startsWith('test-')) return current
  return `test-${current}`
}

function cloneIdForProduct(sourceSlug) {
  return `product.${withTestSlug(sourceSlug)}`
}

/** Deep-clone a published doc, drop system keys, keep asset + live refs. */
function cloneDocBody(doc) {
  const raw = structuredClone(doc)
  for (const key of SYSTEM_KEYS) delete raw[key]
  return raw
}

function applyTestLabels(doc) {
  doc.title = withTestTitle(doc.title)
  if (typeof doc.h1 === 'string' && doc.h1.trim()) {
    doc.h1 = withTestTitle(doc.h1)
  }
  if (typeof doc.shortName === 'string' && doc.shortName.trim()) {
    doc.shortName = withTestTitle(doc.shortName)
  }
  if (typeof doc.metaTitle === 'string' && doc.metaTitle.trim()) {
    doc.metaTitle = withTestTitle(doc.metaTitle)
  }
  if (doc.slug && typeof doc.slug.current === 'string') {
    doc.slug = { _type: 'slug', current: withTestSlug(doc.slug.current) }
  }
  doc.allowIndex = false
  return doc
}

function ref(id) {
  return { _type: 'reference', _ref: id }
}

function imageField(assetId, alt, key, {primary = false} = {}) {
  return {
    _type: 'image',
    ...(key ? {_key: key} : {}),
    asset: {_type: 'reference', _ref: assetId},
    ...(alt ? {alt} : {}),
    primary,
  }
}

function catalogVideoField(assetId, thumbnail) {
  return {
    _type: 'catalogVideo',
    _key: 'video-mock-0',
    source: 'upload',
    file: {
      _type: 'file',
      asset: {_type: 'reference', _ref: assetId},
    },
    ...(thumbnail ? {thumbnail} : {}),
  }
}

/** @type {Map<string, string>} */
const assetCache = new Map()

/**
 * Resolve a local public image to a Sanity image asset id.
 * Dry-run: verify file exists; look up existing by filename; do not upload.
 * Confirm: upload when missing.
 */
async function resolveImageAsset(relativePath, { upload }) {
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
  if (!upload) {
    return null
  }
  const doc = await client.assets.upload('image', createReadStream(abs), {
    filename,
  })
  assetCache.set(relativePath, doc._id)
  return doc._id
}

/**
 * Resolve a local public file (e.g. MP4) to a Sanity file asset id.
 */
async function resolveFileAsset(relativePath, { upload }) {
  const cacheKey = `file:${relativePath}`
  if (assetCache.has(cacheKey)) return assetCache.get(cacheKey)
  const abs = join(PUBLIC_DIR, relativePath)
  if (!existsSync(abs)) {
    throw new Error(`Missing asset file: ${abs}`)
  }
  const filename = relativePath.split('/').pop()
  const existing = await client.fetch(
    `*[_type == "sanity.fileAsset" && originalFilename == $filename][0]._id`,
    { filename },
  )
  if (existing) {
    assetCache.set(cacheKey, existing)
    return existing
  }
  if (!upload) {
    return null
  }
  const doc = await client.assets.upload('file', createReadStream(abs), {
    filename,
    contentType: 'video/mp4',
  })
  assetCache.set(cacheKey, doc._id)
  return doc._id
}

async function main() {
  console.log(`\nClone [Test] Rigid Boxes / Book Style — ${describeMode(args)}\n`)
  console.log(`project ${PROJECT_ID} / dataset ${DATASET}`)

  const mockAbs = join(PUBLIC_DIR, MOCK_IMAGE_REL)
  if (!existsSync(mockAbs)) {
    console.error(`❌  Missing mock image: ${mockAbs}`)
    process.exit(1)
  }
  const videoAbs = join(PUBLIC_DIR, MOCK_VIDEO_REL)
  if (!existsSync(videoAbs)) {
    console.error(`❌  Missing mock video: ${videoAbs}`)
    process.exit(1)
  }

  const line = await client.fetch(`*[_id == $id][0]`, { id: SOURCE_LINE_ID })
  if (!line) {
    console.error(`❌  Missing productLine ${SOURCE_LINE_ID}`)
    process.exit(1)
  }

  const style = await client.fetch(`*[_id == $id][0]`, { id: SOURCE_STYLE_ID })
  if (!style) {
    console.error(`❌  Missing productStyle ${SOURCE_STYLE_ID}`)
    process.exit(1)
  }

  const products = await client.fetch(
    `*[
      _type == "product" &&
      kind == "standard" &&
      productLine._ref == $lineId &&
      !(_id in path("drafts.**")) &&
      defined(slug.current)
    ] | order(title asc) [0...$count]`,
    { lineId: SOURCE_LINE_ID, count: PRODUCT_CLONE_COUNT },
  )
  if (products.length === 0) {
    console.error(
      `❌  No standard products on line ${SOURCE_LINE_ID} to clone.`,
    )
    process.exit(1)
  }
  if (products.length < PRODUCT_CLONE_COUNT) {
    console.warn(
      `⚠️  Only ${products.length} standard product(s) found (wanted ${PRODUCT_CLONE_COUNT}).`,
    )
  }

  const existingImageId = await resolveImageAsset(MOCK_IMAGE_REL, {
    upload: false,
  })
  console.log(`\nMock image: ${MOCK_IMAGE_REL}`)
  if (existingImageId) {
    console.log(`  will reuse asset ${existingImageId}`)
  } else {
    console.log(
      apply
        ? '  will upload (not yet in dataset)'
        : '  will upload on --confirm (not yet in dataset)',
    )
  }

  const existingVideoId = await resolveFileAsset(MOCK_VIDEO_REL, {
    upload: false,
  })
  console.log(`Mock video: ${MOCK_VIDEO_REL}`)
  if (existingVideoId) {
    console.log(`  will reuse asset ${existingVideoId}`)
  } else {
    console.log(
      apply
        ? '  will upload (not yet in dataset)'
        : '  will upload on --confirm (not yet in dataset)',
    )
  }

  const lineClone = applyTestLabels(cloneDocBody(line))
  lineClone._id = CLONE_LINE_ID
  lineClone._type = 'productLine'

  const styleClone = applyTestLabels(cloneDocBody(style))
  styleClone._id = CLONE_STYLE_ID
  styleClone._type = 'productStyle'
  styleClone.productLine = ref(CLONE_LINE_ID)

  /** @type {{ kind: string, id: string, detail: string }[]} */
  const planned = [
    {
      kind: 'createOrReplace',
      id: lineClone._id,
      detail: `${lineClone.title} → /products/${lineClone.slug.current}`,
    },
    {
      kind: 'createOrReplace',
      id: styleClone._id,
      detail: `${styleClone.title} → …/${styleClone.slug.current}`,
    },
  ]

  console.log(`\nSource line:   ${line.title} (${line._id})`)
  console.log(`Source style:  ${style.title} (${style._id})`)
  console.log(`Source products (${products.length}):`)
  for (const p of products) {
    console.log(`  - ${p.title} (${p._id})`)
  }

  if (!apply) {
    for (const product of products) {
      const sourceSlug = product.slug?.current
      if (!sourceSlug) {
        console.error(`❌  Product ${product._id} has no slug`)
        process.exit(1)
      }
      const clone = applyTestLabels(cloneDocBody(product))
      planned.push({
        kind: 'createOrReplace',
        id: cloneIdForProduct(sourceSlug),
        detail: `${clone.title} → /products/${withTestSlug(sourceSlug)} (kraft image + hover video)`,
      })
    }

    console.log(`\nPlanned writes (${planned.length}):`)
    for (const row of planned) {
      console.log(`  ${row.kind.padEnd(14)} ${row.id} — ${row.detail}`)
    }
    console.log(`\nCleanup: ${CLEANUP_GROQ}`)
    console.log(
      `\n${planned.length} write(s) pending on ${DATASET}. DRY-RUN — re-run with \`--confirm\`.\n`,
    )
    return
  }

  const imageId = await resolveImageAsset(MOCK_IMAGE_REL, { upload: true })
  if (!imageId) {
    console.error('❌  Failed to resolve mock image asset')
    process.exit(1)
  }
  console.log(`  using image asset ${imageId}`)

  const videoId = await resolveFileAsset(MOCK_VIDEO_REL, { upload: true })
  if (!videoId) {
    console.error('❌  Failed to resolve mock video asset')
    process.exit(1)
  }
  console.log(`  using video asset ${videoId}`)

  const productClones = products.map((product) => {
    const sourceSlug = product.slug?.current
    if (!sourceSlug) {
      console.error(`❌  Product ${product._id} has no slug`)
      process.exit(1)
    }
    const clone = applyTestLabels(cloneDocBody(product))
    clone._id = cloneIdForProduct(sourceSlug)
    clone._type = 'product'
    clone.productLine = ref(CLONE_LINE_ID)
    // Drop live sibling styles (e.g. Rigid Window Boxes on the display-window
    // product) so the test product only appears under the cloned Book Style.
    clone.productStyle = [ref(CLONE_STYLE_ID)]
    const still = imageField(imageId, MOCK_IMAGE_ALT, 'image-mock-0', {
      primary: true,
    })
    clone.images = [still]
    clone.videos = [catalogVideoField(videoId, still)]
    delete clone.featuredImage
    delete clone.media
    delete clone.featuredVideo
    // availableCustomizations / customizationExceptions stay on live options.
    return clone
  })

  for (const p of productClones) {
    planned.push({
      kind: 'createOrReplace',
      id: p._id,
      detail: `${p.title} → /products/${p.slug.current} (kraft image + hover video)`,
    })
  }

  console.log(`\nPlanned writes (${planned.length}):`)
  for (const row of planned) {
    console.log(`  ${row.kind.padEnd(14)} ${row.id} — ${row.detail}`)
  }
  console.log(`\nCleanup: ${CLEANUP_GROQ}`)

  const tx = client.transaction()
  tx.createOrReplace(lineClone)
  tx.createOrReplace(styleClone)
  for (const p of productClones) tx.createOrReplace(p)
  await tx.commit()

  console.log(`\n✅  Wrote ${planned.length} document(s) to ${DATASET}.\n`)
  console.log('Routes:')
  console.log(`  /products/${lineClone.slug.current}`)
  console.log(
    `  /products/${lineClone.slug.current}/${styleClone.slug.current}`,
  )
  for (const p of productClones) {
    console.log(`  /products/${p.slug.current}`)
  }
  console.log('')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
