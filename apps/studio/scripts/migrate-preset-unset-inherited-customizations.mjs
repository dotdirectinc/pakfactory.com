#!/usr/bin/env node
/**
 * PROD-2778 — Inspiration presets stop carrying a copy of their base's options.
 *
 *   product (kind == "inspiration").availableCustomizations
 *     entry with preselected == true   →  kept
 *     any other entry                  →  removed
 *
 * ── Why ─────────────────────────────────────────────────────────────────────
 *
 * A preset offers what the product in `basedOn` offers — the base's direct list
 * plus what the customization rules derive from it — and stores ONLY the options
 * it arrives with already chosen (PROD-2530, PROD-2776). An entry that is not
 * pre-selected asserts nothing.
 *
 * The catalog fill (pakfactory.com-backend `scripts/sanity-fill.mjs`) wrote the
 * base product's list onto every preset as "inherited" entries without the flag.
 * On development, 2026-10-02: 640 of 750 presets, 10–57 entries each — 638 an
 * exact copy of the base's list, 2 a partial copy, none naming an option the base
 * lacks. Studio drew them as pre-selected (★, type-header counts) while the
 * website, which seeds only `preselected == true`, ignored them.
 *
 * Decided with Crystal, 2026-10-02: they are leftovers, not pre-selections.
 * Delete them; she pre-selects by hand in Studio afterwards. Notion holds no
 * per-preset pre-selections, so there is nothing to import instead.
 *
 * Customers lose nothing: availability never came from these entries.
 *
 * ── ⚠️ THE PART THIS SCRIPT CANNOT FIX ──────────────────────────────────────
 *
 * 🔴 The catalog fill must stop writing inherited entries, or a re-run brings
 * them back — AND, because the uploader `set`s every field the fill owns, it
 * would replace whatever Crystal pre-selected by hand. Fixed in the fill under
 * the same ticket; re-running this script repairs the data, not the cause.
 *
 * Drafts included (`perspective: 'raw'`) — publishing a stale draft would
 * otherwise restore the entries on a document this script had already fixed.
 * Each patch is pinned to the revision it was planned from (`ifRevisionId`), so
 * an editor saving the same preset mid-run fails that patch instead of losing
 * their edit. Idempotent: a re-run finds nothing to remove.
 *
 * `--verify` re-reads the dataset and checks every preset, not a count.
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content).
 *
 * 🔴 Run it through the register, not the command below:
 *   pnpm sanity:migrate up --dataset <development|production> \
 *     --only 20261002-preset-unset-inherited-customizations --confirm
 *
 * The invocation below is this script's own interface, and is still the right way
 * to take a dry run:
 *   pnpm --filter @pakfactory/studio run migrate:preset-unset-inherited-customizations -- --dataset development
 *   ...                                                                                  --dataset development --confirm
 *   ...                                                                                  --dataset production --confirm --yes-production
 *   ...                                                                                  --dataset production --verify
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
  pnpm --filter @pakfactory/studio run migrate:preset-unset-inherited-customizations -- --dataset <development|production> [--confirm] [--yes-production] [--verify]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.
  --verify          Read-only. Re-read every preset; writes nothing.`

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

/** The whole rule, in one place: an entry survives only if it says it is pre-selected. */
const keeps = (entry) => entry?.preselected === true

