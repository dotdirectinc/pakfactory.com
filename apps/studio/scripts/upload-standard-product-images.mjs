#!/usr/bin/env node
/**
 * Upload the Standard product PNGs from Google Drive into each product's `images` (PROD-3023).
 *
 *   pnpm --filter @pakfactory/studio run upload:product-images -- --dataset development --line "12-Fabric Gift Bags & Pouches"
 *   pnpm --filter @pakfactory/studio run upload:product-images -- --dataset development --line "12-Fabric Gift Bags & Pouches" --confirm
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content — agents never write
 * documents).
 *
 * ── Source ───────────────────────────────────────────────────────────────────
 *
 * The shared drive "02_Product Images Sanity", read through Google Drive for Desktop on this
 * machine: <line>/<style>/[SKU] Title/02-Edited/*.png. Only PNGs directly inside a product's
 * 02-Edited are taken — the .jpg twins, 01-Originals and loose files are ignored. Folders
 * named "[INTERNAL] …" are skipped. Names and Drive file ids come from Drive for Desktop's
 * metadata database; bytes are read from the mount. Naming rules:
 * https://claude.ai/artifact/H3xzmQPkcVhjvGULcK3fHk
 *
 * ── What it refuses ──────────────────────────────────────────────────────────
 *
 *   · A product whose copies in different style folders are not byte-identical — someone has
 *     to pick which copy is right first. Listed, skipped; the rest of the line goes ahead.
 *   · A SKU with no product, or more than one, or one whose status is not `active`.
 *   · A product that already has `images`, unless --replace.
 *
 * ── What it writes ───────────────────────────────────────────────────────────
 *
 *   · Each PNG is uploaded once, `source: { name: 'google-drive', id: <fileId>, url }` — the
 *     shape fill:catalog uses, so either script reuses the other's assets. A file whose bytes
 *     are already in the dataset (same sha1) is reused, not uploaded again.
 *   · Each asset gets the `product` media tag (sanity-plugin-media), which Studio only applies
 *     when an editor picks the image by hand.
 *   · `images` on the published product, and on `drafts.<id>` when one exists (otherwise the
 *     stale draft reverts the upload when someone presses Publish). One patch per product.
 *   · Order: angled, front, side, top, bottom, close-up, then any other view; within a view
 *     the plain image before colour variants, then by number. The first is `primary`.
 *   · `alt`: "<product title>, <colour>, <view>", e.g. "Burlap/Jute Drawstring Bags, kraft,
 *     front view". Editable in Studio.
 *
 * Re-running is safe: assets are reused, and a product whose `images` already equal what
 * this would write is not touched.
 *
 * ── Environment ──────────────────────────────────────────────────────────────
 *
 *   SANITY_API_WRITE_TOKEN   (root .env.local) — required for --confirm
 *   Google Drive for Desktop, signed in, with the Marketing shared drive available.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { execFileSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run upload:product-images -- --dataset <name> --line "<line folder>" [--only SKU,SKU] [--replace] [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --line            REQUIRED. The line folder, exactly as on Drive, e.g. "12-Fabric Gift Bags & Pouches".
  --only            Limit to these SKUs (comma-separated).
  --replace         Overwrite products that already have images.
  --drive-root      The "02_Product Images Sanity" folder on this Mac, if it is not found automatically.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`

const args = parseScriptArgs({ usage: USAGE, values: ['line', 'only', 'drive-root'], flags: ['replace'] })
const { confirm: apply, dataset: DATASET } = args
if (!args.line) fail(`--line is required.\n\n${USAGE}`)
const ONLY = args.only ? new Set(args.only.split(',').map((s) => s.trim()).filter(Boolean)) : null

/** The shared-drive folder "02_Product Images Sanity". */
const ROOT_FOLDER_ID = '16vpFB8XqfWHNuslE-TxJiJZ4RmIxBj2x'
const ROOT_FOLDER_NAME = '02_Product Images Sanity'
const MEDIA_TAG = 'product'
const UPLOADS_AT_ONCE = 4
const BATCH = 50

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || '8293wrxp'
const TOKEN = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN
if (!TOKEN) fail('Missing Sanity token in .env.local.')
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

