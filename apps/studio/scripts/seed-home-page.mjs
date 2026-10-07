#!/usr/bin/env node
/**
 * Seed the Home page layout (PROD-2666) onto the `homePage` singleton, in the
 * agreed order, from REAL documents in the target dataset — no invented records:
 *
 *   1–4  Spotlight · Full-bleed · Finder · Finder fullscreen
 *        (review: four H1s — keep one before launch)
 *   5    Clients         logoWall          clients with a logo
 *   6    Products        productLinesRow   visible product lines
 *   7    Industries      solutionsRow      solutions with a page
 *   8    Why PakFactory  benefits          copy approved by Richard 2026-09-30
 *   9    How it works    steps             copy approved by Richard 2026-09-30
 *   10   Case studies    caseStudiesRow    recent case studies with an image
 *   11   By the numbers  stats             figures approved by Richard 2026-09-30
 *   12   Expertise       expertiseSequence listed stages, end-to-end order
 *   13   Reviews         testimonialsRow   live Google reviews (chrome only)
 *   14   FAQ             faqSection        up to 5 existing FAQs with scope "general"
 *   15   Get a quote     generalCta        site default copy → /contact
 *
 * Idempotent: seeded sections use stable `_key`s (`seed-hero-*`, `seed-home-*`);
 * re-running replaces them in order and appends every other section after them.
 * Patches the published `homePage` (created if missing) and its draft if one exists.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:home-page -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:home-page -- --dataset development --confirm
 */

