#!/usr/bin/env node
/**
 * PROD-3206 — create the Glossary Group documents the index is sectioned by.
 *
 * `glossaryTerm.group` was a hardcoded list of five values, set on 0 of 243
 * terms. The content team then proposed twelve different ones, which is the
 * argument for a document type over an enum: the list changed once before
 * anyone had filled it, and a list in the schema means a deploy every time it
 * changes again.
 *
 * This creates the twelve they proposed. After that the list is theirs — adding
 * or renaming a group is Studio work and this script is not re-run for it.
 *
 * ── A TASK, not a migration ─────────────────────────────────────────────────
 *
 * It creates documents rather than moving a dataset from one shape to the next,
 * so it lives in the TASKS list in the manifest and the bulk runner never picks
 * it up. Seeds swept into a bulk `up` are how a seed gets re-run over live
 * content.
 *
 * Idempotent by construction: ids are derived from the title, and every write
 * is `createIfNotExists`. A re-run after someone has renamed a group in the
 * Studio does NOT undo the rename — the document already exists under that id,
 * so it is left alone. That is wanted. The team owns this list once it is
 * seeded.
 *
 * 🔴 It does not point any term at any group. Which group a term belongs to is
 * authoring, decided per term as each one is written.
 *
 * ⚠️ About half of these have no terms in them at launch — Packaging Basics,
 * Packaging Products, Ordering & Logistics, Testing & Quality, Certifications &
 * Compliance, Sustainability. They are seeded anyway, because the index renders
 * only groups that have entries; an empty group is not a section. The list is
 * shaped for 150 terms and costs nothing at 40.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/studio run seed:glossary-groups -- --dataset development
 *   ...                                                         --dataset development --confirm
 *   ...                                                         --dataset production --confirm --yes-production
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
  pnpm --filter @pakfactory/studio run seed:glossary-groups -- --dataset <development|production> [--confirm] [--yes-production]

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

/** The twelve, in the order the content team listed them. */
const GROUPS = [
  'Packaging Basics',
  'Packaging Products',
  'Structure & Features',
  'Materials',
  'Printing & Color',
  'Finishes',
  'Design & Artwork',
  'Manufacturing',
  'Ordering & Logistics',
  'Testing & Quality',
  'Certifications & Compliance',
  'Sustainability',
]

/**
 * Same normalisation `uniqueTaxonomyTitle` uses, so this script and the Studio's
 * duplicate rule agree on what counts as the same group. Without it the seed
 * matches on id alone and creates a second "Materials" beside one somebody made
 * by hand — the API does not run validation, so the duplicate lands silently and
 * only shows up as two documents flagged in the Studio afterwards.
 */
function comparisonKey(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Derived so the id is stable across runs and datasets. */
function idFor(title) {
  return `glossaryGroup-${title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`
}

async function main() {
  console.log('\n🌱  Seed Glossary Groups (PROD-3206)')
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const planned = GROUPS.map((title) => ({ _id: idFor(title), title }))

  const existing = await client.fetch(
    `*[_type == "glossaryGroup"]{ _id, title }`,
  )
  const existingIds = new Set(existing.map((d) => d._id.replace(/^drafts\./, '')))
  const byTitle = new Map(existing.map((d) => [comparisonKey(d.title), d]))

  const present = planned.filter((g) => existingIds.has(g._id))
  // Matched by title rather than id: a group someone created by hand has a
  // generated id, so an id check alone would create a duplicate of it.
  const claimed = planned.filter(
    (g) => !existingIds.has(g._id) && byTitle.has(comparisonKey(g.title)),
  )
  const toCreate = planned.filter(
    (g) => !existingIds.has(g._id) && !byTitle.has(comparisonKey(g.title)),
  )

  // A group someone added that is not in this seed at all is theirs, not drift.
  const extra = existing.filter(
    (d) =>
      !planned.some(
        (g) =>
          g._id === d._id.replace(/^drafts\./, '') ||
          comparisonKey(g.title) === comparisonKey(d.title),
      ),
  )

  console.log(`${GROUPS.length} group(s) in this seed:`)
  console.log(`   to create       ${toCreate.length}`)
  console.log(`   already present ${present.length}  (left exactly as they are, renames included)`)
  if (claimed.length) {
    console.log(`\n   ${claimed.length} already exist under a different id — skipped, NOT duplicated:`)
    claimed.forEach((g) =>
      console.log(`   • ${g.title}   (existing ${byTitle.get(comparisonKey(g.title))._id})`),
    )
  }
  if (extra.length) {
    console.log(`\n   ${extra.length} further group(s) exist that this seed did not create — left alone:`)
    extra.forEach((d) => console.log(`   • ${d.title || d._id}`))
  }

  if (!toCreate.length) {
    console.log(`\n✅  Nothing to do — all twelve already exist on ${DATASET}.\n`)
    return
  }

  console.log('\nWill create:')
  toCreate.forEach((g) => console.log(`   • ${g.title}   (${g._id})`))

  if (!apply) {
    console.log(`\n${toCreate.length} document(s) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }

  const tx = client.transaction()
  for (const g of toCreate) {
    tx.createIfNotExists({ _id: g._id, _type: 'glossaryGroup', title: g.title })
  }
  await tx.commit({ visibility: 'sync' })

  const count = await client.fetch(`count(*[_type == "glossaryGroup"])`)
  console.log(`\n✍️   Created ${toCreate.length}. ${DATASET} now holds ${count} Glossary Group(s).\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
