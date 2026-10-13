#!/usr/bin/env node
/**
 * Seed hero / SEO / catalog UI copy onto Product + Customization Catalog Pages
 * (PROD-3001).
 *
 * Customization Catalog gets Crystal’s drafted copy. Product Catalog gets the
 * copy already live on `/products`. Leaves title, sections, filters, and
 * previewImage alone. Patches published + draft ids when present.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:catalog-page-copy -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:catalog-page-copy -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:catalog-page-copy -- --dataset production --confirm --yes-production
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
  pnpm --filter @pakfactory/studio run seed:catalog-page-copy -- --dataset <development|production> [--confirm] [--yes-production]

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

const ROBOTS = {
  allowIndex: true,
  allowFollow: true,
  noImageIndex: false,
}

/** Crystal’s draft for `/customizations`. */
const CUSTOMIZATION_COPY = {
  h1: 'Customization Library',
  intro:
    'Explore materials, finishes, printing techniques, and additional features for custom packaging. Learn how each option works and how it shapes your packaging’s look, feel, and functionality.',
  metaTitle: 'Packaging Customization Library | PakFactory',
  metaDescription:
    'Explore 200+ packaging materials, finishes, printing techniques, and add-ons. Learn what each option does and find the right fit for your custom packaging.',
  searchPlaceholder: 'Search options',
  emptyMessage:
    'No matching options found. Try a different search term or clear your filters to explore more options.',
  resetLabel: 'Clear All',
  productLineFacetLabel: 'Compatible Products',
  categoryHint:
    'Select a category above to filter by type, properties, and more.',
  ...ROBOTS,
}

/** Current `/products` route copy. */
const PRODUCT_COPY = {
  h1: 'Products',
  intro: 'Custom packaging solutions tailored to your brand.',
  metaTitle: 'Products',
  metaDescription: 'Browse packaging products and styles.',
  searchPlaceholder: 'Search products',
  emptyMessage: 'No products match these filters. Reset or broaden search.',
  resetLabel: 'Reset Filter',
  productLineFacetLabel: 'Product Line',
  ...ROBOTS,
}

const TARGETS = [
  {
    id: 'customizationCatalogPage',
    type: 'customizationCatalogPage',
    title: 'Default',
    copy: CUSTOMIZATION_COPY,
  },
  {
    id: 'productCatalogPage',
    type: 'productCatalogPage',
    title: 'Default',
    copy: PRODUCT_COPY,
  },
]

const COPY_KEYS = [
  'h1',
  'intro',
  'metaTitle',
  'metaDescription',
  'searchPlaceholder',
  'emptyMessage',
  'resetLabel',
  'productLineFacetLabel',
  'categoryHint',
  'allowIndex',
  'allowFollow',
  'noImageIndex',
]

function sameCopy(doc, copy) {
  if (!doc) return false
  for (const key of COPY_KEYS) {
    if (!(key in copy)) continue
    const next = copy[key]
    const current = doc[key]
    if (typeof next === 'boolean') {
      if (current !== next) return false
      continue
    }
    const a = typeof current === 'string' ? current.trim() : current
    const b = typeof next === 'string' ? next.trim() : next
    if (a !== b) return false
  }
  return true
}

async function seed() {
  console.log(`\n🌱  Catalog page copy → ${DATASET} (${PROJECT_ID})\n`)

  const plans = []
  for (const target of TARGETS) {
    const docs = await client.fetch(
      `*[_id == $id || _id == "drafts." + $id]{_id, _type, title, h1, intro, metaTitle, metaDescription, searchPlaceholder, emptyMessage, resetLabel, productLineFacetLabel, categoryHint, allowIndex, allowFollow, noImageIndex}`,
      {id: target.id},
    )
    const published = docs.find((d) => d._id === target.id) ?? null
    const draft = docs.find((d) => d._id === `drafts.${target.id}`) ?? null

    const idsToTouch = []
    if (!published && !draft) {
      idsToTouch.push({id: target.id, action: 'create'})
    } else {
      if (published && !sameCopy(published, target.copy)) {
        idsToTouch.push({id: target.id, action: 'patch'})
      }
      if (draft && !sameCopy(draft, target.copy)) {
        idsToTouch.push({id: `drafts.${target.id}`, action: 'patch'})
      }
      if (published && !draft && sameCopy(published, target.copy)) {
        // nothing
      } else if (!published && draft && sameCopy(draft, target.copy)) {
        // nothing
      }
    }

    plans.push({
      ...target,
      published: Boolean(published),
      draft: Boolean(draft),
      idsToTouch,
    })
  }

  for (const plan of plans) {
    if (plan.idsToTouch.length === 0) {
      console.log(`  ${plan.id}: skip (copy already matches)`)
      continue
    }
    for (const touch of plan.idsToTouch) {
      console.log(`  ${touch.id}: ${touch.action}`)
    }
  }

  const toWrite = plans.filter((p) => p.idsToTouch.length > 0)
  if (!apply) {
    console.log(
      `\n  DRY-RUN on dataset=${DATASET} — would update ${toWrite.reduce((n, p) => n + p.idsToTouch.length, 0)} doc id(s). Re-run with --confirm.\n`,
    )
    return
  }

  if (toWrite.length === 0) {
    console.log(
      `\n✅  Nothing to write on dataset=${DATASET} — catalog copy already matches.\n`,
    )
    return
  }

  const tx = client.transaction()
  for (const plan of toWrite) {
    for (const touch of plan.idsToTouch) {
      if (touch.action === 'create') {
        tx.createOrReplace({
          _id: touch.id,
          _type: plan.type,
          title: plan.title,
          ...plan.copy,
        })
      } else {
        tx.patch(touch.id, {set: plan.copy})
      }
    }
  }
  await tx.commit()

  console.log(
    `\n  ✓  Wrote ${toWrite.reduce((n, p) => n + p.idsToTouch.length, 0)} catalog copy update(s)`,
  )
  console.log(
    '\n✅  Done. Publish drafts in Studio if needed, then check /products and /customizations.\n',
  )
}

seed().catch((err) => {
  console.error('❌  Catalog page copy seed failed:', err.message)
  process.exit(1)
})
