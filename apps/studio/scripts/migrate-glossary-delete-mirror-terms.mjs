#!/usr/bin/env node
/**
 * PROD-3209 — delete the mirror Glossary Terms.
 *
 * Step 3 of 3, and the only destructive one. Steps 1 and 2 must both have run:
 * this REFUSES to delete a term anything still references, so an unrun step
 * stops it rather than breaking the dataset.
 *
 * ── What is being deleted, and why it is safe ───────────────────────────────
 *
 * 243 Glossary Terms that each mirror a single Customization Option — same
 * title, option-level prose inside. `20261028-option-description-from-term`
 * already copied that prose to `customizationOption.description`, which is
 * where it belongs and where the front end reads it from after PROD-3207. The
 * words survive; the container goes.
 *
 * A mirror is a Glossary Term with no `group` (see `lib/glossary-concepts.mjs`).
 * Exact today: the nine concepts carry a group, the 243 mirrors do not.
 *
 * ── Three guards ────────────────────────────────────────────────────────────
 *
 * 🔴 Nothing referenced is deleted. Every candidate is checked against the whole
 * dataset, and one surviving reference aborts the run before a single document
 * is removed. That is what makes running this out of order a refusal rather
 * than 243 broken links.
 *
 * 🔴 Nothing with prose the Option did not receive is deleted. A mirror whose
 * `definition` never reached its Option would take live copy with it, so it is
 * reported and the run stops. Expected count: zero — the copy migration read
 * back clean on 243 of 243.
 *
 * 🔴 Drafts go with their published document. A draft left behind reappears in
 * the Studio as an orphan nobody can publish, so `drafts.X` is deleted whenever
 * `X` is.
 *
 * ⚠️ There is no undo. Take a dataset export first:
 *   npx sanity dataset export <dataset> ./backup.tar.gz
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 * 🔴 Run it through the register, not the command below:
 *   pnpm sanity:migrate up --dataset <development|production> \
 *     --only 20261028-glossary-delete-mirror-terms --confirm
 *
 * This script's own interface, and the right way to take a dry run:
 *   pnpm --filter @pakfactory/studio run migrate:glossary-delete-mirrors -- --dataset development
 *   ...                                                                    --dataset development --confirm
 *   ...                                                                    --dataset production --confirm --yes-production
 *   ...                                                                    --dataset production --verify
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'
import { MIRROR_TERM_FILTER, bareId } from './lib/glossary-concepts.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run migrate:glossary-delete-mirrors -- --dataset <development|production> [--confirm] [--yes-production] [--verify]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually delete. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.
  --verify          Read-only. Re-read and report what remains; writes nothing.`

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

/** Portable Text with no renderable text is not copy anybody loses. */
function hasProse(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) return false
  return blocks.some((b) =>
    Array.isArray(b?.children) ? b.children.some((c) => (c?.text ?? '').trim()) : false,
  )
}

/**
 * The rendered words, whitespace collapsed. Guard 2 compares prose to prose, so
 * this is what both sides are reduced to before they are matched.
 */
