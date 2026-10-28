#!/usr/bin/env node
/**
 * PROD-3206 — move the linked term's definition onto the option as `description`.
 *
 * 239 of the 243 Glossary Terms carry a title character-identical to the single
 * option that points at them. They were never authored as a glossary; they are
 * mirrors, and the prose inside them is option-level copy sitting in a container
 * named for something else. PROD-2779 renders it in the option page hero, so all
 * 243 are live customer-facing text.
 *
 * The words are right and belong on the option. This moves them:
 *
 *   glossaryTerm.definition  →  customizationOption.description
 *
 * Same words, same position on the page once PROD-3207 ships, container renamed.
 * Nothing is deleted — `glossaryTerm.definition` is left exactly as it is, and
 * it stays the hero's source until the front end switches. That is deliberate:
 * the copy exists in two places for the length of the cutover, which is what
 * makes the cutover safe to do in either order and reversible if it is not.
 *
 * ── What it will not do ─────────────────────────────────────────────────────
 *
 * 🔴 It never overwrites a `description` that already has content. Once the
 * content team starts rewriting these — which is the whole point of the move,
 * since Gloss and Matte currently share a verbatim sentence — a re-run must not
 * put the boilerplate back. An option with copy already in `description` is
 * skipped and counted.
 *
 * Reads the definition through
 * `coalesce(glossaryTerm[0]->definition, glossaryTerm->definition)` so it works
 * whether or not `20261028-glossary-term-array` has run yet. Order between the
 * two does not matter.
 *
 * Portable Text `_key`s are carried over as they are. Keys only have to be
 * unique within their own array, so reusing them across documents is correct
 * and keeps a re-run byte-identical.
 *
 * Drafts included (`perspective: 'raw'`).
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 * 🔴 Run it through the register, not the command below:
 *   pnpm sanity:migrate up --dataset <development|production> \
 *     --only 20261028-option-description-from-term --confirm
 *
 * This script's own interface, and the right way to take a dry run:
 *   pnpm --filter @pakfactory/studio run migrate:option-description -- --dataset development
 *   ...                                                               --dataset development --confirm
 *   ...                                                               --dataset production --confirm --yes-production
 *   ...                                                               --dataset production --verify
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
  pnpm --filter @pakfactory/studio run migrate:option-description -- --dataset <development|production> [--confirm] [--yes-production] [--verify]

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

/** Portable Text with no renderable text is not worth copying. */
function hasProse(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) return false
  return blocks.some((b) =>
    Array.isArray(b?.children) ? b.children.some((c) => (c?.text ?? '').trim()) : false,
  )
}

async function main() {
  console.log('\n🔀  glossaryTerm.definition → customizationOption.description (PROD-3206)')
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const docs = await client.fetch(
    `*[_type == "customizationOption"]{
       _id, title, description,
       "termTitle": coalesce(glossaryTerm[0]->term, glossaryTerm->term),
       "definition": coalesce(glossaryTerm[0]->definition, glossaryTerm->definition),
       "isDraft": _id in path("drafts.**")
     } | order(title asc)`,
  )

  if (!docs.length) {
    console.log(`✅  Nothing to do — ${DATASET} holds no customizationOption documents.\n`)
    return
  }

  const withDefinition = docs.filter((d) => hasProse(d.definition))
  const alreadyWritten = withDefinition.filter((d) => hasProse(d.description))
  const toCopy = withDefinition.filter((d) => !hasProse(d.description))
  const noSource = docs.filter((d) => !hasProse(d.definition))

  if (verify) {
    console.log(`Checked ${docs.length} Option(s).`)
    const missing = withDefinition.filter((d) => !hasProse(d.description))
    if (!missing.length) {
      console.log(`✅  Every Option with a linked definition carries a description (${withDefinition.length}).\n`)
      return
    }
    console.error(`❌  ${missing.length} Option(s) have a linked definition but an empty description:`)
    missing.forEach((d) => console.error(`     ${label(d)}  ← ${d.termTitle}`))
    process.exit(1)
  }

  console.log(`${docs.length} Option(s) (drafts included):`)
  console.log(`   definition to copy across   ${toCopy.length}`)
  console.log(`   description already written ${alreadyWritten.length}  (skipped, never overwritten)`)
  console.log(`   no linked definition        ${noSource.length}`)

  if (alreadyWritten.length) {
    console.log('\n⚠️  Skipped — these already hold their own copy, which this must not clobber:')
    alreadyWritten.forEach((d) => console.log(`   • ${label(d)}`))
  }

  if (!toCopy.length) {
    console.log(`\n✅  Nothing to do — every linked definition is already on its Option.\n`)
    return
  }

  const tx = client.transaction()
  for (const d of toCopy) {
    tx.patch(d._id, (patch) => patch.set({ description: d.definition }))
  }

  if (!apply) {
    console.log(`\n${toCopy.length} patch(es) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }

  await tx.commit({ visibility: 'sync' })
  console.log(`\n✍️   Wrote ${toCopy.length} patch(es) to ${DATASET}.`)

  const leftover = await client.fetch(
    `count(*[_type == "customizationOption" &&
       defined(coalesce(glossaryTerm[0]->definition, glossaryTerm->definition)) &&
       !defined(description)])`,
  )
  if (leftover > 0) {
    console.error(`❌  ${leftover} Option(s) still have no description. Re-run with --verify.`)
    process.exit(1)
  }
  console.log('✅  Read back clean — every linked definition is on its Option.\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
