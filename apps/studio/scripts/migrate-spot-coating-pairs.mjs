#!/usr/bin/env node
/**
 * PROD-2783 — Spot Coating pairs follow Crystal's frame.
 *
 * Sets `compatibleCustomizations` between every Spot Coating option and every option of
 * Surface Finish, Surface Finish (non-paper) and Lamination to exactly the table below —
 * the Miro frame "Material <> Surface Finish (Lamination/Coating) <> Spot Coating", which
 * the generator's board snapshot (2026-09-23) matches line for line. Pairs with any OTHER
 * type are not touched.
 *
 * ── Why ─────────────────────────────────────────────────────────────────────
 *
 * The relationship fill (pakfactory.com-backend `scripts/lib/relationship-fill.ts`,
 * `compatibilityOn`) keeps a pair when each option still SURVIVES the other being picked.
 * Spot Coating's rows in this frame are alternatives across three types, so with Gloss
 * picked, Spot UV stayed pending — Anti-Scratch Lamination could still satisfy it — and
 * Gloss–Spot UV was written as compatible. Every spot coating ended up paired with every
 * finish, Glitter, Pearlescent and Textured included, which the board sends to "No Spot
 * Coating Option". The fill corrects that for materials only; it is fixed under the same
 * ticket, and until it is, a re-run of the fill restores what this script removes.
 *
 * ── How ─────────────────────────────────────────────────────────────────────
 *
 * Every option is pinned by `_id` and its title is asserted, so a renamed or replaced
 * document stops the run instead of being guessed at. A pair is read from BOTH ends
 * (Studio reads it symmetrically) and written on both, the shape the fill wrote: an
 * unwanted pair is removed from both documents, a missing one added to both. Spot Varnish
 * is `not-active`, off the board and paired with nothing, and is left alone.
 *
 * Drafts included (`perspective: 'raw'`) — publishing a stale draft would otherwise
 * restore a removed pair. Each document's patch is pinned to the revision it was planned
 * from (`ifRevisionId`), so an editor saving mid-run fails that document instead of losing
 * their edit. Idempotent: a re-run finds nothing to change.
 *
 * `--verify` re-reads the dataset and checks every pair in scope, not a count.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 * 🔴 Run it through the register, not the command below:
 *   pnpm sanity:migrate up --dataset <development|production> \
 *     --only 20261002-spot-coating-pairs --confirm
 *
 * The invocation below is this script's own interface, and is still the right way
 * to take a dry run:
 *   pnpm --filter @pakfactory/studio run migrate:spot-coating-pairs -- --dataset development
 *   ...                                                               --dataset development --confirm
 *   ...                                                               --dataset production --confirm --yes-production
 *   ...                                                               --dataset production --verify
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { randomBytes } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run migrate:spot-coating-pairs -- --dataset <development|production> [--confirm] [--yes-production] [--verify]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.
  --verify          Read-only. Re-read every pair in scope; writes nothing.`

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

// ── The frame, in one place. Ids read from development on 2026-10-02; titles asserted. ──

/** The partner options, by id → the title it must still carry. */
const F = {
  uncoated: ['cap-3c2eb5db19ec8018bffed3e4e36a592f', 'Uncoated / No Surface Finish'],
  gloss: ['cap-3c2eb5db19ec80afb64fcfce52066fdb', 'Gloss'],
  semiGloss: ['cap-3c2eb5db19ec80a2b6dbda31c98eb10d', 'Semi-Gloss'],
  matte: ['cap-3c2eb5db19ec80ed9da9c43637881c46', 'Matte'],
  softTouch: ['cap-3c2eb5db19ec80319b92feb9ee315982', 'Soft Touch'],
  metallicSheen: ['cap-3c2eb5db19ec80d9badcd0f6f3370fb4', 'Metallic Sheen'],
  holographic: ['cap-3c2eb5db19ec803ea708d2ac3c73996d', 'Holographic'],
  glossNp: ['cap-3c6eb5db19ec80e7a1ccc286a2ff9da8', 'Gloss (for non-paper)'],
  matteNp: ['cap-3c6eb5db19ec80608cc9d9b397264b24', 'Matte (for non-paper)'],
  softTouchNp: ['cap-3c6eb5db19ec8069ad95c4dbacb40a54', 'Soft Touch (for non-paper)'],
  antiScratchLam: ['cap-4edeb5db19ec83a2b336816a4626fd5c', 'Anti-Scratch Lamination'],
}

