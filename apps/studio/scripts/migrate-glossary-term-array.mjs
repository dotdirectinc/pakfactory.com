#!/usr/bin/env node
/**
 * PROD-3206 — wrap `customizationOption.glossaryTerm` into an array.
 *
 * The field went from `reference` to `reference[]` because an option can
 * genuinely belong to two concepts: Hybrid Color is CMYK *and* Pantone,
 * Textured Embossing & Debossing is both. Every stored value is still a single
 * reference object, so this moves the data to the shape the schema now expects.
 *
 *   before   glossaryTerm: { _type: 'reference', _ref: 'glossaryTerm-…' }
 *   after    glossaryTerm: [{ _type: 'reference', _ref: 'glossaryTerm-…', _key: '…' }]
 *
 * ── Run this in the SAME deploy as the schema change ────────────────────────
 *
 * Until it runs, an option that carries a concept shows "Invalid property value"
 * in the Studio — the value is a reference where the schema wants an array. The
 * data is intact and the warning is cosmetic, but it is on every option that has
 * a concept, so editors will report it.
 *
 * 🔴 Do NOT let anyone press "Reset value" on that warning. It deletes the
 * reference, and these 243 links are what the later migration repoints.
 *
 * The reading side is already safe either way: the six projections in
 * `packages/sanity/src/queries/catalog.ts` ask
 * `coalesce(glossaryTerm[0]->definition, glossaryTerm->definition)`, so the
 * detail-page hero renders whichever shape it finds. That fallback exists
 * because the code and the data are deployed by different people on different
 * schedules — delete it once every dataset has been through this script.
 *
 * ── Why the key is derived rather than random ───────────────────────────────
 *
 * Array items need a `_key`. A random one would make every dry run print a
 * different patch and every re-run look like a change, so the key is derived
 * from the reference id: the same input always produces the same array, which
 * is what makes this idempotent in the way the register expects.
 *
 * Drafts included (`perspective: 'raw'`) — publishing a stale draft would
 * otherwise restore the single-reference shape on a document already fixed.
 *
 * Nothing is deleted and nothing is repointed. An option keeps exactly the
 * concept it had; only the container changes. The repoint, the clear and the
 * mirror-term deletion are a separate migration that cannot run until the nine
 * concept terms are authored.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 * 🔴 Run it through the register, not the command below:
 *   pnpm sanity:migrate up --dataset <development|production> \
 *     --only 20261028-glossary-term-array --confirm
 *
 * `migrate.mjs` writes the ledger row; this script does not. See MIGRATIONS.md.
 *
 * This script's own interface, and the right way to take a dry run:
 *   pnpm --filter @pakfactory/studio run migrate:glossary-term-array -- --dataset development
 *   ...                                                                --dataset development --confirm
 *   ...                                                                --dataset production --confirm --yes-production
 *   ...                                                                --dataset production --verify
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
  pnpm --filter @pakfactory/studio run migrate:glossary-term-array -- --dataset <development|production> [--confirm] [--yes-production] [--verify]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.
  --verify          Read-only. Re-read and compare values; writes nothing.`

const args = parseScriptArgs({ usage: USAGE, flags: ['verify'] })
const { confirm: apply, verify } = args

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

const label = (d) => `${d.title || d._id}${d.isDraft ? ' (draft)' : ''}`

/** Deterministic, so a re-run produces the identical array. */
function keyFor(ref) {
  return `gt-${String(ref).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`
}

function wrap(ref) {
  return [{ _type: 'reference', _ref: ref, _key: keyFor(ref) }]
}

async function main() {
  console.log('\n🔀  customizationOption.glossaryTerm → reference[] (PROD-3206)')
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const docs = await client.fetch(
    `*[_type == "customizationOption"]{
       _id, title, glossaryTerm,
       "isDraft": _id in path("drafts.**")
     } | order(title asc)`,
  )

  if (!docs.length) {
    console.log(`✅  Nothing to do — ${DATASET} holds no customizationOption documents.\n`)
    return
  }

  const empty = docs.filter((d) => d.glossaryTerm == null)
  const already = docs.filter((d) => Array.isArray(d.glossaryTerm))
  const single = docs.filter(
    (d) => d.glossaryTerm != null && !Array.isArray(d.glossaryTerm),
  )

  // A value that is neither null, an array, nor a reference object is something
  // this script has no business guessing at.
  const unplaceable = single.filter((d) => typeof d.glossaryTerm?._ref !== 'string')
  if (unplaceable.length) {
    console.error(`❌  ${unplaceable.length} Option(s) hold a glossaryTerm this script cannot read:`)
    unplaceable.forEach((d) =>
      console.error(`     ${d._id}  ${label(d)}  ${JSON.stringify(d.glossaryTerm)}`),
    )
    console.error('    Expected either a reference object or an array. Nothing written.')
    process.exit(1)
  }

  // Dangling references are reported, not fixed. Wrapping one is still correct —
  // the shape is what changes — but a concept that no longer exists is worth
  // knowing about before the repoint migration tries to use it.
  const refIds = [...new Set(single.map((d) => d.glossaryTerm._ref))]
  const liveIds = refIds.length
    ? await client.fetch(`*[_type == "glossaryTerm" && _id in $ids]._id`, { ids: refIds })
    : []
  const liveSet = new Set(liveIds.map((id) => id.replace(/^drafts\./, '')))
  const dangling = single.filter((d) => !liveSet.has(d.glossaryTerm._ref.replace(/^drafts\./, '')))

  if (verify) {
    console.log(`Checked ${docs.length} Option(s).`)
    if (!single.length) {
      console.log(`✅  Every glossaryTerm is an array (${already.length} set, ${empty.length} empty).\n`)
      return
    }
    console.error(`❌  ${single.length} Option(s) still hold a single reference:`)
    single.forEach((d) => console.error(`     ${label(d)}  → ${d.glossaryTerm._ref}`))
    process.exit(1)
  }

  console.log(`${docs.length} Option(s) (drafts included):`)
  console.log(`   single reference → wrap   ${single.length}`)
  console.log(`   already an array          ${already.length}`)
  console.log(`   empty, left alone         ${empty.length}`)

  if (dangling.length) {
    console.log(`\n⚠️  ${dangling.length} point at a Glossary Term that does not exist. Wrapped anyway —`)
    console.log('    the shape is what changes here — but worth clearing before the repoint:')
    dangling.forEach((d) => console.log(`   • ${label(d)}  → ${d.glossaryTerm._ref}`))
  }

  if (!single.length) {
    console.log(`\n✅  Nothing to do — ${DATASET} is already on the array shape.\n`)
    return
  }

  const tx = client.transaction()
  for (const d of single) {
    tx.patch(d._id, (patch) => patch.set({ glossaryTerm: wrap(d.glossaryTerm._ref) }))
  }

  if (!apply) {
    console.log(`\n${single.length} patch(es) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }

  // `visibility: 'sync'` — an async commit returns before the dataset settles,
  // so the read-back below would report success either way.
  await tx.commit({ visibility: 'sync' })
  console.log(`\n✍️   Wrote ${single.length} patch(es) to ${DATASET}.`)

  const leftover = await client.fetch(
    `count(*[_type == "customizationOption" && defined(glossaryTerm) && !(glossaryTerm[0]._ref match "*")])`,
  )
  if (leftover > 0) {
    console.error(`❌  ${leftover} Option(s) still do not read as an array. Re-run with --verify.`)
    process.exit(1)
  }
  console.log('✅  Read back clean — every glossaryTerm is an array.\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
