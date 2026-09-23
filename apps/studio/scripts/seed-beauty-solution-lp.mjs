#!/usr/bin/env node
/**
 * Seed Beauty & Cosmetics Solution LP + Solution Industry Page template
 * (WP4 / ADR-020 / Phase B).
 *
 * Upserts dependency docs (clients, FAQs, demo case-study stubs, Beauty
 * solutionStyles), creates the pinned `solutionIndustryPage` singleton
 * (section order + chrome; logo wall also gets shared default clients), and
 * patches `solution` slug `beauty-cosmetics` with matching `_key` **content**
 * sections plus `template` → solutionIndustryPage.
 *
 * Assets are uploaded from apps/www/public/solutions/beauty-cosmetics/**.
 * Expertise stages are resolved by existing CMS slugs (not invented).
 * Testimonials are intentionally omitted (PROD-2293).
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:beauty-solution-lp -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:beauty-solution-lp -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:beauty-solution-lp -- --dataset production --confirm --yes-production
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
  pnpm --filter @pakfactory/studio run seed:beauty-solution-lp -- --dataset <development|production> [--confirm] [--yes-production]

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

const SITE_ORIGIN = 'https://www.pakfactory.com'
const SLUG = 'beauty-cosmetics'
const PUBLIC_DIR = join(
  repoRoot,
  'apps/www/public/solutions/beauty-cosmetics',
)
const SOLUTION_ID = 'solution.beauty-cosmetics'
const TEMPLATE_ID = 'solutionIndustryPage'
const HELP_CATEGORY_ID = 'helpCategory.beauty-seed-packaging'

/** Chrome keys owned by the template (merge prefers these over solution). */
const TEMPLATE_CHROME_KEYS = [
  'heading',
  'intro',
  'align',
  'showTopBorder',
  'showBottomBorder',
  'link',
]

/**
 * Strip band content so the singleton carries order + chrome.
 * Exception: `logoWall` keeps shared default curated clients (seeded on the
 * industry template as well as on Beauty). Other lists stay empty.
 */
function chromeOnlySection(section) {
  const out = {
    _type: section._type,
    _key: section._key,
  }
  for (const key of TEMPLATE_CHROME_KEYS) {
    if (section[key] != null) out[key] = section[key]
  }
  switch (section._type) {
    case 'logoWall':
      out.curatedItems = Array.isArray(section.curatedItems)
        ? section.curatedItems
        : []
      break
    case 'caseStudiesRow':
    case 'expertiseSequence':
      out.curatedItems = []
      break
    case 'inspirationsGrid':
    case 'videoCaseStudiesRow':
      out.cards = []
      break
    case 'faqSection':
      out.faqs = []
      break
    default:
      break
  }
  return out
}

function solutionStyleSeedId(key) {
  return `solutionStyle.beauty-${key}`
}

/** Keyword phrase for solutionStyle.filter (required non-empty). */
function styleFilterKeywords(title) {
  const phrase = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return phrase ? [phrase] : ['packaging']
}

/** Fixture logo band → client docs */
const LOGO_CLIENTS = [
  {
    slug: 'venture',
    name: 'Venture',
    file: 'logos/venture.png',
    website: `${SITE_ORIGIN}/case-studies/venture`,
  },
  { slug: 'innisfree', name: 'innisfree', file: 'logos/innisfree.png' },
  { slug: 'drop', name: 'drop', file: 'logos/drop.png' },
  { slug: 'revlon', name: 'Revlon', file: 'logos/revlon.png' },
  { slug: 'ammu-beauty', name: 'Ammu Beauty', file: 'logos/ammu-beauty.png' },
  { slug: 'benefit', name: 'Benefit', file: 'logos/benefit.png' },
]

