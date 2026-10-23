#!/usr/bin/env node
/**
 * Upload the Customization option PNGs from Google Drive into each option's `images` (PROD-3031).
 *
 *   pnpm --filter @pakfactory/studio run upload:customization-images -- --dataset development --category "1-Materials"
 *   pnpm --filter @pakfactory/studio run upload:customization-images -- --dataset development --category "1-Materials" --confirm
 *
 * Written by an agent, RUN BY A HUMAN (AGENTS.md § Sanity content — agents never write
 * documents).
 *
 * The product siblings are upload-standard-product-images.mjs and
 * upload-inspiration-product-images.mjs; this one differs where the Drive layout, the naming
 * rules and the document type differ.
 *
 * ── Source ───────────────────────────────────────────────────────────────────
 *
 * The shared drive "04_Customization Images Sanity", read through Google Drive for Desktop on
 * this machine: <category>/<type>/<option>/02-Edited/*.png. Only PNGs directly inside an
 * option's 02-Edited are taken — the .jpg twins, 01-Originals and 03-Optimized are ignored.
 * Skipped folders: "[Skip] …" (First Launch unchecked in Notion), "_for review" and anything
 * else starting with "_", and the root "99-Unmatched" pool. The temporary tags at the front of
 * an option folder ("[New] ", "[Regenerate] ", "[Extra] ") are not part of its name. Names and
 * Drive file ids come from Drive for Desktop's metadata database; bytes are read from the mount.
 * Naming rules:
 * https://claude.ai/artifact/4vppMkYHHvocDgtREqMyxa
 *
 * ── Matching ─────────────────────────────────────────────────────────────────
 *
 * An option folder is named exactly as the option in Notion, and the Sanity `customizationOption`
 * title is the same name, so they are matched by title. Drive for Desktop keeps a "/" in a folder
 * name as a space (Flocked/Velvet Wrap → "Flocked Velvet Wrap"), so both sides are compared with
 * "/" read as a space, spaces collapsed and case ignored. A folder with no option of that name,
 * or with more than one, is refused and listed.
 *
 * ── What it refuses ──────────────────────────────────────────────────────────
 *
 *   · The same image twice in one option.
 *   · Two different options holding a byte-identical PNG — almost always a misfiled image.
 *     Both are skipped.
 *   · An option with no match, or more than one, or whose status is not `active`.
 *   · An option that already has other `images`, unless --replace.
 *   · The 5 options uploaded by hand for the demo (DEMO_DONE), always.
 *
 * ── What it writes ───────────────────────────────────────────────────────────
 *
 *   · Each PNG is uploaded once, `source: { name: 'google-drive', id: <fileId>, url }`. A file
 *     whose bytes are already in the dataset (same sha1) is reused.
 *   · Each asset gets the `customization` media tag (sanity-plugin-media).
 *   · `images` on the published option, and on `drafts.<id>` when one exists. One patch per
 *     option. `videos` and every other field are never touched.
 *   · Order: by variant, then by number (`_gold`, `_silver`; `-1`, `-2`), except that a
 *     hand-picked first image (PRIMARY_PICK) moves to the front. The first is `primary`.
 *   · `alt`: the option title, plus the variant or the image number when it has more than one
 *     image, e.g. "Coated Sticker Paper, gloss".
 *   · With --replace: an image asset the replaced `images` held is deleted once nothing in the
 *     dataset references it any more. One still referenced elsewhere is kept and listed.
 *
 * Re-running is safe: assets are reused, and an option whose `images` already equal what this
 * would write is not touched.
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
  pnpm --filter @pakfactory/studio run upload:customization-images -- --dataset <name> --category "<category folder>" [--only "Name|Name"] [--skip "Name|Name"] [--replace] [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --category        REQUIRED. The category folder, exactly as on Drive, e.g. "1-Materials".
  --only            Limit to these options, by title, separated by "|".
  --skip            Leave these options out, by title, separated by "|".
  --replace         Overwrite options that already have other images, and delete the old
                    image assets nothing else uses.
  --drive-root      The "04_Customization Images Sanity" folder on this Mac, if it is not found automatically.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`

const args = parseScriptArgs({ usage: USAGE, values: ['category', 'only', 'skip', 'drive-root'], flags: ['replace'] })
const { confirm: apply, dataset: DATASET } = args
if (!args.category) fail(`--category is required.\n\n${USAGE}`)
const nameList = (v) => (v ? new Set(v.split('|').map((s) => s.trim()).filter(Boolean)) : null)
const ONLY = nameList(args.only)
const SKIP = nameList(args.skip) ?? new Set()

/** The shared-drive folder "04_Customization Images Sanity". */
const ROOT_FOLDER_ID = '1bzvWpFe5UB6l2EfAfuTAUm5I_0aVp098'
const ROOT_FOLDER_NAME = '04_Customization Images Sanity'
/** The temporary work tags at the front of an option folder: "[New] ", "[Regenerate] ", "[Extra] ". */
const WORK_TAGS = /^(\[(New|Regenerate|Extra)\] )+/
const MEDIA_TAG = 'customization'
const UPLOADS_AT_ONCE = 4
const BATCH = 50

