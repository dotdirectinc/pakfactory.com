/**
 * Remove the Solution Styles the PROD-1541 seed scripts created (PROD-2605).
 *
 * `seed-beauty-solution-lp.mjs`, `seed-beauty-style-products.mjs` and
 * `seed-test-kids-solution-lp.mjs` wrote `solutionStyle.beauty-*` and `solutionStyle.test-kids-*`
 * to demo the solution landing page, before the catalog fill knew the type existed. The fill now
 * creates the real ones from Notion (`solutionStyle-<notionId>`), so the seeded ones are clutter —
 * and, left in place, some share a parent solution with the real ones and would be matched by
 * title instead of replaced.
 *
 * ── WHAT THIS DELETES, AND WHAT IT DELIBERATELY DOES NOT ─────────────────────────
 *
 * Only `solutionStyle` documents whose id carries a seed prefix, published and draft. Nothing
 * references them (checked 2026-09-25), and the script re-checks: a document that anything still
 * references is REFUSED, never force-deleted, and the run stops.
 *
 * NOT the rest of the seeds' output — the `[Test] Beauty & Cosmetics` solution (24 inbound
 * references), its case studies, clients, FAQs and `[Test]` products. That is a wider test-data
 * clean-up with its own decisions; this script only clears the way for the Solution Style fill.
 *
 * Run it BEFORE `pull-sanity` for the fill, so the snapshot no longer holds the seeded styles.
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 *   pnpm --filter @pakfactory/studio run remove:seeded-solution-styles -- --dataset development
 *   pnpm --filter @pakfactory/studio run remove:seeded-solution-styles -- --dataset development --confirm
 *
 * Requires a WRITE token in repo-root `.env.local` or `apps/studio/.env.local`
 * (`SANITY_API_WRITE_TOKEN` / `SANITY_TOKEN`). A read token cannot --confirm.
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
  pnpm --filter @pakfactory/studio run remove:seeded-solution-styles -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually delete. Without it the run is a dry run.
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
  console.error('❌  --confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN); a read token cannot write.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2024-10-01',
  token: TOKEN,
  useCdn: false,
  perspective: 'raw',
})

/**
 * The id prefixes the three seed scripts write — published and draft. `string::startsWith`, not
 * `path()`: a path glob's `*` matches a whole dot-separated segment, so `path("solutionStyle.beauty-*")`
 * matches nothing and a dry run reports a clean dataset.
 */
const SEEDED = `_type == "solutionStyle" && (
  string::startsWith(_id, "solutionStyle.beauty-") || string::startsWith(_id, "drafts.solutionStyle.beauty-") ||
  string::startsWith(_id, "solutionStyle.test-kids-") || string::startsWith(_id, "drafts.solutionStyle.test-kids-")
)`

async function main() {
  console.log(`\n🧹  Seeded Solution Styles (PROD-2605) — ${describeMode({ confirm: apply, dataset: DATASET })}`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET}\n`)

  const docs = await client.fetch(
    `*[${SEEDED}] | order(_id asc){ _id, title, "parent": solution->title, "referencedBy": *[references(^._id)]._id }`,
  )
  if (docs.length === 0) {
    console.log(`✅  Nothing to remove in dataset=${DATASET} — no seeded Solution Styles left.`)
    return
  }

  // A draft's own published twin is not an outside reference to it.
  const ids = new Set(docs.map((d) => d._id))
  const blocked = docs.filter((d) => d.referencedBy.some((r) => !ids.has(r)))
  for (const d of docs) {
    const draft = d._id.startsWith('drafts.') ? ' (draft)' : ''
    const refs = d.referencedBy.filter((r) => !ids.has(r))
    console.log(`${refs.length ? '⛔' : '🗑️ '}  ${d.title ?? '(untitled)'}${draft} — ${d._id}${d.parent ? ` · under "${d.parent}"` : ''}${refs.length ? ` · referenced by ${refs.join(', ')}` : ''}`)
  }
  console.log(`\n${docs.length} seeded Solution Style document(s) in dataset=${DATASET}`)

  if (blocked.length) {
    console.error(`\n❌  ${blocked.length} of them are still referenced — nothing deleted. Remove those references first; this script never force-deletes.`)
    process.exit(1)
  }
  if (!apply) {
    console.log(`\n🔍  DRY RUN — nothing deleted in dataset=${DATASET}. Re-run with --confirm to delete.`)
    return
  }

  let tx = client.transaction()
  for (const d of docs) tx = tx.delete(d._id)
  try {
    await tx.commit()
  } catch (err) {
    console.error(`\n❌  Delete failed: ${err.message}\n    Nothing was deleted (one transaction).`)
    process.exit(1)
  }
  console.log(`\n✅  ${docs.length} seeded Solution Style document(s) deleted from dataset=${DATASET}.`)
}

main().catch((err) => {
  console.error(`\n❌  ${err.message}`)
  process.exit(1)
})
