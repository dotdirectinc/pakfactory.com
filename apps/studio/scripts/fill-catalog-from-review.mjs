/**
 * Populate a dataset from an APPROVED catalog review set (the one-time catalog fill).
 *
 *   pnpm --filter @pakfactory/studio run fill:catalog -- --review <dir> --dataset development
 *   pnpm --filter @pakfactory/studio run fill:catalog -- --review <dir> --dataset development --confirm
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content — agents never write
 * documents). The review set is produced by `pakfactory.com-backend/scripts/sanity-fill.mjs
 * generate` from Notion + Google Drive and read by a person before this runs. This script
 * decides nothing about content: every document, field and image comes from that folder.
 *
 * ── What it refuses ──────────────────────────────────────────────────────────
 *
 *   · A review set whose files do not match `manifest.json` — an edit after approval is
 *     a new review, not a quiet upload.
 *   · A `create` whose `_id` already holds a different type or a different title, and a
 *     `patch` whose target is missing or of another type (the Soft Touch lesson from
 *     PROD-2463: a derived id silently overwrote a live document).
 *   · A reference to a document that is neither in the dataset nor in the set.
 *   · Any `blocked` document. The generator holds those back; they never reach here.
 *
 * ── What it writes ───────────────────────────────────────────────────────────
 *
 *   · Only the fields listed in each document's `_fill.owned`. `set`, never `unset`,
 *     never delete, never replace a whole document.
 *   · Only what CHANGED (PROD-2628, "smart refill"). Each existing document — published and
 *     draft separately — is compared with the value the fill would write, field by field,
 *     and only the fields that differ are set. A document with nothing to change is not
 *     written at all: no revision, no webhook, no CDN revalidation. A re-run writes nothing.
 *     New documents are created in full, as before.
 *   · A patch also lands on an existing `drafts.<id>`, otherwise the stale draft reverts
 *     the fill the moment an editor presses Publish.
 *   · `publish: false` on a NEW document writes `drafts.<id>` only. An existing published
 *     document is never unpublished — the review report lists those conflicts.
 *   · `publish: true` on a document that exists ONLY as `drafts.<id>` publishes it (PROD-2605,
 *     2026-09-28: every catalog document is published): the published document is created
 *     from the draft's full content plus the fill's fields, and the draft is removed — what
 *     Studio's Publish button does. Nothing an editor wrote in the draft is lost.
 *   · Then every WEAK reference to a document published here is strengthened (`_weak` and
 *     `_strengthenOnPublish` unset). Studio does that when a person presses Publish; an API
 *     publish does not, and a weak reference to a published document is what Studio flags
 *     as "points at a draft".
 *   · A reference to a document with no published version (a new draft-only option, say)
 *     is written weak with `_strengthenOnPublish`, the shape Studio writes, because a
 *     strong reference to it is rejected. Publishing the target strengthens it.
 *   · Images: each Drive file is downloaded with the read-only service account and
 *     uploaded once, tagged `source: { name: 'google-drive', id: <fileId>, url }`. A file
 *     already uploaded (same source id) is reused, so re-runs do not duplicate assets.
 *     cardImage / ogImage are never written (not in the review set by decision).
 *
 * ── Environment ──────────────────────────────────────────────────────────────
 *
 *   SANITY_API_WRITE_TOKEN            (apps/studio/.env.local) — required for --confirm
 *   GOOGLE_APPLICATION_CREDENTIALS    path to the sanity-asset-reader key, OUTSIDE the repo —
 *                                     required for --confirm when the set has images
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { createHash, createSign } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run fill:catalog -- --review <dir> --dataset <name> [--confirm] [--yes-production]

  --review          REQUIRED. The approved review set (holds manifest.json).
  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`

// `--review <dir>` is this script's only value flag; parseScriptArgs owns the rest and
// still rejects anything it does not know.
const rawArgv = process.argv.slice(2)
const reviewAt = rawArgv.findIndex((a) => a === '--review' || a.startsWith('--review='))
let REVIEW
if (reviewAt !== -1) {
  const a = rawArgv[reviewAt]
  REVIEW = a.includes('=') ? a.slice(a.indexOf('=') + 1) : rawArgv[reviewAt + 1]
  rawArgv.splice(reviewAt, a.includes('=') ? 1 : 2)
}
const args = parseScriptArgs({ usage: USAGE, argv: rawArgv })
if (!REVIEW || REVIEW.startsWith('--')) {
  console.error(`\n✖ --review <dir> is required.\n\n${USAGE}\n`)
  process.exit(1)
}
REVIEW = resolve(REVIEW)
const { confirm: apply, dataset: DATASET } = args

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
const TOKEN = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN
if (!TOKEN) fail('Missing Sanity token in apps/studio/.env.local.')
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  fail('--confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN).')
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
  token: TOKEN,
  useCdn: false,
  perspective: 'raw',
})

/** Dependencies first: a strong reference to a document not yet written is rejected. */
// solutionStyle after solution / productLine / productStyle: it references all three (PROD-2605).
// customizationCategory first: the fill patches it only for its registry identity (entityId /
// entityCode, PROD-2628) and it references nothing in the set.
// Write order: a document is written before anything that references it. Glossary terms come
// before options because an option's `glossaryTerm` points at one (the glossary seed set).
const TYPE_ORDER = ['customizationCategory', 'property', 'propertyValue', 'customizationType', 'productLine', 'productStyle', 'solution', 'solutionStyle', 'glossaryTerm', 'customizationOption', 'product']
const BATCH = 50