/**
 * Uploaded by hand for a demo on 19 Oct, with hand-set alt text and order — never touched here
 * (Notion Registry ID = Sanity `entityId`).
 */
const DEMO_DONE = new Map([
  ['opt_01kwjd9sc0fjms3aeh8gr36s9s', 'AQ Coating (Aqueous)'],
  ['opt_01kq84a3r0exj9jqq28e0vben9', 'Acrylonitrile Butadiene Styrene (ABS) Blister Plastic'],
  ['opt_01m0jssb70eqvsw8m2mt2qw5yn', 'Adhesive Strip'],
  ['opt_01kwmajv90f8vsjf92jng0rw0e', 'Algae-Based Ink'],
  ['opt_01kq84a3r0e2frtp9raywk1kns', 'Metallic Board'],
])

/**
 * First image picked on the Customization Image Review, 21 Oct
 * (https://claude.ai/artifact/ND2EAL74UbatoEYJwYH8Xd), and the Add-on Image Review, 23 Oct
 * (https://claude.ai/artifact/BFCoGyufbbXyGYUUTm94Hg). Option title → 02-Edited file name.
 */
const PRIMARY_PICK = {
  'Specialty Corrugated Board': 'material_specialty-corrugated-board_holographic.png',
  'Coated Sticker Paper': 'material_coated-sticker-paper_gloss.png',
  'Recyclable PE Pouch Material': 'material_recyclable-pe-pouch-material_white.png',
  'Plastic Handle': 'add-on_plastic-handle_rigid-box.png',
  'Child-Resistant Zipper (Pouches)': 'add-on_child-resistant-zipper-pouches_slider-lock.png',
  'Hang Hole': 'add-on_hang-hole_kraft.png',
}

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
  fail('Drive for Desktop has no metadata for the Customization images folder on this Mac.')
}

