/**
 * Unset the retired legacy `type` field on `redirect` docs (PROD-2157).
 *
 * `type` (301/302) is fully superseded by `behaviour` (permanent/temporary/gone):
 * the schema field is removed and the resolver (`@pakfactory/redirects`) no longer
 * reads `type` — status comes from `behaviour`, defaulting to permanent 301. This
 * script removes the now-dead stored value so the data matches the schema. Purely
 * cosmetic (the resolver already ignores `type`); safe to run any time after the
 * type-retirement deploy.
 *
 * SAFETY GATE: refuses to --apply if any doc still has `type` but NO `behaviour`
 * (those would silently change status — run `backfill:redirect-fields` first).
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 *   pnpm --filter @pakfactory/studio run unset:redirect-type -- --dataset development
 *   pnpm --filter @pakfactory/studio run unset:redirect-type -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run unset:redirect-type -- --dataset production --confirm --yes-production
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
  pnpm --filter @pakfactory/studio run unset:redirect-type -- --dataset <development|production> [--confirm] [--yes-production]

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
  console.log(`\n🧹  Unset retired redirect \`type\` field (PROD-2157)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${apply ? 'APPLY (writes)' : 'DRY-RUN (no writes)'}\n`)

  const docs = await client.fetch(
    `*[_type == "redirect" && defined(type) && !(_id in path("drafts.**"))]{ _id, type, behaviour }`,
  )
  const draftIds = await client.fetch(
    `*[_type == "redirect" && defined(type) && _id in path("drafts.**")]._id`,
  )

  if (docs.length === 0) {
    console.log('✅  Nothing to do — no published redirect still carries a `type` field.\n')
    return
  }

  // Safety gate: a doc with `type` but no `behaviour` would silently change status
  // once `type` is gone (resolver defaults to 301). Backfill those first.
  const missingBehaviour = docs.filter((d) => !d.behaviour)
  if (missingBehaviour.length) {
    console.log(`⚠️  ${missingBehaviour.length} doc(s) have \`type\` but NO \`behaviour\` — run \`backfill:redirect-fields\` first:`)
    missingBehaviour.forEach((d) => console.log(`     ${d._id}  (type=${d.type})`))
    if (apply) {
      console.error(`\n❌  Refusing to write while docs lack \`behaviour\`. Backfill, then retry.\n`)
      process.exit(1)
    }
  }

  console.log(`${docs.length} published doc(s) carry \`type\` (to unset):`)
  for (const d of docs) console.log(`  ${apply ? '✏️ ' : '•'} ${d._id}  (type=${d.type}, behaviour=${d.behaviour ?? '—'})`)

  if (draftIds.length) {
    console.log(`\n⚠️  ${draftIds.length} redirect(s) have open DRAFTS also carrying \`type\` — republish them afterward:`)
    draftIds.forEach((id) => console.log(`     ${id}`))
  }

  if (!apply) {
    console.log(`\nDRY-RUN on dataset=${DATASET} — nothing unset. Re-run with --confirm. Verify on development first, then production.\n`)
    return
  }

  const tx = client.transaction()
  for (const d of docs) tx.patch(d._id, (p) => p.unset(['type']))
  await tx.commit()
  console.log(`\n✅  Unset \`type\` on ${docs.length} redirect(s) on ${DATASET}.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
