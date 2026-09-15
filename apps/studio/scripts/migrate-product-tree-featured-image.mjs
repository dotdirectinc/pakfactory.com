#!/usr/bin/env node
/**
 * PROD-2512 — move the product tree's representative image onto one name.
 *
 *   productLine.cardImage   →  featuredImage
 *   productStyle.image      →  featuredImage
 *
 * Product needs no data step: `featuredImage` is NEW there, and its gallery
 * (`media`) is untouched. What changes on Product is only the RULE — the first
 * gallery image no longer silently doubles as the card.
 *
 * ── Why this rename ─────────────────────────────────────────────────────────
 *
 * D33: a field is never named for its render slot. `bannerImage` named a shape and
 * became `cardImage`, which named a UI component — the same violation, one word
 * over. `featuredImage` names a ROLE: the image that stands for this document.
 *
 * It is also the name the schema has always used in prose. The shared `ogImage`
 * description on every type reads "Falls back to the featured image, then the
 * global default" — pointing at a concept that had no field until now.
 *
 * ⚠️ Product Style was renamed twice in two days (cardImage → image in PROD-2511,
 * then image → featuredImage here). That is churn, and it is recorded rather than
 * hidden: PROD-2511 merged before Richard proposed the better name. No data was
 * lost either time — one document, one asset reference.
 *
 * ── What this writes ────────────────────────────────────────────────────────
 *
 * The whole image object, moved key-for-key: asset reference, hotspot, crop and
 * alt all travel together, so nothing is re-uploaded and no asset is touched.
 *
 * ⚠️ ADDITIVE ONLY. The old keys are NOT unset here — Conventions §4.3: never
 * remove a populated field in the change that stops using it. They are already
 * undeclared in the schema, so they are invisible in the Studio; removal belongs
 * in a later `migrate:unset-removed-deprecated` sweep.
 *
 * Drafts included (`perspective: 'raw'`) — publishing a stale draft would restore
 * the old shape on a document this script had already fixed.
 *
 * Idempotent: a document that already carries `featuredImage` is skipped, so a
 * re-run writes nothing and says so.
 *
 * `--verify` re-reads and compares the ASSET REFERENCE on each document, not a
 * count. A transaction can return before the dataset settles, so a script's own
 * closing tally is not evidence — that has bitten this series three times.
 *
 * Written by an agent, RUN BY A HUMAN.
 *
 * ⚠️ Run in the SAME deploy as the schema change.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run migrate:product-tree-featured-image -- --dataset <development|production> [--confirm] [--yes-production] [--verify]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.
  --verify          Read-only. Re-read and compare asset references; writes nothing.`

const args = parseScriptArgs({ usage: USAGE, flags: ['verify'] })
const { confirm: apply, verify } = args

/**
 * Every old key that may hold the representative image, newest name first.
 *
 * ⚠️ Product Style has TWO entries, and that is not belt-and-braces — it is the
 * actual state of the dataset. PROD-2511 renamed `cardImage` → `image` in the
 * schema and deliberately shipped NO migration, because the plan was to re-upload
 * the single affected image by hand. That schema change then merged but was never
 * deployed, so the Studio still writes `cardImage` and `image` is empty on every
 * document. `cardImage` is therefore where the data actually lives.
 *
 * `image` is listed first anyway: if anything is ever written under the interim
 * name, the newer key should win rather than be silently overwritten by the older
 * one. Today it matches nothing, which the dry run prints.
 */
const MOVES = [
  { type: 'productLine', from: 'cardImage' },
  { type: 'productStyle', from: 'image' },
  { type: 'productStyle', from: 'cardImage' },
]

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
const DATASET = args.dataset
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN

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

const assetRef = (img) => img?.asset?._ref ?? null

async function main() {
  console.log(`\nproject=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  if (verify) return runVerify()

  const tx = client.transaction()
  const moved = new Set()
  let queued = 0
  let already = 0

  for (const { type, from } of MOVES) {
    const docs = await client.fetch(
      `*[_type == $type && defined(${from}.asset)]{_id, title, ${from}, featuredImage}`,
      { type },
    )
    console.log(`${type}.${from} → featuredImage — ${docs.length} document(s) carry it`)

    for (const doc of docs) {
      // `moved` guards the within-run case: Product Style is visited twice, and the
      // first pass's patch is not readable until the transaction commits.
      if (doc.featuredImage || moved.has(doc._id)) {
        already++
        console.log(`   · skip  ${doc.title} — already has featuredImage`)
        continue
      }
      moved.add(doc._id)
      // The whole object moves: asset, hotspot, crop and alt travel together.
      tx.patch(doc._id, (p) => p.set({ featuredImage: doc[from] }))
      queued++
      console.log(`   ✓ move  ${doc.title}  (asset ${assetRef(doc[from])})`)
    }
  }

  if (!queued) {
    console.log(`\nNothing to do on dataset=${DATASET}${already ? ` — ${already} already migrated.` : '.'}\n`)
    return
  }

  if (!apply) {
    console.log(`\nDRY RUN — ${queued} patch(es) would be written to dataset=${DATASET}. Re-run with --confirm.\n`)
    return
  }

  // 'sync', not 'async': an async commit returns before the dataset settles and the
  // closing count then reads stale.
  await tx.commit({ visibility: 'sync' })
  console.log(`\n✅ ${queued} patch(es) written to dataset=${DATASET}. Re-run with --verify.\n`)
}

/** Compares values, not counts: every old key's asset must now be on featuredImage. */
async function runVerify() {
  let bad = 0
  let checked = 0

  for (const { type, from } of MOVES) {
    const docs = await client.fetch(
      `*[_type == $type && (defined(${from}.asset) || defined(featuredImage.asset))]{_id, title, ${from}, featuredImage}`,
      { type },
    )
    for (const doc of docs) {
      checked++
      const was = assetRef(doc[from])
      const now = assetRef(doc.featuredImage)
      if (was && was !== now) {
        bad++
        console.log(`   ✖ ${type} — ${doc.title}: ${from}=${was} but featuredImage=${now ?? 'MISSING'}`)
      } else {
        console.log(`   ✓ ${type} — ${doc.title}: featuredImage=${now}`)
      }
    }
  }

  console.log(
    bad
      ? `\n✖ ${bad} of ${checked} document(s) did NOT move on dataset=${DATASET}.\n`
      : `\n✅ all ${checked} document(s) verified on dataset=${DATASET}.\n`,
  )
  if (bad) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