/** A name as both sides can agree on it: "/" read as a space, spaces collapsed, case ignored. */
const nameKey = (title) => title.replace(/\//g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

/** Every option folder in the chosen category, with the PNGs directly inside its 02-Edited. */
function collectCategory(tree, driveRoot) {
  const children = (sid) => tree.kids.get(sid) ?? []
  const categories = children(tree.rootStableId).filter((i) => i.is_folder)
  const category = categories.find((i) => i.local_title === args.category)
  if (!category) fail(`No category folder "${args.category}". Category folders: ${categories.map((i) => i.local_title).sort().join(' · ')}`)

  const byName = new Map()
  const skipped = { notLaunched: 0, other: [], byFlag: new Set() }
  for (const type of children(category.stable_id).filter((i) => i.is_folder)) {
    for (const opt of children(type.stable_id).filter((i) => i.is_folder)) {
      if (opt.local_title.startsWith('_')) continue
      if (opt.local_title.startsWith('[Skip]')) { skipped.notLaunched++; continue }
      const name = opt.local_title.replace(WORK_TAGS, '')
      if (ONLY && ![...ONLY].some((n) => nameKey(n) === nameKey(name))) continue
      if ([...SKIP].some((n) => nameKey(n) === nameKey(name))) { skipped.byFlag.add(name); continue }
      if (byName.has(name)) fail(`Two option folders are named "${name}" in ${args.category}.`)
      const edited = children(opt.stable_id).find((i) => i.is_folder && i.local_title === '02-Edited')
      const files = []
      for (const f of edited ? children(edited.stable_id) : []) {
        if (f.is_folder) continue
        const lower = f.local_title.toLowerCase()
        if (!lower.endsWith('.png')) {
          if (!lower.endsWith('.jpg') && !lower.endsWith('.jpeg')) skipped.other.push(`${name} › ${f.local_title}`)
          continue
        }
        files.push({
          name: f.local_title,
          driveId: f.id,
          path: join(driveRoot, category.local_title, type.local_title, opt.local_title, '02-Edited', f.local_title),
        })
      }
      byName.set(name, { folder: opt.local_title, type: type.local_title, files })
    }
  }
  return { byName, skipped }
}

// ─── 2. Order, alt, primary ──────────────────────────────────────────────────

/** category_option-name[_variant][-N].png → the variant and N. */
function parseName(name) {
  const stem = name.replace(/\.png$/i, '')
  const parts = stem.split('_')
  const last = parts.length > 2 ? parts.slice(2).join('_') : parts[1] ?? ''
  const tail = last.match(/-(\d+)$/)
  return {
    variant: parts.length > 2 ? last.replace(/-\d+$/, '') : null,
    number: tail ? Number(tail[1]) : 0,
  }
}

function orderImages(files) {
  return files
    .map((f) => ({ ...f, parsed: parseName(f.name) }))
    .sort((a, b) =>
      (a.parsed.variant ?? '').localeCompare(b.parsed.variant ?? '') ||
      a.parsed.number - b.parsed.number ||
      a.name.localeCompare(b.name),
    )
}

function withPick(name, ordered) {
  const file = PRIMARY_PICK[name]
  if (!file) return ordered
  const i = ordered.findIndex((f) => f.name === file)
  if (i === -1) fail(`${name}: the picked first image "${file}" is not in its 02-Edited folder.`)
  return [ordered[i], ...ordered.slice(0, i), ...ordered.slice(i + 1)]
}

function altFor(title, p, count) {
  if (count < 2) return title
  if (p.variant) return `${title}, ${p.variant.replace(/-/g, ' ')}${p.number ? ` ${p.number}` : ''}`
  return p.number ? `${title}, image ${p.number}` : title
}

/** The `images` value for an option, or null while any of its PNGs has no asset yet. */
function imagesFor(t, assetFor) {
  if (t.files.some((f) => !assetFor.has(f.hash))) return null
  return t.files.map((f, i) => ({
    _type: 'image',
    _key: key(),
    asset: { _type: 'reference', _ref: assetFor.get(f.hash) },
    alt: altFor(t.title, f.parsed, t.files.length),
    primary: i === 0,
  }))
}

/** Same images, same order, alt and primary — `_key`s aside. */
const same = (stored, next) =>
  JSON.stringify((stored ?? []).map((i) => [i.asset?._ref, i.alt, !!i.primary])) === JSON.stringify(next.map((i) => [i.asset._ref, i.alt, i.primary]))

// ─── 3. Run ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🖼   Customization option images → Sanity')
  console.log(`    category="${args.category}"${ONLY ? `  only=${[...ONLY].join(' | ')}` : ''}`)
  console.log(`    dataset=${DATASET}  mode=${describeMode(args)}${args.replace ? '  --replace' : ''}`)

  const driveRoot = findDriveRoot()
  const { byName, skipped } = collectCategory(readDriveTree(), driveRoot)
  console.log(`    Drive: ${plural(byName.size, 'option folder')} · ${skipped.notLaunched} [Skip] folders skipped`)
  if (skipped.byFlag.size) console.log(`    skipped by --skip: ${[...skipped.byFlag].sort().join(' | ')}`)
  if (skipped.other.length) {
    console.log(`    not uploaded (not a PNG/JPG): ${skipped.other.length}`)
    skipped.other.forEach((s) => console.log(`      · ${s}`))
  }

  // Bytes, and the one-image-once rules.
  const needsFix = []
  const empty = []
  const plan = new Map() // option name → [{ name, driveId, buf, hash }]
  for (const [name, opt] of [...byName].sort(([a], [b]) => a.localeCompare(b))) {
    if (!opt.files.length) { empty.push(name); continue }
    const files = []
    for (const f of opt.files) {
      if (!existsSync(f.path)) fail(`${f.path} is listed by Drive but not on the mount — is Drive for Desktop syncing?`)
      const buf = readFileSync(f.path)
      files.push({ ...f, buf, hash: sha1(buf) })
    }
    const seen = new Map()
    const twice = files.filter((f) => (seen.has(f.hash) ? true : (seen.set(f.hash, f.name), false)))
    if (twice.length) { needsFix.push(`${name}: the same image twice — ${twice.map((f) => `${seen.get(f.hash)} = ${f.name}`).join('; ')}`); continue }
    plan.set(name, files)
  }
  const owners = new Map()
  for (const [name, files] of plan) for (const f of files) {
    if (!owners.has(f.hash)) owners.set(f.hash, [])
    owners.get(f.hash).push([name, f.name])
  }
  for (const list of owners.values()) {
    const names = [...new Set(list.map(([n]) => n))]
    if (names.length < 2) continue
    needsFix.push(`same image in ${names.join(' and ')}: ${list.map(([, f]) => f).join(' = ')}`)
    names.forEach((n) => plan.delete(n))
  }
  if (empty.length) console.log(`    no PNGs in 02-Edited (skipped): ${empty.join(' | ')}`)
  if (needsFix.length) {
    console.log(`\n    ⚠ skipped — fix on Drive first:`)
    needsFix.forEach((s) => console.log(`      · ${s}`))
  }

  // Options in the dataset, matched by name.
  const names = [...plan.keys()]
  const docs = await client.fetch(
    `*[_type == "customizationOption" && !(_id in path("versions.**"))]{ _id, title, status, entityId, images }`,
  )
  const byOption = new Map()
  for (const d of docs) {
    const id = d._id.replace(/^drafts\./, '')
    const k = nameKey(d.title ?? '')
    if (!byOption.has(k)) byOption.set(k, new Map())
    const ids = byOption.get(k)
    if (!ids.has(id)) ids.set(id, {})
    ids.get(id)[d._id.startsWith('drafts.') ? 'draft' : 'published'] = d
  }

  const refused = []
  const demo = []
  const targets = []
  for (const name of names) {
    const ids = byOption.get(nameKey(name))
    if (!ids) { refused.push(`${name}: no customization option with this name in ${DATASET}`); continue }
    if (ids.size > 1) { refused.push(`${name}: ${ids.size} options share this title (${[...ids.keys()].join(', ')})`); continue }
    const [[id, { published, draft }]] = [...ids]
    const doc = published ?? draft
    if (DEMO_DONE.has(doc.entityId)) { demo.push(name); continue }
    if (doc.status !== 'active') { refused.push(`${name}: status is "${doc.status}", not active`); continue }
    const hasImages = (published?.images?.length ?? 0) + (draft?.images?.length ?? 0) > 0
    targets.push({ name, id, published, draft, hasImages, title: doc.title, files: withPick(doc.title, orderImages(plan.get(name))) })
  }
  if (demo.length) console.log(`    uploaded for the demo, left alone: ${demo.join(' | ')}`)

  // Assets already in the dataset, by content.
  const allHashes = [...new Set(targets.flatMap((t) => t.files.map((f) => f.hash)))]
  const existing = allHashes.length
    ? await client.fetch(`*[_type == "sanity.imageAsset" && sha1hash in $hashes]{ _id, sha1hash }`, { hashes: allHashes })
    : []
  const assetFor = new Map(existing.map((a) => [a.sha1hash, a._id]))

  // An option that already has images is left alone unless --replace — except when its images
  // already ARE what this run would write (a re-run): then it stays in and writes nothing.
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i]
    if (!t.hasImages || args.replace) continue
    const next = imagesFor(t, assetFor)
    const upToDate = next && [t.published, t.draft].filter(Boolean).every((d) => same(d.images, next))
    if (!upToDate) { refused.push(`${t.name}: already has other images — pass --replace to overwrite`); targets.splice(i, 1) }
  }
  if (refused.length) {
    console.log(`\n    ⚠ ${plural(refused.length, 'option')} not written:`)
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
  console.log(`\n    ${plural(targets.length - upToDate, 'option')} to write · ${upToDate} already up to date · ${plural(hashes.length, 'PNG')} · ${hashes.length - toUpload.length} already in ${DATASET}, ${toUpload.length} to upload`)
  if (args.replace) console.log(`    --replace: ${plural(replaced.length, 'old image asset')} to delete once nothing references it`)
  for (const t of targets) {
    const n = imagesFor(t, assetFor)
    const current = n && [t.published, t.draft].filter(Boolean).every((d) => same(d.images, n))
    const note = current ? '  (already up to date)' : t.hasImages ? '  (replaces its images)' : ''
    console.log(`\n    ${t.title}${t.draft ? '  (+ draft)' : ''}${note}`)
    t.files.forEach((f, i) => console.log(`      ${i === 0 ? '★' : ' '} ${f.name}\n          alt: ${altFor(t.title, f.parsed, t.files.length)}`))
  }

  if (!apply) {
    console.log(`\n    DRY-RUN — dataset=${DATASET}. Nothing written. Re-run with --confirm to write.\n`)
    return
  }
  if (!targets.length) { console.log('\n    Nothing to write.\n'); return }

  // Media tag document — the oldest of that name if several exist (created only if none does).
  let tag = await client.fetch(`*[_type == "media.tag" && name.current == $name] | order(_createdAt asc)[0]{ _id }`, { name: MEDIA_TAG })
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

  // Options: one patch each, published and draft.
  const log = { dataset: DATASET, category: args.category, at: new Date().toISOString(), options: [], deletedAssets: [], keptAssets: [] }
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
    log.options.push({
      title: t.title,
      id: t.id,
      replaced: t.hasImages ? (t.published ?? t.draft).images?.map((i) => i.asset?._ref) : undefined,
      images: t.files.map((f, i) => ({ file: f.name, driveId: f.driveId, asset: images[i].asset._ref, primary: images[i].primary })),
    })
    if (pending >= BATCH) { await tx.commit({ autoGenerateArrayKeys: false }); tx = client.transaction(); pending = 0 }
  }
  if (pending) await tx.commit({ autoGenerateArrayKeys: false })
  console.log(`    ✓ ${plural(written, 'option')} written · ${unchanged} already up to date`)

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

  const logPath = join(tmpdir(), `upload-customization-images-${DATASET}-${Date.now()}.json`)
  writeFileSync(logPath, JSON.stringify(log, null, 2))
  console.log(`    log: ${logPath}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
