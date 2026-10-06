#!/usr/bin/env node
/**
 * PROD-2845 — one `status` replaces `customerFacing` and `hasPage`.
 *
 *   product (standard)   customerFacing: false  →  active-internal
 *   product (inspiration) customerFacing: false  →  not-active
 *   productLine / productStyle  customerFacing: false  →  active-internal
 *   solution             hasPage: true   →  active
 *   solution             hasPage: false  →  not-active
 *   solutionStyle / customizationCategory / customizationType  (unset)  →  active
 *
 * Everything already customer-facing keeps the status it has, INCLUDING unset:
 * 13 production lines carry no status and read as active, and this must not change
 * that. The old keys are then unset, the way PROD-2538 unset the fields it retired.
 *
 * ── Why the two off states are not interchangeable ──────────────────────────
 *
 * `active-internal` is hidden but still works as STRUCTURE: its children keep their
 * own status, it still answers as a catalog filter, it is still a valid `basedOn`
 * target. `not-active` takes its children down with it. Every document this script
 * sets to active-internal is one that something else depends on — all 6 hidden
 * standard products on production have exactly one inspiration product based on
 * them, and both hidden lines are specialty lines whose products stay on sale.
 *
 * 🔴 Inspiration products get `not-active` instead, because Active (Internal) is
 * rejected on `kind == "inspiration"` — nothing is ever based on a preset, so the
 * value has no job there. Production has 0 such documents; development has 127.
 *
 * ── 🔴 THE SOLUTION ROW IS A COMMERCIAL DECISION, NOT A DATA TIDY-UP ────────
 *
 * 18 production solutions have no page. They carry 21 product tags and 14 client
 * tags, 10 of those on case studies. Setting them `not-active` stops every one of
 * those chips rendering. The content team reassigns or retires them BEFORE or WITH
 * this run — "no industry chip" is already a supported state, so dropping one is
 * valid where no honest reassignment exists.
 *
 * ── ⚠️ Deploy ordering ──────────────────────────────────────────────────────
 *
 * 🔴 MUST land in the same deploy as the schema change. `customerFacing` read
 * unset-as-visible while `status` whitelists, so a gap between them makes hidden
 * documents briefly PUBLIC. Schema first then data, with no release in between.
 *
 * Drafts included (`perspective: 'raw'`) — publishing a stale draft would otherwise
 * restore a removed field on a document this script had already fixed.
 * Idempotent: re-running writes the same values.
 *
 * `--verify` re-reads the dataset and compares VALUES, not counts. Transactions can
 * return before the dataset settles, so a script's own closing tally is not evidence.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 * 🔴 Run it through the register, not the command below:
 *   pnpm sanity:migrate up --dataset <development|production> \
 *     --only 20261005-status-unification --confirm
 *
 * The invocation below is this script's own interface, and is still the right way
 * to take a dry run:
 *   pnpm --filter @pakfactory/studio run migrate:status-unification -- --dataset development
 *   ...                                                              --dataset development --confirm
 *   ...                                                              --dataset production --confirm --yes-production
 *   ...                                                              --dataset production --verify
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
  pnpm --filter @pakfactory/studio run migrate:status-unification -- --dataset <development|production> [--confirm] [--yes-production] [--verify]

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

/**
 * 🔴 A GROQ projection returns NULL for an attribute a document does not have — not
 * `undefined`. So `p.customerFacing !== undefined` is true for every row, including
 * the types that never had the field. Both the unset list and the verify pass test
 * for a value that is actually present.
 */
const present = (v) => v !== undefined && v !== null

/** Types whose off switch was `customerFacing`. */
const CUSTOMER_FACING_TYPES = ['product', 'productLine', 'productStyle']
/**
 * The values each type is allowed to hold, mirroring `apps/studio/lib/catalog-status.ts`.
 * Duplicated rather than imported because this is a .mjs script and that is a .ts module;
 * if the two ever disagree, the schema wins and this list is the stale one.
 */
const ALLOWED_STATUS = {
  product: ['active', 'coming-soon', 'discontinued', 'not-active', 'active-internal'],
  productLine: ['active', 'coming-soon', 'discontinued', 'not-active', 'active-internal'],
  productStyle: ['active', 'coming-soon', 'discontinued', 'not-active', 'active-internal'],
  solution: ['active', 'coming-soon', 'not-active'],
  solutionStyle: ['active', 'coming-soon', 'not-active'],
  customizationCategory: ['active', 'not-active'],
  customizationType: ['active', 'not-active'],
}

/** Types gaining `status` where none existed. */
const NEW_STATUS_TYPES = ['solutionStyle', 'customizationCategory', 'customizationType']
const ALL_TYPES = [...CUSTOMER_FACING_TYPES, 'solution', ...NEW_STATUS_TYPES]

const label = (d) => `${d.title || d._id}${d.isDraft ? ' (draft)' : ''}`

/**
 * The whole mapping, in one place. Returns the status this document should end up
 * with, or null to leave it exactly as it is.
 */
function targetStatus(d) {
  if (CUSTOMER_FACING_TYPES.includes(d._type)) {
    if (d.customerFacing !== false) return null // keep whatever it has, unset included
    // An inspiration product cannot be Active (Internal) — the schema rejects it.
    return d._type === 'product' && d.kind === 'inspiration' ? 'not-active' : 'active-internal'
  }
  if (d._type === 'solution') {
    // 🔴 IDEMPOTENCY. This decision is derived from `hasPage` — which this very
    // migration deletes. Once it is gone there is nothing left to derive from, and the
    // status standing in the document IS the answer. Without this guard a second
    // --confirm run reads every migrated solution as `hasPage !== true` and sets the
    // whole lot to Not active, destroying the Active state it just created.
    if (!present(d.hasPage)) return null
    return d.hasPage === true ? 'active' : 'not-active'
  }
  // New field: only fill it in where it is missing, never overwrite an editor's choice.
  if (NEW_STATUS_TYPES.includes(d._type)) return d.status ? null : 'active'
  return null
}

