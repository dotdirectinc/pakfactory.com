/**
 * Migrate legacy bodyTable blocks (row-major: string[] columns + rows[].cells)
 * to column-major shape (PROD-2224): columns[]{ header, cells[]{ value } }.
 *
 * From repo root (humans only — agents must not run content writes):
 *   pnpm --filter @pakfactory/studio run migrate:body-table -- --dry-run
 *   pnpm --filter @pakfactory/studio run migrate:body-table
 *
 * Requires a write token in repo root `.env.local` or `apps/studio/.env.local`
 * (`SANITY_API_WRITE_TOKEN` / `SANITY_API_READ_TOKEN` / `SANITY_TOKEN`).
 *
 * The blog front-end dual-reads both shapes via `normalizeBodyTable` until this
 * migration has been applied on each dataset.
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

function key() {
  return randomUUID().replace(/-/g, '').slice(0, 12)
}

/**
 * @param {unknown} block
 * @returns {unknown | null} Migrated block, or null if unchanged / not legacy
 */
function migrateBodyTable(block) {
  if (!block || typeof block !== 'object' || block._type !== 'bodyTable') {
    return null
  }

  const columns = block.columns
  if (!Array.isArray(columns) || columns.length === 0) return null

  // Already column-major (objects with header/cells).
  const alreadyNew = columns.some(
    (c) => c != null && typeof c === 'object' && ('header' in c || 'cells' in c),
  )
  if (alreadyNew) return null

  // Legacy: columns are strings (or non-objects).
  const headers = columns.map((c) => (typeof c === 'string' ? c : String(c ?? '')))
  const rows = Array.isArray(block.rows) ? block.rows : []
  const rowCount = Math.max(rows.length, 2)

  const nextColumns = headers.map((header, colIdx) => {
    const cells = []
    for (let r = 0; r < rowCount; r += 1) {
      const row = rows[r]
      const raw = Array.isArray(row?.cells) ? row.cells[colIdx] : ''
      cells.push({
        _key: key(),
        _type: 'tableCell',
        value: typeof raw === 'string' ? raw : String(raw ?? ''),
      })
    }
    return {
      _key: key(),
      _type: 'tableColumn',
      header,
      cells,
    }
  })

  const { rows: _drop, ...rest } = block
  return {
    ...rest,
    columns: nextColumns,
  }
}

/**
 * @param {unknown[]} blocks
 * @returns {{ blocks: unknown[]; changed: number }}
 */
function migratePortableText(blocks) {
  if (!Array.isArray(blocks)) return { blocks, changed: 0 }

  let changed = 0
  const next = blocks.map((block) => {
    const migrated = migrateBodyTable(block)
    if (!migrated) return block
    changed += 1
    return migrated
  })

  return { blocks: next, changed }
}

const QUERY = /* groq */ `*[
  _type == "post" &&
  count(body[_type == "bodyTable" && defined(rows)]) > 0
]{ _id, _rev, title, body }`

async function main() {
  console.log(`\n📦  Dataset: ${DATASET} (${PROJECT_ID})`)
  console.log(`🔧  Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`)

  const docs = await client.fetch(QUERY)
  if (!docs.length) {
    console.log('✅  No posts with legacy bodyTable rows found.')
    return
  }

  console.log(`Found ${docs.length} post(s) with legacy bodyTable data.\n`)

  for (const doc of docs) {
    const { blocks, changed } = migratePortableText(doc.body)
    console.log(`• ${doc.title || doc._id} — ${changed} table(s) to convert`)

    if (dryRun || changed === 0) continue

    await client
      .patch(doc._id)
      .set({ body: blocks })
      .commit({ autoGenerateArrayKeys: false })
    console.log(`  ✓ patched ${doc._id}`)
  }

  console.log(
    dryRun
      ? '\nDry run complete — re-run without --dry-run to apply.\n'
      : '\n✅  Migration complete. Reload Studio to confirm Data table columns edit column-first.\n',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
