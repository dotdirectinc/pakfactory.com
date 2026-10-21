#!/usr/bin/env node
/**
 * Upload the Inspiration product PNGs from Google Drive into each product's `images` (PROD-3010).
 *
 *   pnpm --filter @pakfactory/studio run upload:inspiration-images -- --dataset development --solution "03-Beer"
 *   pnpm --filter @pakfactory/studio run upload:inspiration-images -- --dataset development --solution "03-Beer" --confirm
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content — agents never write
 * documents).
 *
 * The Standard sibling is upload-standard-product-images.mjs; this one differs where the
 * Drive layout and the naming rules differ.
 *
 * ── Source ───────────────────────────────────────────────────────────────────
 *
 * The shared drive "03_Inspiration Product Images Sanity", read through Google Drive for
 * Desktop on this machine: <solution>/[SKU] Title/02-Edited/*.png. Only PNGs directly inside a
 * product's 02-Edited are taken — the .jpg twins and the "99-Not Selected" / "_for review"
 * subfolders are ignored. Product folders named "[NA] …" (Not Active) are skipped. Names and
 * Drive file ids come from Drive for Desktop's metadata database; bytes are read from the
 * mount. Naming rules: https://claude.ai/artifact/L2Y8otoiq1NTMW999kSr7R
 *
 * A product that belongs to several solutions has a folder in each. Every copy must be
 * byte-identical (they were made so on 20 Oct); the run compares the chosen solution's copy
 * with every copy in the other launching solutions. "[NA] …" solution folders are out of
 * scope and never compared.
 *
 * ── What it refuses ──────────────────────────────────────────────────────────
 *
 *   · A product whose copies in other solution folders are not byte-identical.
 *   · The same image twice in one product.
 *   · Two different products holding a byte-identical PNG — almost always a misfiled image.
 *     Both are skipped. --skip SKU,SKU leaves out any others on purpose.
 *   · A SKU with no product, or more than one, or one whose status is not `active`.
 *   · A product that already has other `images`, unless --replace.
 *
 * ── What it writes ───────────────────────────────────────────────────────────
 *
 *   · Each PNG is uploaded once, `source: { name: 'google-drive', id: <fileId>, url }`. A file
 *     whose bytes are already in the dataset (same sha1) is reused — so the second solution
 *     a product appears in finds it up to date.
 *   · Each asset gets the `product` media tag (sanity-plugin-media).
 *   · `images` on the published product, and on `drafts.<id>` when one exists. One patch per
 *     product. `lifestyleImages` and the video fields are never touched.
 *   · Order: by view, then by number (angled-view-1, angled-view-2, …). The first is `primary`.
 *   · `alt`: "<product title>, <view>", e.g. "Custom Beer Carrier, angled view 2".
 *   · With --replace: an image asset the replaced `images` held is deleted once nothing in the
 *     dataset references it any more. One still referenced elsewhere is kept and listed.
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
  pnpm --filter @pakfactory/studio run upload:inspiration-images -- --dataset <name> --solution "<solution folder>" [--only SKU,SKU] [--skip SKU,SKU] [--replace] [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --solution        REQUIRED. The solution folder, exactly as on Drive, e.g. "03-Beer".
  --only            Limit to these SKUs (comma-separated).
  --skip            Leave these SKUs out (comma-separated).
  --replace         Overwrite products that already have other images, and delete the old
                    image assets nothing else uses.
  --drive-root      The "03_Inspiration Product Images Sanity" folder on this Mac, if it is not found automatically.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`

const args = parseScriptArgs({ usage: USAGE, values: ['solution', 'only', 'skip', 'drive-root'], flags: ['replace'] })
const { confirm: apply, dataset: DATASET } = args
if (!args.solution) fail(`--solution is required.\n\n${USAGE}`)
const skuList = (v) => (v ? new Set(v.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)) : null)
const ONLY = skuList(args.only)
const SKIP = skuList(args.skip) ?? new Set()

/** The shared-drive folder "03_Inspiration Product Images Sanity". */
const ROOT_FOLDER_ID = '15QpsQtt650QRtzkii0VPHLxSMziJpWO0'
const ROOT_FOLDER_NAME = '03_Inspiration Product Images Sanity'
/** "[COR-013-BR1] Custom Beer Carrier" — Inspiration SKUs carry the solution code and a number. */
const SKU_FOLDER = /^\[([A-Z]{3}-\d{3}-[A-Z]{2}\d+)\] /
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
  fail('Drive for Desktop has no metadata for the Inspiration product images folder on this Mac.')
}

/** The PNGs directly inside one product folder's 02-Edited, and anything else found there. */
function productFiles(children, solution, prod, driveRoot, sku) {
  const edited = children(prod.stable_id).find((i) => i.is_folder && i.local_title === '02-Edited')
  const files = []
  const other = []
  for (const f of edited ? children(edited.stable_id) : []) {
    if (f.is_folder) continue
    if (!f.local_title.toLowerCase().endsWith('.png')) {
      if (!f.local_title.toLowerCase().endsWith('.jpg')) other.push(`${sku} › ${f.local_title}`)
      continue
    }
    files.push({
      name: f.local_title,
      driveId: f.id,
      path: join(driveRoot, solution.local_title, prod.local_title, '02-Edited', f.local_title),
    })
  }
  return { files, other }
}

