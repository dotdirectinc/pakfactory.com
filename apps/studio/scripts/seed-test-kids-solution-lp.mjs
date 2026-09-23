#!/usr/bin/env node
/**
 * Seed Test Kids Packaging industry + styles + 14 inspiration products
 * (hero style-products fixtures) + case-study stubs + preselected customizations.
 *
 * All docs use stable test prefixes for easy cleanup:
 *   solution.test-kids-* / solutionStyle.test-kids-* / product.test-kids-*
 *   faq.test-kids-* / caseStudy.test-kids-* / client.test-kids-*
 *   slug test-kids-* / sku TEST-KIDS-*
 *
 * Styles copy the original Beauty INSPIRATION_CARDS mock content under Kids.
 * Products' titles include style keyword phrases so solution-style-filter matches.
 * Inspiration availableCustomizations are copied (preselected) from basedOn.
 * relatedCaseStudies feeds Industry LP case-study / video rows via inherit.
 *
 * Requires at least one existing standard product (for basedOn) and the
 * solutionIndustryPage template (from Beauty seed or otherwise).
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents
 * (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:test-kids-solution-lp -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:test-kids-solution-lp -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:test-kids-solution-lp -- --dataset production --confirm --yes-production
 *
 * Cleanup (human):
 *   *[_id match "solution.test-kids-*" || _id match "solutionStyle.test-kids-*"
 *     || _id match "product.test-kids-*" || _id match "faq.test-kids-*"
 *     || _id match "caseStudy.test-kids-*" || _id match "client.test-kids-*"
 *     || sku match "TEST-KIDS-*"]
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { createReadStream, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:test-kids-solution-lp -- --dataset <development|production> [--confirm] [--yes-production]

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

const SOLUTION_ID = 'solution.test-kids-packaging'
const SLUG = 'test-kids-packaging'
const TEMPLATE_ID = 'solutionIndustryPage'
const PUBLIC_DIR = join(
  repoRoot,
  'apps/www/public/solutions/beauty-cosmetics',
)
const MAX_PRESELECTED_CUSTOMIZATIONS = 4

/** Same mock cards as Beauty inspirations — seeded as Kids styles. */
const STYLE_CARDS = [
  {
    key: 'paper-gift-bags',
    title: 'Paper Gift Bags',
    description:
      'Elevate kids shopping experiences with custom paper gift bags.',
    image: 'hero/tile-novus-edge.png',
    alt: 'Pink rigid gift box holding six pastel lip balm pods',
  },
  {
    key: 'beauty-pouches',
    title: 'Beauty Pouches',
    description:
      'Package kids accessories in fully customizable pouches.',
    image: 'hero/tile-myko.png',
    alt: 'Printed stand-up pouch with a silver foil interior',
  },
  {
    key: 'product-boxes',
    title: 'Product Boxes',
    description:
      'Enhance shelf appeal with custom kids product boxes.',
    image: 'hero/tile-product-boxes.png',
    alt: 'Blue Drop body scrub jar in an open printed shipper',
  },
  {
    key: 'shipping-boxes',
    title: 'Shipping Boxes',
    description:
      'Deliver kids products with branded shipping boxes.',
    image: 'hero/tile-novus-edge-1.png',
    alt: 'Six pastel folding cartons stacked into a column',
  },
  {
    key: 'premium-rigid-gift-boxes',
    title: 'Premium Rigid Gift Boxes',
    description:
      'Luxury rigid gift boxes for kids brand prestige.',
    image: 'hero/tile-caudalie.png',
    alt: 'Jumiso skincare set in a frosted window carton',
  },
  {
    key: 'labels-stickers',
    title: 'Labels & Stickers',
    description:
      'Custom labels and stickers for kids packaging.',
    image: 'hero/tile-meridian.png',
    alt: 'Acure treatment tube beside a holographic printed carton',
  },
]

/** 14 products: 3,3,2,2,2,2 across the six styles. */
const PRODUCT_COUNTS = [3, 3, 2, 2, 2, 2]

const FAQ_ITEMS = [
  {
    id: 'faq.test-kids-1',
    slug: 'test-kids-formats',
    question: 'What packaging formats work for kids brands?',
    answer:
      'Paper gift bags, pouches, product boxes, and rigid gift sets are common starting points for kids lines.',
  },
  {
    id: 'faq.test-kids-2',
    slug: 'test-kids-finishes',
    question: 'Can you match brand colors for kids packaging?',
    answer:
      'Yes. Soft-touch, foil, and spot UV are routine. We proof color before production.',
  },
  {
    id: 'faq.test-kids-3',
    slug: 'test-kids-moq',
    question: 'What are typical MOQs for kids packaging?',
    answer:
      'MOQs depend on format and finish. Custom cartons often start in the low thousands.',
  },
]