function fail(msg) {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// ─── 1. The review set, exactly as approved ───────────────────────────────────

function loadReviewSet() {
  const manifestPath = join(REVIEW, 'manifest.json')
  if (!existsSync(manifestPath)) fail(`No manifest.json in ${REVIEW}.`)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const mismatched = []
  for (const [rel, { sha256: expected }] of Object.entries(manifest.files)) {
    const p = join(REVIEW, rel)
    if (!existsSync(p)) mismatched.push(`${rel} (missing)`)
    else if (sha256(readFileSync(p)) !== expected) mismatched.push(`${rel} (changed since generate)`)
  }
  if (mismatched.length) {
    fail(`The review set does not match its manifest:\n  ${mismatched.join('\n  ')}\nRe-run generate and review again.`)
  }
  // A document file for a type this script does not know would be skipped without a word, and its
  // documents never written. Refuse instead: the set and the uploader must agree on every type.
  const unknownTypes = Object.keys(manifest.files)
    .filter((rel) => rel.startsWith('documents/'))
    .map((rel) => rel.slice('documents/'.length).replace(/\.json$/, ''))
    .filter((type) => !TYPE_ORDER.includes(type))
  if (unknownTypes.length) {
    fail(`The review set has documents of a type this uploader does not write: ${unknownTypes.join(', ')}.\nAdd the type to TYPE_ORDER (in reference order) before uploading.`)
  }
  const docs = TYPE_ORDER.flatMap((type) => {
    const rel = `documents/${type}.json`
    if (!manifest.files[rel]) return []
    const list = JSON.parse(readFileSync(join(REVIEW, rel), 'utf8'))
    // An inspirational product's `basedOn` points at a standard one: write standards first.
    return type === 'product' ? list.sort((a, b) => (a.kind === 'inspiration') - (b.kind === 'inspiration')) : list
  })
  const assets = manifest.files['assets.json'] ? JSON.parse(readFileSync(join(REVIEW, 'assets.json'), 'utf8')) : []
  return { manifest, docs, assets }
}

// ─── Google Drive, read-only ──────────────────────────────────────────────────

let driveTokenPromise
function driveToken() {
  driveTokenPromise ??= (async () => {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    if (!keyPath) fail('GOOGLE_APPLICATION_CREDENTIALS is not set — point it at the sanity-asset-reader key file (kept outside the repo).')
    const key = JSON.parse(readFileSync(keyPath, 'utf8'))
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
    const now = Math.floor(Date.now() / 1000)
    const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
      iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })}`
    const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url')
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
    })
    if (!res.ok) fail(`Google token exchange failed: HTTP ${res.status} ${await res.text()}`)
    return (await res.json()).access_token
  })()
  return driveTokenPromise
}

async function downloadDriveFile(asset) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${asset.driveFileId}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${await driveToken()}` },
  })
  if (!res.ok) throw new Error(`Drive download ${asset.driveFileId} (${asset.name}): HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (asset.md5) {
    const got = createHash('md5').update(buf).digest('hex')
    if (got !== asset.md5) throw new Error(`Drive file ${asset.name} changed since the review (md5 ${got} ≠ ${asset.md5})`)
  }
  return buf
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📦  Catalog fill from review set`)
  console.log(`    review=${REVIEW}`)
  console.log(`    dataset=${DATASET}  mode=${describeMode(args)}`)

  const { docs, assets } = loadReviewSet()
  console.log(`    ${plural(docs.length, 'document')} · ${plural(assets.length, 'image')} — manifest verified`)

  const blocked = docs.filter((d) => d._fill?.action !== 'create' && d._fill?.action !== 'patch')
  if (blocked.length) fail(`${plural(blocked.length, 'document')} without a create/patch action: ${blocked.slice(0, 5).map((d) => d._id).join(', ')}`)

  // ── 2. What the dataset holds now ───────────────────────────────────────────
  const plannedIds = docs.map((d) => d._id)
  const present = new Map()
  for (let i = 0; i < plannedIds.length; i += 500) {
    const slice = plannedIds.slice(i, i + 500)
    // Full content, not just id/type/title: the smart refill compares every owned field.
    const rows = await client.fetch(`*[_id in $ids || _id in $drafts]`, {
      ids: slice,
      drafts: slice.map((id) => `drafts.${id}`),
    })
    for (const r of rows) present.set(r._id, r)
  }

  const errors = []
  const willExistPublished = new Set()
  for (const d of docs) {
    const pub = present.get(d._id)
    const draft = present.get(`drafts.${d._id}`)
    const existing = pub ?? draft
    if (d._fill.action === 'patch') {
      if (!existing) errors.push(`patch target ${d._id} (${d._type} "${d.title}") is not in ${DATASET}.`)
      else if (existing._type !== d._type) errors.push(`patch target ${d._id} is a ${existing._type}, the set says ${d._type}.`)
    } else if (existing) {
      // A create that already exists is a re-run — allowed only if it is plainly the same document.
      if (existing._type !== d._type || (existing.title ?? '') !== (d.title ?? '')) {
        errors.push(`create ${d._id} collides with an existing ${existing._type} "${existing.title}" — refusing to overwrite it.`)
      }
    }
    if (pub || d._fill.publish) willExistPublished.add(d._id)
  }

  // References: in the dataset, or in this set.
  const planned = new Set(plannedIds)
  const refs = new Set()
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') {
      if (typeof v._ref === 'string' && !v._ref.startsWith('drive:')) refs.add(v._ref)
      Object.entries(v).forEach(([k, x]) => k !== '_fill' && walk(x))
    }
  }
  docs.forEach(walk)
  // A target that exists only as `drafts.<id>` is fine: it is written weak below, the shape
  // Studio writes, and strengthens when the target is published. Checking published ids alone
  // rejected every reference to an unlaunched solution or a Hidden style (PROD-2605).
  const outside = [...refs].filter((r) => !planned.has(r))
  const outsideFound = new Set()
  const outsideDraftOnly = new Set()
  for (let i = 0; i < outside.length; i += 500) {
    const ids = outside.slice(i, i + 500)
    const rows = await client.fetch(`*[_id in $ids || _id in $drafts]._id`, { ids, drafts: ids.map((id) => `drafts.${id}`) })
    for (const id of rows) if (!id.startsWith('drafts.')) outsideFound.add(id)
    for (const id of rows) if (id.startsWith('drafts.') && !outsideFound.has(id.slice(7))) outsideDraftOnly.add(id.slice(7))
  }
  for (const id of outsideFound) outsideDraftOnly.delete(id)
  for (const r of outside) if (!outsideFound.has(r) && !outsideDraftOnly.has(r)) errors.push(`reference to ${r}, which is neither in ${DATASET} nor in the review set.`)
  outsideFound.forEach((id) => willExistPublished.add(id))
  if (outsideDraftOnly.size) {
    console.log(`    ${plural(outsideDraftOnly.size, 'referenced document')} outside the set exist only as drafts — those references are written weak and strengthen on publish`)
  }

  const counts = {}
  for (const d of docs) {
    const c = (counts[d._type] ??= { create: 0, patch: 0, publish: 0, draft: 0 })
    c[d._fill.action]++
    c[d._fill.publish ? 'publish' : 'draft']++
  }
  console.log('\n    type                   create  patch  publish  draft')
  for (const [t, c] of Object.entries(counts)) {
    console.log(`    ${t.padEnd(22)} ${String(c.create).padStart(6)}  ${String(c.patch).padStart(5)}  ${String(c.publish).padStart(7)}  ${String(c.draft).padStart(5)}`)
  }

  // Documents this run publishes out of draft, and the weak references that then strengthen.
  const toPublish = docs.filter((d) => d._fill.publish && !present.has(d._id) && present.has(`drafts.${d._id}`)).map((d) => d._id)
  const strengthen = await weakReferencesTo(new Set(toPublish))
  if (toPublish.length) console.log(`\n    drafts to publish: ${toPublish.length} · weak references to strengthen: ${strengthen.refs} in ${plural(strengthen.docs.length, 'document')}`)

  if (errors.length) {
    console.error(`\n✖ ${plural(errors.length, 'preflight error')} — nothing written:`)
    errors.slice(0, 40).forEach((e) => console.error(`  · ${e}`))
    if (errors.length > 40) console.error(`  … and ${errors.length - 40} more`)
    process.exit(1)
  }
  console.log('\n    ✓ preflight: ids, types and references check out')

  // ── 3. Images ───────────────────────────────────────────────────────────────
  const existingAssets = assets.length
    ? await client.fetch(`*[_type == "sanity.imageAsset" && source.name == "google-drive" && source.id in $ids]{ _id, "id": source.id }`, {
        ids: assets.map((a) => a.driveFileId),
      })
    : []
  const assetIdFor = new Map(existingAssets.map((a) => [a.id, a._id]))
  const toUpload = assets.filter((a) => !assetIdFor.has(a.driveFileId))
  console.log(`    images: ${assetIdFor.size} already uploaded, ${toUpload.length} to upload`)

  // A value exactly as it will be written. Leniently (for comparing, and in a dry run) an image
  // not uploaded yet resolves to a marker no stored value can equal — so it counts as a change.
  const docById = new Map(docs.map((d) => [d._id, d]))
  const resolveWith = (lenient) => {
    const resolve = (v) => {
      if (Array.isArray(v)) return v.map(resolve)
      if (!v || typeof v !== 'object') return v
      const out = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x)]))
      if (typeof out._ref === 'string' && out._ref.startsWith('drive:')) {
        const id = assetIdFor.get(out._ref.slice(6))
        if (!id && !lenient) throw new Error(`no uploaded asset for ${out._ref}`)
        out._ref = id ?? `not-uploaded-yet:${out._ref}`
      } else if (typeof out._ref === 'string' && !willExistPublished.has(out._ref)) {
        const target = docById.get(out._ref)
        out._weak = true
        if (target) out._strengthenOnPublish = { type: target._type }
      }
      return out
    }
    return resolve
  }
  const resolveValue = resolveWith(false)
  const resolveLenient = resolveWith(true)

  // ── Smart refill: which owned fields actually differ ─────────────────────────
  // Compared as canonical JSON (object keys sorted; array order kept, since order is content).
  const canon = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x))
  const changedFields = (d, stored) => d._fill.owned.filter((k) => d[k] !== undefined && canon(resolveLenient(d[k])) !== canon(stored?.[k]))
  const publishing = new Set(toPublish)
  const refill = { create: 0, changed: 0, unchanged: 0, fields: new Map() }
  for (const d of docs) {
    const pub = present.get(d._id)
    const draft = present.get(`drafts.${d._id}`)
    if (d._fill.action === 'create' && !pub && !draft) { refill.create++; continue }
    if (publishing.has(d._id)) { refill.changed++; continue } // published out of draft this run: always written
    const changed = new Set([...(pub ? changedFields(d, pub) : []), ...(draft ? changedFields(d, draft) : [])])
    if (!changed.size) { refill.unchanged++; continue }
    refill.changed++
    for (const k of changed) refill.fields.set(`${d._type}.${k}`, (refill.fields.get(`${d._type}.${k}`) ?? 0) + 1)
  }
  const topFields = [...refill.fields].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} ${n}`).join(' · ')
  console.log(`\n    smart refill: ${refill.create} to create · ${refill.changed} to update · ${refill.unchanged} unchanged — not written`)
  if (topFields) console.log(`    fields that change: ${topFields}`)

  if (!apply) {
    const weak = docs.flatMap((d) => [...collectRefs(d)].filter((r) => !willExistPublished.has(r))).length
    console.log(`    references that would be written weak (target stays draft): ${weak}`)
    console.log(`\n    DRY-RUN — dataset=${DATASET}. Nothing written. Re-run with --confirm to write.\n`)
    return
  }

  let uploaded = 0
  const uploadOne = async (a) => {
    const buf = await downloadDriveFile(a)
    const doc = await client.assets.upload('image', buf, {
      filename: a.name,
      contentType: a.mimeType,
      source: { name: 'google-drive', id: a.driveFileId, url: a.url },
    })
    assetIdFor.set(a.driveFileId, doc._id)
    if (++uploaded % 25 === 0) console.log(`    … ${uploaded}/${toUpload.length} images`)
  }
  for (let i = 0; i < toUpload.length; i += 4) await Promise.all(toUpload.slice(i, i + 4).map(uploadOne))
  console.log(`    ✓ ${plural(uploaded, 'image')} uploaded`)

  // ── 4. Documents ────────────────────────────────────────────────────────────
  // A strong reference to a document with no published version is rejected — in a draft
  // as much as in a published document — so those are written weak, as Studio does.

  const draftContent = new Map()
  for (let i = 0; i < toPublish.length; i += 200) {
    const rows = await client.fetch(`*[_id in $ids]`, { ids: toPublish.slice(i, i + 200).map((id) => `drafts.${id}`) })
    for (const r of rows) draftContent.set(r._id, r)
  }

  const log = { dataset: DATASET, startedAt: new Date().toISOString(), written: [], unchanged: [], published: [], strengthened: [] }
  // What each published document holds when the patch loop compares it: its fetched content,
  // or — for one phase 1 publishes out of draft — the draft content phase 1 wrote.
  const fullContent = new Map()
  for (const [id, row] of present) if (!id.startsWith('drafts.')) fullContent.set(id, row)
  let tx = client.transaction()
  let pending = 0
  const flush = async () => {
    if (!pending) return
    await tx.commit({ autoGenerateArrayKeys: false })
    tx = client.transaction()
    pending = 0
  }

  // Phase 1 — publish out of draft, each document EXACTLY as its draft holds it. Its own
  // references to other drafts are weak already, so every write is valid on its own; the
  // fill's fields (which may reference each other strongly) go on in phase 2, once every
  // target exists as a published document.
  for (const id of toPublish) {
    const full = draftContent.get(`drafts.${id}`)
    if (!full) throw new Error(`draft ${id} vanished since the preflight — re-run`)
    const { _id: _drop, _rev, _createdAt, _updatedAt, ...content } = full
    tx.createIfNotExists({ ...content, _id: id })
    tx.delete(`drafts.${id}`)
    present.set(id, { _id: id, _type: full._type, title: full.title })
    fullContent.set(id, { ...content, _id: id })
    present.delete(`drafts.${id}`)
    log.published.push(id)
    pending += 2
    if (pending >= BATCH) await flush()
  }
  await flush()
  if (toPublish.length) console.log(`    ✓ ${plural(toPublish.length, 'draft')} published`)
  for (const d of docs) {
    const owned = d._fill.owned
    const pub = present.get(d._id)
    const draft = present.get(`drafts.${d._id}`)
    const set = Object.fromEntries(owned.filter((k) => d[k] !== undefined).map((k) => [k, resolveValue(d[k])]))

    const targets = []
    let changed = null
    if (d._fill.action === 'create' && !pub && !draft) {
      // A new document gets everything the set holds for it (slug, index defaults …),
      // not only the owned fields — `initialValue` never runs for an API write.
      const { _id, _type, _fill, ...fields } = d
      targets.push(d._fill.publish ? _id : `drafts.${_id}`)
      tx.createIfNotExists({ _id: targets[0], _type, ...resolveValue(fields) })
    } else {
      // Smart refill: each target gets only the fields that differ from what it holds; a
      // target with none is not written. A document published out of draft in phase 1 is
      // compared with what phase 1 just wrote (its draft's content), so it gets the same test.
      changed = {}
      for (const [id, stored] of [[d._id, pub && (fullContent.get(d._id) ?? pub)], [`drafts.${d._id}`, draft]]) {
        if (!stored) continue
        const keys = changedFields(d, stored)
        if (!keys.length) continue
        targets.push(id)
        changed[id] = keys
        tx.patch(id, (p) => p.set(Object.fromEntries(keys.map((k) => [k, set[k]]))))
      }
      if (!targets.length) { log.unchanged.push(d._id); continue }
    }
    log.written.push({ _id: d._id, _type: d._type, action: d._fill.action, targets, ...(changed ? { changed } : {}) })
    pending += targets.length
    if (pending >= BATCH) await flush()
  }
  await flush()

  // Strengthen weak references to what was just published (see header).
  if (strengthen.docs.length) {
    const fresh = await weakReferencesTo(new Set(toPublish))
    for (const { _id, paths } of fresh.docs) {
      tx.patch(_id, (p) => p.unset(paths.flatMap((path) => [`${path}._weak`, `${path}._strengthenOnPublish`])))
      log.strengthened.push({ _id, references: paths.length })
      pending++
      if (pending >= BATCH) await flush()
    }
    await flush()
    console.log(`    ✓ ${plural(fresh.refs, 'weak reference')} strengthened in ${plural(fresh.docs.length, 'document')}`)
  }
  log.finishedAt = new Date().toISOString()
  const logPath = join(REVIEW, `upload-${DATASET}-${log.finishedAt.replace(/[:.]/g, '-')}.json`)
  writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`)
  console.log(`\n    ✓ ${plural(log.written.length, 'document')} written to dataset=${DATASET} · ${plural(log.unchanged.length, 'document')} unchanged, not written`)
  console.log(`    log → ${logPath}`)
  console.log(`    next: open Studio on ${DATASET} and spot-check; run \`sanity documents validate --dataset ${DATASET}\`.\n`)
}

