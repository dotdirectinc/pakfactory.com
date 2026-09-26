#!/usr/bin/env node
/**
 * Clone a minimal [Test] Rigid Boxes experience on a dataset:
 *   1 productLine  → [Test] Rigid Boxes / test-rigid-boxes
 *   1 productStyle → [Test] Book Style Rigid Boxes / test-book-style-rigid-boxes
 *   3 standard products under that style
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
 *   *[_id in ["line.test-rigid-boxes","style.test-book-style-rigid-boxes"] || _id match "product.test-custom-book-style*" || _id match "product.test-custom-fitted-insert*"]
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
/** First three published standard products under Book Style, by title. */
const SOURCE_PRODUCT_IDS = [
  'product-529eb5db19ec82d79a6181b63c063497', // Buffer Wall Tray
  'product-ff1eb5db19ec834b97de81a5547c9f5b', // Display Window
  'product-758eb5db19ec83fb9e1201a27c1cb00b', // Fitted Insert
]

const CLONE_LINE_ID = 'line.test-rigid-boxes'
const CLONE_STYLE_ID = 'style.test-book-style-rigid-boxes'

const SYSTEM_KEYS = new Set([
  '_id',
  '_rev',
  '_createdAt',
  '_updatedAt',
  '_system',
  '_originalId',
])

const CLEANUP_GROQ =
  '*[_id in ["line.test-rigid-boxes","style.test-book-style-rigid-boxes"] || _id match "product.test-custom-book-style*" || _id match "product.test-custom-fitted-insert*"]'

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

async function main() {
  console.log(`\nClone [Test] Rigid Boxes / Book Style — ${describeMode(args)}\n`)
  console.log(`project ${PROJECT_ID} / dataset ${DATASET}`)

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
    `*[_id in $ids] | order(title asc)`,
    { ids: SOURCE_PRODUCT_IDS },
  )
  if (products.length !== SOURCE_PRODUCT_IDS.length) {
    const found = new Set(products.map((p) => p._id))
    const missing = SOURCE_PRODUCT_IDS.filter((id) => !found.has(id))
    console.error(`❌  Missing products: ${missing.join(', ')}`)
    process.exit(1)
  }

  const lineClone = applyTestLabels(cloneDocBody(line))
  lineClone._id = CLONE_LINE_ID
  lineClone._type = 'productLine'

  const styleClone = applyTestLabels(cloneDocBody(style))
  styleClone._id = CLONE_STYLE_ID
  styleClone._type = 'productStyle'
  styleClone.productLine = ref(CLONE_LINE_ID)

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
    // availableCustomizations / customizationExceptions stay on live options.
    return clone
  })

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
    ...productClones.map((p) => ({
      kind: 'createOrReplace',
      id: p._id,
      detail: `${p.title} → /products/${p.slug.current}`,
    })),
  ]

  console.log(`\nSource line:   ${line.title} (${line._id})`)
  console.log(`Source style:  ${style.title} (${style._id})`)
  console.log(`Source products (${products.length}):`)
  for (const p of products) {
    console.log(`  - ${p.title} (${p._id})`)
  }

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