function proseKey(blocks) {
  if (!Array.isArray(blocks)) return ''
  return blocks
    .flatMap((b) => (Array.isArray(b?.children) ? b.children.map((c) => c?.text ?? '') : []))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  console.log('\n🗑️   Delete the mirror Glossary Terms (PROD-3209, step 3 of 3)')
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const mirrors = await client.fetch(
    `*[${MIRROR_TERM_FILTER}]{
       _id, term, definition,
       "isDraft": _id in path("drafts.**"),
       "refs": *[references(^._id)]{ _id, _type, "title": coalesce(title, term, name) }
     } | order(term asc)`,
  )

  const survivors = await client.fetch(
    `count(*[_type == "glossaryTerm" && defined(group) && !(_id in path("drafts.**"))])`,
  )

  if (!mirrors.length) {
    console.log(`✅  Nothing to do — ${DATASET} holds no mirror terms. ${survivors} Glossary Term(s) remain.\n`)
    return
  }

  const published = mirrors.filter((m) => !m.isDraft)
  const drafts = mirrors.filter((m) => m.isDraft)

  if (verify) {
    console.error(`❌  ${mirrors.length} mirror term(s) still on ${DATASET} (${published.length} published, ${drafts.length} draft).`)
    process.exit(1)
  }

  console.log(`${mirrors.length} mirror term(s): ${published.length} published, ${drafts.length} draft.`)
  console.log(`   Glossary Terms that survive   ${survivors}`)

  // ── Guard 1 — anything still pointing here ────────────────────────────────
  // A draft's references resolve against its published id, so both are checked
  // under one identity.
  const refsById = new Map()
  for (const m of mirrors) {
    const id = bareId(m._id)
    const seen = refsById.get(id) || []
    for (const r of m.refs || []) {
      if (!seen.some((s) => s._id === r._id)) seen.push(r)
    }
    refsById.set(id, seen)
  }
  const stillReferenced = [...refsById.entries()].filter(([, refs]) => refs.length)

  if (stillReferenced.length) {
    const total = stillReferenced.reduce((n, [, refs]) => n + refs.length, 0)
    console.error(`\n❌  ${stillReferenced.length} mirror term(s) are still referenced by ${total} document(s).`)
    console.error('    Steps 1 and 2 have not both run. NOTHING DELETED.\n')
    stillReferenced.slice(0, 20).forEach(([id, refs]) => {
      const term = mirrors.find((m) => bareId(m._id) === id)
      console.error(`     ${term?.term || id}`)
      refs.slice(0, 4).forEach((r) => console.error(`        ← ${r._type}  ${r.title || r._id}`))
      if (refs.length > 4) console.error(`        … and ${refs.length - 4} more`)
    })
    if (stillReferenced.length > 20) console.error(`     … and ${stillReferenced.length - 20} more terms`)
    console.error('\n    Run `migrate:glossary-repoint` and `migrate:glossary-clear` first.')
    process.exit(1)
  }

  // ── Guard 2 — prose that never reached an Option ──────────────────────
  //
  // Matched on the prose itself, not on the title. Two reasons.
  //
  // `migrate:option-description` copied the words through the REFERENCE, so the
  // question that protects the copy is "are these words on an Option", not "is
  // there an Option with the same name". Four of the 243 never shared a title
  // with the Option they fed, and a rename would break the title test on any of
  // the rest.
  //
  // 🔴 The first version asked it in GROQ as
  // `count(*[_type == "customizationOption" && lower(title) == lower(^.term)]) == 0`
  // and got 0 for every term, failing all 243 over copy that had demonstrably
  // already moved. `lower()` applied to a `^`-scoped attribute inside a nested
  // filter does not resolve: `title == ^.term` works, `lower(title) ==
  // lower($param)` works, the two together silently do not. Comparing in JS
  // sidesteps it. Do not move this back into GROQ.
  const withProse = published.filter((m) => hasProse(m.definition))
  if (withProse.length) {
    const descriptions = await client.fetch(
      `*[_type == "customizationOption" && defined(description)].description`,
    )
    const carried = new Set(descriptions.map(proseKey).filter(Boolean))
    const orphaned = withProse.filter((m) => !carried.has(proseKey(m.definition)))

    if (orphaned.length) {
      console.error(`\n❌  ${orphaned.length} mirror term(s) hold prose that no Option carries.`)
      console.error('    Deleting them would lose copy. NOTHING DELETED.\n')
      orphaned.slice(0, 25).forEach((m) => console.error(`     • ${m.term}`))
      if (orphaned.length > 25) console.error(`     … and ${orphaned.length - 25} more`)
      console.error('\n    Run `migrate:option-description` first, or move the copy by hand.')
      process.exit(1)
    }
    console.log(`   definitions already carried by an Option   ${withProse.length}  (checked, safe to drop)`)
  }

  console.log('\nWill delete (first 15 shown):')
  mirrors.slice(0, 15).forEach((m) => console.log(`   • ${m.term || m._id}${m.isDraft ? '  (draft)' : ''}`))
  if (mirrors.length > 15) console.log(`   … and ${mirrors.length - 15} more`)

  if (!apply) {
    console.log(`\n${mirrors.length} document(s) pending deletion on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).`)
    console.log('⚠️  There is no undo. Export the dataset before the confirmed run.\n')
    return
  }

  // Delete the draft alongside its published document, so nothing is orphaned.
  const ids = new Set()
  for (const m of mirrors) {
    ids.add(m._id)
    if (!m.isDraft) ids.add(`drafts.${m._id}`)
  }

  const tx = client.transaction()
  for (const id of ids) tx.delete(id)
  await tx.commit({ visibility: 'sync' })

  console.log(`\n✍️   Deleted ${mirrors.length} mirror term(s) from ${DATASET}.`)

  const [leftover, remaining] = await Promise.all([
    client.fetch(`count(*[${MIRROR_TERM_FILTER}])`),
    client.fetch(`count(*[_type == "glossaryTerm" && !(_id in path("drafts.**"))])`),
  ])
  if (leftover > 0) {
    console.error(`❌  ${leftover} mirror term(s) remain. Re-run with --verify.`)
    process.exit(1)
  }
  console.log(`✅  Read back clean — no mirror terms left. ${remaining} Glossary Term(s) on ${DATASET}.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