/** Case-study stub brands (fixture Glossier / Herb / Alto / Andplus) */
const CASE_STUDY_STUBS = [
  {
    id: 'caseStudy.beauty-seed-glossier',
    clientId: 'client.beauty-seed-glossier',
    clientSlug: 'beauty-seed-glossier',
    clientName: 'Glossier',
    slug: 'beauty-seed-glossier',
    title: 'Elevating a beauty icon with a fully branded unboxing moment',
    tag: 'Cosmetics',
    image: 'case-studies/glossier.png',
    logoFile: 'logos/benefit.png',
  },
  {
    id: 'caseStudy.beauty-seed-herb',
    clientId: 'client.beauty-seed-herb',
    clientSlug: 'beauty-seed-herb',
    clientName: 'Herb',
    slug: 'beauty-seed-herb',
    title: 'Clean, compliant folding cartons for a plant-based skincare line',
    tag: 'Skincare',
    image: 'case-studies/herb.png',
    logoFile: 'logos/innisfree.png',
  },
  {
    id: 'caseStudy.beauty-seed-alto',
    clientId: 'client.beauty-seed-alto',
    clientSlug: 'beauty-seed-alto',
    clientName: 'Alto',
    slug: 'beauty-seed-alto',
    title: 'Compact, premium cartons built for the retail shelf',
    tag: 'Skincare',
    image: 'case-studies/alto.png',
    logoFile: 'logos/drop.png',
  },
  {
    id: 'caseStudy.beauty-seed-andplus',
    clientId: 'client.beauty-seed-andplus',
    clientSlug: 'beauty-seed-andplus',
    clientName: 'Andplus',
    slug: 'beauty-seed-andplus',
    title: 'Bold, collectible packaging that turns a product into a keepsake',
    tag: 'Luxury Gifting',
    image: 'case-studies/andplus.png',
    logoFile: 'logos/revlon.png',
  },
]

/** Map fixture journey order → existing expertiseStage.slug.current */
const EXPERTISE_STAGES = [
  {
    slug: 'packaging-strategy',
    description:
      'Beauty ranges grow by shade, size and season. Our 360° Strategic Framework maps each SKU onto shared substrates and tooling — so the range reads as one family, and Total Cost of Ownership drops as it scales.',
  },
  {
    slug: 'packaging-design',
    description:
      "Droppers, airless pumps and glass jars are top-heavy and fragile. We cut dielines to your primary's exact dimensions, then specify the finish that sells it — soft-touch lamination, cold foil, an embedded mirror.",
    diagramFile: 'expertise/expertise-design.png',
  },
  {
    slug: 'prototyping',
    description:
      'A six-shade range has to match across every substrate. Controlled sampling plus AI-powered colour management lock the range on a G7 Master press, and foam-insert samples reach you in about five business days.',
  },
  {
    slug: 'managed-manufacturing',
    description:
      'Your finish only works if the factory can actually hold it. We match each SKU to a PakCertified facility audited to ISO 9001 and G7 Master, then govern every run so the reorder matches the launch exactly.',
  },
  {
    slug: 'logistics-management',
    description:
      'Your carton, insert, gift bag and labels have different lead times and different factories. We consolidate them into one shipment, engineer the pallet so nothing scuffs, and clear customs on your Incoterms.',
  },
  {
    slug: 'packaging-fulfillment',
    description:
      'Holiday sets and press kits are assembled by hand to your spec. Retailer pack-outs meet Routing Guide standards, and FBA-compliant barcoding plus transit-tested secondary packaging covers the digital shelf.',
  },
]

