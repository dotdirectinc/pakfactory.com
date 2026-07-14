/**
 * Backfill `language: "en"` on blog i18n documents and create the French homepage shell.
 *
 * From repo root:
 *   node apps/studio/scripts/migrate-blog-i18n-en.mjs
 *   node apps/studio/scripts/migrate-blog-i18n-en.mjs --dry-run
 *
 * Requires write token in repo root `.env.local` or `apps/blog/.env.local`.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/blog/.env.local'), override: true })

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

const I18N_TYPES = ['post', 'blogPage', 'blogCategory', 'blogTag']
const EN_HOME_ID = 'blogHomePage'
const FR_HOME_ID = 'blogHomePage-fr'

async function backfillLanguage(type) {
  const ids = await client.fetch(
    `*[_type == $type && !defined(language)]._id`,
    { type },
  )
  console.log(`  ${type}: ${ids.length} document(s) missing language`)
  if (ids.length === 0 || dryRun) return ids.length

  const tx = client.transaction()
  for (const id of ids) {
    tx.patch(id, { set: { language: 'en' } })
  }
  await tx.commit()
  return ids.length
}

async function ensureFrenchHomepage() {
  const existing = await client.fetch(`*[_id == $id][0]._id`, { id: FR_HOME_ID })
  if (existing) {
    console.log(`  French homepage already exists (${FR_HOME_ID})`)
    return false
  }

  const enHome = await client.fetch(`*[_id == $id][0]`, { id: EN_HOME_ID })
  const frDoc = {
    _id: FR_HOME_ID,
    _type: 'blogPage',
    pageRole: 'home',
    language: 'fr',
    title: enHome?.title ? `${enHome.title} (FR)` : 'Blog Homepage (FR)',
    pageBuilder: enHome?.pageBuilder ?? [],
  }

  console.log(`  Creating French homepage shell (${FR_HOME_ID})`)
  if (!dryRun) {
    await client.createOrReplace(frDoc)
  }
  return true
}

async function main() {
  console.log(
    `\n🌐  Blog i18n EN backfill → ${DATASET} (${PROJECT_ID})${dryRun ? ' [dry-run]' : ''}\n`,
  )

  let patched = 0
  for (const type of I18N_TYPES) {
    patched += await backfillLanguage(type)
  }

  const createdFr = await ensureFrenchHomepage()

  console.log(`\n✅  Patched ${patched} document(s) with language: "en"`)
  if (createdFr) {
    console.log(
      '   French homepage shell created — link EN/FR via Studio Translations UI if metadata is missing.',
    )
  }
  if (dryRun) {
    console.log('   (dry-run: no writes performed)\n')
  } else {
    console.log('')
  }
}

main().catch((err) => {
  console.error('❌  Migration failed:', err.message)
  process.exit(1)
})
