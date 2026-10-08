/**
 * Copy the legacy `images` array into the Studio "Media" field (`media`) on products and
 * customization options.
 *
 * The schema moved a record's images into `media` (Studio → Content → Media), but the data
 * never followed: on `development` 58 documents still hold their images in `images`, a field
 * Studio no longer shows (22 products, 22 customization options, 14 solution styles, counted
 * 2026-10-08). The admin Catalog previews `media[0]` (Richard, 2026-10-08), so those records
 * show no image until their Media is filled.
 *
 * What it does, per document (drafts and published alike, each patched on its own revision):
 *   · only when `images` has entries AND `media` is empty — Media an editor already filled is
 *     never touched;
 *   · `media` = the `images` entries as plain images (asset, hotspot, crop, alt), the one
 *     flagged `primary` first, the rest in their order;
 *   · `images` is LEFT in place. This copies, it does not move: deleting the old field is a
 *     separate decision, and nothing is lost if the copy turns out to be unwanted.
 *
 * Not covered, on purpose:
 *   · solution styles — their schema has no Media field (only Featured image). Their 14
 *     legacy image arrays are listed in the report, not written anywhere;
 *   · `lifestyleImages` (41 products) — a different slot, not this field.
 *
 * Refs: PROD-2926. Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/sanity migrate:images-to-media -- --dataset development            # dry run
 *   pnpm --filter @pakfactory/sanity migrate:images-to-media -- --dataset development --confirm  # write
 *   pnpm --filter @pakfactory/sanity migrate:images-to-media -- --dataset production --confirm --yes-production
 *
 * Env: SANITY_API_WRITE_TOKEN. Project id from NEXT_PUBLIC_SANITY_PROJECT_ID /
 * SANITY_STUDIO_PROJECT_ID.
 */

import { createClient, type SanityClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: join(__dirname, '../../../.env.local') })
loadEnv({ path: join(__dirname, '../../../.env') })

// `pnpm run x -- --flag` forwards the literal `--`; anything else unknown is a hard exit.
const KNOWN = new Set(['--dataset', '--confirm', '--yes-production'])
const args = process.argv.slice(2).filter((a) => a !== '--')
let dataset: string | undefined
let confirm = false
let yesProduction = false
for (let i = 0; i < args.length; i++) {
  const a = args[i]!
  if (!KNOWN.has(a)) fail(`Unknown argument "${a}". Accepted: --dataset <name>, --confirm, --yes-production.`)
  if (a === '--dataset') dataset = args[++i]
  if (a === '--confirm') confirm = true
  if (a === '--yes-production') yesProduction = true
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || ''
const token = process.env.SANITY_API_WRITE_TOKEN || ''
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01'

function fail(msg: string): never {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}
if (!dataset) fail('--dataset is required (no environment fallback).')
if (!projectId) fail('No project id in env.')
if (!token) fail('No SANITY_API_WRITE_TOKEN in env.')
if (dataset === 'production' && confirm && !yesProduction)
  fail('Refusing to write to production without --yes-production.')

const client: SanityClient = createClient({ projectId, dataset: dataset!, apiVersion, token, useCdn: false })

type LegacyImage = {
  _key?: string
  _type?: string
  asset?: { _ref?: string; _type?: string }
  hotspot?: unknown
  crop?: unknown
  alt?: string
  primary?: boolean
}
type Doc = { _id: string; _rev: string; _type: string; title?: string; images?: LegacyImage[]; media?: unknown[] }

/** A Media entry from a legacy one: an image with its asset and framing; `primary` is dropped. */
function toMedia(img: LegacyImage, i: number) {
  return {
    _key: img._key ?? `img${i}`,
    _type: 'image',
    asset: { _type: 'reference', _ref: img.asset!._ref! },
    ...(img.hotspot ? { hotspot: img.hotspot } : {}),
    ...(img.crop ? { crop: img.crop } : {}),
    ...(img.alt ? { alt: img.alt } : {}),
  }
}

async function main() {
  const mode = confirm ? 'WRITE' : 'DRY-RUN'
  console.log(`images → media — project=${projectId} dataset=${dataset} mode=${mode}`)

  const docs = await client.fetch<Doc[]>(
    `*[_type in ["product", "customizationOption", "solutionStyle"] && count(images) > 0]{ _id, _rev, _type, title, images, media }`,
    {},
    { perspective: 'raw' },
  )
  const notCovered = docs.filter((d) => d._type === 'solutionStyle')
  const candidates = docs.filter((d) => d._type !== 'solutionStyle')
  const alreadyFilled = candidates.filter((d) => (d.media?.length ?? 0) > 0)
  const todo = candidates
    .filter((d) => !((d.media?.length ?? 0) > 0))
    .map((d) => {
      const usable = (d.images ?? []).filter((img) => img.asset?._ref)
      const ordered = [...usable.filter((img) => img.primary), ...usable.filter((img) => !img.primary)]
      return { doc: d, media: ordered.map(toMedia), skipped: (d.images?.length ?? 0) - usable.length }
    })
    .filter((t) => t.media.length > 0)

  const byType = (list: { _type: string }[]) =>
    Object.entries(list.reduce<Record<string, number>>((m, d) => ({ ...m, [d._type]: (m[d._type] ?? 0) + 1 }), {}))
      .map(([t, n]) => `${t} ${n}`)
      .join(', ') || 'none'

  console.log(`\nDocuments with legacy images (drafts included): ${docs.length}`)
  console.log(`  to copy into media:            ${todo.length} (${byType(todo.map((t) => t.doc))})`)
  console.log(`  media already filled — left:   ${alreadyFilled.length}`)
  console.log(`  solution styles — no Media field, not written: ${notCovered.length}`)
  for (const t of todo) {
    console.log(`    ${t.doc._type.padEnd(20)} ${t.doc._id.padEnd(44)} ${t.media.length} image(s)${t.skipped ? `, ${t.skipped} without an asset skipped` : ''}  ${t.doc.title ?? ''}`)
  }

  if (!todo.length) {
    console.log(`\nNothing to copy on dataset=${dataset}.`)
    return
  }
  if (!confirm) {
    console.log(`\nDRY-RUN on dataset=${dataset} — re-run with --confirm to write.`)
    return
  }

  let written = 0
  for (const t of todo) {
    // ifRevisionID: a document edited since it was read is not overwritten — re-run instead.
    await client.patch(t.doc._id).ifRevisionId(t.doc._rev).set({ media: t.media }).commit()
    written++
  }
  console.log(`\n✓ ${written} document(s) written on dataset=${dataset}. Legacy \`images\` left in place.`)
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)))
