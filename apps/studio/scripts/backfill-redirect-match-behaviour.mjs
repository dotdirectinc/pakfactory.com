/**
 * Backfill `matchType` + `behaviour` on legacy `redirect` docs (PROD-2157).
 *
 * The pattern-capable schema adds `matchType` (exact/prefix/phrase) and `behaviour`
 * (permanent/temporary/gone). Existing docs (the ~150 migration redirects) predate
 * those fields — they carry only the legacy `type` (301/302). The resolver already
 * defaults `matchType` to exact and reads `behaviour` with a `type` fallback, so
 * this is a NON-URGENT tidy-up: it makes the stored data explicit and lets a later
 * ticket drop the `type` fallback.
 *
 * Sets, only where missing (idempotent — never overwrites an editor's value):
 *   matchType -> "exact"
 *   behaviour -> "temporary" when type == "302", else "permanent"
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 *   pnpm --filter @pakfactory/studio run backfill:redirect-fields -- --dataset development
 *   pnpm --filter @pakfactory/studio run backfill:redirect-fields -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run backfill:redirect-fields -- --dataset production --confirm --yes-production
 *
 * Requires a WRITE token in repo-root `.env.local` or `apps/studio/.env.local`
 * (`SANITY_API_WRITE_TOKEN` / `SANITY_TOKEN`). A read token cannot --apply.
 *
 * Processes published docs; any redirect with an open DRAFT is reported (republish
 * afterward). Redirects live in the shared `production` dataset.
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
  pnpm --filter @pakfactory/studio run backfill:redirect-fields -- --dataset <development|production> [--confirm] [--yes-production]

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
  console.error('❌  --confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN); a read token cannot write.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
})

async function main() {
  console.log(`\n🔧  Backfill redirect matchType + behaviour (PROD-2157)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${apply ? 'APPLY (writes)' : 'DRY-RUN (no writes)'}\n`)

  const docs = await client.fetch(
    `*[_type == "redirect" && (!defined(matchType) || !defined(behaviour)) && !(_id in path("drafts.**"))]{ _id, type, matchType, behaviour }`,
  )
  const draftIds = await client.fetch(`*[_type == "redirect" && _id in path("drafts.**")]._id`)

  const changes = []
  for (const d of docs) {
    const set = {}
    if (!d.matchType) set.matchType = 'exact'
    if (!d.behaviour) set.behaviour = d.type === '302' ? 'temporary' : 'permanent'
    if (Object.keys(set).length) changes.push({ _id: d._id, set })
  }

  if (changes.length === 0) {
    console.log('✅  Nothing to backfill — every redirect already has matchType + behaviour.\n')
    return
  }

  for (const c of changes) {
    console.log(`${apply ? '✏️ ' : '•'} ${c._id}  ${JSON.stringify(c.set)}`)
  }

  if (draftIds.length) {
    console.log(`\n⚠️  ${draftIds.length} redirect(s) have open DRAFTS — republish them afterward so the draft carries the new fields:`)
    draftIds.forEach((id) => console.log(`     ${id}`))
  }

  console.log(`\n${changes.length} doc(s) to backfill`)

  if (!apply) {
    console.log(`\nDRY-RUN on dataset=${DATASET} — nothing written. Re-run with --confirm. Verify on development first, then production.\n`)
    return
  }

  const tx = client.transaction()
  for (const c of changes) tx.patch(c._id, (p) => p.set(c.set))
  await tx.commit()
  console.log(`\n✅  Backfilled ${changes.length} redirect(s) on ${DATASET}.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
