/**
 * Replace every `faq` document with the Notion FAQ table, and attach each one to the page it
 * belongs to.
 *
 * Notion is the only source of truth for FAQs (the same policy as the catalog rebuild,
 * CATALOG-REBUILD.md). Everything already in the dataset is test or seed data, so this does not
 * merge. It deletes every `faq` that is not a Notion row and writes the Notion rows under ids
 * derived from the Notion page id (`faq-<32 hex>`), so a re-run replaces the same documents.
 *
 * ── WHAT A NOTION ROW BECOMES ────────────────────────────────────────────────────
 *
 *   Question     → question
 *   Handle       → slug            (Notion's formula; falls back to a slug of the question)
 *   Answer       → answer          (Portable Text: blank-line paragraphs, `•` lines → bullets,
 *                                   bold / italic / links kept)
 *   Type         → scope           Generic → general · Product, Expertise → contextual
 *   Product Line → about[] and that line's `faqs`
 *   Expertise    → that stage's `faqs`   (Type = Expertise only; Type decides, so a Generic
 *                                   row that names a stage is NOT attached — it is reported)
 *
 * `category` is left EMPTY. Notion has no category column and the only Help Category in the
 * dataset was test data (Richard, 2026-09-25): every FAQ shows a required-field error until
 * real categories exist. Page lists follow Notion's creation order, and are written in full
 * even past the schema's 6-item limit (Corrugated Boxes has 7) — Studio flags it, Notion fixes it.
 *
 * ── WHAT IS DELETED ──────────────────────────────────────────────────────────────
 *
 *   every `faq` (published and draft) that is not a Notion row
 *   every `helpCategory` whose title contains "test", once nothing else references it
 *
 * A reference from a document this script does not rewrite (a Help Category's `featured`, a
 * post's `faqs`) is removed first, item by item, so the delete cannot be blocked. Line and stage
 * `faqs` lists are REPLACED, drafts included. All of it goes in ONE transaction, each patched
 * document pinned to the revision read.
 *
 * From repo root (DRY RUN is the default — prints only, writes nothing):
 *   pnpm --filter @pakfactory/studio run populate:faqs -- --dataset development
 *   pnpm --filter @pakfactory/studio run populate:faqs -- --dataset development --confirm
 *
 * Notion is read live with NOTION_TOKEN (read-only integration, the one sanity-fill uses), or
 * from a saved pull with --notion-json <file>. --emit-plan <file> writes the full plan as JSON.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run populate:faqs -- --dataset <name> [--notion-json <file>] [--emit-plan <file>] [--confirm] [--yes-production]

  --dataset            REQUIRED. No env fallback.
  --notion-json <path> Use a saved Notion pull instead of reading the API (NOTION_TOKEN).
  --emit-plan <path>   Write the full plan (every document and patch) as JSON.
  --confirm            Actually write. Without it the run is a dry run.
  --yes-production     Second gate; required to write to production.`

const args = parseScriptArgs({ values: ['notion-json', 'emit-plan'], usage: USAGE })
const { confirm: apply, yesProduction, notionJson, emitPlan } = args
const DATASET = args.dataset

const fail = (msg) => {
  console.error(`\n❌  ${msg}`)
  process.exit(1)
}

/** Notion FAQ data source (PakFactory Products workspace). */
const NOTION_FAQ_SOURCE = '29beb5db-19ec-8205-86d7-87b4be871960'

/** Notion `Expertise` option → expertiseStage _id. Fulfillment has no Notion option yet. */
const STAGE_BY_EXPERTISE = {
  Strategy: 'expertise-strategy',
  Design: 'expertise-design',
  Prototyping: 'expertise-prototyping',
  Manufacturing: 'expertise-manufacturing',
  Logistics: 'expertise-logistics',
}
const SCOPE_BY_TYPE = { Generic: 'general', Product: 'contextual', Expertise: 'contextual' }

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '8293wrxp'
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN || process.env.SANITY_TOKEN
if (!TOKEN) fail('Missing Sanity token in .env.local (SANITY_API_WRITE_TOKEN).')
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  fail('--confirm needs a WRITE token; only a read token is set.')
}
if (apply && DATASET === 'production' && !yesProduction) fail('Refusing to write to production without --yes-production.')

