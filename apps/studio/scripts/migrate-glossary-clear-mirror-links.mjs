#!/usr/bin/env node
/**
 * PROD-3209 — clear customizationOption.glossaryTerm where the term is a mirror.
 *
 * Step 2 of 3. Run this BEFORE `migrate:glossary-delete-mirrors`, or the delete
 * takes away a term 163 Options still point at.
 *
 * Most Options are not instances of a broader concept. Diecut Window, Nylon Rope
 * Handle and Magnetic Closure have a mirror term today only because a term was
 * created for every Option; there is no *Window* or *Handle* concept above them,
 * and D84 says there should not be — those are shelf labels, not words anybody
 * looks up. Their copy already lives on the Option, so the link is the last
 * thing holding the mirror alive.
 *
 * ── Two conditions, and the second is the one that matters ──────────────────
 *
 * An Option is cleared when its Type is NOT one of the nine AND the term it
 * points at is a mirror (`!defined(group)` — see `lib/glossary-concepts.mjs`).
 *
 * 🔴 Excluding the nine Types is what makes the order between step 1 and step 2
 * not matter. Without it, running this first would strip the 80 links the
 * repoint is about to move and the family information would be gone.
 *
 * 🔴 Requiring the target to be a mirror is what makes this safe to re-run once
 * the second tier of splits is authored — Embossing & Debossing, Color System,
 * Spot UV. Those terms will carry a group, so a link to one is never cleared.
 *
 * Nothing else is touched. An Option with no link is not written to.
 *
 * Drafts included (`perspective: 'raw'`).
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 * 🔴 Run it through the register, not the command below:
 *   pnpm sanity:migrate up --dataset <development|production> \
 *     --only 20261028-glossary-clear-mirror-links --confirm
 *
 * This script's own interface, and the right way to take a dry run:
 *   pnpm --filter @pakfactory/studio run migrate:glossary-clear -- --dataset development
 *   ...                                                           --dataset development --confirm
 *   ...                                                           --dataset production --confirm --yes-production
 *   ...                                                           --dataset production --verify
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'
import { CONCEPT_TYPE_SLUGS, MIRROR_TERM_FILTER, groqList } from './lib/glossary-concepts.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run migrate:glossary-clear -- --dataset <development|production> [--confirm] [--yes-production] [--verify]

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

/** Options outside the nine Types whose first term is a mirror. */
const TO_CLEAR = `*[_type == "customizationOption" &&
  count(glossaryTerm) > 0 &&
  !(type->slug.current in ${groqList(CONCEPT_TYPE_SLUGS)}) &&
  !defined(glossaryTerm[0]->group)
]`

async function main() {
  console.log('\n🧹  Clear customizationOption.glossaryTerm where the term is a mirror (PROD-3209, step 2 of 3)')
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const [toClear, keptOnConcept, mirrorCount] = await Promise.all([
    client.fetch(
      `${TO_CLEAR}{
         _id, title, status,
         "typeTitle": type->title,
         "termTitle": glossaryTerm[0]->term,
         "nTerms": count(glossaryTerm),
         "isDraft": _id in path("drafts.**")
       } | order(typeTitle asc, title asc)`,
    ),
    client.fetch(
      `count(*[_type == "customizationOption" && count(glossaryTerm) > 0 &&
         !(type->slug.current in ${groqList(CONCEPT_TYPE_SLUGS)}) &&
         defined(glossaryTerm[0]->group)])`,
    ),
    client.fetch(`count(*[${MIRROR_TERM_FILTER} && !(_id in path("drafts.**"))])`),
  ])

  if (verify) {
    if (!toClear.length) {
      console.log(`✅  No Option outside the nine Types points at a mirror term.\n`)
      return
    }
    console.error(`❌  ${toClear.length} Option(s) still point at a mirror:`)
    toClear.forEach((o) => console.error(`     ${label(o)}  → ${o.termTitle}`))
    process.exit(1)
  }

  console.log(`${mirrorCount} mirror term(s) published on ${DATASET}.`)
  console.log(`   links to clear          ${toClear.length}`)
  console.log(`   left alone, real term   ${keptOnConcept}  (points at a term carrying a group)`)

  if (!toClear.length) {
    console.log(`\n✅  Nothing to do — no Option outside the nine Types points at a mirror.\n`)
    return
  }

  const byType = new Map()
  for (const o of toClear) {
    const t = o.typeTitle || '(no type)'
    byType.set(t, (byType.get(t) || 0) + 1)
  }
  console.log('\nBy Customization Type:')
  ;[...byType.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .forEach(([t, n]) => console.log(`   ${String(n).padStart(3)}  ${t}`))

  // Two concepts on an Option outside the nine would mean a shape this script
  // did not anticipate; unsetting the field would take both.
  const multi = toClear.filter((o) => o.nTerms > 1)
  if (multi.length) {
    console.error(`\n❌  ${multi.length} of these carry more than one term. Unsetting would drop both:`)
    multi.forEach((o) => console.error(`     ${label(o)}  (${o.nTerms} terms)`))
    console.error('    Resolve them by hand first. Nothing written.')
    process.exit(1)
  }

  const retired = toClear.filter((o) => o.status !== 'active').length
  if (retired) console.log(`\n   ${retired} of the ${toClear.length} are retired. Cleared the same way — their mirror is going too.`)

  const tx = client.transaction()
  for (const o of toClear) {
    tx.patch(o._id, (patch) => patch.unset(['glossaryTerm']))
  }

  if (!apply) {
    console.log(`\n${toClear.length} patch(es) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }

  await tx.commit({ visibility: 'sync' })
  console.log(`\n✍️   Wrote ${toClear.length} patch(es) to ${DATASET}.`)

  const leftover = await client.fetch(`count(${TO_CLEAR})`)
  if (leftover > 0) {
    console.error(`❌  ${leftover} Option(s) still point at a mirror. Re-run with --verify.`)
    process.exit(1)
  }
  console.log('✅  Read back clean — no Option outside the nine Types points at a mirror.\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