/** The chosen solution's products, and every other copy of each of them under the root. */
function collectSolution(tree, driveRoot) {
  const children = (sid) => tree.kids.get(sid) ?? []
  const solutions = children(tree.rootStableId).filter((i) => i.is_folder)
  const solution = solutions.find((i) => i.local_title === args.solution)
  if (!solution) fail(`No solution folder "${args.solution}". Solution folders: ${solutions.map((i) => i.local_title).sort().join(' · ')}`)

  const bySku = new Map()
  const skipped = { notActive: 0, notPng: [], byFlag: new Set() }
  for (const prod of children(solution.stable_id).filter((i) => i.is_folder)) {
    if (prod.local_title.startsWith('[NA]')) { skipped.notActive++; continue }
    const m = prod.local_title.match(SKU_FOLDER)
    if (!m) { skipped.notPng.push(`${prod.local_title} (no [SKU] in the folder name)`); continue }
    const sku = m[1]
    if (ONLY && !ONLY.has(sku)) continue
    if (SKIP.has(sku)) { skipped.byFlag.add(sku); continue }
    const { files, other } = productFiles(children, solution, prod, driveRoot, sku)
    skipped.notPng.push(...other)
    bySku.set(sku, { folder: prod.local_title, files, twins: [] })
  }

  // Copies in the other launching solution folders, compared file by file in the next step.
  for (const sol of solutions) {
    if (sol.stable_id === solution.stable_id || sol.local_title.startsWith('[NA]')) continue
    for (const prod of children(sol.stable_id).filter((i) => i.is_folder)) {
      const sku = prod.local_title.match(SKU_FOLDER)?.[1]
      if (!sku || !bySku.has(sku)) continue
      bySku.get(sku).twins.push({ solution: sol.local_title, ...productFiles(children, sol, prod, driveRoot, sku) })
    }
  }
  return { bySku, skipped }
}

// ─── 2. Order, alt, primary ──────────────────────────────────────────────────

const VIEW_RANK = [/^angle/, /^front/, /^side/, /^top/, /^bottom/, /^close-up/]

/** solution_product_view[-state][-N].png → the view part, its base without the number, and N. */
function parseName(name) {
  const view = name.replace(/\.png$/i, '').split('_').slice(2).join('_') || null
  const tail = view?.match(/-(\d+)$/)
  return { view, viewBase: view ? view.replace(/-\d+$/, '') : null, number: tail ? Number(tail[1]) : 0 }
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
      (a.parsed.viewBase ?? '').localeCompare(b.parsed.viewBase ?? '') ||
      a.parsed.number - b.parsed.number ||
      a.name.localeCompare(b.name),
    )
}

