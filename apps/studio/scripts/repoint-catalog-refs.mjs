/**
 * Put back the references `purge:catalog --detach-referrers` unset — pointing each one at the
 * document the rebuild created in its place.
 *
 * The purge (PROD-2514) could not delete a catalog document while a case study, client, FAQ
 * or solution style held a strong reference to it, so it recorded every such reference in its
 * --emit-map file — referrer, path, old target, old title — and then unset them. The rebuild
 * from Notion recreated the catalog under NEW ids. This reads that map and writes each
 * reference back, at the same path, to the successor.
 *
 * ── HOW A SUCCESSOR IS FOUND ─────────────────────────────────────────────────────
 *
 * The map classifies each old target (`referrers[].repairBy`):
 *   title   the rebuild recreated the same title — found by (_type, title)
 *   alias   renamed in Notion — the map names the successor title
 *   choice  Notion split it in two (Registered Embossing & Debossing → Registered Embossing
 *           | Registered Debossing). Only the referrer's own copy can say which was meant,
 *           so these are NEVER resolved here without --choices (see below).
 *
 * A successor must be exactly ONE document (drafts folded into their published id). None, or
 * two, and the reference is reported and left unset — never guessed. After the 2026-09-24
 * rebuild that is 12 of 203: solutions that exist in no Notion row (five clients' `industry`,
 * and six solution styles pointing at "Test Kids Packaging", which was test data).
 *
 * ── HOW IT IS WRITTEN ────────────────────────────────────────────────────────────
 *
 *   field      `solution` / `industry` — set, only if the field is still empty
 *   array item `capabilities[_key=="k"]` — appended with the SAME _key, only if no item with
 *              that key exists. The item's original position was not recorded, so it lands
 *              at the end of the array.
 *
 * A reference to a successor that is still a draft is written weak, as Studio does. Everything
 * goes in ONE transaction, and each referrer is pinned to the revision read, so an edit made
 * since is a clean failure, not an overwrite. Re-running is safe: anything already in place is
 * counted and skipped.
 *
 * ── --choices ────────────────────────────────────────────────────────────────────
 *
 * A JSON array, one entry per choice reference, written by a person who read the case study:
 *   [{ "referrer": "<_id from the dry run>", "path": "<path from the dry run>",
 *      "choose": "Registered Embossing" }]                 ← or ["Registered Embossing", "Registered Debossing"]
 * `choose` must name the map's successors for that reference. Choosing both writes two items.
 *
 * From repo root (DRY RUN is the default — prints only, writes nothing):
 *   pnpm --filter @pakfactory/studio run repoint:catalog-refs -- --dataset development --map ~/cf/purge-map.json
 *   pnpm --filter @pakfactory/studio run repoint:catalog-refs -- --dataset development --map ~/cf/purge-map.json --confirm
 *   … --choices ~/cf/repoint-choices.json   (add once the 9 choices are made)
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run repoint:catalog-refs -- --dataset <name> --map <purge-map.json> [--choices <file>] [--confirm] [--yes-production]

  --dataset          REQUIRED. No env fallback. Must match the dataset the map was taken from.
  --map <path>       REQUIRED. The --emit-map file purge:catalog wrote BEFORE detaching.
  --choices <path>   The person's picks for "choice" references (see the header).
  --confirm          Actually write. Without it the run is a dry run.
  --yes-production   Second gate; required to write to production.`

const args = parseScriptArgs({ values: ['map', 'choices'], usage: USAGE })
const { confirm: apply, yesProduction, map: mapPath, choices: choicesPath } = args
const DATASET = args.dataset

const fail = (msg) => {
  console.error(`\n❌  ${msg}`)
  process.exit(1)
}
if (!mapPath) fail('--map is required: the purge map is the only record of what pointed where.')
if (!existsSync(resolvePath(mapPath))) fail(`No map at ${resolvePath(mapPath)}.`)

const map = JSON.parse(readFileSync(resolvePath(mapPath), 'utf8'))
if (!Array.isArray(map.detached)) {
  fail('This map has no `detached` list — it was not written by purge:catalog --detach-referrers, or it is the re-run map.')
}
if (!map.detached.length) {
  fail(`The map at ${resolvePath(mapPath)} records 0 detached references — use the map from the run that detached them.`)
}
// The map names its dataset. Repointing development's case studies from production's map (or
// the reverse) would write ids that do not exist; refuse rather than discover it per reference.
if (map.dataset !== DATASET) fail(`The map was taken from dataset=${map.dataset}, not dataset=${DATASET}.`)

const PROJECT_ID = map.projectId || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '8293wrxp'
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN
if (!TOKEN) fail('Missing Sanity token in .env.local (SANITY_API_WRITE_TOKEN).')
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  fail('--confirm needs a WRITE token; only a read token is set.')
}
if (apply && DATASET === 'production' && !yesProduction) fail('Refusing to write to production without --yes-production.')

const client = createClient({ projectId: PROJECT_ID, dataset: DATASET, token: TOKEN, apiVersion: '2024-10-01', useCdn: false })
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const publishedId = (id) => id.replace(/^drafts\./, '')

/** `capabilities[_key=="abc"]` → { parent: 'capabilities', key: 'abc' }; a plain field → null. */
function arrayItem(path) {
  const m = path.match(/^(.*)\[_key=="([^"]+)"\]$/)
  return m ? { parent: m[1], key: m[2] } : null
}

