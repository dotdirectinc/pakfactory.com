#!/usr/bin/env node
/**
 * Wrap legacy bare-file `featuredVideo` into the shared featuredVideo object.
 *
 *   product.featuredVideo (file)      →  { _type: 'featuredVideo', source: 'upload', file }
 *   productLine.featuredVideo (file)  →  same
 *
 * Expertise Stage has no legacy data (field is new).
 *
 * 🔴 Run it through the register, not the USAGE line below:
 *   pnpm sanity:migrate up --dataset <development|production> \
 *     --only 20260929-featured-video-object --confirm
 *
 * `migrate.mjs` writes the ledger row; this script does not, and never has.
 * See scripts/sanity/MIGRATIONS.md.
 *
 * Idempotent: documents that already have `featuredVideo.source` are skipped.
 * Additive: does not unset anything outside the reshaped object.
 *
 * Written by an agent, RUN BY A HUMAN.
 */

import {createClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseScriptArgs, describeMode} from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({path: join(repoRoot, '.env.local')})
loadEnv({path: join(repoRoot, '.env')})
loadEnv({path: join(repoRoot, 'apps/studio/.env.local'), override: true})

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run migrate:featured-video-object -- --dataset <development|production> [--confirm] [--yes-production] [--verify]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.
  --verify          Read-only. Assert no legacy bare-file featuredVideo remains.`

const args = parseScriptArgs({usage: USAGE, flags: ['verify']})
const {confirm: apply, verify} = args

const TYPES = ['product', 'productLine']

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
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error('❌  --confirm needs a WRITE token.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
  perspective: 'raw',
})

/** Legacy bare file: has asset, no source discriminator. */
const LEGACY_FILTER = /* groq */ `defined(featuredVideo.asset) && !defined(featuredVideo.source)`

function toObject(fileValue) {
  // Keep asset (+ optional originalFilename metadata Sanity stores on the file).
  const file = {
    _type: 'file',
    asset: fileValue.asset,
  }
  return {
    _type: 'featuredVideo',
    source: 'upload',
    file,
  }
}

async function main() {
  console.log(`\nproject=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  if (verify) return runVerify()

  const tx = client.transaction()
  let queued = 0
  let already = 0

  for (const type of TYPES) {
    const docs = await client.fetch(
      `*[_type == $type && defined(featuredVideo)]{_id, title, featuredVideo}`,
      {type},
    )
    console.log(`${type}.featuredVideo — ${docs.length} document(s) carry the field`)

    for (const doc of docs) {
      const fv = doc.featuredVideo
      if (!fv) continue
      if (fv.source) {
        already++
        console.log(`   · skip  ${doc.title ?? doc._id} — already object (source=${fv.source})`)
        continue
      }
      if (!fv.asset) {
        already++
        console.log(`   · skip  ${doc.title ?? doc._id} — no asset (empty/partial)`)
        continue
      }
      tx.patch(doc._id, (p) => p.set({featuredVideo: toObject(fv)}))
      queued++
      console.log(`   ✓ wrap  ${doc.title ?? doc._id}  (asset ${fv.asset._ref})`)
    }
  }

  if (!queued) {
    console.log(
      `\nNothing to do on dataset=${DATASET}${already ? ` — ${already} already migrated.` : '.'}\n`,
    )
    return
  }

  if (!apply) {
    console.log(
      `\nDRY RUN — ${queued} patch(es) would be written to dataset=${DATASET}. Re-run with --confirm.\n`,
    )
    return
  }

  await tx.commit({visibility: 'sync'})
  console.log(`\n✅ ${queued} patch(es) written to dataset=${DATASET}. Re-run with --verify.\n`)
}

async function runVerify() {
  const remaining = await client.fetch(
    `count(*[_type in $types && ${LEGACY_FILTER}])`,
    {types: TYPES},
  )
  if (remaining > 0) {
    console.log(
      `\n✖ ${remaining} document(s) still have legacy bare-file featuredVideo on dataset=${DATASET}.\n`,
    )
    process.exitCode = 1
    return
  }
  console.log(
    `\n✅ no legacy bare-file featuredVideo on product / productLine (dataset=${DATASET}).\n`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