/** Each Spot Coating option → exactly the partners the frame draws for it. */
const FRAME = [
  ['cap-235eb5db19ec834789b001f3d8aa2802', 'Spot UV / Spot Gloss', ['uncoated', 'matte', 'softTouch', 'antiScratchLam', 'matteNp', 'softTouchNp']],
  ['cap-3c3eb5db19ec80039848d4899c86f343', 'Matte Spot UV', ['gloss', 'metallicSheen', 'holographic', 'glossNp']],
  ['cap-27deb5db19ec82d69d5781316f9b8347', 'Spot Glitter', ['uncoated', 'matte', 'softTouch', 'antiScratchLam']],
  ['cap-c2aeb5db19ec8287a723811cdcbc2f64', 'Raised Spot UV', ['uncoated', 'semiGloss', 'matte', 'softTouch', 'antiScratchLam', 'matteNp', 'softTouchNp']],
  ['cap-392eb5db19ec801f88aaf461f08b1f51', 'Textured Spot UV', ['uncoated', 'semiGloss', 'matte', 'softTouch', 'antiScratchLam']],
]

/** The partner side of the scope: every option of these types, whatever its id. */
const PARTNER_TYPES = ['Surface Finish', 'Surface Finish (non-paper)', 'Lamination']

const pub = (id) => id.replace(/^drafts\./, '')
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`)
const newKey = () => randomBytes(6).toString('hex')

async function main() {
  console.log('\n✨  Spot Coating pairs follow the frame (PROD-2783)')
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const spotIds = FRAME.map(([id]) => id)
  const docs = await client.fetch(
    `*[_type == "customizationOption" && (
        _id in $spotIds || _id in $draftSpotIds ||
        type->title in $types
     )]{ _id, _rev, title, "type": type->title, compatibleCustomizations }`,
    { spotIds, draftSpotIds: spotIds.map((id) => `drafts.${id}`), types: PARTNER_TYPES },
  )

  // ── Gate: every pinned id exists, published, with the title the frame names. ──
  const byId = new Map(docs.map((d) => [d._id, d]))
  const pinned = [...FRAME.map(([id]) => id), ...Object.values(F).map(([id]) => id)]
  // None of them at all is a dataset the catalog fill has not reached (production, as of
  // 2026-10-02) — there are no wrong pairs to fix. SOME of them is a mismatch, and stops below.
  if (pinned.every((id) => !byId.has(id))) {
    console.log(`✅  Nothing to do — ${DATASET} holds none of the frame's options (the catalog fill has not run here).\n`)
    return
  }
  const problems = []
  for (const [id, title] of [...FRAME.map(([id, t]) => [id, t]), ...Object.values(F)]) {
    const d = byId.get(id)
    if (!d) problems.push(`${id} (${title}) — not found`)
    else if (d.title !== title) problems.push(`${id} — expected "${title}", found "${d.title}"`)
  }
  if (problems.length) {
    console.error(`❌  The frame's options do not match ${DATASET}:`)
    problems.forEach((p) => console.error(`     ${p}`))
    console.error('    Nothing written. Re-read the ids rather than matching by title.')
    process.exit(1)
  }

  const spotSet = new Set(spotIds)
  const partnerDocs = docs.filter((d) => PARTNER_TYPES.includes(d.type))
  const partnerSet = new Set(partnerDocs.map((d) => pub(d._id)))
  const title = new Map(docs.map((d) => [pub(d._id), d.title]))

  const want = new Set()
  for (const [spot, , partners] of FRAME) for (const k of partners) want.add(pairKey(spot, F[k][0]))

  // Every pair in scope as it stands, read from both ends, drafts included.
  const have = new Set()
  for (const d of docs) {
    const me = pub(d._id)
    for (const r of d.compatibleCustomizations ?? []) {
      const other = pub(r?._ref ?? '')
      const inScope = (spotSet.has(me) && partnerSet.has(other)) || (partnerSet.has(me) && spotSet.has(other))
      if (inScope) have.add(pairKey(me, other))
    }
  }
  const toRemove = [...have].filter((k) => !want.has(k)).sort()
  const toAdd = [...want].filter((k) => !have.has(k)).sort()
  const name = (k) => {
    const [a, b] = k.split('|')
    const [spot, partner] = spotSet.has(a) ? [a, b] : [b, a]
    return `${title.get(spot) ?? spot} ↔ ${title.get(partner) ?? partner}`
  }

  // Per document: what it must lose and what it must gain, so BOTH ends end up agreeing.
  const plan = []
  for (const d of docs) {
    const me = pub(d._id)
    const isSpot = spotSet.has(me)
    if (!isSpot && !partnerSet.has(me)) continue
    const refs = d.compatibleCustomizations ?? []
    const present = new Set(refs.map((r) => pub(r?._ref ?? '')))
    const drop = refs.filter((r) => {
      const other = pub(r?._ref ?? '')
      const inScope = isSpot ? partnerSet.has(other) : spotSet.has(other)
      return inScope && !want.has(pairKey(me, other))
    })
    const add = [...want]
      .map((k) => k.split('|'))
      .filter(([a, b]) => a === me || b === me)
      .map(([a, b]) => (a === me ? b : a))
      .filter((other) => !present.has(other))
    if (drop.length || add.length) plan.push({ d, drop, add })
  }

  if (verify) {
    console.log(`Checked ${FRAME.length} Spot Coating option(s) against ${partnerSet.size} partner option(s), both ends, drafts included.`)
    if (!toRemove.length && !toAdd.length && !plan.length) {
      console.log('✅  Every pair in scope matches the frame, on both ends.\n')
      return
    }
    if (toRemove.length) console.error(`❌  ${toRemove.length} pair(s) the frame does not draw:\n     ${toRemove.map(name).join('\n     ')}`)
    if (toAdd.length) console.error(`❌  ${toAdd.length} pair(s) the frame draws that are missing:\n     ${toAdd.map(name).join('\n     ')}`)
    if (plan.length) console.error(`❌  ${plan.length} document(s) hold only one end of a pair.`)
    process.exit(1)
  }

  console.log(`${FRAME.length} Spot Coating option(s) × ${partnerSet.size} option(s) of ${PARTNER_TYPES.join(' / ')} (drafts included).`)
  console.log(`   pairs the frame draws   ${want.size}`)
  console.log(`   pairs in the dataset    ${have.size}`)
  console.log(`   to remove               ${toRemove.length}`)
  console.log(`   to add                  ${toAdd.length}`)
  if (toRemove.length) {
    console.log('\nRemoving — named, because each is a pairing a customer could order today:')
    toRemove.forEach((k) => console.log(`   − ${name(k)}`))
  }
  if (toAdd.length) {
    console.log('\nAdding:')
    toAdd.forEach((k) => console.log(`   + ${name(k)}`))
  }

  if (!plan.length) {
    console.log(`\n✅  Nothing to do — every pair in scope in ${DATASET} already matches the frame.\n`)
    return
  }
  console.log(`\n${plan.length} document(s) to patch (both ends of every pair).`)
  if (!apply) {
    console.log(`DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }

  // One transaction per document: a revision conflict fails that document alone.
  const conflicts = []
  for (const { d, drop, add } of plan) {
    const patch = client.patch(d._id).ifRevisionId(d._rev).setIfMissing({ compatibleCustomizations: [] })
    if (drop.length) patch.unset(drop.map((r) => `compatibleCustomizations[_key=="${r._key}"]`))
    if (add.length) {
      patch.insert('after', 'compatibleCustomizations[-1]', add.map((id) => ({ _key: newKey(), _type: 'reference', _ref: id })))
    }
    try {
      await client.transaction().patch(patch).commit({ visibility: 'sync' })
    } catch (err) {
      conflicts.push({ d, err })
    }
  }

  console.log(`\n✅  Patched ${plan.length - conflicts.length} of ${plan.length} document(s) in ${DATASET}.`)
  if (conflicts.length) {
    console.error(`❌  ${conflicts.length} document(s) changed while this ran and were NOT patched — re-run to pick them up:`)
    conflicts.forEach(({ d, err }) => console.error(`     ${d.title} (${d._id}): ${err.message}`))
  }
  console.log('    ⚠️  The relationship fill restores the removed pairs until its fix lands (PROD-2783).')
  console.log('    Re-run with `--verify` to check every pair.\n')
  if (conflicts.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
