#!/usr/bin/env node
/**
 * Create the nine concept Glossary Terms the option pages collapse into.
 *
 * ── What these are ──────────────────────────────────────────────────────────
 *
 * The 243 Glossary Terms on the dataset today are not glossary entries. Each one
 * mirrors a single Customization Option, character for character — "Gloss
 * Lamination" has a term, "Matte Lamination" has a term — and the prose inside
 * them is option-level copy that `20261028-option-description-from-term` has
 * already moved onto the options themselves. They are duplicates awaiting
 * deletion, not a glossary.
 *
 * A concept term is the opposite: one entry for the thing those options are
 * instances of. Lamination, once, explaining what lamination is — with Gloss,
 * Matte, Soft Touch and the rest appearing on it as derived cards because they
 * point at it through `customizationOption.glossaryTerm`.
 *
 * Nine families earn that treatment. The rest of the 209 active options stay
 * option pages only, because there is no broader concept above them to explain.
 *
 * ── Why this runs before anybody writes a word ──────────────────────────────
 *
 * The remaining migrations — repoint the options that belong to a concept, clear
 * the mirror link on the ones that do not, delete the 243 mirrors — need these
 * documents to EXIST. They do not need them to be good. A term with a name, a
 * slug and a group is a valid repoint target.
 *
 * So this seeds nine empty shells and the content team fills `definition` and
 * `body` on their own schedule. The Studio will show all nine as incomplete,
 * which is correct: they are.
 *
 * 🔴 `/glossary` must NOT go live until those definitions are written. Nine
 * entries with an empty definition is nine thin pages, and the glossary index
 * renders the definition as its row gloss. The route waits for the words; the
 * dataset does not have to.
 *
 * ── A TASK, not a migration ─────────────────────────────────────────────────
 *
 * It creates documents rather than moving a dataset from one shape to the next,
 * so it lives in the TASKS list in the manifest and the bulk runner never picks
 * it up — the same reasoning as `seed:glossary-groups`.
 *
 * Idempotent by construction: ids are derived from the slug and every write is
 * `createIfNotExists`. A re-run after somebody has renamed a term, written its
 * definition or moved it to another group does NOT undo any of that. The team
 * owns these nine once they exist.
 *
 * ── Two collision checks, not one ───────────────────────────────────────────
 *
 * `glossaryTerm` validates BOTH `term` (uniqueTaxonomyTitle, ignoring case and
 * punctuation) and `slug` (uniqueSlugAcross). The write API runs neither, so a
 * seed that matched on id alone would land a silent duplicate that only shows up
 * later as two flagged documents in the Studio. That is exactly what happened to
 * `seed:glossary-groups` on `development` — a hand-made "Materials" with a
 * generated id — so this checks title and slug the way the Studio does and skips
 * anything already claimed.
 *
 * The same lesson is why `group` is resolved by TITLE and never by a hardcoded
 * id: `Materials` on `development` is `00c87367-…`, not `glossaryGroup-materials`.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 *   pnpm --filter @pakfactory/studio run seed:glossary-concept-terms -- --dataset development
 *   ...                                                                --dataset development --confirm
 *   ...                                                                --dataset production --confirm --yes-production
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
  pnpm --filter @pakfactory/studio run seed:glossary-concept-terms -- --dataset <development|production> [--confirm] [--yes-production]

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

/**
 * The nine, with the glossary section each belongs under.
 *
 * `group` is the Glossary Group TITLE, matched the way the Studio matches it.
 * The content team can move any of them afterwards and a re-run will not argue.
 */
const CONCEPTS = [
  { term: 'Paperboard', slug: 'paperboard', group: 'Materials' },
  { term: 'Chipboard', slug: 'chipboard', group: 'Materials' },
  { term: 'Corrugated Board', slug: 'corrugated-board', group: 'Materials' },
  { term: 'Foam', slug: 'foam', group: 'Materials' },
  { term: 'Blister Plastic', slug: 'blister-plastic', group: 'Materials' },
  { term: 'Molded Pulp', slug: 'molded-pulp', group: 'Materials' },
  { term: 'Ink', slug: 'ink', group: 'Printing & Color' },
  { term: 'Lamination', slug: 'lamination', group: 'Finishes' },
  { term: 'Foiling', slug: 'foiling', group: 'Finishes' },
]

