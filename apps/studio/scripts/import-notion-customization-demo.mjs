#!/usr/bin/env node
/**
 * Import the Notion `Demo` customization rows into Sanity (PROD-2463).
 *
 * The content team authors customizations in four Notion databases — Materials,
 * Finishing, Printing, Additional Customization — each with a `Demo` checkbox.
 * The 113 checked rows are the set the front end builds against. They all land on
 * one Sanity type, `customizationOption`.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run import:notion-customization-demo -- --dataset development
 *   pnpm --filter @pakfactory/studio run import:notion-customization-demo -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run import:notion-customization-demo -- --dataset production --confirm --yes-production
 *
 * ── Why the rows are committed as JSON ──────────────────────────────────────
 * `data/notion-customization-demo.json` holds the export. The script never talks to
 * Notion, so anyone with a Sanity write token can re-run it; there is no second
 * credential and no dependency on an MCP session. Re-export the same columns to
 * refresh it — do not hand-edit copy in there.
 *
 * ── Why nothing is deleted except two documents ──────────────────────────────
 * The instruction was "replace the whole set". That cannot be done as stated:
 * **30 of the 33 existing options are referenced by live published case studies**
 * through `caseStudy.capabilities[]`, which `packages/sanity/src/queries/case-studies.ts`
 * projects as `capabilities[]->{_id, title, slug}`. A deleted target does not
 * degrade gracefully — the array entry becomes null and the Customizations list on
 * a live page loses a row. *Offset Printing (Lithography)* alone is referenced by 13
 * case studies. So:
 *
 *   · 18 rows match an existing option        → PATCH in place, `_id` preserved
 *   · 95 rows are new                         → create
 *   · 13 existing options with no Notion row  → LEFT ALONE (all referenced)
 *   ·  2 existing options, unreferenced       → deleted, after a live reference check
 *
 * A patch, not a `createOrReplace`: `createOrReplace` drops every field the new
 * document omits, and two of the overwrite targets carry MORE than Notion does —
 * SBS has 9 `properties`, 2 `availableOnProducts` and 2 `faqs`; CCNB has 7
 * `properties`. Replacing them with the Notion subset would be a downgrade dressed
 * as an import. Fields Notion has no opinion about are not touched.
 *
 * ── Why `role` is not taken from Notion's `Detail Page` ─────────────────────
 * Tempting, and wrong. `Detail Page` answers "does this get a page?"; `role` answers
 * "does a customer pick this?". The schema treats those as inverse ("reference
 * options have library pages, configurable options do not") — but the Notion data
 * breaks that premise, because the content team gives detail pages to things
 * customers also pick. Mapping the column directly would mark 102 of 113 rows
 * `reference`, i.e. "never reaches the configurator", for Magnetic Closure, Hot Foil
 * Stamping, Spot UV and SBS. Everything is imported `configurable` instead, matching
 * the schema's own `initialValue` and 27 of the 33 documents already in production.
 *
 * The genuine `reference` signal in Notion is different: being a *target* of a
 * Surface Finish row's `Related Finishing`. Those five — Gloss Lamination, Matte
 * Lamination, Soft Touch/Velvet Lamination, UV Coating, Varnish Coating, AQ Coating —
 * are not Demo-checked, already exist, and are already `reference`. They are what
 * `achieves` is wired from below.
 *
 * ── What is deliberately NOT imported ───────────────────────────────────────
 *   · `Description` (~450 chars on all 113) — there is no field for it on
 *     `customizationOption`; its designed home is `glossaryTerm`, which holds 0
 *     documents. Dropped for the demo by decision, not by oversight.
 *   · `What is` — a page heading ("What is SBS (Solid Bleached Sulfate) Paperboard?"),
 *     not content.
 *   · `availableOnProducts` — left empty everywhere by decision. Note the consequence:
 *     empty means OFFERED NOWHERE per the field's own description, so every imported
 *     option raises the `configurable && empty` validation warning until somebody
 *     authors availability. Only the Additional Customization rows could have been
 *     filled anyway (its Notion "Product Style" database matches all 97 Sanity
 *     `productStyle` titles exactly); Materials points at the legacy Shopify
 *     "Collections" database and Printing at "Product Grouping", neither of which
 *     matches a Sanity product document.
 *   · Notion `Status` (New/Pending/Rewrite/Copies Done) — authoring workflow, not
 *     product lifecycle. Everything imports `status: 'active'`.
 *   · Every image column, `Short Name`, `SEO Page Title`, `FAQ` and `Color Range` —
 *     empty on all 113 rows. Nothing to upload, so this script touches no assets.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run import:notion-customization-demo -- --dataset <development|production> [--confirm] [--yes-production]

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
  console.error('❌  --confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN).')
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

// ─── Mapping tables ──────────────────────────────────────────────────────────
// Types, categories and property values are resolved BY TITLE/SLUG at runtime, not
// by hardcoded `_id`. Ids would work (they are identical on both datasets today) but
// a title lookup that fails loudly beats an id that silently points at nothing.

/**
 * Notion `Type` → the Sanity `customizationType` it belongs to.
 *
 * 29 distinct Notion types across the 113 rows. 16 already exist by exact title.
 * 13 are created here. 3 resolve onto an existing type under a different name
 * rather than creating a near-duplicate:
 *
 *   Foiling Technique → "Foiling"          keep Sanity's shorter title
 *   Opening & Access  → "Pulls & Lifts"    retitled: Notion's set (Ribbon Lift/Pull/
 *                                          Pull Tab, Tear Notch, Tear Strip) is wider
 *                                          than "pulls and lifts" describes
 *   Windows           → "Window Patching"  retitled: otherwise the imported option
 *                                          *Window Patching* sits inside a type
 *                                          called *Window Patching*
 *
 * A retitle changes `title` only. The slug stays (`pulls-lifts`, `window-patching`) —
 * a slug is a stable key and changing one deliberately is a separate act.
 *
 * `cardinality` is required on a new type and is NEVER written to an existing one;
 * those already hold a reviewed value. `many` only where a customer can genuinely
 * pick several: a box takes one paperboard but can carry a plaque and a mirror.
 */
