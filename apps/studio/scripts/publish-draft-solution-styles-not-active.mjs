/**
 * Publish every draft-only Solution Style that carries a registry id, as Not active
 * (PROD-3093).
 *
 * ── Why ───────────────────────────────────────────────────────────────────────
 *
 * In `development`, 96 of the 198 Solution Styles exist only as `drafts.<id>` —
 * exactly the ones not ticked "First launch" in Notion (checked 2026-10-15). The
 * registry fill and the Sync read published documents only (PROD-3094), so they
 * cannot see a third of the solution styles until those are published.
 *
 * Every one of the 96 drafts says `status: "active"`. Publishing them unchanged would
 * put 96 collection pages live. Publishing them as `not-active` makes them real
 * documents without anything new appearing on the site; the content team turns each
 * one on in Studio when it is ready.
 *
 * ── What it writes ────────────────────────────────────────────────────────────
 *
 * For each `drafts.<id>` Solution Style with an `entityId` and NO published `<id>`:
 *   · create `<id>` from the draft, with `status: "not-active"` — every other field as
 *     the draft has it;
 *   · delete `drafts.<id>` — the same thing Studio's Publish does.
 *
 * `create` (not `createOrReplace`) so a document published by someone else between the
 * dry run and the write makes the transaction fail instead of being overwritten.
 *
 * Not touched: drafts of styles that are already published (those are edits in
 * progress), and the `[test]` Cosmetic styles without a registry id.
 *
 * ── Refusals ──────────────────────────────────────────────────────────────────
 *
 * The run stops before writing anything if a candidate:
 *   · has no published parent `solution` — a strong reference to an unpublished
 *     document is rejected on publish;
 *   · strongly references any other document that has no published version;
 *   · has no slug, or a slug a published sibling under the same solution already uses
 *     (`uniqueSlugWithinParent` — Studio would refuse to publish it too).
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 * 🔴 Run it through the register so the ledger records it:
 *   pnpm sanity:migrate up --dataset development \
 *     --only 20261015-publish-draft-solution-styles-not-active --confirm
 *
 * The script's own interface, which the runner calls and which is still the way to
 * take a dry run:
 *   pnpm --filter @pakfactory/studio run migrate:publish-draft-solution-styles -- --dataset development
 *   pnpm --filter @pakfactory/studio run migrate:publish-draft-solution-styles -- --dataset development --confirm
 *
 * `production`: after the catalog production fill (PROD-2596), with `--yes-production`.
 *
 * ⚠️ TAKE A DATASET EXPORT FIRST. Sanity has no undo.
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
  pnpm --filter @pakfactory/studio run migrate:publish-draft-solution-styles -- --dataset <development|production> [--confirm] [--yes-production]

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
  // Explicit: on apiVersion >= 2025-02-19 the client defaults to `published`, which
  // drops every draft — and drafts are the whole input here.
  perspective: 'raw',
})

const NOT_ACTIVE = 'not-active'
const CHUNK = 50
const SYSTEM_KEYS = ['_rev', '_createdAt', '_updatedAt']

const publishedId = (id) => id.replace(/^drafts\./, '')

/** Every strong `_ref` in a document, with the path it sits at. */
function strongRefs(value, path = '', out = []) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => strongRefs(v, `${path}[${v?._key ? `_key=="${v._key}"` : i}]`, out))
  } else if (value && typeof value === 'object') {
    if (typeof value._ref === 'string' && !value._weak) out.push({ path, ref: value._ref })
    for (const [k, v] of Object.entries(value)) {
      if (k !== '_ref') strongRefs(v, path ? `${path}.${k}` : k, out)
    }
  }
  return out
}

async function main() {
  console.log(`\n📤  Publish draft-only Solution Styles as Not active (PROD-3093)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const [drafts, publishedStyles] = await Promise.all([
    client.fetch(`*[_type == "solutionStyle" && _id in path("drafts.**") && defined(entityId)]`),
    client.fetch(
      `*[_type == "solutionStyle" && !(_id in path("drafts.**"))]{ _id, "solution": solution._ref, "slug": slug.current }`,
    ),
  ])

  const publishedIds = new Set(publishedStyles.map((d) => d._id))
  const candidates = drafts
    .filter((d) => !publishedIds.has(publishedId(d._id)))
    .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))

  if (!candidates.length) {
    console.log(
      `✅  Nothing to do in dataset=${DATASET} — no draft-only Solution Style with a registry id.\n`,
    )
    return
  }

  // ── Pre-flight: everything a publish would trip over, checked before any write ──
  const refIds = [...new Set(candidates.flatMap((d) => strongRefs(d).map((r) => r.ref)))]
  const existingRefs = new Set(
    await client.fetch(`*[_id in $ids]._id`, { ids: refIds.filter((id) => !id.startsWith('drafts.')) }),
  )
  const slugsTaken = new Set(publishedStyles.map((d) => `${d.solution}::${d.slug}`))
  const seen = new Set()
  const problems = []

  for (const d of candidates) {
    const name = `${d.title ?? d._id} (${d.entityId})`
    if (!d.solution?._ref) problems.push(`${name}: no parent solution`)
    for (const { path, ref } of strongRefs(d)) {
      if (!existingRefs.has(ref)) problems.push(`${name}: ${path} → ${ref} has no published version`)
    }
    const slug = d.slug?.current
    if (!slug) {
      problems.push(`${name}: no slug`)
      continue
    }
    const key = `${d.solution?._ref}::${slug}`
    if (slugsTaken.has(key) || seen.has(key)) {
      problems.push(`${name}: slug "${slug}" is already used under the same solution`)
    }
    seen.add(key)
  }

  console.log(`    ${candidates.length} draft-only Solution Style(s) with a registry id:\n`)
  candidates.forEach((d) =>
    console.log(`     ${d.entityId}  ${d.title ?? publishedId(d._id)}  [${d.status ?? 'no status'} → ${NOT_ACTIVE}]`),
  )
  console.log('')

  if (problems.length) {
    console.error(`❌  ${problems.length} problem(s) — nothing written in dataset=${DATASET}:\n`)
    problems.forEach((p) => console.error(`     ${p}`))
    console.error('')
    process.exit(1)
  }

  if (!apply) {
    console.log(
      `DRY-RUN only (dataset=${DATASET}) — re-run with \`--confirm\` (production also needs \`--yes-production\`) to write.`,
    )
    console.log(`⚠️  Take a dataset export first. Sanity has no undo.\n`)
    return
  }

  let done = 0
  for (let i = 0; i < candidates.length; i += CHUNK) {
    const tx = client.transaction()
    for (const draft of candidates.slice(i, i + CHUNK)) {
      const doc = { ...draft, _id: publishedId(draft._id), status: NOT_ACTIVE }
      for (const k of SYSTEM_KEYS) delete doc[k]
      tx.create(doc)
      tx.delete(draft._id)
    }
    await tx.commit({ visibility: 'sync' })
    done += Math.min(CHUNK, candidates.length - i)
    console.log(`    … ${done}/${candidates.length}`)
  }

  console.log(`\n✅  ${done} Solution Style(s) published as Not active in dataset=${DATASET}.`)
  console.log(`    Re-run to confirm it reports nothing to do.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