const client = createClient({ projectId: PROJECT_ID, dataset: DATASET, token: TOKEN, apiVersion: '2024-10-01', useCdn: false })
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const hex32 = (id) => id.replace(/-/g, '')
const publishedId = (id) => id.replace(/^drafts\./, '')
/** Deterministic array _key from a Notion id — stable across re-runs. */
const keyFor = (notionId) => notionId.slice(-12)

// ─── Notion ──────────────────────────────────────────────────────────────────

async function pullNotion() {
  const token = process.env.NOTION_TOKEN
  if (!token) {
    fail('NOTION_TOKEN is not set. Pass it in the environment (pakfactory.com-backend/.env.local holds it), or use --notion-json.')
  }
  const rows = []
  let cursor
  do {
    const res = await fetch(`https://api.notion.com/v1/data_sources/${NOTION_FAQ_SOURCE}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    })
    if (!res.ok) fail(`Notion FAQ (${NOTION_FAQ_SOURCE}): HTTP ${res.status} ${await res.text()}`)
    const body = await res.json()
    for (const page of body.results) {
      if (page.in_trash || page.archived) continue
      const p = page.properties
      const lines = p['Product Line']?.relation ?? []
      if (p['Product Line']?.has_more) fail(`Notion row ${page.id} has more than 25 product lines — not handled.`)
      rows.push({
        id: hex32(page.id),
        createdTime: page.created_time,
        question: (p.Question?.title ?? []).map((t) => t.plain_text).join('').trim(),
        answer: p.Answer?.rich_text ?? [],
        type: p.Type?.select?.name ?? null,
        expertise: p.Expertise?.select?.name ?? null,
        lines: lines.map((r) => hex32(r.id)),
        handle: p.Handle?.formula?.string ?? null,
      })
    }
    cursor = body.has_more ? body.next_cursor : undefined
  } while (cursor)
  return { fetchedAt: new Date().toISOString(), via: 'notion-api', rows }
}

function loadNotion() {
  if (!notionJson) return pullNotion()
  const path = resolvePath(notionJson)
  if (!existsSync(path)) fail(`No Notion pull at ${path}.`)
  const data = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(data.rows)) fail(`${path} has no rows[] — it was not written by this script's pull.`)
  return data
}

// ─── Portable Text ───────────────────────────────────────────────────────────

const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96)

/**
 * Notion rich text → Portable Text. Notion stores the answer as one run of segments with
 * literal newlines; each non-empty line becomes a block, and a line starting with `•` / `-`
 * becomes a bullet item. Bold / italic / links carry over as marks.
 */
function toPortableText(richText, rowId) {
  const lines = [[]]
  for (const seg of richText) {
    const marks = []
    if (seg.annotations?.bold) marks.push('strong')
    if (seg.annotations?.italic) marks.push('em')
    const href = seg.href || seg.text?.link?.url || null
    const parts = (seg.plain_text ?? '').split('\n')
    parts.forEach((text, i) => {
      if (i > 0) lines.push([])
      if (text) lines[lines.length - 1].push({ text, marks, href })
    })
  }
  const blocks = []
  lines.forEach((spans, li) => {
    const joined = spans.map((s) => s.text).join('')
    if (!joined.trim()) return
    const bullet = /^\s*[•\-–]\s+/.test(joined)
    if (bullet) {
      // Strip the bullet glyph from the first span(s).
      let strip = joined.match(/^\s*[•\-–]\s+/)[0].length
      for (const s of spans) {
        if (!strip) break
        const cut = Math.min(strip, s.text.length)
        s.text = s.text.slice(cut)
        strip -= cut
      }
    }
    const markDefs = []
    const children = spans
      .filter((s) => s.text)
      .map((s, si) => {
        const marks = [...s.marks]
        if (s.href) {
          const key = `l${li}s${si}`
          markDefs.push({ _key: key, _type: 'link', href: s.href })
          marks.push(key)
        }
        return { _type: 'span', _key: `s${li}x${si}`, text: s.text, marks }
      })
    if (children.length) children[children.length - 1].text = children[children.length - 1].text.replace(/\s+$/, '')
    blocks.push({
      _type: 'block',
      _key: `b${li}`,
      style: 'normal',
      markDefs,
      children,
      ...(bullet ? { listItem: 'bullet', level: 1 } : {}),
    })
  })
  if (!blocks.length) fail(`Notion row ${rowId} has an empty Answer.`)
  return blocks
}

// ─── Plan ────────────────────────────────────────────────────────────────────

const notion = await loadNotion()
const rows = [...notion.rows].sort((a, b) => (a.createdTime ?? '').localeCompare(b.createdTime ?? '') || a.id.localeCompare(b.id))

const existing = await client.fetch(`{
  "faqs": *[_type == "faq"]{ _id, _rev, question },
  "helpCategories": *[_type == "helpCategory"]{ _id, _rev, title },
  "lines": *[_type == "productLine"]{ _id, _rev, title, "n": count(faqs) },
  "stages": *[_type == "expertiseStage"]{ _id, _rev, title, "n": count(faqs) }
}`)

const problems = []
const reports = []
const faqDocs = []
const byLine = new Map() // line published id → [faq id]
const byStage = new Map() // stage published id → [faq id]
const lineIds = new Set(existing.lines.map((l) => publishedId(l._id)))
const stageIds = new Set(existing.stages.map((s) => publishedId(s._id)))
const slugs = new Map()

for (const row of rows) {
  const id = `faq-${row.id}`
  if (!row.question) problems.push(`${row.id}: empty Question`)
  const scope = SCOPE_BY_TYPE[row.type]
  if (!scope) problems.push(`${row.id} "${row.question}": Type is ${row.type ?? 'empty'} — expected Generic, Product or Expertise`)
  const slug = row.handle?.trim() || slugify(row.question)
  if (slugs.has(slug)) problems.push(`${row.id}: slug "${slug}" repeats ${slugs.get(slug)}`)
  slugs.set(slug, row.id)

  const about = []
  for (const lineNotionId of row.lines) {
    const lineId = `line-${lineNotionId}`
    if (!lineIds.has(lineId)) {
      problems.push(`${row.id} "${row.question}": Product Line ${lineNotionId} has no productLine ${lineId} in ${DATASET}`)
      continue
    }
    about.push({ _type: 'reference', _key: keyFor(lineNotionId), _ref: lineId })
    if (row.type === 'Product') byLine.set(lineId, [...(byLine.get(lineId) ?? []), id])
  }
  if (row.type === 'Product' && !row.lines.length) problems.push(`${row.id} "${row.question}": Type Product with no Product Line`)

  if (row.type === 'Expertise') {
    const stage = STAGE_BY_EXPERTISE[row.expertise]
    if (!stage) problems.push(`${row.id} "${row.question}": Type Expertise with Expertise = ${row.expertise ?? 'empty'}`)
    else if (!stageIds.has(stage)) problems.push(`${row.id}: expertiseStage ${stage} is not in ${DATASET}`)
    else byStage.set(stage, [...(byStage.get(stage) ?? []), id])
  } else if (row.expertise) {
    reports.push(`not attached to a stage — Type is ${row.type}, Expertise says ${row.expertise}: "${row.question}"`)
  }

  faqDocs.push({
    _id: id,
    _type: 'faq',
    question: row.question,
    slug: { _type: 'slug', current: slug },
    answer: toPortableText(row.answer, row.id),
    scope,
    ...(about.length ? { about } : {}),
  })
}

if (problems.length) {
  console.error(`\n❌  ${plural(problems.length, 'Notion row problem')} — nothing planned:\n   • ${problems.join('\n   • ')}`)
  process.exit(1)
}

const keep = new Set(faqDocs.map((d) => d._id))
const deleteFaqs = existing.faqs.filter((f) => !keep.has(publishedId(f._id)))
const deleteCategories = existing.helpCategories.filter((c) => /test/i.test(c.title ?? ''))
const deleting = new Set([...deleteFaqs, ...deleteCategories].map((d) => d._id))

// The pages whose `faqs` this script owns outright — replaced wholesale, drafts included.
const listPatches = []
const refList = (ids) => ids.map((ref) => ({ _type: 'reference', _key: keyFor(ref.slice(4)), _ref: ref }))
for (const doc of [...existing.lines, ...existing.stages]) {
  const target = (byLine.get(publishedId(doc._id)) ?? byStage.get(publishedId(doc._id))) || null
  if (target) listPatches.push({ id: doc._id, rev: doc._rev, title: doc.title, before: doc.n ?? 0, faqs: refList(target) })
  else if (doc.n) listPatches.push({ id: doc._id, rev: doc._rev, title: doc.title, before: doc.n, faqs: null })
}
const owned = new Set(listPatches.map((p) => p.id))

// Anything else still pointing at a document being deleted — remove just those items.
const referrers = deleting.size
  ? await client.fetch(
      `*[references($ids) && !(_id in $ids)]{ _id, _rev, _type, "t": coalesce(title, question, name) }`,
      { ids: [...deleting] },
    )
  : []
const unsetPatches = []
for (const r of referrers) {
  if (owned.has(r._id)) continue
  const doc = await client.getDocument(r._id)
  const paths = []
  const walk = (node, path) => {
    if (Array.isArray(node)) {
      node.forEach((item, i) => {
        if (item?._ref && deleting.has(item._ref)) paths.push(item._key ? `${path}[_key=="${item._key}"]` : `${path}[${i}]`)
        else walk(item, item?._key ? `${path}[_key=="${item._key}"]` : `${path}[${i}]`)
      })
    } else if (node && typeof node === 'object') {
      if (node._ref && deleting.has(node._ref)) paths.push(path)
      else for (const [k, v] of Object.entries(node)) if (!k.startsWith('_')) walk(v, path ? `${path}.${k}` : k)
    }
  }
  walk(doc, '')
  if (paths.length) unsetPatches.push({ id: r._id, rev: r._rev, type: r._type, title: r.t, paths })
}

// ─── Report ──────────────────────────────────────────────────────────────────

const counts = (type) => faqDocs.filter((d) => d.scope === type).length
console.log(`\n${describeMode({ dataset: DATASET, confirm: apply })}`)
console.log(`Notion: ${plural(rows.length, 'FAQ row')} (${notion.via}, ${notion.fetchedAt})\n`)
console.log(`Delete  ${plural(deleteFaqs.length, 'FAQ document')} not in Notion` + (deleteFaqs.length ? ':' : ''))
for (const f of deleteFaqs) console.log(`          ${f._id}  ${f.question ?? ''}`)
console.log(`Delete  ${plural(deleteCategories.length, 'test Help Category', 'test Help Categories')}` + deleteCategories.map((c) => `  ${c._id} "${c.title}"`).join(''))
console.log(`\nWrite   ${plural(faqDocs.length, 'FAQ')}: ${counts('general')} general, ${counts('contextual')} contextual · category left blank on all`)
console.log(`\nReplace faqs on ${plural(listPatches.length, 'page')}:`)
for (const p of listPatches.sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id))) {
  const n = p.faqs?.length ?? 0
  const flag = n > 6 ? '  ⚠️ over the 6-item limit' : n && n < 3 ? '  ⚠️ under the 3-item minimum' : ''
  console.log(`          ${p.title.padEnd(28)} ${String(p.before).padStart(2)} → ${String(n).padStart(2)}  ${p.id}${flag}`)
}
if (unsetPatches.length) {
  console.log(`\nUnset references to deleted documents on ${plural(unsetPatches.length, 'other document')}:`)
  for (const u of unsetPatches) console.log(`          ${u.type} ${u.id} "${u.title}" — ${u.paths.join(', ')}`)
}
if (reports.length) console.log(`\nReported, not acted on:\n   • ${reports.join('\n   • ')}`)