/** Read a dotted/keyed path off a document — enough for the shapes the purge recorded. */
function readPath(doc, path) {
  let cur = doc
  for (const part of path.match(/[^.[\]]+|\[_key=="[^"]+"\]|\[\d+\]/g) ?? []) {
    if (cur == null) return undefined
    const keyed = part.match(/^\[_key=="([^"]+)"\]$/)
    const index = part.match(/^\[(\d+)\]$/)
    if (keyed) cur = Array.isArray(cur) ? cur.find((i) => i?._key === keyed[1]) : undefined
    else if (index) cur = Array.isArray(cur) ? cur[Number(index[1])] : undefined
    else cur = cur[part]
  }
  return cur
}

async function main() {
  console.log(`\n🔗  Re-point catalog references — ${describeMode({ confirm: apply, dataset: DATASET })}`)
  console.log(`   project ${PROJECT_ID} · dataset=${DATASET}`)
  console.log(`   map ${resolvePath(mapPath)} (taken ${map.takenAt}) · ${plural(map.detached.length, 'detached reference')}`)

  // ── 1. Successors: (type, title) → exactly one document now ──────────────────
  const types = [...new Set(map.referrers.map((r) => r._type))]
  const docs = await client.fetch(`*[_type in $types]{_id, _type, title}`, { types })
  const byTitle = new Map() // `${type}|${title}` → Set(published id)
  const hasPublished = new Set()
  for (const d of docs) {
    const k = `${d._type}|${d.title}`
    if (!byTitle.has(k)) byTitle.set(k, new Set())
    byTitle.get(k).add(publishedId(d._id))
    if (!d._id.startsWith('drafts.')) hasPublished.add(d._id)
  }
  const successorFor = (type, title) => {
    const ids = byTitle.get(`${type}|${title}`)
    if (!ids || ids.size === 0) return { error: `no ${type} titled "${title}" exists now` }
    if (ids.size > 1) return { error: `${ids.size} ${type} documents are titled "${title}"` }
    const id = [...ids][0]
    return { id, type, title, weak: !hasPublished.has(id) }
  }
  const repairOf = new Map(map.referrers.map((r) => [r._id, r]))

  // ── 2. The person's choices ───────────────────────────────────────────────────
  const choices = new Map()
  if (choicesPath) {
    if (!existsSync(resolvePath(choicesPath))) fail(`No choices file at ${resolvePath(choicesPath)}.`)
    for (const c of JSON.parse(readFileSync(resolvePath(choicesPath), 'utf8'))) {
      choices.set(`${c.referrer}|${c.path}`, [].concat(c.choose))
    }
  }

  // ── 3. Plan every detached reference ──────────────────────────────────────────
  const plan = [] // { row, successors: [...] }
  const noSuccessor = []
  const pendingChoice = []
  const badChoice = []
  for (const row of map.detached) {
    const repair = repairOf.get(row.target._id)
    const how = repair?.repairBy ?? 'title'
    let titles
    if (how === 'choice') {
      const picked = choices.get(`${row.referrer._id}|${row.path}`)
      if (!picked) {
        pendingChoice.push({ row, options: repair.successors })
        continue
      }
      const invalid = picked.filter((t) => !repair.successors.includes(t))
      if (invalid.length || !picked.length) {
        badChoice.push({ row, picked, options: repair.successors })
        continue
      }
      titles = picked
    } else {
      titles = [(repair?.successors ?? [row.target.title])[0]]
    }
    const resolved = titles.map((t) => successorFor(row.target._type, t))
    const error = resolved.find((r) => r.error)
    if (error) {
      noSuccessor.push({ row, why: error.error })
      continue
    }
    plan.push({ row, successors: resolved })
  }

  // ── 4. Read every referrer as it is now, and build the patches ────────────────
  const referrerIds = [...new Set(plan.map((p) => p.row.referrer._id))]
  const live = new Map((await client.fetch(`*[_id in $ids]`, { ids: referrerIds })).map((d) => [d._id, d]))
  const writes = new Map() // referrer id → [{ kind, ... }]
  const already = []
  const conflicts = []
  const missingReferrer = []
  for (const { row, successors } of plan) {
    const doc = live.get(row.referrer._id)
    if (!doc) {
      missingReferrer.push(row)
      continue
    }
    const ref = (s) => ({
      _type: 'reference',
      _ref: s.id,
      ...(s.weak ? { _weak: true, _strengthenOnPublish: { type: s.type } } : {}),
    })
    const item = arrayItem(row.path)
    const ops = writes.get(doc._id) ?? []
    if (item) {
      const list = readPath(doc, item.parent)
      const present = Array.isArray(list) ? list : []
      successors.forEach((s, i) => {
        const key = i === 0 ? item.key : `${item.key}${i + 1}`
        const existing = present.find((x) => x?._key === key)
        if (existing?._ref === s.id) already.push(row)
        else if (existing) conflicts.push({ row, why: `an item with _key "${key}" already points at ${existing._ref}` })
        else ops.push({ kind: 'append', parent: item.parent, value: { _key: key, ...ref(s) }, row, s })
      })
    } else if (/\[\d+\]/.test(row.path.split('.').pop())) {
      conflicts.push({ row, why: 'an index path — its position cannot be trusted after the detach' })
    } else {
      const current = readPath(doc, row.path)
      const s = successors[0]
      if (current?._ref === s.id) already.push(row)
      else if (current != null) conflicts.push({ row, why: `the field is set again (→ ${current._ref ?? JSON.stringify(current)})` })
      else ops.push({ kind: 'set', path: row.path, value: ref(s), row, s })
    }
    if (ops.length) writes.set(doc._id, ops)
  }

  // ── 5. Report ─────────────────────────────────────────────────────────────────
  const total = [...writes.values()].reduce((n, ops) => n + ops.length, 0)
  console.log(`\n   ${plural(total, 'reference')} to write into ${plural(writes.size, 'document')}`)
  const byField = {}
  for (const ops of writes.values()) for (const o of ops) {
    const k = `${o.row.referrer._type}.${(o.path ?? o.parent).replace(/\[.*$/, '')}`
    byField[k] = (byField[k] ?? 0) + 1
  }
  for (const [k, n] of Object.entries(byField).sort((a, b) => b[1] - a[1])) console.log(`     ${String(n).padStart(5)}  ${k}`)
  const weak = [...writes.values()].flat().filter((o) => o.s.weak).length
  if (weak) console.log(`   ${plural(weak, 'reference')} written weak — the successor is still a draft`)
  if (already.length) console.log(`   ${plural(already.length, 'reference')} already in place — skipped`)

  if (pendingChoice.length) {
    console.log(`\n⚠️  ${plural(pendingChoice.length, 'reference')} need a person's CHOICE — left unset until --choices names them:`)
    for (const { row, options } of pendingChoice) {
      console.log(`     ${row.referrer._type} "${row.referrer.title}"`)
      console.log(`         referrer ${row.referrer._id} · path ${row.path}`)
      console.log(`         was "${row.target.title}" → choose ${options.map((o) => `"${o}"`).join(' | ')} (or both)`)
    }
  }
  if (badChoice.length) {
    console.log(`\n❌  ${plural(badChoice.length, 'choice')} ${badChoice.length === 1 ? 'names' : 'name'} something that is not a successor:`)
    for (const { row, picked, options } of badChoice) console.log(`     ${row.referrer._id} ${row.path}: ${JSON.stringify(picked)} — options ${JSON.stringify(options)}`)
  }
  if (noSuccessor.length) {
    console.log(`\n⚠️  ${plural(noSuccessor.length, 'reference')} have NO successor — left unset, for a person to decide:`)
    for (const { row, why } of noSuccessor) console.log(`     ${row.referrer._type} "${row.referrer.title}" .${row.path} — was "${row.target.title}": ${why}`)
  }
  if (conflicts.length) {
    console.log(`\n⚠️  ${plural(conflicts.length, 'reference')} skipped — the referrer changed since the detach:`)
    for (const { row, why } of conflicts) console.log(`     ${row.referrer._type} "${row.referrer.title}" .${row.path}: ${why}`)
  }
  if (missingReferrer.length) {
    console.log(`\n⚠️  ${plural(missingReferrer.length, 'reference')} skipped — the referrer no longer exists:`)
    for (const row of missingReferrer) console.log(`     ${row.referrer._type} ${row.referrer._id}`)
  }
  const accounted = total + already.length + pendingChoice.length + badChoice.length + noSuccessor.length + conflicts.length + missingReferrer.length
  const extra = [...writes.values()].flat().filter((o) => o.value?._key && o.value._key !== arrayItem(o.row.path)?.key).length
  console.log(`\n   accounted for ${accounted - extra} of ${map.detached.length} detached references in dataset=${DATASET}`
    + (extra ? ` (+${extra} second pick${extra === 1 ? '' : 's'} from --choices)` : ''))

  // ── 6. Write, or explain why not ──────────────────────────────────────────────
  if (badChoice.length) fail('Fix the choices file first — nothing was written.')
  if (!total) {
    console.log(`\n✅  Nothing to write in dataset=${DATASET}.`)
    return
  }
  if (!apply) {
    console.log(`\n🔍  DRY RUN — nothing written to dataset=${DATASET}. Re-run with --confirm to write.`)
    return
  }

  let tx = client.transaction()
  for (const [id, ops] of writes) {
    ops.forEach((o, i) => {
      tx = tx.patch(id, (p) => {
        let patch = i === 0 ? p.ifRevisionId(live.get(id)._rev) : p
        if (o.kind === 'set') return patch.set({ [o.path]: o.value })
        return patch.setIfMissing({ [o.parent]: [] }).append(o.parent, [o.value])
      })
    })
  }
  try {
    await tx.commit({ visibility: 'sync', autoGenerateArrayKeys: false })
  } catch (err) {
    fail(`Write failed: ${err.message}\n    Nothing was written (one transaction). Re-run to see what changed.`)
  }
  console.log(`\n✅  ${plural(total, 'reference')} written into ${plural(writes.size, 'document')} in dataset=${DATASET}.`)
  if (pendingChoice.length || noSuccessor.length) {
    console.log(`    Still unset: ${pendingChoice.length} awaiting a choice, ${noSuccessor.length} with no successor.`)
  }
}

main().catch((err) => fail(err.message))
