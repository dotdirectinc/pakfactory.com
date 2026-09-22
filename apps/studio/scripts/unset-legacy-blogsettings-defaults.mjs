/**
 * Remove the now-orphaned per-type default objects from the `blogSettings` document
 * (PROD-2116 cleanup). After the query fallback + schema tabs were removed, these
 * fields are inert data — no longer in the schema, no longer read — and show up in
 * Studio as "fields not in your content model". This unsets them for tidiness.
 *
 * ⚠️ Run this LAST, and only once the query cleanup is confirmed stable in prod.
 * While these values remain, they are your rollback buffer: reverting the query to
 * the coalesce fallback would read them again. Unsetting removes that buffer.
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 *   pnpm --filter @pakfactory/studio run cleanup:blogsettings-defaults -- --dataset development
 *   pnpm --filter @pakfactory/studio run cleanup:blogsettings-defaults -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run cleanup:blogsettings-defaults -- --dataset production --confirm --yes-production
 *
 * Requires a WRITE token (`SANITY_API_WRITE_TOKEN` / `SANITY_TOKEN`).
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
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run cleanup:blogsettings-defaults -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`
const args = parseScriptArgs({ usage: USAGE })

const apply = args.confirm

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
const DATASET = args.dataset
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local (SANITY_API_WRITE_TOKEN)')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error('❌  --confirm needs a WRITE token; a read token cannot write.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
})

const LEGACY_FIELDS = [
  'postDefaults',
  'categoryDefaults',
  'tagDefaults',
  'authorDefaults',
  'pageDefaults',
]

async function main() {
  console.log(`\n🧹  Unset legacy blogSettings.*Defaults (PROD-2116 cleanup)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${apply ? 'APPLY (writes)' : 'DRY-RUN (no writes)'}\n`)

  const doc = await client.fetch(`*[_id == "blogSettings"][0]{ ${LEGACY_FIELDS.join(', ')} }`)
  if (!doc) {
    console.log('✅  No blogSettings document — nothing to unset.\n')
    return
  }
  const present = LEGACY_FIELDS.filter((f) => doc[f] !== undefined && doc[f] !== null)
  if (present.length === 0) {
    console.log('✅  Already clean — no legacy *Defaults fields remain on blogSettings.\n')
    return
  }

  console.log(`Will unset ${present.length} field(s) on blogSettings: ${present.join(', ')}`)

  if (!apply) {
    console.log(`\nDRY-RUN on dataset=${DATASET} — nothing written. Re-run with --confirm.\n`)
    return
  }

  await client.patch('blogSettings').unset(present).commit()
  console.log(`\n✅  Unset ${present.join(', ')} on blogSettings (${DATASET}).\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