function altFor(title, p) {
  return p.view ? `${title}, ${p.view.replace(/-/g, ' ')}` : title
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
  console.log('\n🖼   Inspiration product images → Sanity')
  console.log(`    solution="${args.solution}"${ONLY ? `  only=${[...ONLY].join(',')}` : ''}`)
  console.log(`    dataset=${DATASET}  mode=${describeMode(args)}${args.replace ? '  --replace' : ''}`)

  const driveRoot = findDriveRoot()
  const { bySku, skipped } = collectSolution(readDriveTree(), driveRoot)
  const copies = [...bySku.values()].reduce((n, p) => n + p.twins.length, 0)
  console.log(`    Drive: ${plural(bySku.size, 'product')} in the solution · ${plural(copies, 'copy', 'copies')} in other launching solutions checked · ${skipped.notActive} [NA] folders skipped`)
  if (skipped.byFlag.size) console.log(`    skipped by --skip: ${[...skipped.byFlag].sort().join(', ')}`)
  if (skipped.notPng.length) {
    console.log(`    not uploaded (not a PNG/JPG or no SKU): ${skipped.notPng.length}`)
    skipped.notPng.forEach((s) => console.log(`      · ${s}`))
  }

  // Bytes, and the copies-must-match rule.
  const needsPick = []
  const empty = []
  const plan = new Map() // sku → [{ name, driveId, buf, hash }]
  for (const [sku, prod] of [...bySku].sort(([a], [b]) => a.localeCompare(b))) {
    if (!prod.files.length) { empty.push(sku); continue }
    const names = prod.files.map((f) => f.name).sort().join('|')
    const offName = prod.twins.find((t) => t.files.map((f) => f.name).sort().join('|') !== names)
    if (offName) { needsPick.push(`${sku}: file names differ between ${args.solution} and ${offName.solution}`); continue }
    const files = []
    let differs = null
    for (const f of prod.files) {
      if (!existsSync(f.path)) fail(`${f.path} is listed by Drive but not on the mount — is Drive for Desktop syncing?`)
      const buf = readFileSync(f.path)
      const hash = sha1(buf)
      for (const twin of prod.twins) {
        const copy = twin.files.find((x) => x.name === f.name)
        if (!existsSync(copy.path)) fail(`${copy.path} is listed by Drive but not on the mount — is Drive for Desktop syncing?`)
        if (sha1(readFileSync(copy.path)) !== hash) differs = `${sku}: ${f.name} differs between ${args.solution} and ${twin.solution}`
      }
      files.push({ ...f, buf, hash })
    }
    if (differs) { needsPick.push(differs); continue }
    const seen = new Map()
    const twice = files.filter((f) => (seen.has(f.hash) ? true : (seen.set(f.hash, f.name), false)))
    if (twice.length) { needsPick.push(`${sku}: the same image twice — ${twice.map((f) => `${seen.get(f.hash)} = ${f.name}`).join('; ')}`); continue }
    plan.set(sku, files)
  }
  // The same image under two different products is almost always a misfiled file.
  const owners = new Map()
  for (const [sku, files] of plan) for (const f of files) {
    if (!owners.has(f.hash)) owners.set(f.hash, [])
    owners.get(f.hash).push(`${sku} ${f.name}`)
  }
  for (const list of owners.values()) {
    const skus = [...new Set(list.map((x) => x.split(' ')[0]))]
    if (skus.length < 2) continue
    needsPick.push(`same image in ${skus.join(' and ')}: ${list.map((x) => x.split(' ')[1]).join(' = ')}`)
    skus.forEach((s) => plan.delete(s))
  }
  if (empty.length) console.log(`    no PNGs in 02-Edited (skipped): ${empty.join(', ')}`)
  if (needsPick.length) {
    console.log(`\n    ⚠ skipped — fix on Drive first:`)
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
  // already ARE what this run would write (a re-run): then it stays in and writes nothing.
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

  // With --replace, the assets the old `images` held that this run does not reuse.
  const newAssets = new Set(hashes.map((h) => assetFor.get(h)).filter(Boolean))
  const replaced = args.replace
    ? [...new Set(targets.flatMap((t) => [t.published, t.draft].filter(Boolean).flatMap((d) => (d.images ?? []).map((i) => i.asset?._ref))))]
      .filter((id) => id && !newAssets.has(id))
    : []

  const upToDate = targets.filter((t) => { const n = imagesFor(t, assetFor); return n && [t.published, t.draft].filter(Boolean).every((d) => same(d.images, n)) }).length
  console.log(`\n    ${plural(targets.length - upToDate, 'product')} to write · ${upToDate} already up to date · ${plural(hashes.length, 'PNG')} · ${hashes.length - toUpload.length} already in ${DATASET}, ${toUpload.length} to upload`)
  if (args.replace) console.log(`    --replace: ${plural(replaced.length, 'old image asset')} to delete once nothing references it`)
  for (const t of targets) {
    const n = imagesFor(t, assetFor)
    const current = n && [t.published, t.draft].filter(Boolean).every((d) => same(d.images, n))
    const note = current ? '  (already up to date)' : t.hasImages ? '  (replaces its images)' : ''
    console.log(`\n    ${t.sku}  ${t.title}${t.draft ? '  (+ draft)' : ''}${note}`)
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
  const log = { dataset: DATASET, solution: args.solution, at: new Date().toISOString(), products: [], deletedAssets: [], keptAssets: [] }
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
    log.products.push({
      sku: t.sku,
      id: t.id,
      replaced: t.hasImages ? (t.published ?? t.draft).images.map((i) => i.asset?._ref) : undefined,
      images: t.files.map((f, i) => ({ file: f.name, driveId: f.driveId, asset: images[i].asset._ref, primary: images[i].primary })),
    })
    if (pending >= BATCH) { await tx.commit({ autoGenerateArrayKeys: false }); tx = client.transaction(); pending = 0 }
  }
  if (pending) await tx.commit({ autoGenerateArrayKeys: false })
  console.log(`    ✓ ${plural(written, 'product')} written · ${unchanged} already up to date`)

  // Old assets: delete only what nothing references any more (drafts and other documents included).
  if (replaced.length) {
    const stillUsed = new Set(await client.fetch(`*[_id in $ids && count(*[references(^._id)]) > 0]._id`, { ids: replaced }))
    const orphans = replaced.filter((id) => !stillUsed.has(id))
    for (let i = 0; i < orphans.length; i += BATCH) {
      const del = client.transaction()
      orphans.slice(i, i + BATCH).forEach((id) => del.delete(id))
      await del.commit()
    }
    log.deletedAssets = orphans
    log.keptAssets = [...stillUsed]
    console.log(`    ✓ ${plural(orphans.length, 'old image asset')} deleted${stillUsed.size ? ` · ${stillUsed.size} kept (still referenced): ${[...stillUsed].join(', ')}` : ''}`)
  }

  const logPath = join(tmpdir(), `upload-inspiration-images-${DATASET}-${Date.now()}.json`)
  writeFileSync(logPath, JSON.stringify(log, null, 2))
  console.log(`    log: ${logPath}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