const TYPE_PLAN = {
  // ── Material ──────────────────────────────────────────────────────────────
  'Blister Plastic':            { sanityTitle: 'Blister Plastic' },
  'Corrugated Board':           { sanityTitle: 'Corrugated Board' },
  'Exterior Wrap':              { sanityTitle: 'Exterior Wrap' },
  Paperboard:                   { sanityTitle: 'Paperboard' },
  Chipboards:                   { sanityTitle: 'Chipboards',          create: { category: 'Material', cardinality: 'one' } },
  Fabric:                       { sanityTitle: 'Fabric',              create: { category: 'Material', cardinality: 'one' } },
  Foam:                         { sanityTitle: 'Foam',                create: { category: 'Material', cardinality: 'one' } },
  'Mailer Film':                { sanityTitle: 'Mailer Film',         create: { category: 'Material', cardinality: 'one' } },
  'Molded Pulp':                { sanityTitle: 'Molded Pulp',         create: { category: 'Material', cardinality: 'one' } },
  'Pouch Material':             { sanityTitle: 'Pouch Material',      create: { category: 'Material', cardinality: 'one' } },
  'Sticker Material':           { sanityTitle: 'Sticker Material',    create: { category: 'Material', cardinality: 'one' } },
  'Tin Box Material':           { sanityTitle: 'Tin Box Material',    create: { category: 'Material', cardinality: 'one' } },
  // ── Finishes ──────────────────────────────────────────────────────────────
  'Embossing & Debossing':      { sanityTitle: 'Embossing & Debossing' },
  'Food-Safe Treatment':        { sanityTitle: 'Food-Safe Treatment' },
  Lamination:                   { sanityTitle: 'Lamination' },
  'Spot Coating':               { sanityTitle: 'Spot Coating' },
  'Surface Coating':            { sanityTitle: 'Surface Coating' },
  'Foiling Technique':          { sanityTitle: 'Foiling' },
  'Surface Finish':             { sanityTitle: 'Surface Finish',      create: { category: 'Finishes', cardinality: 'one' } },
  'Surface Finish (non-paper)': { sanityTitle: 'Surface Finish (non-paper)', create: { category: 'Finishes', cardinality: 'one' } },
  // ── Printing ──────────────────────────────────────────────────────────────
  Ink:                          { sanityTitle: 'Ink' },
  'Printing Method':            { sanityTitle: 'Printing Method' },
  'Color System':               { sanityTitle: 'Color System',        create: { category: 'Printing', cardinality: 'one' } },
  // ── Additional Customization ──────────────────────────────────────────────
  Closures:                     { sanityTitle: 'Closures' },
  'Reinforcement & Utility':    { sanityTitle: 'Reinforcement & Utility' },
  'Opening & Access':           { sanityTitle: 'Pulls & Lifts',       retitleTo: 'Opening & Access' },
  Windows:                      { sanityTitle: 'Window Patching',     retitleTo: 'Windows' },
  Embellishments:               { sanityTitle: 'Embellishments',      create: { category: 'Additional Customization', cardinality: 'many' } },
  Handles:                      { sanityTitle: 'Handles',             create: { category: 'Additional Customization', cardinality: 'one' } },
}

