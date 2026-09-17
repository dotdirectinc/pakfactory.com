#!/usr/bin/env node
/**
 * Seed White Lined Corrugated Board for a complete customization detail demo
 * on development (PROD-1299).
 *
 * Completes Type + Option content beyond selectable Color/Finish:
 *   1. Stated declared properties on Type `corrugated-board`
 *   2. Stated property values on Option `white-lined-corrugated-board`
 *   3. availableOnProducts → product lines
 *   4. media[] padded to 6 by cycling existing assets
 *   5. glossaryTerm create + option reference
 *   6. faqs[] typed Q&A
 *
 * Reuses existing Property / Property Value / Product Line docs.
 * Idempotent. No new Property / PropertyValue documents.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:white-lined-detail-demo -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:white-lined-detail-demo -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:white-lined-detail-demo -- --dataset production --confirm --yes-production
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:white-lined-detail-demo -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`

const args = parseScriptArgs({ usage: USAGE })
const { confirm: apply } = args

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  '8293wrxp'
const DATASET = args.dataset
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity token in .env.local')
  process.exit(1)
}
if (apply && !(process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_TOKEN)) {
  console.error(
    '❌  --confirm needs a WRITE token (SANITY_API_WRITE_TOKEN / SANITY_TOKEN).',
  )
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

const TYPE_SLUG = 'corrugated-board'
const OPTION_SLUG = 'white-lined-corrugated-board'
const GLOSSARY_ID = 'glossary-white-lined-corrugated'

/** Keep selectable Color + Finish; add stated specs. */
const DECLARED = [
  { slug: 'color', usage: 'selectable' },
  { slug: 'finish-type', usage: 'selectable' },
  { slug: 'physical-properties', usage: 'stated' },
  { slug: 'performance', usage: 'stated' },
  { slug: 'sustainability', usage: 'stated' },
  { slug: 'source', usage: 'stated' },
]

const SELECTABLE_VALUE_SLUGS = [
  'color-white',
  'color-brown',
  'color-black',
  'finish-gloss',
  'finish-matte',
  'finish-soft-touch',
]

const STATED_VALUE_SLUGS = [
  'smooth',
  'printable',
  'coated',
  'tear-resistant',
  'recyclable',
  'fsc-certified',
  'virgin-fiber',
]

const PRODUCT_LINE_SLUGS = [
  'corrugated-boxes',
  'cardboard-displays',
  'folding-cartons',
  'box-inserts',
]

const FAQ_ITEMS = [
  {
    question: 'Is white-lined corrugated board recyclable?',
    answer:
      'Yes. Standard white-lined corrugated is recyclable with paper streams, and FSC®-certified fiber is available on request for programs that need chain-of-custody documentation.',
  },
  {
    question: 'How does it compare to fully bleached white corrugated?',
    answer:
      'White-lined keeps a kraft core with a print-ready white face, so you get clean graphics at a lower cost than fully bleached board while retaining corrugated strength for shipping.',
  },
  {
    question: 'What print methods work best on the white liner?',
    answer:
      'The smooth white face supports flexo and digital for solid color and simple graphics. For photo-quality work, talk to a specialist about coatings and print method pairing.',
  },
]

function publishedId(id) {
  return id.replace(/^drafts\./, '')
}

function ref(id, key) {
  return { _type: 'reference', _ref: publishedId(id), _key: key }
}

function plainBlock(text, key = randomUUID().slice(0, 12)) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: `${key}-s0`,
        marks: [],
        text,
      },
    ],
  }
}

function sameRefSet(a, b) {
  const left = (a ?? []).map((r) => r?._ref).filter(Boolean).sort().join('|')
  const right = (b ?? []).map((r) => r?._ref).filter(Boolean).sort().join('|')
  return left === right
}

function declaredMatches(existing, next) {
  const key = (row) =>
    `${row?.property?._ref ?? ''}:${row?.usage ?? ''}`
  const left = (existing ?? []).map(key).sort().join('|')
  const right = (next ?? []).map(key).sort().join('|')
  return left === right
}

function mediaAssetIds(media) {
  return (media ?? [])
    .map((m) => m?.asset?._ref)
    .filter(Boolean)
    .join('|')
}