const INSPIRATION_CARDS = [
  {
    key: 'paper-gift-bags',
    title: 'Paper Gift Bags',
    description:
      'Elevate beauty shopping experiences with our chic cosmetic paper gift bags.',
    image: 'hero/tile-novus-edge.png',
    alt: 'Pink rigid gift box holding six pastel lip balm pods',
  },
  {
    key: 'beauty-pouches',
    title: 'Beauty Pouches',
    description:
      'Package cosmetic products and accessories in our fully customizable pouches.',
    image: 'hero/tile-myko.png',
    alt: 'Printed stand-up pouch with a silver foil interior',
  },
  {
    key: 'product-boxes',
    title: 'Product Boxes',
    description:
      'Enhance shelf appeal with our custom cosmetic boxes that provide premium branding and reliable protection.',
    image: 'hero/tile-product-boxes.png',
    alt: 'Blue Drop body scrub jar in an open printed shipper',
  },
  {
    key: 'shipping-boxes',
    title: 'Shipping Boxes',
    description:
      'Deliver beauty with our cosmetic and skincare shipping boxes, offering excellent protection and effective branding.',
    image: 'hero/tile-novus-edge-1.png',
    alt: 'Six pastel folding cartons stacked into a column',
  },
  {
    key: 'premium-rigid-gift-boxes',
    title: 'Premium Rigid Gift Boxes',
    description:
      'Enhance beauty brand prestige with our luxury cosmetic packaging boxes, expertly crafted for superior protection elegance.',
    image: 'hero/tile-caudalie.png',
    alt: 'Jumiso skincare set in a frosted window carton',
  },
  {
    key: 'labels-stickers',
    title: 'Labels & Stickers',
    description:
      'Enhance beauty packaging with customizable cosmetic labels and stickers, offering stunning designs durability.',
    image: 'hero/tile-meridian.png',
    alt: 'Acure treatment tube beside a holographic printed carton',
  },
]

const FAQ_ITEMS = [
  {
    id: 'faq.beauty-seed-1',
    slug: 'beauty-packaging-formats',
    question:
      'What packaging formats work best for beauty and cosmetics brands?',
    answer:
      'Rigid boxes, folding cartons, and sleeve-and-tray sets are the most common starting points. We match format to channel — retail shelf, DTC unboxing, or gift kits — and to how your SKUs share board and tooling.',
  },
  {
    id: 'faq.beauty-seed-2',
    slug: 'beauty-brand-colors-finishes',
    question: 'Can you match my brand colors and specialty finishes?',
    answer:
      'Yes. Soft-touch, foil, emboss/deboss, and spot UV are routine on beauty runs. We proof color and finish on production-intent samples before you commit to a full order.',
  },
  {
    id: 'faq.beauty-seed-3',
    slug: 'beauty-moqs-lead-times',
    question: 'What are typical MOQs and lead times for beauty packaging?',
    answer:
      'MOQs depend on format and finish complexity, but custom beauty cartons and rigid sets often start in the low thousands. Lead times cover design lock, sampling, and production — we map dates against your launch once the brief is clear.',
  },
  {
    id: 'faq.beauty-seed-4',
    slug: 'beauty-inserts-dielines',
    question: 'Do you help with inserts, dielines, and multi-SKU systems?',
    answer:
      'Our design and prototyping teams build fitted inserts, shared dielines across a shade or size range, and kits that stay cohesive as the line grows — so you are not retooling every SKU from scratch.',
  },
  {
    id: 'faq.beauty-seed-5',
    slug: 'beauty-get-a-quote',
    question: 'How do I get a quote for beauty packaging?',
    answer:
      'Share your product sizes, target quantity, and any brand references. Start a quote request or talk with our team — we will recommend a format path and return production-ready pricing.',
  },
]

const PRODUCTS_INDUSTRY_URL = `${SITE_ORIGIN}/products?industry=${SLUG}`
const CUSTOMIZATIONS_URL = `${SITE_ORIGIN}/customizations`
const CASE_STUDIES_URL = `${SITE_ORIGIN}/case-studies`

function plainBlock(text, key) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: `${key}-span`, text, marks: [] }],
  }
}

function externalLink(url) {
  return {
    linkType: 'external',
    externalUrl: url,
  }
}