async function main() {
  console.log('\n🧹  Inspiration presets: remove entries that are not pre-selected (PROD-2778)')
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  // `base` is read published-or-draft, only to say whether a preset's leftovers were a
  // full or a partial copy. The rule does not depend on it.
  const presets = await client.fetch(
    `*[_type == "product" && kind == "inspiration"]{
       _id, _rev, title,
       "isDraft": _id in path("drafts.**"),
       availableCustomizations,
       "baseTitle": basedOn->title,
       "baseIds": basedOn->availableCustomizations[].customization._ref
     } | order(title asc)`,
  )

  if (!presets.length) {
    console.log(`✅  Nothing to do — ${DATASET} holds no inspiration products.\n`)
    return
  }

  const plan = presets
    .map((p) => {
      const list = Array.isArray(p.availableCustomizations) ? p.availableCustomizations : []
      const kept = list.filter(keeps)
      const removed = list.filter((e) => !keeps(e))
      return { ...p, list, kept, removed }
    })
    .filter((p) => p.removed.length > 0)

  if (verify) {
    console.log(`Checked ${presets.length} inspiration product(s), drafts included.`)
    if (!plan.length) {
      console.log('✅  No preset stores an entry that is not pre-selected.\n')
      return
    }
    console.error(`❌  ${plan.length} preset(s) still store entries that are not pre-selected:`)
    plan.forEach((p) => console.error(`     ${label(p)}: ${p.removed.length}`))
    process.exit(1)
  }

  // How each leftover list relates to its base. Expected: a copy of the base's list. A
  // partial copy or an option the base lacks is still removed — neither is a pre-selection
  // — but it is named, because it is the case someone might have meant something by.
  const classify = (p) => {
    const base = new Set(p.baseIds ?? [])
    const ids = p.removed.map((e) => e?.customization?._ref).filter(Boolean)
    if (!p.baseIds) return 'no base'
    if (ids.some((id) => !base.has(id))) return 'names options the base lacks'
    return new Set(ids).size === base.size ? 'copy of base' : 'partial copy of base'
  }
  const byKind = new Map()
  for (const p of plan) {
    const k = classify(p)
    byKind.set(k, [...(byKind.get(k) ?? []), p])
  }

  const entries = plan.reduce((n, p) => n + p.removed.length, 0)
  const keeping = plan.filter((p) => p.kept.length > 0)
  console.log(`${presets.length} inspiration product(s), drafts included.`)
  console.log(`   ${plan.length} store entries that are not pre-selected — ${entries} entr${entries === 1 ? 'y' : 'ies'} to remove:`)
  for (const [k, list] of byKind) console.log(`     ${String(list.length).padStart(4)}  ${k}`)
  console.log(`   ${keeping.length} of those also hold real pre-selections, which are kept.`)

  for (const [k, list] of byKind) {
    if (k === 'copy of base') continue
    console.log(`\n⚠️  ${k} — removed all the same, named so it can be checked:`)
    list.forEach((p) => console.log(`   • ${label(p)} — ${p.removed.length} entr${p.removed.length === 1 ? 'y' : 'ies'} (base: ${p.baseTitle ?? '—'})`))
  }
  if (keeping.length) {
    console.log('\nKeeping pre-selections on:')
    keeping.forEach((p) => console.log(`   • ${label(p)} — keeps ${p.kept.length}, removes ${p.removed.length}`))
  }

  if (!plan.length) {
    console.log(`\n✅  Nothing to do — no preset in ${DATASET} stores an entry that is not pre-selected.\n`)
    return
  }
  if (!apply) {
    console.log(`\n${plan.length} patch(es) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`)
    return
  }

  // One transaction per preset: a revision conflict on one document (an editor saving it
  // mid-run) must fail that preset alone, not roll back the other 639.
  const conflicts = []
  for (const p of plan) {
    const patch = client.patch(p._id).ifRevisionId(p._rev)
    if (p.kept.length) patch.set({ availableCustomizations: p.kept })
    else patch.unset(['availableCustomizations'])
    try {
      await client.transaction().patch(patch).commit({ visibility: 'sync' })
    } catch (err) {
      conflicts.push({ p, err })
    }
  }

  console.log(`\n✅  Patched ${plan.length - conflicts.length} of ${plan.length} preset(s) in ${DATASET}.`)
  if (conflicts.length) {
    console.error(`❌  ${conflicts.length} preset(s) changed while this ran and were NOT patched — re-run to pick them up:`)
    conflicts.forEach(({ p, err }) => console.error(`     ${label(p)}: ${err.message}`))
  }

  const left = await client.fetch(
    `count(*[_type == "product" && kind == "inspiration" && count(availableCustomizations[preselected != true]) > 0])`,
  )
  console.log(`    ${left} preset(s) still store entries that are not pre-selected (want 0).`)
  console.log(`    ⚠️  The catalog fill re-introduces them unless it no longer writes inherited entries.`)
  console.log(`    Re-run with \`--verify\` to check every preset.\n`)
  if (left > 0 || conflicts.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