/** Same normalisation `uniqueTaxonomyTitle` uses, so this and the Studio agree. */
function comparisonKey(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const idFor = (slug) => `glossaryTerm-${slug}`
const bare = (id) => String(id).replace(/^drafts\./, '')

async function main() {
  console.log('\n🌱  Seed the nine concept Glossary Terms')
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const [groups, terms] = await Promise.all([
    client.fetch(`*[_type == "glossaryGroup"]{ _id, title }`),
    client.fetch(`*[_type == "glossaryTerm"]{ _id, term, "slug": slug.current }`),
  ])

  // ── Resolve groups by title ───────────────────────────────────────────────
  const groupByTitle = new Map(groups.map((g) => [comparisonKey(g.title), g]))
  const missingGroups = [...new Set(CONCEPTS.map((c) => c.group))].filter(
    (t) => !groupByTitle.has(comparisonKey(t)),
  )
  if (missingGroups.length) {
    console.error(`❌  ${missingGroups.length} Glossary Group(s) this seed needs do not exist on ${DATASET}:`)
    missingGroups.forEach((t) => console.error(`     • ${t}`))
    console.error('\n    Run `seed:glossary-groups` first. Nothing written.')
    process.exit(1)
  }

  // ── Work out what is already claimed ──────────────────────────────────────
  const byId = new Map(terms.map((t) => [bare(t._id), t]))
  const byTitle = new Map(terms.map((t) => [comparisonKey(t.term), t]))
  const bySlug = new Map(terms.filter((t) => t.slug).map((t) => [t.slug, t]))

  const planned = CONCEPTS.map((c) => {
    const _id = idFor(c.slug)
    const group = groupByTitle.get(comparisonKey(c.group))
    const titleOwner = byTitle.get(comparisonKey(c.term))
    const slugOwner = bySlug.get(c.slug)
    return {
      ...c,
      _id,
      groupId: group._id,
      present: byId.has(_id),
      titleOwner: titleOwner && bare(titleOwner._id) !== _id ? titleOwner : null,
      slugOwner: slugOwner && bare(slugOwner._id) !== _id ? slugOwner : null,
    }
  })

  const present = planned.filter((c) => c.present)
  const claimed = planned.filter((c) => !c.present && (c.titleOwner || c.slugOwner))
  const toCreate = planned.filter((c) => !c.present && !c.titleOwner && !c.slugOwner)

  console.log(`${CONCEPTS.length} concept term(s) in this seed:`)
  console.log(`   to create       ${toCreate.length}`)
  console.log(`   already present ${present.length}  (left exactly as they are — renames, definitions, group moves included)`)

  if (claimed.length) {
    console.log(`\n⚠️  ${claimed.length} would duplicate a term that already exists. Skipped, NOT created:`)
    claimed.forEach((c) => {
      const owner = c.titleOwner || c.slugOwner
      const why = c.titleOwner ? 'same name' : 'same slug'
      console.log(`   • ${c.term}   (${why} as "${owner.term}", ${owner._id})`)
    })
    console.log('    Point the repoint migration at those instead, or rename them first.')
  }

  if (!toCreate.length) {
    console.log(`\n✅  Nothing to do — every concept term already exists on ${DATASET}.\n`)
    return
  }

  console.log('\nWill create, with an empty definition and body for the content team:')
  toCreate.forEach((c) => console.log(`   • ${c.term.padEnd(18)} /glossary/${c.slug.padEnd(18)} ${c.group}`))

  if (!apply) {
    console.log(`\n${toCreate.length} document(s) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }

  const tx = client.transaction()
  for (const c of toCreate) {
    tx.createIfNotExists({
      _id: c._id,
      _type: 'glossaryTerm',
      term: c.term,
      slug: { _type: 'slug', current: c.slug },
      group: { _type: 'reference', _ref: c.groupId },
    })
  }
  await tx.commit({ visibility: 'sync' })

  console.log(`\n✍️   Created ${toCreate.length} on ${DATASET}.`)

  const leftover = await client.fetch(
    `count(*[_type == "glossaryTerm" && _id in $ids])`,
    { ids: toCreate.map((c) => c._id) },
  )
  if (leftover !== toCreate.length) {
    console.error(`❌  Read back ${leftover} of ${toCreate.length}. Re-run to see what is missing.`)
    process.exit(1)
  }
  console.log('✅  Read back clean. `definition` and `body` are empty on purpose — the Studio will flag them as incomplete.\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
