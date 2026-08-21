/**
 * PROD-2288 — copy `internalTitle` → `title` on every Solution.
 *
 * Solution.md renames the Studio-only `internalTitle` to a required, presentable
 * `title`. The schema adds `title` and deprecates `internalTitle` (add → migrate
 * → deprecate → remove, §4.3); this backfills `title` on the existing documents
 * so they validate. All 30 docs carry `internalTitle` and none has `title` yet
 * (verified on production 2026-08-19).
 *
 * Additive-safe and idempotent: only patches Solutions that have `internalTitle`
 * and no `title`, so re-running is a no-op. Existing slugs are untouched (the
 * field's `source: title` only affects new slug generation in the Studio).
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/sanity migrate:solution-titles --dataset development
 *   ... --confirm                                        # apply (dry-run is default)
 *   ... --dataset production --confirm --yes-production
 *   ... --dataset production --verify                    # read-only
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

const args = process.argv.slice(2)
const flag = (n: string) => {
  const i = args.indexOf(`--${n}`)
  return i === -1 ? undefined : args[i + 1]
}
const has = (n: string) => args.includes(`--${n}`)

const dataset = flag('dataset')
const confirm = has('confirm')
const verifyOnly = has('verify')
const yesProduction = has('yes-production')

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || ''
const token = process.env.SANITY_API_WRITE_TOKEN || ''
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01'

function fail(msg: string): never {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}
if (!dataset) fail('--dataset is required.')
if (!projectId) fail('No project id in env.')
if (!token) fail('No SANITY_API_WRITE_TOKEN in env.')
if (dataset === 'production' && confirm && !yesProduction)
  fail('Refusing to write to production without --yes-production.')

const client: SanityClient = createClient({ projectId, dataset: dataset!, apiVersion, token, useCdn: false })
const write = confirm && !verifyOnly

// Drafts and published both — perspective raw returns drafts.* alongside published.
const FILTER = `*[_type == "solution" && defined(internalTitle) && !defined(title)]`

async function main() {
  console.log(
    `PROD-2288 solution internalTitle → title — ${projectId}/${dataset}, mode ${verifyOnly ? 'VERIFY' : write ? 'WRITE' : 'DRY-RUN'}`,
  )
  const docs = await client.fetch<{ _id: string; internalTitle: string }[]>(
    `${FILTER}{ _id, internalTitle }`,
    {},
    { perspective: 'raw' },
  )
  console.log(`\n${docs.length} solution doc(s) need title backfilled.`)

  if (verifyOnly || docs.length === 0) {
    if (docs.length === 0) console.log('✓ Nothing to backfill — every Solution already has a title.')
    return
  }
  if (!write) {
    for (const d of docs) console.log(`  would set title = "${d.internalTitle}" on ${d._id}`)
    console.log('\nDRY-RUN — re-run with --confirm to apply.')
    return
  }

  for (let i = 0; i < docs.length; i += 50) {
    const tx = client.transaction()
    for (const d of docs.slice(i, i + 50)) {
      tx.patch(client.patch(d._id).setIfMissing({ title: d.internalTitle }))
    }
    await tx.commit({ visibility: 'async' })
    console.log(`  set ${Math.min(i + 50, docs.length)}/${docs.length}`)
  }
  console.log('\n✓ Done. internalTitle stays in place (deprecated) until it is removed from the schema.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
