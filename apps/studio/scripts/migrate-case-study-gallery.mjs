/**
 * Flatten legacy case-study Gallery items (`galleryImage` objects with nested `image`)
 * into native Sanity image array members (asset + alt + caption on the member).
 *
 * From repo root:
 *   pnpm --filter @pakfactory/studio run migrate:case-study-gallery -- --dry-run
 *   pnpm --filter @pakfactory/studio run migrate:case-study-gallery
 *
 * Requires a write token in repo root `.env.local` or `apps/studio/.env.local`
 * (`SANITY_API_WRITE_TOKEN` / `SANITY_API_READ_TOKEN` / `SANITY_TOKEN`).
 *
 * After a successful run on each dataset, the legacy `galleryImage` member can be
 * removed from `case-study-gallery-block.ts`.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })
loadEnv({ path: join(repoRoot, 'apps/www/.env.local'), override: true })

const dryRun = process.argv.includes('--dry-run')

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  '8293wrxp'
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  'development'
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
})

const PT_FIELDS = ['challenge', 'solution', 'result']

/**
 * @param {Record<string, unknown>} item
 * @returns {Record<string, unknown> | null} Flattened image member, or null if unchanged / unusable
 */
function flattenGalleryImage(item) {
  if (!item || item._type !== 'galleryImage') return null
  const nested = item.image
  if (!nested || typeof nested !== 'object') {
    console.warn(`  ⚠️  Skipping galleryImage ${_key(item)} — missing nested image`)
    return null
  }

  const { image: _drop, _type: _legacyType, ...rest } = item
  return {
    ...nested,
    ...rest,
    _type: 'image',
    _key: item._key || randomUUID().replace(/-/g, '').slice(0, 12),
    alt: item.alt,
    caption: item.caption,
  }
}

function _key(item) {
  return item?._key ?? '(no key)'
}

/**
 * @param {unknown[]} blocks
 * @returns {{ blocks: unknown[]; changed: number }}
 */
function migratePortableText(blocks) {
  if (!Array.isArray(blocks)) return { blocks, changed: 0 }

  let changed = 0
  const next = blocks.map((block) => {
    if (!block || typeof block !== 'object' || block._type !== 'caseStudyGalleryBlock') {
      return block
    }
    if (!Array.isArray(block.images)) return block

    let blockChanged = false
    const images = block.images.map((item) => {
      const flat = flattenGalleryImage(item)
      if (!flat) return item
      blockChanged = true
      changed += 1
      return flat
    })

    return blockChanged ? { ...block, images } : block
  })

  return { blocks: next, changed }
}

const QUERY = /* groq */ `*[
  _type == "caseStudy" &&
  (
    count(challenge[_type == "caseStudyGalleryBlock"].images[_type == "galleryImage"]) > 0 ||
    count(solution[_type == "caseStudyGalleryBlock"].images[_type == "galleryImage"]) > 0 ||
    count(result[_type == "caseStudyGalleryBlock"].images[_type == "galleryImage"]) > 0
  )
]{ _id, _rev, title, challenge, solution, result }`

async function main() {
  console.log(`\n📦  Dataset: ${DATASET} (${PROJECT_ID})`)
  console.log(`🔧  Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`)

  const docs = await client.fetch(QUERY)
  if (!docs.length) {
    console.log('✅  No case studies with legacy galleryImage items found.')
    return
  }

  console.log(`Found ${docs.length} case study document(s) with legacy gallery items.\n`)

  for (const doc of docs) {
    const patch = {}
    let totalChanged = 0

    for (const field of PT_FIELDS) {
      const { blocks, changed } = migratePortableText(doc[field])
      if (changed > 0) {
        patch[field] = blocks
        totalChanged += changed
      }
    }

    console.log(`• ${doc.title || doc._id} — ${totalChanged} image(s) to flatten`)

    if (dryRun || totalChanged === 0) continue

    await client.patch(doc._id).set(patch).commit({ autoGenerateArrayKeys: false })
    console.log(`  ✓ patched ${doc._id}`)
  }

  console.log(
    dryRun
      ? '\nDry run complete — re-run without --dry-run to apply.\n'
      : '\n✅  Migration complete. Reload Studio to confirm galleries edit as native images.\n',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