/**
 * Notion filter column → { Notion option label: propertyValue slug }.
 *
 * Scoped BY COLUMN, not by a flat label lookup, because the same word means
 * different things in the two models: Notion files `Textured` under
 * `Filter - Finish/Effect`, while Sanity's `textured` value belongs to the
 * *Physical Properties* property. A flat map would attach it under the wrong parent.
 *
 * A label absent from a column's map has NO `propertyValue` document in Sanity and is
 * skipped — Bleached, Unbleached, Dyed, Special Effect, Semi-Gloss, Metallic,
 * Holographic, Glitter, Pearlescent, Low VOC Emission, Energy-efficient,
 * Smudge-proof, Scratech-resistant (sic), Anti-fog, Microwave-safe, Tactile. Creating
 * those is a content decision, not an import step. The run reports every skip so the
 * gap is counted rather than silent.
 *
 * `Filter - Coverage` (Full Surface / Spot Effect) has no Sanity `property` document
 * at all, so the whole column is unmappable and is listed here as empty on purpose.
 */
const PROPERTY_VALUE_MAP = {
  'Filter - Material Source': { 'Virgin Fiber': 'virgin-fiber', 'Recycled Fiber': 'recycled-fiber' },
  'Filter - Physical Properties': { Coated: 'coated', Uncoated: 'uncoated' },
  'Filter - Aesthetic': { Natural: 'natural-look', Luxury: 'premium-look' },
  'Filter - Sustainability': {
    Recyclable: 'recyclable',
    Compostable: 'compostable',
    'Recycled Content': 'recycled-content',
    'FSC® available': 'fsc-certified',
  },
  'Filter - Finish/Effect': {
    Gloss: 'finish-gloss',
    Matte: 'finish-matte',
    'Soft Touch': 'finish-soft-touch',
    Textured: 'textured',
  },
  'Filter - Performance': { 'Moisture-resistant': 'moisture-resistant', 'Food-safe': 'food-safe' },
  'Filter - Coverage': {},
}

/**
 * Notion row title → the existing Sanity option it is the same thing as, where the
 * titles differ. Only one case: the acronym is expanded two different ways. Notion is
 * where the content team authors, so Notion's expansion wins on the document — but
 * somebody should confirm which is correct before it reaches a page.
 */
const TITLE_ALIASES = { 'CCNB (Clay-Coated News Back)': 'CCNB (Coated Chip Natural Back)' }

