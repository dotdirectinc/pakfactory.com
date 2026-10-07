#!/usr/bin/env node
/**
 * Move images[0] → lifestyleImages on inspiration products only.
 *
 *   product (kind == "inspiration") with images[]
 *     → lifestyleImages gets images[0] (primary: true, new _key)
 *     → that item is removed from images[]
 *
 * Standard products and every other catalog type are never queried or patched.
 *
 * 🔴 Run it through the register (after catalog-media-groups so images[] exists):
 *   pnpm sanity:migrate up --dataset development --only 20261007-inspiration-first-image-to-lifestyle
 *   pnpm sanity:migrate up --dataset development --only 20261007-inspiration-first-image-to-lifestyle --confirm
 *
 * Development cutover only. Do not pass production / --yes-production until a
 * later production migration is scheduled.
 *
 * Idempotent: skip when lifestyleImages already has items, or images is empty.
 * No re-upload — asset ref, hotspot, crop, and alt travel with the object.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents.
 */

import {createClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'
import {randomUUID} from 'node:crypto'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseScriptArgs, describeMode} from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({path: join(repoRoot, '.env.local')})
loadEnv({path: join(repoRoot, '.env')})
loadEnv({path: join(repoRoot, 'apps/studio/.env.local'), override: true})

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run migrate:inspiration-first-image-to-lifestyle -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.

  Initial cutover: use --dataset development only. Inspiration products only.`

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
  console.error('❌  --confirm needs a WRITE token.')
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

function cloneAsLifestylePrimary(img) {
  if (!img?.asset) return null
  const {_type, _key, ...rest} = img
  return {
    _type: 'image',
    _key: randomUUID(),
    ...rest,
    primary: true,
  }
}

function buildPatch(doc) {
  const images = Array.isArray(doc.images) ? doc.images : []
  if (images.length === 0) return null

  const lifestyle = Array.isArray(doc.lifestyleImages) ? doc.lifestyleImages : []
  if (lifestyle.length > 0) return null

  const first = images[0]
  const moved = cloneAsLifestylePrimary(first)
  if (!moved) return null

  return {
    images: images.slice(1),
    lifestyleImages: [moved],
  }
}

async function main() {
  console.log(
    `\nInspiration first image → lifestyle — project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`,
  )
  console.log('Filter: _type == "product" && kind == "inspiration" && count(images) > 0\n')

  if (DATASET === 'production' && apply) {
    console.warn(
      '⚠️  This cutover is scoped to development. Production writes need a later scheduled migration.\n',
    )
  }

  const docs = await client.fetch(
    `*[
      _type == "product" &&
      kind == "inspiration" &&
      count(images) > 0
    ]{
      _id,
      title,
      sku,
      images,
      lifestyleImages
    }`,
  )

  console.log(`${docs.length} inspiration product(s) with images[]\n`)

  const tx = client.transaction()
  let queued = 0
  let skipped = 0

  for (const doc of docs) {
    const label = doc.title || doc.sku || doc._id
    const next = buildPatch(doc)
    if (!next) {
      skipped++
      const reason =
        (doc.lifestyleImages?.length ?? 0) > 0
          ? 'already has lifestyleImages'
          : 'nothing to move'
      console.log(`   · skip  ${label} — ${reason}`)
      continue
    }

    tx.patch(doc._id, (p) =>
      p.set({
        images: next.images,
        lifestyleImages: next.lifestyleImages,
      }),
    )
    queued++
    console.log(
      `   ✓ move  ${label}  images ${doc.images.length}→${next.images.length}  lifestyleImages=1`,
    )
  }

  console.log(`\nqueued=${queued} skipped=${skipped}`)

  if (!apply) {
    console.log(
      `\n🔍  DRY RUN — nothing written in dataset=${DATASET}. Re-run with --confirm to write.\n`,
    )
    return
  }

  if (queued === 0) {
    console.log('\n✅  Nothing to write.\n')
    return
  }

  await tx.commit({visibility: 'async'})
  console.log(`\n✅  Wrote ${queued} document(s) to dataset=${DATASET}.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