if (emitPlan) {
  writeFileSync(resolvePath(emitPlan), JSON.stringify({ dataset: DATASET, notion: { via: notion.via, fetchedAt: notion.fetchedAt }, deleteFaqs, deleteCategories, faqDocs, listPatches, unsetPatches, reports }, null, 2))
  console.log(`\nPlan written to ${resolvePath(emitPlan)}`)
}

if (!apply) {
  console.log(`\nDry run on dataset=${DATASET} — nothing written. Re-run with --confirm to apply.`)
  process.exit(0)
}

// ─── Write ───────────────────────────────────────────────────────────────────

// One transaction: Sanity checks references against the end state, so the new FAQs, the
// re-pointed lists and the deletes land together or not at all.
const tx = client.transaction()
for (const d of faqDocs) tx.createOrReplace(d)
for (const u of unsetPatches) tx.patch(u.id, (p) => p.ifRevisionId(u.rev).unset(u.paths))
for (const p of listPatches) {
  tx.patch(p.id, (patch) => {
    const pinned = patch.ifRevisionId(p.rev)
    return p.faqs ? pinned.set({ faqs: p.faqs }) : pinned.unset(['faqs'])
  })
}
for (const d of deleteFaqs) tx.delete(d._id)
for (const c of deleteCategories) tx.delete(c._id)

const result = await tx.commit({ visibility: 'sync' })
console.log(`\n✅  dataset=${DATASET}: committed transaction ${result.transactionId} — ${plural(result.results.length, 'mutation')}.`)
