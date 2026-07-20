/**
 * Seed the five per-type settings singletons (PROD-2116) from the legacy
 * `blogSettings` per-type default objects, so the co-located Settings docs carry
 * IDENTICAL values and rendered meta/sitemap output is unchanged after the cutover.
 *
 * The blog resolves defaults as `new singleton -> blogSettings.<type>Defaults`, so
 * until these singletons exist the site uses the old values untouched. Run this to
 * populate them.
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 *   NEXT_PUBLIC_SANITY_DATASET=development pnpm --filter @pakfactory/studio run seed:per-type-settings
 *   NEXT_PUBLIC_SANITY_DATASET=development pnpm --filter @pakfactory/studio run seed:per-type-settings -- --apply
 * Then, after verifying dev, promote to production:
 *   NEXT_PUBLIC_SANITY_DATASET=production  pnpm --filter @pakfactory/studio run seed:per-type-settings -- --apply
 *
 * Requires a WRITE token in repo-root `.env.local` or `apps/studio/.env.local`
 * (`SANITY_API_WRITE_TOKEN` / `SANITY_TOKEN`). A read token cannot --apply.
 *
 * Mapping (singleton id  <-  blogSettings field):
 *   postSettings      <- postDefaults
 *   categorySettings  <- categoryDefaults
 *   topicSettings     <- tagDefaults        (the type is still `blogTag`)
 *   authorSettings    <- authorDefaults
 *   pageSettings      <- pageDefaults
 *
 * Idempotent: uses createOrReplace on fixed ids. Re-running re-copies from
 * blogSettings (safe until the legacy fields are removed in the follow-up ticket).
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
  console.error('❌  Missing Sanity token in .env.local (SANITY_API_WRITE_TOKEN)')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error('❌  --apply needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN); a read token cannot write.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
})

const BASE_KEYS = [
  'metaTitleFormat',
  'metaDescriptionFormat',
  'allowIndex',
  'allowFollow',
  'noImageIndex',
  'sitemapPriority',
  'sitemapChangefreq',
]

// singleton id  <-  blogSettings field  (+ any extra keys)
const MAP = [
  { id: 'postSettings', from: 'postDefaults', keys: BASE_KEYS },
  { id: 'categorySettings', from: 'categoryDefaults', keys: BASE_KEYS },
  { id: 'topicSettings', from: 'tagDefaults', keys: [...BASE_KEYS, 'autoNoindexThreshold'] },
  { id: 'authorSettings', from: 'authorDefaults', keys: BASE_KEYS },
  { id: 'pageSettings', from: 'pageDefaults', keys: BASE_KEYS },
]

function pick(obj, keys) {
  const out = {}
  for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null) out[k] = obj[k]
  return out
}

async function main() {
  console.log(`\n🌱  Seed per-type settings singletons (PROD-2116)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${apply ? 'APPLY (writes)' : 'DRY-RUN (no writes)'}\n`)

  const legacy = await client.fetch(
    `*[_id == "blogSettings"][0]{ postDefaults, categoryDefaults, tagDefaults, authorDefaults, pageDefaults }`,
  )
  if (!legacy) {
    console.error('❌  No `blogSettings` document found on this dataset — nothing to copy from. Aborting.')
    process.exit(1)
  }

  const docs = MAP.map(({ id, from, keys }) => ({
    _id: id,
    _type: id,
    ...pick(legacy[from], keys),
  }))

  for (const doc of docs) {
    const { _id, _type, ...fields } = doc
    console.log(`${apply ? '✏️ ' : '•'} ${_id}`)
    for (const [k, v] of Object.entries(fields)) console.log(`     ${k}: ${JSON.stringify(v)}`)
    if (Object.keys(fields).length === 0) {
      console.log(`     ⚠️  legacy source (${MAP.find((m) => m.id === _id).from}) is empty — singleton would be created with no values`)
    }
  }

  if (!apply) {
    console.log(`\nDRY-RUN only — re-run with \`-- --apply\` to write. Seed DEVELOPMENT first, verify, then PRODUCTION.\n`)
    return
  }

  const tx = client.transaction()
  for (const doc of docs) tx.createOrReplace(doc)
  await tx.commit()
  console.log(`\n✅  Seeded ${docs.length} settings singletons on ${DATASET}.`)
  console.log(`    Verify the desk (Post ▸ Settings, etc.) and diff rendered meta/sitemap, then promote to the next dataset.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