/** Case-study stubs for relatedCaseStudies inherit (case + video rows). */
const CASE_STUDY_STUBS = [
  {
    id: 'caseStudy.test-kids-playbox',
    clientId: 'client.test-kids-playbox',
    clientSlug: 'test-kids-playbox',
    clientName: 'Playbox',
    slug: 'test-kids-playbox',
    title: 'Playful unboxing that turns kids SKUs into keepsakes',
    tag: 'Toys',
    image: 'case-studies/glossier.png',
    logoFile: 'logos/benefit.png',
  },
  {
    id: 'caseStudy.test-kids-sprout',
    clientId: 'client.test-kids-sprout',
    clientSlug: 'test-kids-sprout',
    clientName: 'Sprout',
    slug: 'test-kids-sprout',
    title: 'Compliant folding cartons for a kids wellness line',
    tag: 'Wellness',
    image: 'case-studies/herb.png',
    logoFile: 'logos/innisfree.png',
  },
  {
    id: 'caseStudy.test-kids-littleshelf',
    clientId: 'client.test-kids-littleshelf',
    clientSlug: 'test-kids-littleshelf',
    clientName: 'Little Shelf',
    slug: 'test-kids-littleshelf',
    title: 'Retail-ready kids cartons built for the shelf',
    tag: 'Retail',
    image: 'case-studies/alto.png',
    logoFile: 'logos/drop.png',
  },
  {
    id: 'caseStudy.test-kids-storykit',
    clientId: 'client.test-kids-storykit',
    clientSlug: 'test-kids-storykit',
    clientName: 'Storykit',
    slug: 'test-kids-storykit',
    title: 'Collectible gift packaging for a kids subscription box',
    tag: 'Gifting',
    image: 'case-studies/andplus.png',
    logoFile: 'logos/revlon.png',
  },
]

const CLEANUP_GROQ =
  '*[_id match "solution.test-kids-*" || _id match "solutionStyle.test-kids-*" || _id match "product.test-kids-*" || _id match "faq.test-kids-*" || _id match "caseStudy.test-kids-*" || _id match "client.test-kids-*" || sku match "TEST-KIDS-*"]'

const BASED_ON_BASE = /* groq */ `
  _type == "product" &&
  kind == "standard" &&
  !(_id in path("drafts.**")) &&
  defined(slug.current) &&
  defined(productLine._ref) &&
  count(productStyle) > 0
`

