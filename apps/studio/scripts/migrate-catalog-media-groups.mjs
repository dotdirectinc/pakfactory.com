#!/usr/bin/env node
/**
 * ADR-024 — copy catalog media into images[] / videos[] and unset the old keys.
 *
 *   featuredImage + media[]  →  images[] (featuredImage primary)
 *   featuredVideo            →  videos[0] (thumbnail = featuredImage when set)
 *
 * Lifestyle arrays start empty. Asset references, hotspot, crop, and alt travel
 * together — nothing is re-uploaded.
 *
 * Types: product, productLine, productStyle, customizationOption, solution,
 * solutionStyle, bundle.
 *
 * 🔴 Run it through the register:
 *   pnpm sanity:migrate up --dataset development --only 20261007-catalog-media-groups
 *   pnpm sanity:migrate up --dataset development --only 20261007-catalog-media-groups --confirm
 *
 * This cutover is development-only. Do not pass production / --yes-production
 * until a later production migration is scheduled.
 *
 * Idempotent: documents that already have images or videos are skipped.
 * After a successful copy, unsets featuredImage, media, and featuredVideo.
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
  pnpm --filter @pakfactory/studio run migrate:catalog-media-groups -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.

  Initial cutover: use --dataset development only.`

const args = parseScriptArgs({usage: USAGE})
const {confirm: apply} = args

const TYPES = [
  'product',
  'productLine',
  'productStyle',
  'customizationOption',
  'solution',
  'solutionStyle',
  'bundle',
]

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

function key() {
  return randomUUID()
}

function assetRef(img) {
  return img?.asset?._ref ?? null
}

function cloneImage(img, primary) {
  if (!img?.asset) return null
  const {_type, ...rest} = img
  return {
    _type: 'image',
    _key: key(),
    ...rest,
    primary: primary === true,
  }
}

function hasFeaturedVideo(video) {
  if (!video || typeof video !== 'object') return false
  if (video.source === 'upload' && video.file?.asset) return true
  if (video.source === 'url' && video.url) return true
  if (video.source === 'youtube' && video.youtubeUrl) return true
  if (video.asset) return true
  return false
}

function cloneVideo(video, thumbnail) {
  if (!hasFeaturedVideo(video)) return null
  const {_type, ...rest} = video
  const out = {
    _type: 'catalogVideo',
    _key: key(),
    ...rest,
  }
  if (thumbnail?.asset) {
    const {_type: _t, ...thumbRest} = thumbnail
    out.thumbnail = {_type: 'image', ...thumbRest}
  }
  return out
}

function buildPatch(doc) {
  const images = []
  const seen = new Set()

  const featured = cloneImage(doc.featuredImage, true)
  if (featured) {
    images.push(featured)
    seen.add(assetRef(featured))
  }

  for (const item of doc.media ?? []) {
    const ref = assetRef(item)
    if (!ref || seen.has(ref)) continue
    const cloned = cloneImage(item, images.length === 0)
    if (!cloned) continue
    images.push(cloned)
    seen.add(ref)
  }

  const videos = []
  const video = cloneVideo(doc.featuredVideo, doc.featuredImage)
  if (video) videos.push(video)

  if (images.length === 0 && videos.length === 0) return null

  return {images, videos}
}

async function main() {
  console.log(
    `\nADR-024 catalog media groups — project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`,
  )

  if (DATASET === 'production' && apply) {
    console.warn(
      '⚠️  This cutover is scoped to development. Production writes need a later scheduled migration.\n',
    )
  }

  const docs = await client.fetch(
    `*[_type in $types && (
      defined(featuredImage.asset) ||
      count(media) > 0 ||
      defined(featuredVideo)
    )]{
      _id,
      _type,
      title,
      featuredImage,
      media,
      featuredVideo,
      images,
      videos
    }`,
    {types: TYPES},
  )

  console.log(`${docs.length} document(s) still carry legacy media keys\n`)

  const tx = client.transaction()
  let queued = 0
  let skipped = 0

  for (const doc of docs) {
    const label = doc.title || doc._id
    if ((doc.images?.length ?? 0) > 0 || (doc.videos?.length ?? 0) > 0) {
      skipped++
      console.log(`   · skip  ${doc._type} ${label} — already has images/videos`)
      continue
    }

    const next = buildPatch(doc)
    if (!next) {
      skipped++
      console.log(`   · skip  ${doc._type} ${label} — nothing to copy`)
      continue
    }

    tx.patch(doc._id, (p) =>
      p
        .set({
          images: next.images,
          videos: next.videos,
        })
        .unset(['featuredImage', 'media', 'featuredVideo']),
    )
    queued++
    console.log(
      `   ✓ copy  ${doc._type} ${label}  images=${next.images.length} videos=${next.videos.length}`,
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
