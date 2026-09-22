/**
 * Backfill `language: "en"` on blog i18n documents and create the French homepage shell.
 *
 * From repo root:
 *   pnpm --filter @pakfactory/studio run migrate:blog-i18n-en -- --dataset development
 *   pnpm --filter @pakfactory/studio run migrate:blog-i18n-en -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run migrate:blog-i18n-en -- --dataset production --confirm --yes-production
 *   node apps/studio/scripts/migrate-blog-i18n-en.mjs --dry-run
 *
 * Requires write token in repo root `.env.local` or `apps/blog/.env.local`.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/blog/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run migrate:blog-i18n-en -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`
const args = parseScriptArgs({ usage: USAGE })

const dryRun = !args.confirm

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

  console.log(`  ${dryRun ? 'Would create' : 'Creating'} French homepage shell (${FR_HOME_ID})`)
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

  // A ✅ is a claim about what the dataset now contains. In a dry run nothing was
  // written, so the tick is withheld rather than footnoted — BUG-0032 was a correct
  // banner lost underneath three ✅ characters.
  if (dryRun) {
    console.log(`\n🔍  DRY-RUN on dataset=${DATASET} — nothing written.`)
    console.log(`   Would patch ${patched} document(s) with language: "en"${createdFr ? ', and create the French homepage shell' : ''}.`)
    console.log('   Re-run with --confirm to write.\n')
  } else {
    console.log(`\n✅  Patched ${patched} document(s) with language: "en" on dataset=${DATASET}`)
    if (createdFr) {
      console.log(
        '   French homepage shell created — link EN/FR via Studio Translations UI if metadata is missing.',
      )
    }
    console.log('')
  }
}

main().catch((err) => {
  console.error('❌  Migration failed:', err.message)
  process.exit(1)
})
