/**
 * Unset `property.valuesPerItem`, whose field comes out of the schema in the
 * same PR (PROD-2585).
 *
 * ⚠️ Removing a field from the schema does NOT remove it from stored documents.
 * That is how `showThicknessTable` and its siblings survived on 33 Options long
 * after the schema forgot them (D48 §3). Hence this script, in the same deploy.
 *
 * ── This one destroys data, and there is no gate that can say otherwise ────
 *
 * Every other unset migration in this register checks a successor first: the
 * value survives somewhere, so dropping the old key loses nothing. There is no
 * successor here. `valuesPerItem` is being removed because nothing consumes it,
 * not because something else now carries it, so the authored values are gone
 * for good.
 *
 * That makes the run log the only record. THIS SCRIPT PRINTS EVERY VALUE IT IS
 * ABOUT TO DELETE, on a dry run and on a real one, so the loss lands somewhere
 * readable rather than happening quietly. There is no override flag and no
 * gate to skip: the printed list IS the gate, and a human reading it is the
 * check.
 *
 * ── Which datasets ────────────────────────────────────────────────────────
 *
 * `development` is the only one with anything to do — 10 of 12 Properties carry
 * the key (Shape, Thickness, Relative Cost, Aesthetic, Color, Finish Type,
 * Performance, Role, Source, Sustainability), authored during PROD-2542's
 * testing.
 *
 * `production` holds 9 Properties with the key set on none, so a run there is a
 * clean no-op. The flags still work for it; there is simply nothing to write.
 *
 * Development's sync from production is disabled and not returning (confirmed
 * 2026-09-23), so the dataset will not clear itself and this script is the only
 * way the keys go.
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 *   pnpm --filter @pakfactory/studio run migrate:unset-values-per-item -- --dataset development
 *   pnpm --filter @pakfactory/studio run migrate:unset-values-per-item -- --dataset development --confirm
 *
 * ⚠️ TAKE A DATASET EXPORT FIRST. Sanity has no undo.
 * ⚠️ Run in the SAME deploy as the schema change. Running it FIRST would leave
 *    10 documents failing the field's `required` rule while the field still
 *    exists, which is a worse state than either end.
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
  pnpm --filter @pakfactory/studio run migrate:unset-values-per-item -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`
const args = parseScriptArgs({ usage: USAGE })
const { confirm: apply } = args

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
  console.error(
    '❌  --confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN); a read token cannot write.',
  )
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
  // Explicit: on apiVersion >= 2025-02-19 the client defaults to `published`,
  // which silently drops every draft. A draft holding an unswept key would be
  // republished later and put it straight back.
  perspective: 'raw',
})

const label = (d) => `${d.isDraft ? '[draft] ' : ''}${d.title ?? d._id}`

async function main() {
  console.log(`\n🧹  Unset property.valuesPerItem (PROD-2585)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const docs = await client.fetch(
    `*[_type == "property" && defined(valuesPerItem)]{
       _id, title, valuesPerItem, "isDraft": _id in path("drafts.**")
     } | order(title asc)`,
  )

  if (!docs.length) {
    console.log('✅  Nothing to unset — no Property in this dataset carries the key.\n')
    return
  }

  console.log(
    `🔴  ${docs.length} document(s) carry \`valuesPerItem\`, and this is a DELIBERATE LOSS —`,
  )
  console.log(`    the field has no successor, so these values are not being moved anywhere.`)
  console.log(`    What is being deleted:\n`)
  docs.forEach((d) => console.log(`     ${label(d)} — valuesPerItem="${d.valuesPerItem}"`))
  console.log('')

  if (!apply) {
    console.log(
      `DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`) to write.`,
    )
    console.log(`⚠️  Take a dataset export first. Sanity has no undo.\n`)
    return
  }

  const tx = client.transaction()
  docs.forEach((d) => tx.patch(d._id, (p) => p.unset(['valuesPerItem'])))
  await tx.commit()

  console.log(`✅  ${docs.length} document(s) patched in ${DATASET}.`)
  console.log(`    Re-query \`defined(valuesPerItem)\` to confirm 0.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
