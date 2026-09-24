/**
 * Reshape `customizationType.dependsOn` from a flat list of references into REQUIREMENTS
 * (PROD-2595 follow-up; approved by Eric and Crystal 2026-09-24).
 *
 * The field now holds `[{ _type: 'requirement', anyOf: [reference, …] }]`: every requirement
 * must be met, and a partner in ANY entry of one meets it. The flat shape could not say which
 * deciders are alternatives — Spot Coating needed a paper AND a non-paper finish and was empty
 * everywhere.
 *
 * ── WHAT THIS DOES, AND WHAT IT DELIBERATELY DOES NOT ────────────────────────────
 *
 * Each old reference becomes a requirement of ONE. That is exactly what the flat list meant
 * (every entry required), so no product's answer changes on this run. The regrouping — Spot
 * Coating's three types into one requirement — is the relationship fill's job (backend
 * `depends-on.ts`, one requirement per board frame), run after this. Guessing groups here would
 * put an answer in the data that the board never stated.
 *
 * `_key`s are kept: the reference's own key moves onto its requirement, and the reference
 * inside takes a derived one, so a re-run finds nothing to do.
 *
 * Idempotent: a document whose `dependsOn` already holds only requirements is skipped. A mix of
 * both shapes (an editor saved one row in the new Studio before this ran) converts only the
 * bare references.
 *
 * From repo root (DRY-RUN is the default — prints only, nothing is written):
 * 🔴 Run it through the register, not the commands below:
 *   pnpm sanity:migrate up --dataset <development|production> \
 *     --only 20260924-depends-on-requirements --confirm
 *
 * The script's own interface — what the runner calls, and the right way to take a dry run:
 *   pnpm --filter @pakfactory/studio run migrate:depends-on-requirements -- --dataset development
 *   pnpm --filter @pakfactory/studio run migrate:depends-on-requirements -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run migrate:depends-on-requirements -- --dataset production --confirm --yes-production
 *
 * Requires a WRITE token in repo-root `.env.local` or `apps/studio/.env.local`
 * (`SANITY_API_WRITE_TOKEN` / `SANITY_TOKEN`). A read token cannot --confirm.
 *
 * Processes published documents AND drafts. A patched draft still needs a human to publish it
 * in the Studio — this script never publishes.
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
  pnpm --filter @pakfactory/studio run migrate:depends-on-requirements -- --dataset <development|production> [--confirm] [--yes-production]

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

/** A bare reference entry of the old flat shape. */
const isBareReference = (entry) => entry && typeof entry === 'object' && typeof entry._ref === 'string' && !Array.isArray(entry.anyOf)

/** The old entry → a requirement of one, keeping the entry's `_key` on the requirement. */
function toRequirement(entry, index) {
  const key = entry._key || `req${index}`
  return {
    _key: key,
    _type: 'requirement',
    anyOf: [
      {
        _key: `${key}r`,
        _type: 'reference',
        _ref: entry._ref,
        ...(entry._weak ? { _weak: true } : {}),
        ...(entry._strengthenOnPublish ? { _strengthenOnPublish: entry._strengthenOnPublish } : {}),
      },
    ],
  }
}

async function main() {
  console.log(`\n🔧  dependsOn → requirements (PROD-2595) — ${describeMode({ confirm: apply, dataset: DATASET })}`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET}\n`)

  const docs = await client.fetch(
    `*[_type == "customizationType" && defined(dependsOn)]{ _id, _rev, title, dependsOn, "deps": dependsOn[]->title }`,
  )
  const todo = docs.filter((d) => Array.isArray(d.dependsOn) && d.dependsOn.some(isBareReference))
  const empty = docs.filter((d) => !Array.isArray(d.dependsOn) || d.dependsOn.length === 0).length
  const already = docs.length - todo.length - empty

  if (todo.length === 0) {
    console.log(`✅  Nothing to reshape in dataset=${DATASET} — ${docs.length} Type(s) with dependsOn, all already requirements.`)
    return
  }

  for (const d of todo) {
    const bare = d.dependsOn.filter(isBareReference).length
    const draft = d._id.startsWith('drafts.') ? ' (draft)' : ''
    console.log(`✏️  ${d.title}${draft}: ${bare} reference(s) → ${bare} requirement(s) of one`)
  }
  console.log(`\n${todo.length} Type(s) to reshape · ${already} already requirements · ${empty} with an empty list — dataset=${DATASET}`)

  if (!apply) {
    console.log(`\n🔍  DRY RUN — nothing written to dataset=${DATASET}. Re-run with --confirm to write.`)
    return
  }

  let tx = client.transaction()
  for (const d of todo) {
    const next = d.dependsOn.map((entry, i) => (isBareReference(entry) ? toRequirement(entry, i) : entry))
    tx = tx.patch(d._id, (p) => p.ifRevisionId(d._rev).set({ dependsOn: next }))
  }
  try {
    await tx.commit({ autoGenerateArrayKeys: false })
  } catch (err) {
    console.error(`\n❌  Write failed: ${err.message}\n    Nothing was written (one transaction). Re-run to see what changed.`)
    process.exit(1)
  }
  console.log(`\n✅  ${todo.length} Customization Type(s) reshaped in dataset=${DATASET}.`)
}

main().catch((err) => {
  console.error(`\n❌  ${err.message}`)
  process.exit(1)
})
