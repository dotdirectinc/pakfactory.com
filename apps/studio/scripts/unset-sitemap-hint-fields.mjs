/**
 * Unset the retired `sitemapPriority` / `sitemapChangefreq` values from the five
 * per-type settings singletons (PROD-2194 cleanup).
 *
 * The sitemaps stopped emitting `<priority>` and `<changefreq>` first — Google
 * ignores both, and every blog post had been emitting the same constant pair —
 * and the editor fields were then removed from the schema. The stored values are
 * now inert data that Studio surfaces as "fields not in your content model".
 * This clears them.
 *
 * ⚠️ Run this LAST, and only once the schema change is deployed and confirmed
 * stable. While the values remain they are the rollback buffer: restoring the
 * fields would read them back. Unsetting removes that buffer. Same sequence as
 * the PROD-2116 blogSettings cleanup and the legacy `type` retirement.
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 *   NEXT_PUBLIC_SANITY_DATASET=development pnpm --filter @pakfactory/studio run cleanup:sitemap-hints
 *   NEXT_PUBLIC_SANITY_DATASET=development pnpm --filter @pakfactory/studio run cleanup:sitemap-hints -- --apply
 *   NEXT_PUBLIC_SANITY_DATASET=production  pnpm --filter @pakfactory/studio run cleanup:sitemap-hints -- --apply
 *
 * Requires a WRITE token (`SANITY_API_WRITE_TOKEN` / `SANITY_TOKEN`).
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const apply = process.argv.includes('--apply')

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_STUDIO_DATASET || 'development'
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local (SANITY_API_WRITE_TOKEN)')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2024-01-01',
  token: TOKEN,
  useCdn: false,
})

/** The five per-type settings singletons (PROD-2116). */
const SINGLETONS = [
  'postSettings',
  'categorySettings',
  'topicSettings',
  'authorSettings',
  'pageSettings',
]

const FIELDS = ['sitemapPriority', 'sitemapChangefreq']

async function main() {
  console.log(`\n📦  project ${PROJECT_ID} · dataset ${DATASET}`)
  console.log(apply ? '⚠️   APPLY — writes will be made\n' : '🔍  DRY RUN — nothing will be written\n')

  const docs = await client.fetch(
    `*[_id in $ids]{ _id, sitemapPriority, sitemapChangefreq }`,
    { ids: SINGLETONS },
  )

  const stale = docs.filter(
    (d) => d.sitemapPriority !== undefined || d.sitemapChangefreq !== undefined,
  )

  if (!docs.length) {
    console.log('No per-type settings singletons found — nothing to do.')
    return
  }

  for (const id of SINGLETONS) {
    const doc = docs.find((d) => d._id === id)
    if (!doc) {
      console.log(`  ${id.padEnd(18)} (not found)`)
      continue
    }
    const has = [
      doc.sitemapPriority !== undefined ? `priority=${doc.sitemapPriority}` : null,
      doc.sitemapChangefreq !== undefined ? `changefreq=${doc.sitemapChangefreq}` : null,
    ].filter(Boolean)
    console.log(`  ${id.padEnd(18)} ${has.length ? has.join(' · ') : '(already clean)'}`)
  }

  if (!stale.length) {
    console.log('\n✅  All singletons already clean — nothing to unset.')
    return
  }

  console.log(`\n${stale.length} singleton(s) carry stale values.`)

  if (apply) {
    let tx = client.transaction()
    for (const doc of stale) tx = tx.patch(doc._id, (p) => p.unset(FIELDS))
    await tx.commit()
    console.log('✅  Cleared.')
  } else {
    console.log('🔍  Dry run complete — re-run with `-- --apply` to write.')
  }
}

main().catch((err) => {
  console.error('❌  Cleanup failed:', err.message)
  process.exit(1)
})