function imageField(assetId, alt) {
  return {
    _type: 'image',
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

function clientSeedId(slug) {
  return `client.beauty-seed-${slug}`
}

/** @type {Map<string, string>} relative path → asset _id */
const assetCache = new Map()

async function resolveAsset(relativePath, kind = 'image') {
  if (assetCache.has(relativePath)) return assetCache.get(relativePath)

  const abs = join(PUBLIC_DIR, relativePath)
  if (!existsSync(abs)) {
    throw new Error(`Missing asset file: ${abs}`)
  }

  const filename = relativePath.split('/').pop()
  const existing = await client.fetch(
    `*[
      _type == $type &&
      originalFilename == $filename
    ][0]._id`,
    {
      type: kind === 'file' ? 'sanity.fileAsset' : 'sanity.imageAsset',
      filename,
    },
  )
  if (existing) {
    assetCache.set(relativePath, existing)
    return existing
  }

  if (!apply) {
    const placeholder = `pending:${relativePath}`
    assetCache.set(relativePath, placeholder)
    return placeholder
  }

  const contentType =
    kind === 'file'
      ? 'video/mp4'
      : filename.endsWith('.png')
        ? 'image/png'
        : 'image/jpeg'

  const doc = await client.assets.upload(kind, createReadStream(abs), {
    filename,
    contentType,
  })
  assetCache.set(relativePath, doc._id)
  return doc._id
}

async function main() {
  console.log(
    `\nseed:beauty-solution-lp  project=${PROJECT_ID}  dataset=${DATASET}  ${describeMode(args)}\n`,
  )

  // ── Expertise stages (must already exist) ─────────────────────────────────
  const stageSlugs = EXPERTISE_STAGES.map((s) => s.slug)
  const stages = await client.fetch(
    `*[
      _type == "expertiseStage" &&
      slug.current in $slugs &&
      !(_id in path("drafts.**"))
    ]{ _id, title, description, tagline, "slug": slug.current, "hasDiagram": defined(diagram.asset) }`,
    { slugs: stageSlugs },
  )
  const stageBySlug = new Map(stages.map((s) => [s.slug, s]))
  const missingStages = stageSlugs.filter((s) => !stageBySlug.has(s))
  if (missingStages.length) {
    console.error(
      `❌  Missing expertiseStage slug(s) in ${DATASET}: ${missingStages.join(', ')}\n` +
        `    Seed the six PakFactory expertise stages before running this script.`,
    )
    process.exit(1)
  }
  console.log(
    `Expertise stages: ${EXPERTISE_STAGES.map((s) => s.slug).join(' → ')}`,
  )

  // ── Help category for FAQs ────────────────────────────────────────────────
  let helpCategoryId = await client.fetch(
    `*[
      _type == "helpCategory" &&
      !(_id in path("drafts.**"))
    ] | order(_createdAt asc) [0]._id`,
  )
  const needHelpCategory = !helpCategoryId
  if (needHelpCategory) {
    helpCategoryId = HELP_CATEGORY_ID
    console.log(`Help category: will create ${HELP_CATEGORY_ID}`)
  } else {
    console.log(`Help category: reuse ${helpCategoryId}`)
  }

  // ── Existing solution ─────────────────────────────────────────────────────
  const solution = await client.fetch(
    `*[
      _type == "solution" &&
      slug.current == $slug &&
      !(_id in path("drafts.**"))
    ][0]{
      _id, title, h1, shortName, shortDescription, hasPage,
      metaTitle, metaDescription, solutionType, sections, template
    }`,
    { slug: SLUG },
  )
  const solutionId = solution?._id || SOLUTION_ID
  console.log(
    `Solution: ${solution ? `${solution.title} (${solution._id})` : `will create ${SOLUTION_ID}`}`,
  )

  const existingTemplate = await client.fetch(
    `*[_id == $id][0]{ _id, title, "sectionCount": count(sections) }`,
    { id: TEMPLATE_ID },
  )
  console.log(
    `Template: ${
      existingTemplate
        ? `${TEMPLATE_ID} (${existingTemplate.sectionCount ?? 0} sections)`
        : `will create ${TEMPLATE_ID}`
    }`,
  )

  // ── Existing clients by logo slug ─────────────────────────────────────────
  const logoSlugs = LOGO_CLIENTS.map((c) => c.slug)
  const existingClients = await client.fetch(
    `*[
      _type == "client" &&
      slug.current in $slugs &&
      !(_id in path("drafts.**"))
    ]{ _id, name, "slug": slug.current, website, "hasLogo": defined(logo.asset) }`,
    { slugs: logoSlugs },
  )
  const clientBySlug = new Map(existingClients.map((c) => [c.slug, c]))

  // ── Existing FAQs / case stubs ────────────────────────────────────────────
  const faqIds = FAQ_ITEMS.map((f) => f.id)
  const existingFaqs = await client.fetch(
    `*[_id in $ids]{ _id, question }`,
    { ids: faqIds },
  )
  const faqExists = new Set(existingFaqs.map((f) => f._id))

  const stubIds = [
    ...CASE_STUDY_STUBS.map((s) => s.id),
    ...CASE_STUDY_STUBS.map((s) => s.clientId),
  ]
  const existingStubs = await client.fetch(`*[_id in $ids]._id`, {
    ids: stubIds,
  })
  const stubExists = new Set(existingStubs)

  // ── Collect asset paths ───────────────────────────────────────────────────
  const imagePaths = new Set([
    ...LOGO_CLIENTS.map((c) => c.file),
    ...CASE_STUDY_STUBS.flatMap((s) => [s.image, s.logoFile]),
    ...INSPIRATION_CARDS.map((c) => c.image),
    'customizations/materials-finishes.png',
  ])
  for (const stage of EXPERTISE_STAGES) {
    if (stage.diagramFile) imagePaths.add(stage.diagramFile)
  }
  const videoPath = 'case-studies/sample.mp4'
  const hasVideo = existsSync(join(PUBLIC_DIR, videoPath))

  console.log(
    `\nAssets to resolve: ${imagePaths.size} image(s)` +
      (hasVideo ? ' + sample.mp4' : ' (no sample.mp4)'),
  )

  for (const path of imagePaths) {
    await resolveAsset(path, 'image')
  }
  let videoAssetId = null
  if (hasVideo) {
    videoAssetId = await resolveAsset(videoPath, 'file')
  }

  // ── Plan dependency upserts ───────────────────────────────────────────────
  /** @type {{ kind: string, id: string, detail: string }[]} */
  const planned = []

  if (needHelpCategory) {
    planned.push({
      kind: 'create',
      id: HELP_CATEGORY_ID,
      detail: 'helpCategory Packaging (seed)',
    })
  }

  /** @type {Map<string, string>} logo slug → client _id for curatedItems */
  const logoClientIds = new Map()

  for (const row of LOGO_CLIENTS) {
    const existing = clientBySlug.get(row.slug)
    const id = existing?._id || clientSeedId(row.slug)
    logoClientIds.set(row.slug, id)
    const needsCreate = !existing
    const needsLogo = !existing?.hasLogo
    const needsWebsite =
      Boolean(row.website) && existing?.website !== row.website
    if (needsCreate || needsLogo || needsWebsite) {
      planned.push({
        kind: needsCreate ? 'create' : 'patch',
        id,
        detail: `client ${row.name}${needsLogo ? ' +logo' : ''}${needsWebsite ? ' +website' : ''}`,
      })
    }
  }

  for (const stub of CASE_STUDY_STUBS) {
    if (!stubExists.has(stub.clientId)) {
      planned.push({
        kind: 'create',
        id: stub.clientId,
        detail: `client stub ${stub.clientName}`,
      })
    }
    planned.push({
      kind: stubExists.has(stub.id) ? 'replace' : 'create',
      id: stub.id,
      detail: `caseStudy stub ${stub.slug}`,
    })
  }

  for (const faq of FAQ_ITEMS) {
    planned.push({
      kind: faqExists.has(faq.id) ? 'replace' : 'create',
      id: faq.id,
      detail: `faq ${faq.slug}`,
    })
  }

  for (const card of INSPIRATION_CARDS) {
    const id = solutionStyleSeedId(card.key)
    planned.push({
      kind: 'createOrReplace',
      id,
      detail: `solutionStyle ${card.key}`,
    })
  }

  for (const stage of EXPERTISE_STAGES) {
    const doc = stageBySlug.get(stage.slug)
    const needDesc = !doc.description?.trim()
    const needDiagram = Boolean(stage.diagramFile) && !doc.hasDiagram
    if (needDesc || needDiagram) {
      planned.push({
        kind: 'patch',
        id: doc._id,
        detail: `expertiseStage ${stage.slug}${needDesc ? ' +description' : ''}${needDiagram ? ' +diagram' : ''}`,
      })
    }
  }

  planned.push({
    kind: existingTemplate ? 'replace' : 'create',
    id: TEMPLATE_ID,
    detail:
      'solutionIndustryPage sections[] (chrome + shared logoWall clients, stable _keys)',
  })

  planned.push({
    kind: solution ? 'patch' : 'create',
    id: solutionId,
    detail: `solution ${SLUG} sections[] content + template → ${TEMPLATE_ID} + relatedCaseStudies + solutionStyle refs`,
  })

  console.log(`\nPlanned writes (${planned.length}):`)
  for (const row of planned) {
    console.log(`  ${row.kind.padEnd(7)} ${row.id} — ${row.detail}`)
  }
  console.log(`\nSections order (shared _keys on template + solution):`)
  console.log(
    `  1 logoWall → 2 inspirationsGrid → 3 mediaFeature → 4 expertiseSequence`,
  )
  console.log(
    `  5 caseStudiesRow → 6 videoCaseStudiesRow → (skip testimonials) → 7 faqSection`,
  )
  console.log(
    `\nTemplate: order + chrome; logoWall also gets shared default clients.`,
  )
  console.log(
    `Beauty: band content (same _keys); inspirationsGrid → solutionStyle refs.`,
  )
  console.log(
    `Known deltas vs fixture: no eyebrows/highlightSpans (D35); no testimonials (PROD-2293);`,
  )
  console.log(
    `  case-study stubs use beauty-seed-* slugs; CTA labels may fall back to “Learn more”.`,
  )

  if (!apply) {
    console.log(
      `\n${planned.length} write(s) pending on ${DATASET}. DRY-RUN only — re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`,
    )
    return
  }

  // ── Apply ─────────────────────────────────────────────────────────────────
  const tx = client.transaction()

  if (needHelpCategory) {
    tx.createOrReplace({
      _id: HELP_CATEGORY_ID,
      _type: 'helpCategory',
      title: 'Packaging',
      slug: { _type: 'slug', current: 'packaging' },
    })
  }

  for (const row of LOGO_CLIENTS) {
    const existing = clientBySlug.get(row.slug)
    const id = logoClientIds.get(row.slug)
    const logoId = assetCache.get(row.file)
    if (!existing) {
      tx.createOrReplace({
        _id: id,
        _type: 'client',
        name: row.name,
        slug: { _type: 'slug', current: row.slug },
        logo: imageField(logoId, row.name),
        ...(row.website ? { website: row.website } : {}),
      })
    } else {
      const set = {}
      if (!existing.hasLogo) set.logo = imageField(logoId, row.name)
      if (row.website && existing.website !== row.website) {
        set.website = row.website
      }
      if (Object.keys(set).length) {
        tx.patch(id, (p) => p.set(set))
      }
    }
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

  for (const faq of FAQ_ITEMS) {
    tx.createOrReplace({
      _id: faq.id,
      _type: 'faq',
      question: faq.question,
      slug: { _type: 'slug', current: faq.slug },
      answer: [plainBlock(faq.answer, `${faq.slug}-a`)],
      scope: 'contextual',
      category: { _type: 'reference', _ref: helpCategoryId },
      about: [{ _type: 'reference', _key: 'about-sol', _ref: solutionId }],
    })
  }

  for (const card of INSPIRATION_CARDS) {
    const id = solutionStyleSeedId(card.key)
    const imageId = assetCache.get(card.image)
    tx.createOrReplace({
      _id: id,
      _type: 'solutionStyle',
      title: card.title,
      shortName: card.title,
      shortDescription: card.description,
      slug: { _type: 'slug', current: card.key },
      solution: { _type: 'reference', _ref: solutionId },
      featuredImage: imageField(imageId, card.alt),
      filter: {
        keywords: styleFilterKeywords(card.title),
      },
    })
  }

  for (const stage of EXPERTISE_STAGES) {
    const doc = stageBySlug.get(stage.slug)
    const set = {}
    if (!doc.description?.trim()) set.description = stage.description
    if (stage.diagramFile && !doc.hasDiagram) {
      set.diagram = imageField(
        assetCache.get(stage.diagramFile),
        doc.title || stage.slug,
      )
    }
    if (Object.keys(set).length) {
      tx.patch(doc._id, (p) => p.set(set))
    }
  }

  const sections = [
    {
      _type: 'logoWall',
      _key: 'beauty-logo-wall',
      heading: 'Brands we build beauty packaging for',
      intro: 'Building beauty & cosmetic packaging with confidence and speed.',
      curatedItems: LOGO_CLIENTS.map((c) =>
        ref(logoClientIds.get(c.slug), `logo-${c.slug}`),
      ),
    },
    {
      _type: 'inspirationsGrid',
      _key: 'beauty-inspirations',
      heading:
        'Explore every format a beauty line needs. Produced, not rendered.',
      intro:
        '737 packaging across skincare, makeup, fragrance, hair and gifting. Filter by what you are packing.',
      link: externalLink(PRODUCTS_INDUSTRY_URL),
      cards: INSPIRATION_CARDS.map((card) =>
        ref(solutionStyleSeedId(card.key), `style-${card.key}`),
      ),
    },
    {
      _type: 'mediaFeature',
      _key: 'beauty-customizations',
      heading:
        '200+ materials, finishes, and add-on options held in one place, to bring your brand to life.',
      body: [
        plainBlock(
          'From concept to shelf, we deliver premium packaging with bespoke finishes, luxe materials, and precision printing that elevates your brand.',
          'beauty-media-body',
        ),
      ],
      media: imageField(
        assetCache.get('customizations/materials-finishes.png'),
        'A studio spread of packaging materials and finishes — copper and gold foil-stamped panels, blind-embossed boards, a purple suede-laminated block, gilt-edged board stacks, and iridescent, textured and coloured swatch squares arranged on a pink set',
      ),
      link: externalLink(CUSTOMIZATIONS_URL),
    },
    {
      _type: 'expertiseSequence',
      _key: 'beauty-expertise',
      heading: 'One team owns every step, from your first dieline to the shelf.',
      intro:
        'Beauty packaging leaves no room for imperfection. Our end-to-end expertise — from strategy and design through manufacturing and delivery — covers every decision behind your packaging, so you get it right the first time and every run after.',
      curatedItems: EXPERTISE_STAGES.map((s) =>
        ref(stageBySlug.get(s.slug)._id, `stage-${s.slug}`),
      ),
    },
    {
      _type: 'caseStudiesRow',
      _key: 'beauty-case-studies',
      heading: 'Real projects. Real outcomes.',
      intro:
        'See how beauty brands turned packaging like this into a shelf-ready unboxing — made on our own line, with the run-to-run consistency and lead times to back it.',
      curatedItems: CASE_STUDY_STUBS.map((s) =>
        ref(s.id, `cs-${s.slug}`),
      ),
    },
    {
      _type: 'videoCaseStudiesRow',
      _key: 'beauty-video-case-studies',
      heading: 'Packaging moments, captured.',
      intro:
        'Portrait stories with a glass footer — hover the first card to play a muted sample loop.',
      link: externalLink(CASE_STUDIES_URL),
      cards: CASE_STUDY_STUBS.map((stub, index) => {
        const card = {
          _type: 'videoCaseStudyCard',
          _key: `video-${stub.slug}`,
          brand: stub.clientName,
          title: stub.title,
          image: imageField(assetCache.get(stub.image), stub.title),
          logo: imageField(assetCache.get(stub.logoFile), stub.clientName),
          link: {
            linkType: 'internal',
            internalLink: { _type: 'reference', _ref: stub.id },
          },
        }
        if (index === 0 && videoAssetId) {
          card.video = {
            _type: 'file',
            asset: { _type: 'reference', _ref: videoAssetId },
          }
          card.metric = {
            title: "Project Hours Off The Client's Plate",
            body: 'Sourcing, sampling, color matching, and delivery were all handled on our end, allowing the brand to focus entirely on its rebrand.',
          }
        }
        return card
      }),
    },
    {
      _type: 'faqSection',
      _key: 'beauty-faqs',
      heading: 'Questions & Answers',
      faqs: FAQ_ITEMS.map((f) => ref(f.id, `faq-${f.slug}`)),
    },
  ]

  const templateSections = sections.map(chromeOnlySection)
  const relatedCaseStudies = CASE_STUDY_STUBS.map((s) =>
    ref(s.id, `related-${s.slug}`),
  )

  tx.createOrReplace({
    _id: TEMPLATE_ID,
    _type: 'solutionIndustryPage',
    title: 'Solution Industry Page',
    sections: templateSections,
  })

  const solutionDoc = {
    _id: solutionId,
    _type: 'solution',
    title: solution?.title || 'Beauty & Cosmetics',
    h1: solution?.h1 || 'Custom beauty packaging',
    shortName: solution?.shortName || 'Beauty',
    slug: { _type: 'slug', current: SLUG },
    solutionType: solution?.solutionType || 'industry',
    hasPage: true,
    shortDescription:
      solution?.shortDescription ||
      'Packaging paths, inspiration, and expertise for beauty and cosmetics brands.',
    metaTitle:
      solution?.metaTitle ||
      'Beauty & Cosmetics Packaging Solutions | PakFactory',
    metaDescription:
      solution?.metaDescription ||
      'Explore custom packaging for beauty and cosmetics — inspiration, finishes, expertise, and a path to a quote.',
    template: { _type: 'reference', _ref: TEMPLATE_ID },
    relatedCaseStudies,
    sections,
  }

  if (!solution) {
    tx.createOrReplace(solutionDoc)
  } else {
    const set = {
      hasPage: true,
      sections,
      template: solutionDoc.template,
      relatedCaseStudies,
      solutionType: solution.solutionType || 'industry',
    }
    if (!solution.h1) set.h1 = solutionDoc.h1
    if (!solution.shortName) set.shortName = solutionDoc.shortName
    if (!solution.shortDescription) {
      set.shortDescription = solutionDoc.shortDescription
    }
    if (!solution.metaTitle) set.metaTitle = solutionDoc.metaTitle
    if (!solution.metaDescription) {
      set.metaDescription = solutionDoc.metaDescription
    }
    tx.patch(solutionId, (p) => p.set(set))
  }

  await tx.commit({ visibility: 'sync' })
  console.log(`\n✅  Applied seed on ${DATASET}.`)
  console.log(`    Template: ${TEMPLATE_ID} (logoWall shared clients)`)
  console.log(`    Solution: ${solutionId} → template ${TEMPLATE_ID}`)
  console.log(
    `    Solution styles: ${INSPIRATION_CARDS.length} under Beauty (inspirationsGrid refs)`,
  )
  console.log(`    Preview: /solutions/${SLUG}`)
  console.log(
    `    Studio: Main Website → Listing Pages → Solution Industry Page (reorder + logo wall),`,
  )
  console.log(
    `            Solutions → Beauty → Template tab + Solution Styles tab + Sections.`,
  )
  console.log(
    `    Publish any drafts in Studio if Presentation still shows empty sections.\n`,
  )
  console.log(`    Note: testimonials band is absent until PROD-2293.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