const BASED_ON_PROJ = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  "optionRefs": availableCustomizations[defined(customization)].customization._ref
}`

function styleFilterKeywords(title) {
  const phrase = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return phrase ? [phrase] : ['packaging']
}

function styleSeedId(key) {
  return `solutionStyle.test-kids-${key}`
}

function imageField(assetId, alt, key) {
  return {
    _type: 'image',
    ...(key ? { _key: key } : {}),
    asset: { _type: 'reference', _ref: assetId },
    ...(alt ? { alt } : {}),
  }
}

function ref(id, key) {
  return {
    _type: 'reference',
    _ref: id,
    ...(key ? { _key: key } : {}),
  }
}

function plainBlock(text, key) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: `${key}-span`, text, marks: [] }],
  }
}

/** @type {Map<string, string>} */
const assetCache = new Map()

async function resolveAsset(relativePath) {
  if (assetCache.has(relativePath)) return assetCache.get(relativePath)
  const abs = join(PUBLIC_DIR, relativePath)
  if (!existsSync(abs)) {
    throw new Error(`Missing asset file: ${abs}`)
  }
  const filename = relativePath.split('/').pop()
  const existing = await client.fetch(
    `*[_type == "sanity.imageAsset" && originalFilename == $filename][0]._id`,
    { filename },
  )
  if (existing) {
    assetCache.set(relativePath, existing)
    return existing
  }
  const doc = await client.assets.upload('image', createReadStream(abs), {
    filename,
  })
  assetCache.set(relativePath, doc._id)
  return doc._id
}

function buildProductSpecs() {
  /** @type {{ id: string, slug: string, sku: string, title: string, styleKey: string, image: string, alt: string }[]} */
  const products = []
  let n = 0
  STYLE_CARDS.forEach((style, styleIndex) => {
    const count = PRODUCT_COUNTS[styleIndex] ?? 2
    for (let i = 1; i <= count; i++) {
      n += 1
      const skuNum = String(n).padStart(3, '0')
      products.push({
        id: `product.test-kids-${style.key}-${i}`,
        slug: `test-kids-${style.key}-${i}`,
        sku: `TEST-KIDS-${skuNum}`,
        title: `[Test] Kids ${style.title} — Seed ${i}`,
        styleKey: style.key,
        image: style.image,
        alt: style.alt,
      })
    }
  })
  return products
}

/**
 * Prefer a standard product with ≥3 available customizations; fall back to any
 * valid standard. Returns { basedOn, optionRefs }.
 */
async function resolveBasedOn() {
  const withCust = await client.fetch(
    `*[${BASED_ON_BASE} && count(availableCustomizations) >= 3][0]${BASED_ON_PROJ}`,
  )
  if (withCust?._id) {
    return {
      basedOn: withCust,
      optionRefs: (withCust.optionRefs ?? [])
        .filter(Boolean)
        .slice(0, MAX_PRESELECTED_CUSTOMIZATIONS),
    }
  }

  const any = await client.fetch(`*[${BASED_ON_BASE}][0]${BASED_ON_PROJ}`)
  if (!any?._id) {
    return { basedOn: null, optionRefs: [] }
  }
  const refs = (any.optionRefs ?? []).filter(Boolean).slice(0, MAX_PRESELECTED_CUSTOMIZATIONS)
  return { basedOn: any, optionRefs: refs }
}

function buildPreselectedCustomizations(optionRefs) {
  return optionRefs.map((optionId, i) => ({
    _type: 'availableCustomization',
    _key: `cust-${i}`,
    customization: { _type: 'reference', _ref: optionId },
    preselected: true,
  }))
}

async function main() {
  console.log(`\nSeed Test Kids Packaging LP — ${describeMode(args)}\n`)

  const template = await client.fetch(
    `*[_id == $id][0]{ _id }`,
    { id: TEMPLATE_ID },
  )
  if (!template) {
    console.error(
      `❌  Missing ${TEMPLATE_ID}. Run Beauty LP seed first (or create Solution Industry Page).`,
    )
    process.exit(1)
  }

  const { basedOn, optionRefs } = await resolveBasedOn()
  if (!basedOn?._id) {
    console.error(
      '❌  No standard product found for basedOn. Seed/import a standard product first.',
    )
    process.exit(1)
  }
  console.log(`basedOn: ${basedOn.title} (${basedOn._id})`)
  if (optionRefs.length === 0) {
    console.warn(
      '⚠️  No availableCustomizations on any eligible standard product — hero preview dialog will have empty customizations.',
    )
  } else {
    console.log(`Preselected customizations: ${optionRefs.length}`)
  }

  for (const card of STYLE_CARDS) {
    await resolveAsset(card.image)
  }
  for (const stub of CASE_STUDY_STUBS) {
    await resolveAsset(stub.image)
    await resolveAsset(stub.logoFile)
  }

  const productSpecs = buildProductSpecs()
  const preselectedCustomizations = buildPreselectedCustomizations(optionRefs)
  console.log(`Styles: ${STYLE_CARDS.length}`)
  console.log(`Products: ${productSpecs.length}`)
  console.log(`Case studies: ${CASE_STUDY_STUBS.length}`)

  /** @type {{ kind: string, id: string, detail: string }[]} */
  const planned = [
    {
      kind: 'createOrReplace',
      id: SOLUTION_ID,
      detail: 'Test Kids Packaging industry solution',
    },
    ...FAQ_ITEMS.map((f) => ({
      kind: 'createOrReplace',
      id: f.id,
      detail: `faq ${f.slug}`,
    })),
    ...CASE_STUDY_STUBS.flatMap((s) => [
      {
        kind: 'createOrReplace',
        id: s.clientId,
        detail: `client ${s.clientSlug}`,
      },
      {
        kind: 'createOrReplace',
        id: s.id,
        detail: `caseStudy ${s.slug}`,
      },
    ]),
    ...STYLE_CARDS.map((c) => ({
      kind: 'createOrReplace',
      id: styleSeedId(c.key),
      detail: `solutionStyle ${c.key}`,
    })),
    ...productSpecs.map((p) => ({
      kind: 'createOrReplace',
      id: p.id,
      detail: `inspiration ${p.sku}`,
    })),
  ]

  console.log(`\nPlanned writes (${planned.length}):`)
  for (const row of planned) {
    console.log(`  ${row.kind.padEnd(14)} ${row.id} — ${row.detail}`)
  }
  console.log(`\nCleanup: ${CLEANUP_GROQ}`)

  if (!apply) {
    console.log(
      `\n${planned.length} write(s) pending on ${DATASET}. DRY-RUN — re-run with \`--confirm\`.\n`,
    )
    return
  }

  const tx = client.transaction()

  tx.createOrReplace({
    _id: SOLUTION_ID,
    _type: 'solution',
    title: 'Test Kids Packaging',
    h1: 'Custom kids packaging',
    shortName: 'Kids',
    slug: { _type: 'slug', current: SLUG },
    solutionType: 'industry',
    hasPage: true,
    shortDescription:
      'Test industry for hero style-product fixtures. Safe to delete (test-kids prefix).',
    description: [
      plainBlock(
        'Elevate kids products with custom packaging crafted for playful shelf appeal and durable protection. Test fixture for style-matched hero tiles.',
        'test-kids-desc',
      ),
    ],
    metaTitle: 'Test Kids Packaging | PakFactory',
    metaDescription:
      'Test Kids Packaging industry — fixture data for solution style hero products.',
    template: { _type: 'reference', _ref: TEMPLATE_ID },
    faqs: FAQ_ITEMS.map((f) => ref(f.id, `faq-${f.slug}`)),
    relatedCaseStudies: CASE_STUDY_STUBS.map((s) =>
      ref(s.id, `related-${s.slug}`),
    ),
  })

  for (const faq of FAQ_ITEMS) {
    tx.createOrReplace({
      _id: faq.id,
      _type: 'faq',
      question: faq.question,
      slug: { _type: 'slug', current: faq.slug },
      answer: [plainBlock(faq.answer, `${faq.slug}-a`)],
      scope: 'contextual',
    })
  }

  for (const stub of CASE_STUDY_STUBS) {
    const logoId = assetCache.get(stub.logoFile)
    const cardId = assetCache.get(stub.image)
    tx.createOrReplace({
      _id: stub.clientId,
      _type: 'client',
      name: stub.clientName,
      slug: { _type: 'slug', current: stub.clientSlug },
      logo: imageField(logoId, stub.clientName),
    })
    tx.createOrReplace({
      _id: stub.id,
      _type: 'caseStudy',
      title: stub.title,
      slug: { _type: 'slug', current: stub.slug },
      client: { _type: 'reference', _ref: stub.clientId },
      cardImage: imageField(cardId, stub.title),
      cardImageAlt: stub.title,
      cardSummary: stub.tag,
      publishedAt: new Date().toISOString(),
    })
  }

  for (const card of STYLE_CARDS) {
    const id = styleSeedId(card.key)
    tx.createOrReplace({
      _id: id,
      _type: 'solutionStyle',
      title: card.title,
      shortName: card.title,
      shortDescription: card.description,
      slug: { _type: 'slug', current: `test-kids-${card.key}` },
      solution: { _type: 'reference', _ref: SOLUTION_ID },
      featuredImage: imageField(assetCache.get(card.image), card.alt),
      filter: {
        keywords: styleFilterKeywords(card.title),
      },
    })
  }

  const faqRefs = FAQ_ITEMS.map((f) => ref(f.id, `faq-${f.slug}`))
  for (const spec of productSpecs) {
    const imageId = assetCache.get(spec.image)
    /** @type {Record<string, unknown>} */
    const doc = {
      _id: spec.id,
      _type: 'product',
      title: spec.title,
      slug: { _type: 'slug', current: spec.slug },
      kind: 'inspiration',
      status: 'active',
      customerFacing: true,
      sku: spec.sku,
      shortDescription: `Test fixture inspiration product for ${spec.styleKey}.`,
      basedOn: { _type: 'reference', _ref: basedOn._id },
      solutions: [ref(SOLUTION_ID, 'sol-kids')],
      media: [imageField(imageId, spec.alt, `media-${spec.slug}`)],
      faqs: faqRefs,
    }
    if (preselectedCustomizations.length > 0) {
      doc.availableCustomizations = preselectedCustomizations
    }
    tx.createOrReplace(doc)
  }

  await tx.commit({ visibility: 'sync' })
  console.log(`\n✅  Applied Test Kids seed on ${DATASET}.`)
  console.log(`    Solution: ${SOLUTION_ID} → /solutions/${SLUG}`)
  console.log(
    `    Styles: ${STYLE_CARDS.length} · Products: ${productSpecs.length} · Case studies: ${CASE_STUDY_STUBS.length}`,
  )
  console.log(`    basedOn: ${basedOn._id}`)
  console.log(
    `    Preselected customizations: ${preselectedCustomizations.length}`,
  )
  console.log(
    `    Studio: Solutions → Test Kids Packaging → Solution Styles / Categorization.\n`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
