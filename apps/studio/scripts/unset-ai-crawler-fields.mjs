/**
 * Unset retired AI crawler toggles from posts + Global Settings (PROD-2199).
 *
 * Schema removed `aiTraining` / `aiAnswering` from `post` and
 * `aiTrainingDefault` / `aiAnsweringDefault` from `settings`. Stored values are
 * inert and Studio surfaces them as "Unknown fields found". This clears them.
 *
 * ⚠️ Run this LAST, and only once the schema change is deployed and confirmed
 * stable. While the values remain they are the rollback buffer: restoring the
 * fields would read them back. Unsetting removes that buffer. Same sequence as
 * the PROD-2194 sitemap-hints cleanup.
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 *   NEXT_PUBLIC_SANITY_DATASET=development pnpm --filter @pakfactory/studio run cleanup:ai-crawler-fields
 *   NEXT_PUBLIC_SANITY_DATASET=development pnpm --filter @pakfactory/studio run cleanup:ai-crawler-fields -- --apply
 *   NEXT_PUBLIC_SANITY_DATASET=production  pnpm --filter @pakfactory/studio run cleanup:ai-crawler-fields -- --apply
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

const POST_FIELDS = ['aiTraining', 'aiAnswering']
const SETTINGS_FIELDS = ['aiTrainingDefault', 'aiAnsweringDefault']
const TX_CHUNK = 100

function hasAny(doc, fields) {
  return fields.some((f) => doc[f] !== undefined)
}

function summarize(doc, fields) {
  return fields
    .filter((f) => doc[f] !== undefined)
    .map((f) => `${f}=${doc[f]}`)
    .join(' · ')
}

async function commitUnsets(docs, fields) {
  for (let i = 0; i < docs.length; i += TX_CHUNK) {
    const chunk = docs.slice(i, i + TX_CHUNK)
    let tx = client.transaction()
    for (const doc of chunk) tx = tx.patch(doc._id, (p) => p.unset(fields))
    await tx.commit()
  }
}

async function main() {
  console.log(`\n📦  project ${PROJECT_ID} · dataset ${DATASET}`)
  console.log(apply ? '⚠️   APPLY — writes will be made\n' : '🔍  DRY RUN — nothing will be written\n')

  const [posts, settings] = await Promise.all([
    client.fetch(
      `*[_type == "post" && (defined(aiTraining) || defined(aiAnswering))]{ _id, aiTraining, aiAnswering }`,
    ),
    client.fetch(
      `*[_id in ["settings", "drafts.settings"]]{ _id, aiTrainingDefault, aiAnsweringDefault }`,
    ),
  ])

  const staleSettings = settings.filter((d) => hasAny(d, SETTINGS_FIELDS))

  console.log(`Posts with orphaned AI fields: ${posts.length}`)
  for (const p of posts.slice(0, 20)) {
    console.log(`  ${p._id}  ${summarize(p, POST_FIELDS)}`)
  }
  if (posts.length > 20) console.log(`  … and ${posts.length - 20} more`)

  console.log(`\nSettings docs with orphaned AI defaults: ${staleSettings.length}`)
  for (const s of staleSettings) {
    console.log(`  ${s._id}  ${summarize(s, SETTINGS_FIELDS)}`)
  }
  for (const id of ['settings', 'drafts.settings']) {
    if (!settings.find((d) => d._id === id)) {
      console.log(`  ${id}  (not found or already clean)`)
    }
  }

  if (!posts.length && !staleSettings.length) {
    console.log('\n✅  Already clean — nothing to unset.')
    return
  }

  if (!apply) {
    console.log('\n🔍  Dry run complete — re-run with `-- --apply` to write.')
    return
  }

  if (posts.length) await commitUnsets(posts, POST_FIELDS)
  if (staleSettings.length) await commitUnsets(staleSettings, SETTINGS_FIELDS)

  console.log(
    `\n✅  Cleared AI crawler fields on ${posts.length} post(s) and ${staleSettings.length} settings doc(s).`,
  )
}

main().catch((err) => {
  console.error('❌  Cleanup failed:', err.message)
  process.exit(1)
})