/**
 * `achieves` (D47 §1) points FROM a technical option TO the simplified, customer-facing
 * option it can deliver. Notion stores the same relationship backwards, as
 * `Related Finishing` on the Surface Finish rows, so it is inverted here.
 *
 * Keys are the Notion titles in `achievedBy`; values are the existing Sanity option
 * titles. `Soft Touch Coating` has no Sanity document and is dropped — the run says so.
 */
const ACHIEVES_SOURCE_TITLES = {
  'Gloss Lamination': 'Gloss Lamination',
  'Matte Lamination': 'Matte Lamination',
  'Soft Touch/Velvet Lamination': 'Soft Touch Lamination',
  'UV Coating': 'UV Coating',
  'Varnish Coating': 'Varnish Coating',
  'AQ Coating (Aqueous)': 'Aqueous Coating',
}

/**
 * Mock options with no Notion counterpart that may be removed. Deliberately short:
 * every other existing option is referenced by live content. Each one is re-checked
 * for incoming references at runtime before it is touched — this list is the
 * intention, the query is the authority.
 */
const DELETE_TITLES = ['FBB (Folding Box Board)', 'Kraft Paperboard']

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Matches the slugs already in the dataset: `&`, brackets and slashes drop out. */
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const ref = (id) => ({ _type: 'reference', _ref: id })

/** `drafts.foo` → `foo`. References must always point at the published id. */
const publishedId = (id) => id.replace(/^drafts\./, '')

/**
 * The client runs with `perspective: 'raw'`, so every query returns drafts alongside
 * their published twins. Collapse them: one entry per published id, preferring the
 * published document, and remember which ids also have a draft.
 *
 * Both halves matter. Without the collapse, a title lookup can resolve to
 * `drafts.<id>` and the import writes a reference to a draft — `Exterior Wrap` is a
 * live draft on production, so this is not hypothetical. And without the draft set,
 * a patch touches only the published document; the stale draft survives and reverts
 * the import the moment an editor hits Publish.
 */
function collapseDrafts(list) {
  const docs = new Map()
  const draftIds = new Set()
  for (const d of list) {
    const id = publishedId(d._id)
    if (d._id !== id) draftIds.add(d._id)
    const seen = docs.get(id)
    if (!seen || seen._id !== id) docs.set(id, { ...d, _id: id })
  }
  return { docs: [...docs.values()], draftIds }
}

/**
 * Notion's bullet copy → Portable Text. Bullets arrive separated by a blank line in
 * the API and by `<br><br>` in some views, so both are accepted; a trailing `<br>` is
 * dropped. Keys are positional so a re-run produces the identical document and the
 * transaction is a no-op rather than a churned revision.
 */