import {createClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describeMode, parseScriptArgs} from './lib/script-args.mjs'
import {
  buildFinderGeneralBuckets,
  stageRank,
} from './lib/finder-general-buckets.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({path: join(repoRoot, '.env.local')})
loadEnv({path: join(repoRoot, '.env')})
loadEnv({path: join(repoRoot, 'apps/studio/.env.local'), override: true})

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:home-page -- --dataset <development|production> [--confirm] [--yes-production]

  --dataset         REQUIRED. Which dataset to read/write. No env fallback.
  --confirm         Actually write. Without it the run is a dry run.
  --yes-production  Second gate; required to write to production.`

const args = parseScriptArgs({usage: USAGE})
const {confirm: apply} = args
const DATASET = args.dataset

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  '8293wrxp'
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_TOKEN

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

const HOME_ID = 'homePage'
const KEYS = {
  spotlight: 'seed-hero-spotlight',
  fullBleed: 'seed-hero-full-bleed',
  finder: 'seed-hero-finder',
  finderFullscreen: 'seed-hero-finder-fullscreen',
  clients: 'seed-home-clients',
  products: 'seed-home-products',
  industries: 'seed-home-industries',
  caseStudies: 'seed-home-case-studies',
  expertise: 'seed-home-expertise',
  reviews: 'seed-home-reviews',
  quote: 'seed-home-quote',
  benefits: 'seed-home-benefits',
  steps: 'seed-home-steps',
  stats: 'seed-home-stats',
  faqs: 'seed-home-faqs',
}
const SEED_KEYS = new Set(Object.values(KEYS))

const PUBLISHED = '!(_id in path("drafts.**"))'
const LINE_VISIBLE = '(!defined(status) || status == "active")'

const CANDIDATES_QUERY = /* groq */ `{
  "caseStudies": *[_type == "caseStudy" && ${PUBLISHED} && defined(slug.current)
    && (defined(heroMedia.image.asset) || defined(cardImage.asset) || defined(heroMedia.videoThumbnail.asset))]
    | order(publishedAt desc)[0...3]{
      _id, title,
      "imageRef": coalesce(cardImage.asset._ref, heroMedia.image.asset._ref, heroMedia.videoThumbnail.asset._ref)
    },
  "lines": *[_type == "productLine" && ${PUBLISHED} && defined(slug.current) && ${LINE_VISIBLE}]{
      _id, title, "hasImage": (defined(images[primary == true][0].asset) || defined(images[0].asset) || defined(featuredImage.asset))
    } | order(hasImage desc, title asc)[0...4],
  "lineDiagnostics": {
    "all": count(*[_type == "productLine" && ${PUBLISHED}]),
    "withSlug": count(*[_type == "productLine" && ${PUBLISHED} && defined(slug.current)]),
    "visible": count(*[_type == "productLine" && ${PUBLISHED} && defined(slug.current) && ${LINE_VISIBLE}]),
    "withImage": count(*[_type == "productLine" && ${PUBLISHED} && (defined(images[primary == true][0].asset) || defined(images[0].asset) || defined(featuredImage.asset))]),
    "byStatus": array::unique(*[_type == "productLine" && ${PUBLISHED}].status),
    "draftsOnly": count(*[_type == "productLine" && _id in path("drafts.**")
      && !(string::split(_id, "drafts.")[1] in *[_type == "productLine" && ${PUBLISHED}]._id)])
  },
  "industries": *[_type == "solution" && ${PUBLISHED} && defined(slug.current) && status == "active"]{
      _id, title, "hasImage": (defined(images[primary == true][0].asset) || defined(images[0].asset) || defined(featuredImage.asset)), "studies": count(relatedCaseStudies)
    } | order(studies desc, title asc)[0...4],
  "rowLines": *[_type == "productLine" && ${PUBLISHED} && defined(slug.current) && ${LINE_VISIBLE}]{
      _id, title, "hasImage": (defined(images[primary == true][0].asset) || defined(images[0].asset) || defined(featuredImage.asset))
    } | order(hasImage desc, title asc)[0...6],
  "rowIndustries": *[_type == "solution" && ${PUBLISHED} && defined(slug.current) && status == "active"]{
      _id, title, "hasImage": (defined(images[primary == true][0].asset) || defined(images[0].asset) || defined(featuredImage.asset))
    } | order(hasImage desc, title asc)[0...6],
  "rowCaseStudies": *[_type == "caseStudy" && ${PUBLISHED} && defined(slug.current) && defined(cardImage.asset)]
    | order(publishedAt desc)[0...4]{_id, title},
  "clients": *[_type == "client" && ${PUBLISHED} && defined(logo.asset)]
    | order(name asc)[0...10]{_id, name},
  "stages": *[_type == "expertiseStage" && ${PUBLISHED} && defined(slug.current)
    && (!defined(status) || status in ["active", "coming-soon"])]{_id, title},
  "customizations": *[_type == "customizationType" && ${PUBLISHED} && defined(title)]
    | order(title asc)[0...4]{_id, title},
  "posts": *[_type == "post" && ${PUBLISHED} && defined(slug.current)]
    | order(publishedAt desc)[0...4]{_id, title},
  "faqs": *[_type == "faq" && ${PUBLISHED} && scope == "general" && defined(question)]
    | order(_createdAt asc)[0...5]{_id, question}
}`

const copy = {
  eyebrow: 'Custom packaging manufacturer',
  intro: 'Designed, sampled and produced by one team, from first sample to full production.',
  showReviews: true,
  primaryCta: {
    label: 'Request a quote',
    note: 'Custom sizes, print and finishes',
    linkType: 'path',
    relativePath: '/request',
  },
  secondaryCta: {
    label: 'Browse products',
    note: 'Styles, specs and options',
    linkType: 'path',
    relativePath: '/products',
  },
}

const ref = (_id, _key, _type = 'reference') => ({_key, _type, _ref: _id})

function buildSpotlight({caseStudies, lines, industries}) {
  const items = []
  const [firstStudy, secondStudy] = caseStudies
  if (firstStudy) items.push(ref(firstStudy._id, 'slide-case-1', 'spotlightRef'))
  const line = lines.find((row) => row.hasImage)
  if (line) items.push(ref(line._id, 'slide-line-1', 'spotlightRef'))
  const industry = industries.find((row) => row.hasImage)
  if (industry) items.push(ref(industry._id, 'slide-industry-1', 'spotlightRef'))
  if (secondStudy) items.push(ref(secondStudy._id, 'slide-case-2', 'spotlightRef'))
  const campaign = buildPromoCampaign(caseStudies)
  if (campaign) {
    items.push({_key: 'slide-campaign-1', _type: 'heroSpotlightCampaign', ...campaign})
  }
  return items.slice(0, 5)
}

/** Shared Finder / Finder-fullscreen copy + pickers (same payload). */
function buildFinderFields(candidates) {
  return {
    eyebrow: copy.eyebrow,
    headingLead: 'Custom',
    headingJoin: 'for',
    headingTrail: 'brands.',
    intro: 'Pick a product line and an industry to see what we have made.',
    primaryCta: copy.primaryCta,
    secondaryCta: copy.secondaryCta,
    showReviews: true,
    productLines: candidates.lines.map((line, i) => ref(line._id, `line-${i + 1}`)),
    industries: candidates.industries.map((row, i) => ref(row._id, `industry-${i + 1}`)),
  }
}

function buildPromoCampaign(caseStudies) {
  const firstStudy = caseStudies[0]
  const campaignImage = caseStudies[2]?.imageRef || firstStudy?.imageRef
  if (!campaignImage) return null
  return {
    title: 'Talk to a packaging expert',
    description:
      'Not sure where to start? Tell us about your product and we will recommend a format.',
    image: {_type: 'image', asset: {_type: 'reference', _ref: campaignImage}},
    link: {label: 'Contact us', linkType: 'path', relativePath: '/contact'},
  }
}

/**
 * General default rail for Finder fullscreen — ordered flexible items
 * (catalogue refs + optional promo campaign).
 */
function buildDefaultRail(candidates, notes) {
  const items = []
  const pushCatalogue = (kindLabel, doc) => {
    if (!doc?._id) {
      notes.push(`Finder fullscreen · ${kindLabel} omitted — no candidate`)
      return
    }
    items.push({
      _key: `rail-${kindLabel.toLowerCase().replace(/\s+/g, '-')}`,
      _type: 'finderRailItem',
      kindLabel,
      source: 'catalogue',
      item: {_type: 'reference', _ref: doc._id},
      bannerType: 'image',
    })
  }

  pushCatalogue('Product', candidates.lines[0])
  pushCatalogue('Solution', candidates.industries[0])
  const stages = [...(candidates.stages ?? [])].sort(
    (a, b) => stageRank(a.title) - stageRank(b.title),
  )
  pushCatalogue('Expertise', stages[0])
  pushCatalogue('Customization', candidates.customizations?.[0])
  pushCatalogue('Case study', candidates.caseStudies[0])
  pushCatalogue('Blog', candidates.posts?.[0])

  const campaign = buildPromoCampaign(candidates.caseStudies)
  if (campaign) {
    items.push({
      _key: 'rail-promo',
      _type: 'finderRailItem',
      kindLabel: 'Promo',
      source: 'campaign',
      title: campaign.title,
      description: campaign.description,
      link: campaign.link,
      bannerType: 'image',
      bannerImage: campaign.image,
    })
  } else {
    notes.push('Finder fullscreen · Promo omitted — no campaign image')
  }

  return items
}

function buildSections(candidates) {
  const spotlight = buildSpotlight(candidates)
  const sections = []
  const notes = []

  if (spotlight.length > 0) {
    sections.push({
      _key: KEYS.spotlight,
      _type: 'heroSpotlight',
      ...copy,
      heading: 'Packaging that sells the product.',
      spotlight,
    })
    sections.push({
      _key: KEYS.fullBleed,
      _type: 'heroSpotlightFullBleed',
      ...copy,
      heading: 'Custom packaging, made to be noticed.',
      spotlight,
    })
  } else {
    notes.push('no case studies / lines / industries with images — Spotlight + Full-bleed skipped')
  }

  if (candidates.lines.length >= 2 && candidates.industries.length >= 2) {
    const finderFields = buildFinderFields(candidates)
    sections.push({
      _key: KEYS.finder,
      _type: 'heroFinder',
      ...finderFields,
      ...buildFinderGeneralBuckets(candidates),
    })
    sections.push({
      _key: KEYS.finderFullscreen,
      _type: 'heroFinderFullscreen',
      ...finderFields,
      defaultRail: buildDefaultRail(candidates, notes),
    })
  } else {
    notes.push(
      `Finder + Finder fullscreen skipped — needs 2+ visible product lines (found ${candidates.lines.length}) and 2+ industries with a page (found ${candidates.industries.length})`,
    )
  }
  return {sections, notes}
}

/** Approved copy (PROD-2666, 2026-09-30). Edit here, re-run the seed. */
const BENEFITS = [
  ['One team, idea to delivery', 'Strategy, design, prototyping, manufacturing and logistics handled by one team, so nothing gets lost between vendors.', 'quality'],
  ['Experts on every order', 'A packaging specialist helps you choose the structure, material and finish that fit your product.', 'clarity'],
  ['See it before you commit', 'Samples and prototypes let you check fit, print and finish before the full run.', 'risk'],
  ['Eco-friendly options', 'Recyclable and sustainable materials across our product lines.', 'sustainability'],
]
const STEPS = [
  ['Tell us what you need', 'Share your product, quantities and artwork, or start from a product style.', ['Request a quote', '/request']],
  ['Get your quote', 'A packaging specialist reviews your request and sends pricing and options.'],
  ['Approve a sample', 'Check structure, print and finish on a physical sample before production.'],
  ['Production and delivery', 'We manufacture your order and ship it to your door or warehouse.'],
]
const STATS = [
  ['3,000+', 'Brands served'],
  ['4.6', 'Google rating'],
]

const pathLink = (label, relativePath) => ({label, linkType: 'path', relativePath})

function buildBody(candidates) {
  const body = []
  const notes = []
  const refs = (docs, prefix) => docs.map((doc, i) => ref(doc._id, `${prefix}-${i + 1}`))

  if (candidates.clients.length > 0) {
    body.push({_key: KEYS.clients, _type: 'logoWall', heading: 'Clients', curatedItems: refs(candidates.clients, 'client')})
  } else notes.push('Clients skipped — no clients with a logo')

  if (candidates.rowLines.length > 0) {
    body.push({
      _key: KEYS.products,
      _type: 'productLinesRow',
      heading: 'Products',
      link: pathLink('See all', '/products'),
      curatedItems: refs(candidates.rowLines, 'line'),
    })
  } else notes.push('Products skipped — no visible product lines')

  if (candidates.rowIndustries.length > 0) {
    body.push({
      _key: KEYS.industries,
      _type: 'solutionsRow',
      heading: 'Industries',
      link: pathLink('See all', '/solutions'),
      curatedItems: refs(candidates.rowIndustries, 'industry'),
    })
  } else notes.push('Industries skipped — no solutions with a page')

  body.push({
    _key: KEYS.benefits,
    _type: 'benefits',
    heading: 'Why PakFactory',
    items: BENEFITS.map(([title, text, symbol], i) => ({_key: `benefit-${i + 1}`, _type: 'benefit', title, body: text, symbol})),
  })
  body.push({
    _key: KEYS.steps,
    _type: 'steps',
    heading: 'How it works',
    items: STEPS.map(([title, text, link], i) => ({
      _key: `step-${i + 1}`,
      _type: 'step',
      title,
      body: text,
      ...(link ? {link: pathLink(link[0], link[1])} : {}),
    })),
  })

  if (candidates.rowCaseStudies.length > 0) {
    body.push({
      _key: KEYS.caseStudies,
      _type: 'caseStudiesRow',
      heading: 'Case studies',
      link: pathLink('See all', '/case-studies'),
      listSource: 'custom',
      curatedItems: refs(candidates.rowCaseStudies, 'case'),
    })
  } else notes.push('Case studies skipped — no case studies with a card image')

  body.push({
    _key: KEYS.stats,
    _type: 'stats',
    heading: 'By the numbers',
    items: STATS.map(([value, label], i) => ({_key: `stat-${i + 1}`, _type: 'stat', value, label})),
  })

  const stages = [...candidates.stages].sort((a, b) => stageRank(a.title) - stageRank(b.title))
  if (stages.length > 0) {
    body.push({_key: KEYS.expertise, _type: 'expertiseSequence', heading: 'Expertise', curatedItems: refs(stages, 'stage')})
  } else notes.push('Expertise skipped — no listed expertise stages')

  body.push({_key: KEYS.reviews, _type: 'testimonialsRow', heading: 'Reviews'})
  if (candidates.faqs.length > 0) {
    body.push({
      _key: KEYS.faqs,
      _type: 'faqSection',
      heading: 'FAQ',
      listSource: 'custom',
      faqs: candidates.faqs.map((faq, i) => ref(faq._id, `faq-${i + 1}`, 'faqRef')),
    })
  } else notes.push('FAQ skipped — no published FAQs with scope "general"')
  body.push({
    _key: KEYS.quote,
    _type: 'generalCta',
    heading: "Let's collaborate and craft your vision",
    link: pathLink("Let's talk packaging", '/contact'),
  })

  return {body, notes}
}

function mergeSections(existing, heroes) {
  const rest = (Array.isArray(existing) ? existing : []).filter(
    (section) => !SEED_KEYS.has(section?._key),
  )
  return [...heroes, ...rest]
}

async function seed() {
  console.log(`\n🌱  Home page → dataset=${DATASET} (${PROJECT_ID}) · ${describeMode({confirm: apply, dataset: DATASET})}\n`)

  const candidates = await client.fetch(CANDIDATES_QUERY)
  console.log('  Picked from the dataset:')
  console.log(`    case studies: ${candidates.caseStudies.map((d) => d.title).join(' · ') || '—'}`)
  console.log(
    `    product lines: ${candidates.lines.map((d) => `${d.title}${d.hasImage ? '' : ' (no featured image)'}`).join(' · ') || '—'}`,
  )
  console.log(`    FAQs (general): ${candidates.faqs.map((d) => d.question).join(' · ') || '—'}`)
  if (candidates.lines.length < 2) {
    const d = candidates.lineDiagnostics
    console.log(
      `    ↳ product lines on dataset=${DATASET}: ${d.all} published · ${d.withSlug} with slug · ${d.visible} active + customer facing · ${d.withImage} with featured image · ${d.draftsOnly} draft-only (never published) · statuses: ${JSON.stringify(d.byStatus)}`,
    )
  }
  console.log(`    industries: ${candidates.industries.map((d) => `${d.title} (${d.studies ?? 0} studies)`).join(' · ') || '—'}`)
  console.log(
    `    customizations: ${(candidates.customizations ?? []).map((d) => d.title).join(' · ') || '—'}`,
  )
  console.log(`    posts: ${(candidates.posts ?? []).map((d) => d.title).join(' · ') || '—'}`)

  const {sections: heroSections, notes: heroNotes} = buildSections(candidates)
  const {body, notes: bodyNotes} = buildBody(candidates)
  const heroes = [...heroSections, ...body]
  for (const note of [...heroNotes, ...bodyNotes]) console.log(`  ⚠️  ${note}`)
  if (heroes.length === 0) {
    console.log(`\n  Nothing to write on dataset=${DATASET}.\n`)
    return
  }

  const docs = await client.fetch(
    `*[_id in [$id, "drafts." + $id]]{_id, _type, title, sections}`,
    {id: HOME_ID},
  )
  const published = docs.find((d) => d._id === HOME_ID)
  const draft = docs.find((d) => d._id === `drafts.${HOME_ID}`)

  const plans = [
    {id: HOME_ID, exists: Boolean(published), sections: mergeSections(published?.sections, heroes)},
  ]
  if (draft) {
    plans.push({id: draft._id, exists: true, sections: mergeSections(draft.sections, heroes)})
  }

  console.log(`\n  Order: ${heroes.map((h) => h._type).join(' → ')}`)
  for (const plan of plans) {
    console.log(`  ${plan.id}: ${plan.exists ? 'update' : 'create'} → ${plan.sections.length} section(s)`)
  }

  if (!apply) {
    console.log(`\n  DRY-RUN on dataset=${DATASET} — nothing written. Re-run with --confirm.\n`)
    return
  }

  const tx = client.transaction()
  tx.createIfNotExists({_id: HOME_ID, _type: 'homePage', title: 'Home Page'})
  for (const plan of plans) {
    tx.patch(plan.id, (p) => p.set({sections: plan.sections}))
  }
  await tx.commit({autoGenerateArrayKeys: false})

  console.log(`\n✅  Wrote ${plans.length} doc(s) on dataset=${DATASET}. Open / to see the page.\n`)
}

seed().catch((err) => {
  console.error(`❌  Home page seed failed on dataset=${DATASET}:`, err.message)
  process.exit(1)
})