/**
 * Every weak reference to one of `ids`, as Sanity patch paths per document (drafts included).
 * Array items are addressed by `_key`, the way Sanity patches expect.
 */
async function weakReferencesTo(ids) {
  if (!ids.size) return { docs: [], refs: 0 }
  const list = [...ids]
  const holders = new Map()
  for (let i = 0; i < list.length; i += 100) {
    const rows = await client.fetch(`*[references($ids)]`, { ids: list.slice(i, i + 100) })
    for (const r of rows) holders.set(r._id, r)
  }
  const docs = []
  let refs = 0
  for (const doc of holders.values()) {
    const paths = []
    const walk = (v, path) => {
      if (Array.isArray(v)) {
        v.forEach((item, i) => walk(item, `${path}[${item && typeof item === 'object' && item._key ? `_key=="${item._key}"` : i}]`))
      } else if (v && typeof v === 'object') {
        if (typeof v._ref === 'string' && v._weak === true && ids.has(v._ref)) paths.push(path)
        for (const [k, x] of Object.entries(v)) if (!k.startsWith('_')) walk(x, path ? `${path}.${k}` : k)
      }
    }
    walk(doc, '')
    if (paths.length) {
      docs.push({ _id: doc._id, paths })
      refs += paths.length
    }
  }
  return { docs, refs }
}

function collectRefs(doc) {
  const out = new Set()
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') {
      if (typeof v._ref === 'string' && !v._ref.startsWith('drive:')) out.add(v._ref)
      Object.entries(v).forEach(([k, x]) => k !== '_fill' && walk(x))
    }
  }
  walk(doc)
  return out
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}\n`)
  process.exit(1)
})