const toBlocks = (text) =>
  text
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line, i) => ({
      _type: 'block',
      _key: `b${i}`,
      style: 'normal',
      markDefs: [],
      children: [{ _type: 'span', _key: `b${i}s0`, text: line, marks: [] }],
    }))

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📥  Notion Demo customization import (PROD-2463)`)
  console.log(`    project=${PROJECT_ID} dataset=${DATASET} mode=${describeMode(args)}\n`)

  const data = JSON.parse(
    readFileSync(join(__dirname, 'data/notion-customization-demo.json'), 'utf8'),
  )
  const rows = data.databases.flatMap((db) => db.rows.map((r) => ({ ...r, category: db.category })))
  console.log(`    ${plural(rows.length, 'Notion row')} from ${plural(data.databases.length, 'database')}`)

  // ── Resolve what is already there ─────────────────────────────────────────
  const [rawCategories, rawTypes, rawPropertyValues, rawOptions] = await Promise.all([
    client.fetch(`*[_type == "customizationCategory"]{ _id, title }`),
    client.fetch(`*[_type == "customizationType"]{ _id, title, "slug": slug.current }`),
    client.fetch(`*[_type == "propertyValue"]{ _id, title, "slug": slug.current, "property": property->title }`),
    client.fetch(
      `*[_type == "customizationOption"]{ _id, title, "slug": slug.current, "nProps": count(properties), "props": properties[]._ref }`,
    ),
  ])
  const { docs: categories } = collapseDrafts(rawCategories)
  const { docs: types, draftIds: typeDraftIds } = collapseDrafts(rawTypes)
  const { docs: propertyValues } = collapseDrafts(rawPropertyValues)
  const { docs: options, draftIds: optionDraftIds } = collapseDrafts(rawOptions)
  const draftIds = new Set([...typeDraftIds, ...optionDraftIds])
  if (draftIds.size) {
    console.log(`    ${plural(draftIds.size, 'draft')} present — each patch is applied to the draft too`)
  }

  const byTitle = (list) => new Map(list.map((d) => [d.title, d]))
  const catByTitle = byTitle(categories)
  const typeByTitle = byTitle(types)
  const optByTitle = byTitle(options)
  const pvBySlug = new Map(propertyValues.map((d) => [d.slug, d]))

  const errors = []

  // ── 1. Types ──────────────────────────────────────────────────────────────
  const notionTypes = [...new Set(rows.map((r) => r.notionType))].sort()
  const typeDocs = []      // new customizationType documents to create
  const typeRetitles = []  // { _id, from, to }
  const typeIdFor = new Map()

  for (const nt of notionTypes) {
    const plan = TYPE_PLAN[nt]
    if (!plan) {
      errors.push(`Notion type "${nt}" has no entry in TYPE_PLAN — add one before importing.`)
      continue
    }
    const existing = typeByTitle.get(plan.sanityTitle)
    if (existing) {
      typeIdFor.set(nt, existing._id)
      if (plan.retitleTo && existing.title !== plan.retitleTo) {
        typeRetitles.push({ _id: existing._id, from: existing.title, to: plan.retitleTo })
      }
      continue
    }
    if (!plan.create) {
      errors.push(
        `Notion type "${nt}" maps to Sanity type "${plan.sanityTitle}", which does not exist ` +
          `and is not marked for creation. Either it was renamed or TYPE_PLAN is stale.`,
      )
      continue
    }
    const cat = catByTitle.get(plan.create.category)
    if (!cat) {
      errors.push(`Category "${plan.create.category}" not found — needed by new type "${plan.sanityTitle}".`)
      continue
    }
    const slug = slugify(plan.sanityTitle)
    const _id = `type-${slug}-r2304`
    typeIdFor.set(nt, _id)
    typeDocs.push({
      _id,
      _type: 'customizationType',
      title: plan.sanityTitle,
      slug: { _type: 'slug', current: slug },
      category: ref(cat._id),
      cardinality: plan.create.cardinality,
    })
  }

  // ── 2. Options ────────────────────────────────────────────────────────────
  const creates = []   // full documents
  const patches = []   // { _id, title, set }
  const usedPvByType = new Map() // type _id → Set of property titles, for the declarations below
  const skippedFilters = new Map() // "column: label" → count

  for (const row of rows) {
    const typeId = typeIdFor.get(row.notionType)
    if (!typeId) continue // already reported above

    // properties[] — resolve each Notion filter label to a propertyValue document.
    const pvRefs = []
    for (const [column, labels] of Object.entries(row.filters ?? {})) {
      const columnMap = PROPERTY_VALUE_MAP[column]
      if (!columnMap) {
        errors.push(`Unknown Notion filter column "${column}" on "${row.title}" — add it to PROPERTY_VALUE_MAP.`)
        continue
      }
      for (const label of labels) {
        const slug = columnMap[label]
        if (!slug) {
          const k = `${column}: ${label}`
          skippedFilters.set(k, (skippedFilters.get(k) ?? 0) + 1)
          continue
        }
        const pv = pvBySlug.get(slug)
        if (!pv) {
          errors.push(`propertyValue slug "${slug}" (${column}: ${label}) not found in ${DATASET}.`)
          continue
        }
        pvRefs.push(pv)
      }
    }
    if (pvRefs.length) {
      const set = usedPvByType.get(typeId) ?? new Set()
      pvRefs.forEach((pv) => set.add(pv.property))
      usedPvByType.set(typeId, set)
    }
    const propertiesField = pvRefs.map((pv) => ({ ...ref(pv._id), _key: `pv-${pv._id}` }))
    // pv._id is already collapsed to the published id by collapseDrafts().

    const benefits =
      row.whyUse || row.benefits
        ? {
            ...(row.whyUse ? { title: row.whyUse } : {}),
            ...(row.benefits ? { body: toBlocks(row.benefits) } : {}),
          }
        : null

    const existing = optByTitle.get(TITLE_ALIASES[row.title] ?? row.title)

    if (existing) {
      // Patch, never replace — see the header. Only fields Notion has an opinion
      // about, and `properties` is unioned so a richer existing list never shrinks.
      const set = { title: row.title, type: ref(typeId), role: 'configurable', status: 'active' }
      if (benefits) set.benefits = benefits
      if (row.metaDescription) set.metaDescription = row.metaDescription
      const merged = new Map(
        (existing.props ?? []).filter(Boolean).map((r) => [r, { ...ref(r), _key: `pv-${r}` }]),
      )
      propertiesField.forEach((p) => merged.set(p._ref, p))
      if (merged.size > (existing.nProps ?? 0)) set.properties = [...merged.values()]
      patches.push({
        _id: existing._id,
        title: row.title,
        wasTitle: existing.title,
        set,
        keptProps: existing.nProps ?? 0,
        addedProps: merged.size - (existing.nProps ?? 0),
      })
    } else {
      const slug = slugify(row.title)
      creates.push({
        _id: `cap-${slug}-r2304`,
        _type: 'customizationOption',
        title: row.title,
        slug: { _type: 'slug', current: slug },
        type: ref(typeId),
        status: 'active',
        role: 'configurable',
        ...(benefits ? { benefits } : {}),
        ...(propertiesField.length ? { properties: propertiesField } : {}),
        ...(row.metaDescription ? { metaDescription: row.metaDescription } : {}),
        // `initialValue` only runs in the Studio create flow, so an API write that
        // omits these leaves them undefined rather than defaulted.
        allowIndex: true,
        allowFollow: true,
        noImageIndex: false,
      })
    }
  }

  // ── 3. `properties[]` declarations on the types ────────────────────────────
  // Without these the Option's Properties field is unpickable: its picker filters to
  // `property._ref in type->properties[].property._ref`, and no type declares any
  // today. Writing option references without this half leaves a write-only field.
  const properties = await client.fetch(`*[_type == "property"]{ _id, title }`)
  const propByTitle = byTitle(properties)
  const typePropertyPatches = []
  for (const [typeId, propTitles] of usedPvByType) {
    const declared = [...propTitles].sort().map((t) => {
      const p = propByTitle.get(t)
      if (!p) errors.push(`property "${t}" not found — needed for a declaration on type ${typeId}.`)
      return p
    })
    if (declared.some((p) => !p)) continue
    typePropertyPatches.push({
      _id: typeId,
      properties: declared.map((p) => ({
        _key: `dp-${p._id}`,
        _type: 'declaredProperty',
        property: ref(p._id),
        usage: 'stated',
      })),
      titles: [...propTitles].sort(),
    })
  }

  // ── 4. `achieves` on the existing technical options ───────────────────────
  const achievesPatches = []
  const achievesSkipped = []
  const targetIdFor = (title) => {
    const slug = slugify(title)
    const existing = optByTitle.get(title)
    return existing ? existing._id : `cap-${slug}-r2304`
  }
  const achieves = new Map() // source option _id → Set of target option _id
  for (const row of rows) {
    if (!row.achievedBy?.length) continue
    const targetId = targetIdFor(row.title)
    for (const sourceNotionTitle of row.achievedBy) {
      const sanityTitle = ACHIEVES_SOURCE_TITLES[sourceNotionTitle]
      const source = sanityTitle ? optByTitle.get(sanityTitle) : undefined
      if (!source) {
        achievesSkipped.push(`${sourceNotionTitle} → ${row.title}`)
        continue
      }
      const set = achieves.get(source._id) ?? new Set()
      set.add(targetId)
      achieves.set(source._id, set)
    }
  }
  for (const [sourceId, targets] of achieves) {
    achievesPatches.push({
      _id: sourceId,
      title: options.find((o) => o._id === sourceId)?.title ?? sourceId,
      achieves: [...targets].sort().map((id) => ({ ...ref(id), _key: `ach-${id}` })),
    })
  }

  // ── 5. Deletes, gated on a live reference check ────────────────────────────
  const deletes = []
  for (const title of DELETE_TITLES) {
    const doc = optByTitle.get(title)
    if (!doc) {
      console.log(`    ℹ️  "${title}" is already gone — nothing to delete.`)
      continue
    }
    const incoming = await client.fetch(
      `*[references($id)]{ _id, _type, title }`,
      { id: doc._id },
    )
    if (incoming.length) {
      errors.push(
        `Refusing to delete "${title}" (${doc._id}) — ${plural(incoming.length, 'document')} still ` +
          `reference it: ${incoming.map((d) => `${d._type} "${d.title ?? d._id}"`).join(', ')}. ` +
          `Retarget or clear those references first.`,
      )
      continue
    }
    // A left-behind draft would resurrect the document on its next publish.
    deletes.push({ ...doc, draftId: draftIds.has(`drafts.${doc._id}`) ? `drafts.${doc._id}` : null })
  }

  // ── 6. Slug uniqueness ────────────────────────────────────────────────────
  // The Studio's uniqueness rule is validation-only; the API accepts duplicates and
  // an editor discovers them later as an unsaveable document.
  // `options` is already one entry per published id, so a draft no longer looks like
  // a second document sharing its twin's slug.
  const survivingSlugs = new Map()
  for (const o of options) {
    if (deletes.some((d) => d._id === o._id)) continue
    if (o.slug) survivingSlugs.set(o._id, o.slug)
  }
  for (const c of creates) survivingSlugs.set(c._id, c.slug.current)
  const slugOwners = new Map()
  for (const [id, slug] of survivingSlugs) {
    slugOwners.set(slug, [...(slugOwners.get(slug) ?? []), id])
  }
  for (const [slug, ids] of slugOwners) {
    if (ids.length > 1) errors.push(`Duplicate customizationOption slug "${slug}": ${ids.join(', ')}`)
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log(`\n1. Customization types`)
  console.log(`   ${plural(notionTypes.length, 'Notion type')} → ${plural(typeIdFor.size, 'Sanity type')}`)
  typeDocs.forEach((t) => console.log(`   ${apply ? '➕' : '•'} create "${t.title}" (${t.cardinality}) → ${t._id}`))
  typeRetitles.forEach((t) => console.log(`   ${apply ? '✏️ ' : '•'} retitle "${t.from}" → "${t.to}" (slug unchanged)`))
  if (!typeDocs.length && !typeRetitles.length) console.log(`   ✅ every type already present and named correctly`)

  console.log(`\n2. Customization options`)
  console.log(`   ➕ create  ${creates.length}`)
  console.log(`   ✏️  patch   ${patches.length} (existing _id preserved)`)
  patches.forEach((p) => {
    const renamed = p.wasTitle !== p.title ? `  [retitled from "${p.wasTitle}"]` : ''
    const props = p.addedProps > 0 ? `  [+${p.addedProps} properties, ${p.keptProps} kept]` : ''
    console.log(`      · ${p.title}${renamed}${props}`)
  })
  console.log(`   🗑  delete  ${deletes.length}`)
  deletes.forEach((d) => console.log(`      · ${d.title} (${d._id}) — 0 incoming references, ${plural(d.nProps ?? 0, 'property value')} lost`))
  const untouched = options.length - patches.length - deletes.length
  console.log(`   ✋ left alone ${untouched} existing option(s) with no Notion row`)

  console.log(`\n3. Property declarations on types (makes Properties pickable in the Studio)`)
  typePropertyPatches.forEach((t) =>
    console.log(`   ${apply ? '✏️ ' : '•'} ${types.find((x) => x._id === t._id)?.title ?? t._id}: ${t.titles.join(', ')}`),
  )
  if (!typePropertyPatches.length) console.log(`   ℹ️  no type needs one — no row resolved a property value`)

  console.log(`\n4. achieves (Notion "Related Finishing", inverted)`)
  achievesPatches.forEach((p) => console.log(`   ${apply ? '✏️ ' : '•'} ${p.title} achieves ${p.achieves.length}`))
  if (achievesSkipped.length) {
    console.log(`   ⚠️  ${plural(achievesSkipped.length, 'relation')} skipped, no Sanity option for the source:`)
    achievesSkipped.forEach((s) => console.log(`      · ${s}`))
  }

  if (skippedFilters.size) {
    console.log(`\n5. Filter labels with no propertyValue document (skipped)`)
    ;[...skippedFilters.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, n]) => console.log(`   · ${k} — on ${plural(n, 'row')}`))
  }

  if (errors.length) {
    console.error(`\n❌  ${plural(errors.length, 'blocking problem')} — nothing was written:\n`)
    errors.forEach((e) => console.error(`   • ${e}`))
    console.error(`\n    dataset=${DATASET}\n`)
    process.exit(1)
  }

  const writes =
    typeDocs.length +
    typeRetitles.length +
    creates.length +
    patches.length +
    typePropertyPatches.length +
    achievesPatches.length +
    deletes.length
  if (!writes) {
    console.log(`\n✅  Nothing to do — ${DATASET} already matches the Notion Demo set.\n`)
    return
  }
  if (!apply) {
    console.log(
      `\n${plural(writes, 'write')} pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\`` +
        ` (production also needs \`--yes-production\`).\n`,
    )
    return
  }

  // Types first: an option references a type, and a reference to a document that does
  // not exist yet is accepted but leaves the Studio showing a broken reference until
  // the type lands. One transaction keeps that window at zero.
  const tx = client.transaction()
  /** Patch the published document and its draft, if it has one. */
  const patchBoth = (id, fields) => {
    tx.patch(id, (p) => p.set(fields))
    const draft = `drafts.${id}`
    if (draftIds.has(draft)) tx.patch(draft, (p) => p.set(fields))
  }
  typeDocs.forEach((t) => tx.createOrReplace(t))
  typeRetitles.forEach((t) => patchBoth(t._id, { title: t.to }))
  creates.forEach((d) => tx.createOrReplace(d))
  patches.forEach((p) => patchBoth(p._id, p.set))
  typePropertyPatches.forEach((t) => patchBoth(t._id, { properties: t.properties }))
  achievesPatches.forEach((p) => patchBoth(p._id, { achieves: p.achieves }))
  deletes.forEach((d) => {
    tx.delete(d._id)
    if (d.draftId) tx.delete(d.draftId)
  })

  // `visibility: 'sync'` deliberately. An async commit returns before the dataset
  // settles, so the verification below would read the PREVIOUS state and report
  // success either way. That mistake has been made three times in this series.
  await tx.commit({ visibility: 'sync' })

  const after = await client.fetch(`{
    "options": count(*[_type == "customizationOption" && !(_id in path("drafts.**"))]),
    "types": count(*[_type == "customizationType" && !(_id in path("drafts.**"))]),
    "dangling": count(*[_type == "caseStudy"].capabilities[]->[!defined(_id)])
  }`)
  console.log(`\n✅  Applied ${plural(writes, 'write')} in ${DATASET}.`)
  console.log(`    options=${after.options} types=${after.types} dangling case-study references=${after.dangling}`)
  if (after.dangling > 0) {
    console.error(`\n❌  ${plural(after.dangling, 'case-study capability reference')} now dangling — investigate before deploying.\n`)
    process.exit(1)
  }
  console.log('')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