async function fetchDocs() {
  return client.fetch(
    `*[_type in $types]{
       _id, _type, title, kind, status, customerFacing, hasPage,
       "isDraft": _id in path("drafts.**")
     } | order(_type asc, title asc)`,
    { types: ALL_TYPES },
  )
}

async function main() {
  console.log('\n🔀  One status replaces customerFacing and hasPage (PROD-2845)')
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const docs = await fetchDocs()
  if (!docs.length) {
    console.log(`✅  Nothing to do — ${DATASET} holds none of these types.\n`)
    return
  }

  const plan = docs.map((d) => ({ ...d, next: targetStatus(d) }))

  if (verify) {
    // 🔴 Checks the INVARIANT, not the mapping. `targetStatus` reads `customerFacing`
    // and `hasPage` to decide where a document should land — and this migration deletes
    // both. Re-deriving the mapping afterwards would ask "what would hasPage say?" of a
    // document that no longer has one, and every correctly-migrated solution would read
    // as wrong. What stays true forever is: the old keys are gone, and every document
    // holds a status its own type allows.
    const leftovers = plan.filter(
      (p) => present(p.customerFacing) || (p._type === 'solution' && present(p.hasPage)),
    )
    const statusless = plan.filter((p) => !present(p.status))
    const badValue = plan.filter(
      (p) => present(p.status) && !(ALLOWED_STATUS[p._type] ?? []).includes(p.status),
    )
    // The one cross-field rule the schema enforces as an ERROR (PROD-2845 §1).
    const internalPresets = plan.filter(
      (p) => p._type === 'product' && p.kind === 'inspiration' && p.status === 'active-internal',
    )

    console.log(`Checked ${plan.length} document(s).`)
    if (!leftovers.length && !statusless.length && !badValue.length && !internalPresets.length) {
      console.log('✅  Old keys gone; every document holds a status its type allows.\n')
      return
    }
    leftovers.forEach((p) => console.error(`     ${p._type} ${label(p)}: still carries a retired key`))
    statusless.forEach((p) => console.error(`     ${p._type} ${label(p)}: no status set`))
    badValue.forEach((p) =>
      console.error(`     ${p._type} ${label(p)}: status=${JSON.stringify(p.status)} is not offered on this type`),
    )
    internalPresets.forEach((p) =>
      console.error(`     ${p._type} ${label(p)}: Active (Internal) is not valid on an inspiration product`),
    )
    process.exit(1)
  }

  const becomingInternal = plan.filter((p) => p.next === 'active-internal')
  const becomingOff = plan.filter((p) => p.next === 'not-active')
  const becomingActive = plan.filter((p) => p.next === 'active')

  console.log(`${plan.length} document(s) (drafts included):`)
  console.log(`   → Active (Internal)  ${becomingInternal.length}`)
  console.log(`   → Not active         ${becomingOff.length}`)
  console.log(`   → Active             ${becomingActive.length}`)
  console.log(`   unchanged            ${plan.filter((p) => p.next === null).length}`)

  // Named individually. Taking a document off the site is a customer-visible
  // withdrawal, and the two off states are NOT interchangeable — worth reading
  // rather than counting.
  if (becomingInternal.length) {
    console.log(`\nBecoming ACTIVE (INTERNAL) — off the site, still working as structure:`)
    becomingInternal.forEach((p) => console.log(`   • ${p._type}  ${label(p)}`))
  }
  if (becomingOff.length) {
    console.log(`\n🔴 Becoming NOT ACTIVE — off the site, and their children go too:`)
    becomingOff.forEach((p) => console.log(`   • ${p._type}  ${label(p)}`))
    const solutions = becomingOff.filter((p) => p._type === 'solution')
    if (solutions.length) {
      console.log(
        `\n   ⚠️  ${solutions.length} of those are SOLUTIONS. Every product tag, client tag and\n` +
        `      case-study chip pointing at them stops rendering. Reassign or retire them first.`,
      )
    }
  }

  const tx = client.transaction()
  let writes = 0
  for (const p of plan) {
    const unsets = []
    if (present(p.customerFacing)) unsets.push('customerFacing')
    if (p._type === 'solution' && present(p.hasPage)) unsets.push('hasPage')
    if (p.next === null && unsets.length === 0) continue
    tx.patch(p._id, (patch) => {
      const next = p.next === null ? patch : patch.set({ status: p.next })
      return unsets.length ? next.unset(unsets) : next
    })
    writes++
  }

  if (!writes) {
    console.log(`\n✅  Nothing to do — ${DATASET} is already migrated.\n`)
    return
  }
  if (!apply) {
    console.log(`\n${writes} patch(es) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }

  // `visibility: 'sync'` — an async commit returns before the dataset settles, so
  // the check below would read stale state and report success either way.
  await tx.commit({ visibility: 'sync' })
  console.log(`\n✅  Applied ${writes} patch(es) in ${DATASET}.`)

  const left = await client.fetch(
    `count(*[_type in $types && (defined(customerFacing) || (_type == "solution" && defined(hasPage)))])`,
    { types: ALL_TYPES },
  )
  console.log(`    ${left} document(s) still carry a retired key (want 0).`)
  console.log(`    Re-run with \`--verify\` to compare values rather than counts.\n`)
  if (left > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
