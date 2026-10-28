#!/usr/bin/env node
/**
 * PROD-3209 — repoint customizationOption.glossaryTerm from its mirror to its concept.
 *
 * Step 1 of 3. Run this BEFORE `migrate:glossary-delete-mirrors`, or the delete
 * takes away the term these Options still point at.
 *
 *   before   Gloss Lamination  →  "Gloss Lamination" (a mirror of itself)
 *   after    Gloss Lamination  →  "Lamination"       (the concept)
 *
 * ── The mapping is a rule ───────────────────────────────────────────────────
 *
 * The nine concepts are nine Customization Types, one-to-one, so an Option's
 * concept is decided by its `type`. See `lib/glossary-concepts.mjs`. Nothing is
 * matched on title — a title search finds none of this, because no Option
 * contains the word "paperboard"; they are FBB, URB, SBS, Metallic Board.
 *
 * ⚠️ Retired Options are repointed too, not skipped. Five of the 80 are
 * `not-active` — Digital Foiling, Anti-Fog / Biodegradable / Leather Lamination,
 * Wheat Straw Pulp — and they still hold a link to a mirror that step 3 deletes.
 * Skipping them leaves five dangling references nobody would see, because every
 * derived block filters on OPTION_ACTIVE and these never render. They cost
 * nothing to carry and are correct the day one is switched back on.
 *
 * ── What it will not do ─────────────────────────────────────────────────────
 *
 * 🔴 It never ADDS a link to an Option that has none. An Option of one of the
 * nine Types with an empty `glossaryTerm` is reported, not written: deciding
 * that it belongs to the concept is authoring, and this migration moves data it
 * was given rather than inventing data it was not. All 80 have a link today, so
 * the report is empty — it exists for the Option added next month.
 *
 * 🔴 It never overwrites an Option already carrying TWO concepts. Hybrid Color
 * is deliberately CMYK and Pantone; setting the array would silently drop one.
 * None of the 80 is in that state today and all of them hold exactly one
 * reference, but the guard is what makes that safe to re-run after the second
 * tier of splits lands.
 *
 * Drafts included (`perspective: 'raw'`) — publishing a stale draft would
 * otherwise restore a link to a term that no longer exists.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 * 🔴 Run it through the register, not the command below:
 *   pnpm sanity:migrate up --dataset <development|production> \
 *     --only 20261028-glossary-repoint-concepts --confirm
 *
 * This script's own interface, and the right way to take a dry run:
 *   pnpm --filter @pakfactory/studio run migrate:glossary-repoint -- --dataset development
 *   ...                                                             --dataset development --confirm
 *   ...                                                             --dataset production --confirm --yes-production
 *   ...                                                             --dataset production --verify
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'
import {
  TYPE_TO_CONCEPT,
  CONCEPT_TYPE_SLUGS,
  CONCEPT_TERM_SLUGS,
  keyFor,
  bareId,
  groqList,
} from './lib/glossary-concepts.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run migrate:glossary-repoint -- --dataset <development|production> [--confirm] [--yes-production] [--verify]

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

async function main() {
  console.log('\n🔀  customizationOption.glossaryTerm → its concept (PROD-3209, step 1 of 3)')
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const [concepts, options] = await Promise.all([
    client.fetch(
      `*[_type == "glossaryTerm" && slug.current in ${groqList(CONCEPT_TERM_SLUGS)} &&
         !(_id in path("drafts.**"))]{ _id, term, "slug": slug.current }`,
    ),
    client.fetch(
      `*[_type == "customizationOption" && type->slug.current in ${groqList(CONCEPT_TYPE_SLUGS)}]{
         _id, title, status, glossaryTerm,
         "typeSlug": type->slug.current,
         "isDraft": _id in path("drafts.**")
       } | order(title asc)`,
    ),
  ])

  // ── The nine must all exist before anything is repointed ──────────────────
  const conceptBySlug = new Map(concepts.map((c) => [c.slug, c]))
  const missing = CONCEPT_TERM_SLUGS.filter((s) => !conceptBySlug.has(s))
  if (missing.length) {
    console.error(`❌  ${missing.length} concept Glossary Term(s) do not exist on ${DATASET}:`)
    missing.forEach((s) => console.error(`     • /glossary/${s}`))
    console.error('\n    Run `seed:glossary-concept-terms` first. Nothing written.')
    process.exit(1)
  }

  const targetFor = (o) => conceptBySlug.get(TYPE_TO_CONCEPT[o.typeSlug])

  const linked = options.filter((o) => Array.isArray(o.glossaryTerm) && o.glossaryTerm.length)
  const unlinked = options.filter((o) => !Array.isArray(o.glossaryTerm) || !o.glossaryTerm.length)

  // Never clobber a deliberate second concept, and never guess at a shape this
  // script did not write.
  const multi = linked.filter((o) => o.glossaryTerm.length > 1)
  const single = linked.filter((o) => o.glossaryTerm.length === 1)
  const unreadable = single.filter((o) => typeof o.glossaryTerm[0]?._ref !== 'string')
  if (unreadable.length) {
    console.error(`❌  ${unreadable.length} Option(s) hold a glossaryTerm this script cannot read:`)
    unreadable.forEach((o) => console.error(`     ${o._id}  ${JSON.stringify(o.glossaryTerm)}`))
    console.error('    Expected an array of reference objects. Nothing written.')
    process.exit(1)
  }

  const done = single.filter((o) => bareId(o.glossaryTerm[0]._ref) === targetFor(o)._id)
  const toRepoint = single.filter((o) => bareId(o.glossaryTerm[0]._ref) !== targetFor(o)._id)

  if (verify) {
    console.log(`Checked ${options.length} Option(s) across the nine Types.`)
    if (!toRepoint.length && !multi.length) {
      console.log(`✅  Every linked Option points at its concept (${done.length}).\n`)
      return
    }
    if (toRepoint.length) {
      console.error(`❌  ${toRepoint.length} Option(s) still point elsewhere:`)
      toRepoint.forEach((o) => console.error(`     ${label(o)}  → ${o.glossaryTerm[0]._ref}`))
    }
    if (multi.length) {
      console.error(`❌  ${multi.length} Option(s) hold more than one concept and were never repointed:`)
      multi.forEach((o) => console.error(`     ${label(o)}`))
    }
    process.exit(1)
  }

  console.log(`${options.length} Option(s) across the nine Types (drafts included):`)
  console.log(`   to repoint              ${toRepoint.length}`)
  console.log(`   already on the concept  ${done.length}`)
  console.log(`   no link to move         ${unlinked.length}  (reported, never written)`)
  if (multi.length) console.log(`   two concepts already    ${multi.length}  (skipped, never overwritten)`)

  const byConcept = new Map()
  for (const o of toRepoint) {
    const slug = TYPE_TO_CONCEPT[o.typeSlug]
    if (!byConcept.has(slug)) byConcept.set(slug, [])
    byConcept.get(slug).push(o)
  }
  if (byConcept.size) {
    console.log('\nBy concept:')
    for (const slug of CONCEPT_TERM_SLUGS) {
      const group = byConcept.get(slug)
      if (!group) continue
      const retired = group.filter((o) => o.status !== 'active').length
      const suffix = retired ? `   (${retired} retired, repointed anyway)` : ''
      console.log(`   ${String(group.length).padStart(3)} → ${slug}${suffix}`)
    }
  }

  if (unlinked.length) {
    console.log('\n⚠️  These sit in one of the nine Types but carry no concept. Linking one is')
    console.log('    authoring, not migration, so they are left alone — set them in the Studio:')
    unlinked.forEach((o) => console.log(`   • ${label(o)}   (${o.typeSlug})`))
  }

  if (multi.length) {
    console.log('\n⚠️  Skipped — these already carry two concepts, which this must not flatten:')
    multi.forEach((o) => console.log(`   • ${label(o)}`))
  }

  if (!toRepoint.length) {
    console.log(`\n✅  Nothing to do — every linked Option already points at its concept.\n`)
    return
  }

  const tx = client.transaction()
  for (const o of toRepoint) {
    const target = targetFor(o)
    tx.patch(o._id, (patch) =>
      patch.set({
        glossaryTerm: [{ _type: 'reference', _ref: target._id, _key: keyFor(target._id) }],
      }),
    )
  }

  if (!apply) {
    console.log(`\n${toRepoint.length} patch(es) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }

  await tx.commit({ visibility: 'sync' })
  console.log(`\n✍️   Wrote ${toRepoint.length} patch(es) to ${DATASET}.`)

  const leftover = await client.fetch(
    `count(*[_type == "customizationOption" &&
       type->slug.current in ${groqList(CONCEPT_TYPE_SLUGS)} &&
       count(glossaryTerm) == 1 &&
       !(glossaryTerm[0]->slug.current in ${groqList(CONCEPT_TERM_SLUGS)})])`,
  )
  if (leftover > 0) {
    console.error(`❌  ${leftover} Option(s) still point outside the nine. Re-run with --verify.`)
    process.exit(1)
  }
  console.log('✅  Read back clean — every singly-linked Option in the nine Types points at its concept.\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