function faqsMatch(existing, next) {
  const left = (existing ?? [])
    .map((f) => f?.question)
    .filter(Boolean)
    .sort()
    .join('|')
  const right = next.map((f) => f.question).sort().join('|')
  return left === right
}

async function main() {
  console.log(
    `\nseed:white-lined-detail-demo  project=${PROJECT_ID}  dataset=${DATASET}  ${describeMode(args)}\n`,
  )

  const type = await client.fetch(
    `*[
      _type == "customizationType" &&
      slug.current == $slug &&
      !(_id in path("drafts.**"))
    ][0]{ _id, title, properties }`,
    { slug: TYPE_SLUG },
  )
  if (!type?._id) {
    console.error(`❌  No published Type with slug "${TYPE_SLUG}" in ${DATASET}.`)
    process.exit(1)
  }

  const option = await client.fetch(
    `*[
      _type == "customizationOption" &&
      slug.current == $slug &&
      !(_id in path("drafts.**"))
    ][0]{
      _id,
      title,
      properties,
      media,
      availableOnProducts,
      glossaryTerm,
      faqs
    }`,
    { slug: OPTION_SLUG },
  )
  if (!option?._id) {
    console.error(
      `❌  No published Option with slug "${OPTION_SLUG}" in ${DATASET}.`,
    )
    process.exit(1)
  }

  const propSlugs = DECLARED.map((d) => d.slug)
  const properties = await client.fetch(
    `*[
      _type == "property" &&
      slug.current in $slugs &&
      !(_id in path("drafts.**"))
    ]{ _id, title, "slug": slug.current }`,
    { slugs: propSlugs },
  )
  const propBySlug = new Map(properties.map((p) => [p.slug, p]))
  for (const slug of propSlugs) {
    if (!propBySlug.has(slug)) {
      console.error(`❌  Missing Property slug "${slug}" in ${DATASET}.`)
      process.exit(1)
    }
  }

  const allValueSlugs = [...SELECTABLE_VALUE_SLUGS, ...STATED_VALUE_SLUGS]
  const values = await client.fetch(
    `*[
      _type == "propertyValue" &&
      slug.current in $slugs &&
      !(_id in path("drafts.**"))
    ]{ _id, title, "slug": slug.current }`,
    { slugs: allValueSlugs },
  )
  const valueBySlug = new Map(values.map((v) => [v.slug, v]))
  for (const slug of allValueSlugs) {
    if (!valueBySlug.has(slug)) {
      console.error(`❌  Missing Property Value slug "${slug}" in ${DATASET}.`)
      process.exit(1)
    }
  }

  const lines = await client.fetch(
    `*[
      _type == "productLine" &&
      slug.current in $slugs &&
      !(_id in path("drafts.**"))
    ]{ _id, title, "slug": slug.current }`,
    { slugs: PRODUCT_LINE_SLUGS },
  )
  const lineBySlug = new Map(lines.map((l) => [l.slug, l]))
  for (const slug of PRODUCT_LINE_SLUGS) {
    if (!lineBySlug.has(slug)) {
      console.error(`❌  Missing Product Line slug "${slug}" in ${DATASET}.`)
      process.exit(1)
    }
  }

  const existingAssets = (option.media ?? [])
    .map((m) => m?.asset?._ref)
    .filter(Boolean)
  if (existingAssets.length === 0) {
    console.error(
      `❌  Option has no media assets to cycle — add at least one image first.`,
    )
    process.exit(1)
  }

  const nextDeclared = DECLARED.map((row) => {
    const prop = propBySlug.get(row.slug)
    return {
      _type: 'declaredProperty',
      _key: `dp-${row.slug}`,
      usage: row.usage,
      property: { _type: 'reference', _ref: prop._id },
    }
  })

  const nextOptionProps = allValueSlugs.map((slug) =>
    ref(valueBySlug.get(slug)._id, `pv-${slug}`),
  )

  const nextLines = PRODUCT_LINE_SLUGS.map((slug) =>
    ref(lineBySlug.get(slug)._id, `apl-${slug}`),
  )

  const nextMedia = []
  for (let i = 0; i < 6; i++) {
    const assetRef = existingAssets[i % existingAssets.length]
    nextMedia.push({
      _type: 'image',
      _key: `media-demo-${i + 1}`,
      asset: { _type: 'reference', _ref: assetRef },
      alt: `${option.title} showcase ${i + 1}`,
    })
  }

  const nextFaqs = FAQ_ITEMS.map((item, i) => ({
    _type: 'faqItem',
    _key: `faq-demo-${i + 1}`,
    question: item.question,
    answer: [plainBlock(item.answer, `faq-a-${i + 1}`)],
  }))

  const glossaryDoc = {
    _id: GLOSSARY_ID,
    _type: 'glossaryTerm',
    term: 'White-Lined Corrugated Board',
    slug: { _type: 'slug', current: 'white-lined-corrugated-board' },
    definition: [
      plainBlock(
        'Corrugated board with a white print-ready liner on the face and a kraft fluted core. Used for shipping boxes and displays that need clean branding without fully bleached board.',
        'gloss-def-0',
      ),
    ],
    group: 'materials',
  }

  const existingGlossary = await client.fetch(
    `*[_id == $id][0]{ _id, term, "slug": slug.current, definition }`,
    { id: GLOSSARY_ID },
  )

  const typeNeedsPatch = !declaredMatches(type.properties, nextDeclared)
  const propsNeedPatch = !sameRefSet(option.properties, nextOptionProps)
  const linesNeedPatch = !sameRefSet(option.availableOnProducts, nextLines)
  const mediaNeedsPatch =
    (option.media ?? []).length !== 6 ||
    mediaAssetIds(option.media) !== mediaAssetIds(nextMedia)
  const glossaryNeedsCreate = !existingGlossary?._id
  const glossaryRefNeedsPatch =
    option.glossaryTerm?._ref !== GLOSSARY_ID
  const faqsNeedPatch = !faqsMatch(option.faqs, nextFaqs)

  console.log(`Type:   ${type.title}`)
  console.log(
    `  declared → ${DECLARED.map((d) => `${d.slug}:${d.usage}`).join(', ')}`,
  )
  console.log(`Option: ${option.title}`)
  console.log(
    `  properties → ${allValueSlugs.length} values (selectable + stated)`,
  )
  console.log(
    `  availableOnProducts → ${PRODUCT_LINE_SLUGS.join(', ')}`,
  )
  console.log(`  media → 6 slots (cycle ${existingAssets.length} existing asset(s))`)
  console.log(
    `  glossaryTerm → ${GLOSSARY_ID}${glossaryNeedsCreate ? ' (create)' : ' (exists)'}`,
  )
  console.log(`  faqs → ${FAQ_ITEMS.length} typed Q&A`)

  const writes =
    (typeNeedsPatch ? 1 : 0) +
    (propsNeedPatch ? 1 : 0) +
    (linesNeedPatch ? 1 : 0) +
    (mediaNeedsPatch ? 1 : 0) +
    (glossaryNeedsCreate ? 1 : 0) +
    (glossaryRefNeedsPatch ? 1 : 0) +
    (faqsNeedPatch ? 1 : 0)

  if (!writes) {
    console.log(
      `\n✅  Nothing to do — ${DATASET} already has the White Lined detail demo wiring.\n`,
    )
    return
  }

  if (!apply) {
    console.log(
      `\n${writes} write(s) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`,
    )
    return
  }

  const tx = client.transaction()
  if (glossaryNeedsCreate) {
    tx.createOrReplace(glossaryDoc)
  }
  if (typeNeedsPatch) {
    tx.patch(type._id, (patch) => patch.set({ properties: nextDeclared }))
  }

  const optionSet = {}
  if (propsNeedPatch) optionSet.properties = nextOptionProps
  if (linesNeedPatch) optionSet.availableOnProducts = nextLines
  if (mediaNeedsPatch) optionSet.media = nextMedia
  if (glossaryRefNeedsPatch) {
    optionSet.glossaryTerm = {
      _type: 'reference',
      _ref: GLOSSARY_ID,
    }
  }
  if (faqsNeedPatch) optionSet.faqs = nextFaqs

  if (Object.keys(optionSet).length > 0) {
    tx.patch(option._id, (patch) => patch.set(optionSet))
  }

  await tx.commit({ visibility: 'sync' })
  console.log(`\n✅  Applied ${writes} write(s) in ${DATASET}.`)
  console.log(
    `    Preview: /customizations/materials/${OPTION_SLUG}\n`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