function fail(msg) {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const sha1 = (buf) => createHash('sha1').update(buf).digest('hex')
const key = () => randomBytes(6).toString('hex')

// ─── 1. Drive, through Drive for Desktop ──────────────────────────────────────

function findDriveRoot() {
  if (args.driveRoot) return args.driveRoot
  const cloud = join(homedir(), 'Library/CloudStorage')
  if (existsSync(cloud)) {
    for (const acct of readdirSync(cloud).filter((d) => d.startsWith('GoogleDrive-'))) {
      const p = join(cloud, acct, 'Shared drives/Marketing/Assets', ROOT_FOLDER_NAME)
      if (existsSync(p)) return p
    }
  }
  fail(`Could not find "${ROOT_FOLDER_NAME}" under ~/Library/CloudStorage. Pass --drive-root.`)
}

/** Drive for Desktop's metadata db: real Drive ids and names (a "/" in a name shows as a space on the mount, not here). */
function readDriveTree() {
  const base = join(homedir(), 'Library/Application Support/Google/DriveFS')
  const dbs = existsSync(base)
    ? readdirSync(base).map((d) => join(base, d, 'metadata_sqlite_db')).filter((p) => existsSync(p))
    : []
  const tmp = mkdtempSync(join(tmpdir(), 'drivefs-'))
  try {
    for (const db of dbs) {
      // A copy, read-only: Drive for Desktop keeps the live file open.
      const copy = join(tmp, 'meta.db')
      execFileSync('sqlite3', [`file:${db}?mode=ro`, `.backup ${copy}`])
      const q = (sql) => JSON.parse(execFileSync('sqlite3', ['-json', copy, sql], { maxBuffer: 1 << 28 }).toString() || '[]')
      const root = q(`select stable_id from items where id = '${ROOT_FOLDER_ID}'`)[0]
      if (!root) continue
      const items = new Map(
        q('select stable_id, id, local_title, is_folder, trashed, is_tombstone, file_size from items').map((r) => [r.stable_id, r]),
      )
      const kids = new Map()
      for (const { item_stable_id: c, parent_stable_id: p } of q('select item_stable_id, parent_stable_id from stable_parents')) {
        const it = items.get(c)
        if (!it || it.trashed || it.is_tombstone) continue
        if (!kids.has(p)) kids.set(p, [])
        kids.get(p).push(it)
      }
      return { rootStableId: root.stable_id, kids }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
  fail('Drive for Desktop has no metadata for the Standard product images folder on this Mac.')
}

function collectLine(tree, driveRoot) {
  const children = (sid) => tree.kids.get(sid) ?? []
  const line = children(tree.rootStableId).find((i) => i.is_folder && i.local_title === args.line)
  if (!line) {
    const names = children(tree.rootStableId).filter((i) => i.is_folder).map((i) => i.local_title).sort()
    fail(`No line folder "${args.line}". Line folders: ${names.join(' · ')}`)
  }
  const bySku = new Map()
  const skipped = { internal: 0, notPng: [] }
  for (const style of children(line.stable_id).filter((i) => i.is_folder)) {
    for (const prod of children(style.stable_id).filter((i) => i.is_folder)) {
      if (prod.local_title.startsWith('[INTERNAL]')) { skipped.internal++; continue }
      const m = prod.local_title.match(/^\[([A-Z]{3}-\d{3})\] /)
      if (!m) { skipped.notPng.push(`${style.local_title} › ${prod.local_title} (no [SKU] in the folder name)`); continue }
      const sku = m[1]
      if (ONLY && !ONLY.has(sku)) continue
      const edited = children(prod.stable_id).find((i) => i.is_folder && i.local_title === '02-Edited')
      const files = []
      for (const f of edited ? children(edited.stable_id) : []) {
        if (f.is_folder) continue
        if (!f.local_title.toLowerCase().endsWith('.png')) {
          if (!f.local_title.toLowerCase().endsWith('.jpg')) skipped.notPng.push(`${sku} › ${f.local_title}`)
          continue
        }
        files.push({
          name: f.local_title,
          driveId: f.id,
          path: join(driveRoot, line.local_title, style.local_title, prod.local_title, '02-Edited', f.local_title),
        })
      }
      if (!bySku.has(sku)) bySku.set(sku, [])
      bySku.get(sku).push({ style: style.local_title, folder: prod.local_title, files })
    }
  }
  return { bySku, skipped }
}

// ─── 2. Order, alt, primary ──────────────────────────────────────────────────

const VIEW_RANK = [/^angle/, /^front/, /^side/, /^top/, /^bottom/, /^close-up/]

/** line_product_[colour_]view[-N].png → parts. A name without a view part (Box Inserts) keeps only the product. */
function parseName(name) {
  const stem = name.replace(/\.png$/i, '')
  const parts = stem.split('_')
  let colour = null
  let view = null
  if (parts.length >= 4) [colour, view] = [parts[2], parts.slice(3).join('_')]
  else if (parts.length === 3) view = parts[2]
  const tail = (view ?? parts[1] ?? '').match(/-(\d+)$/)
  const number = tail ? Number(tail[1]) : 0
  const viewBase = view ? view.replace(/-\d+$/, '') : null
  return { colour, view, viewBase, number }
}

function orderImages(files) {
  const rank = (p) => {
    if (!p.viewBase) return VIEW_RANK.length + 1
    const i = VIEW_RANK.findIndex((re) => re.test(p.viewBase))
    return i === -1 ? VIEW_RANK.length : i
  }
  return files
    .map((f) => ({ ...f, parsed: parseName(f.name) }))
    .sort((a, b) =>
      rank(a.parsed) - rank(b.parsed) ||
      (a.parsed.colour ? 1 : 0) - (b.parsed.colour ? 1 : 0) ||
      (a.parsed.colour ?? '').localeCompare(b.parsed.colour ?? '') ||
      (a.parsed.viewBase ?? '').localeCompare(b.parsed.viewBase ?? '') ||
      a.parsed.number - b.parsed.number ||
      a.name.localeCompare(b.name),
    )
}

function altFor(title, p) {
  const words = (s) => s.replace(/-/g, ' ')
  const bits = [title]
  if (p.colour) bits.push(words(p.colour))
  if (p.view) bits.push(words(p.view))
  else if (p.number) bits.push(String(p.number))
  return bits.join(', ')
}

/** The `images` value for a product, or null while any of its PNGs has no asset yet. */
function imagesFor(t, assetFor) {
  if (t.files.some((f) => !assetFor.has(f.hash))) return null
  return t.files.map((f, i) => ({
    _type: 'image',
    _key: key(),
    asset: { _type: 'reference', _ref: assetFor.get(f.hash) },
    alt: altFor(t.title, f.parsed),
    primary: i === 0,
  }))
}

/** Same images, same order, alt and primary — `_key`s aside. */
const same = (stored, next) =>
  JSON.stringify((stored ?? []).map((i) => [i.asset?._ref, i.alt, !!i.primary])) === JSON.stringify(next.map((i) => [i.asset._ref, i.alt, i.primary]))

// ─── 3. Run ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🖼   Standard product images → Sanity')
  console.log(`    line="${args.line}"${ONLY ? `  only=${[...ONLY].join(',')}` : ''}`)
  console.log(`    dataset=${DATASET}  mode=${describeMode(args)}${args.replace ? '  --replace' : ''}`)

  const driveRoot = findDriveRoot()
  const { bySku, skipped } = collectLine(readDriveTree(), driveRoot)
  console.log(`    Drive: ${plural(bySku.size, 'product')} in the line · ${skipped.internal} internal folders skipped`)
  if (skipped.notPng.length) {
    console.log(`    not uploaded (not a PNG/JPG or no SKU): ${skipped.notPng.length}`)
    skipped.notPng.forEach((s) => console.log(`      · ${s}`))
  }

  // Bytes, and the copies-must-match rule.
  const needsPick = []
  const empty = []
  const plan = new Map() // sku → [{ name, driveId, buf, hash }]
  for (const [sku, copies] of [...bySku].sort(([a], [b]) => a.localeCompare(b))) {
    const names = copies.map((c) => c.files.map((f) => f.name).sort().join('|'))
    if (new Set(names).size > 1) { needsPick.push(`${sku}: file names differ between ${copies.map((c) => c.style).join(' / ')}`); continue }
    if (!copies[0].files.length) { empty.push(sku); continue }
    const files = []
    let differs = null
    for (const f of copies[0].files) {
      if (!existsSync(f.path)) fail(`${f.path} is listed by Drive but not on the mount — is Drive for Desktop syncing?`)
      const buf = readFileSync(f.path)
      const hash = sha1(buf)
      for (const other of copies.slice(1)) {
        const twin = other.files.find((x) => x.name === f.name)
        if (sha1(readFileSync(twin.path)) !== hash) differs = `${sku}: ${f.name} differs between ${copies[0].style} and ${other.style}`
      }
      files.push({ ...f, buf, hash })
    }
    if (differs) { needsPick.push(differs); continue }
    plan.set(sku, files)
  }
  if (empty.length) console.log(`    no PNGs in 02-Edited (skipped): ${empty.join(', ')}`)
  if (needsPick.length) {
    console.log(`\n    ⚠ ${plural(needsPick.length, 'product')} skipped — style copies differ, pick one first:`)
    needsPick.forEach((s) => console.log(`      · ${s}`))
  }

  // Products in the dataset, matched by SKU.
  const skus = [...plan.keys()]
  const docs = await client.fetch(
    `*[_type == "product" && sku in $skus && !(_id in path("versions.**"))]{ _id, sku, title, status, images }`,
    { skus },
  )
  const byProduct = new Map()
  for (const d of docs) {
    const id = d._id.replace(/^drafts\./, '')
    if (!byProduct.has(d.sku)) byProduct.set(d.sku, new Map())
    const ids = byProduct.get(d.sku)
    if (!ids.has(id)) ids.set(id, {})
    ids.get(id)[d._id.startsWith('drafts.') ? 'draft' : 'published'] = d
  }

  const refused = []
  const targets = []
  for (const sku of skus) {
    const ids = byProduct.get(sku)
    if (!ids) { refused.push(`${sku}: no product with this SKU in ${DATASET}`); continue }
    if (ids.size > 1) { refused.push(`${sku}: ${ids.size} products share this SKU (${[...ids.keys()].join(', ')})`); continue }
    const [[id, { published, draft }]] = [...ids]
    const doc = published ?? draft
    if (doc.status !== 'active') { refused.push(`${sku}: status is "${doc.status}", not active`); continue }
    const hasImages = (published?.images?.length ?? 0) + (draft?.images?.length ?? 0) > 0
    targets.push({ sku, id, published, draft, hasImages, title: doc.title, files: orderImages(plan.get(sku)) })
  }

  // Assets already in the dataset, by content.
  const allHashes = [...new Set(targets.flatMap((t) => t.files.map((f) => f.hash)))]
  const existing = allHashes.length
    ? await client.fetch(`*[_type == "sanity.imageAsset" && sha1hash in $hashes]{ _id, sha1hash }`, { hashes: allHashes })
    : []
  const assetFor = new Map(existing.map((a) => [a.sha1hash, a._id]))

  // A product that already has images is left alone unless --replace — except when its images
  // already ARE what this run would write (a re-run): then it stays in, writes nothing, and its
  // assets still get checked for the media tag.
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i]
    if (!t.hasImages || args.replace) continue
    const next = imagesFor(t, assetFor)
    const upToDate = next && [t.published, t.draft].filter(Boolean).every((d) => same(d.images, next))
    if (!upToDate) { refused.push(`${t.sku}: already has other images — pass --replace to overwrite`); targets.splice(i, 1) }
  }
  if (refused.length) {
    console.log(`\n    ⚠ ${plural(refused.length, 'product')} not written:`)
    refused.forEach((s) => console.log(`      · ${s}`))
  }
  const hashes = [...new Set(targets.flatMap((t) => t.files.map((f) => f.hash)))]
  const toUpload = hashes.filter((h) => !assetFor.has(h))

  const upToDate = targets.filter((t) => { const n = imagesFor(t, assetFor); return n && [t.published, t.draft].filter(Boolean).every((d) => same(d.images, n)) }).length
  console.log(`\n    ${plural(targets.length - upToDate, 'product')} to write · ${upToDate} already up to date · ${plural(hashes.length, 'PNG')} · ${hashes.length - toUpload.length} already in ${DATASET}, ${toUpload.length} to upload`)
  for (const t of targets) {
    console.log(`\n    ${t.sku}  ${t.title}${t.draft ? '  (+ draft)' : ''}`)
    t.files.forEach((f, i) => console.log(`      ${i === 0 ? '★' : ' '} ${f.name}\n          alt: ${altFor(t.title, f.parsed)}`))
  }

  if (!apply) {
    console.log(`\n    DRY-RUN — dataset=${DATASET}. Nothing written. Re-run with --confirm to write.\n`)
    return
  }
  if (!targets.length) { console.log('\n    Nothing to write.\n'); return }

  // Media tag document (created only if no editor has used the tag yet).
  let tag = await client.fetch(`*[_type == "media.tag" && name.current == $name][0]{ _id }`, { name: MEDIA_TAG })
  tag ??= await client.create({ _type: 'media.tag', name: { _type: 'slug', current: MEDIA_TAG } })

  const fileByHash = new Map(targets.flatMap((t) => t.files.map((f) => [f.hash, f])))
  let uploaded = 0
  const uploadOne = async (hash) => {
    const f = fileByHash.get(hash)
    const doc = await client.assets.upload('image', f.buf, {
      filename: f.name,
      contentType: 'image/png',
      source: { name: 'google-drive', id: f.driveId, url: `https://drive.google.com/file/d/${f.driveId}/view` },
    })
    assetFor.set(hash, doc._id)
    if (++uploaded % 25 === 0) console.log(`    … ${uploaded}/${toUpload.length} uploaded`)
  }
  for (let i = 0; i < toUpload.length; i += UPLOADS_AT_ONCE) await Promise.all(toUpload.slice(i, i + UPLOADS_AT_ONCE).map(uploadOne))
  console.log(`    ✓ ${plural(uploaded, 'PNG')} uploaded`)

  // Tag every asset this run uses (idempotent: only assets missing the tag are patched).
  const assetIds = [...new Set(targets.flatMap((t) => t.files.map((f) => assetFor.get(f.hash))))]
  // Ask which ones already HAVE the tag, not which ones lack it: an asset uploaded a moment
  // ago may not be queryable yet, and a "lacks it" query silently skips it (FAB-024, 15 Oct).
  const tagged = new Set(await client.fetch(`*[_id in $ids && $tag in opt.media.tags[]._ref]._id`, { ids: assetIds, tag: tag._id }))
  const untagged = assetIds.filter((id) => !tagged.has(id))
  for (let i = 0; i < untagged.length; i += BATCH) {
    const tx = client.transaction()
    for (const id of untagged.slice(i, i + BATCH)) {
      tx.patch(id, (p) => p.setIfMissing({ opt: {} }).setIfMissing({ 'opt.media': {} }).setIfMissing({ 'opt.media.tags': [] })
        .append('opt.media.tags', [{ _key: key(), _type: 'reference', _ref: tag._id, _weak: true }]))
    }
    await tx.commit()
  }
  console.log(`    ✓ media tag "${MEDIA_TAG}" on ${plural(untagged.length, 'asset')}`)

  // Products: one patch each, published and draft.
  const log = { dataset: DATASET, line: args.line, at: new Date().toISOString(), products: [] }
  let written = 0
  let unchanged = 0
  let tx = client.transaction()
  let pending = 0
  for (const t of targets) {
    const images = imagesFor(t, assetFor)
    const ids = [t.published && t.id, t.draft && `drafts.${t.id}`].filter(Boolean)
    const changing = ids.filter((id) => !same((id.startsWith('drafts.') ? t.draft : t.published)?.images, images))
    if (!changing.length) { unchanged++; continue }
    for (const id of changing) { tx.patch(id, (p) => p.set({ images })); pending++ }
    written++
    log.products.push({ sku: t.sku, id: t.id, images: t.files.map((f, i) => ({ file: f.name, driveId: f.driveId, asset: images[i].asset._ref, primary: images[i].primary })) })
    if (pending >= BATCH) { await tx.commit({ autoGenerateArrayKeys: false }); tx = client.transaction(); pending = 0 }
  }
  if (pending) await tx.commit({ autoGenerateArrayKeys: false })
  console.log(`    ✓ ${plural(written, 'product')} written · ${unchanged} already up to date`)

  const logPath = join(tmpdir(), `upload-product-images-${DATASET}-${Date.now()}.json`)
  writeFileSync(logPath, JSON.stringify(log, null, 2))
  console.log(`    log: ${logPath}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
