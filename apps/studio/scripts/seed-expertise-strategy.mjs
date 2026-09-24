#!/usr/bin/env node
/**
 * Seed the Packaging Strategy expertise stage page (PROD-2577 · ADR-020).
 *
 * Copy is the approved Strategy copy (PROD-1888 — `Expertise_Packaging_Strategy_Page_Copy_v1.md`,
 * Consultative archetype). Writes:
 *   - 5 `expertiseService` docs — the 360° Strategic Framework dimensions (summary + points)
 *   - 5 `faq` docs (contextual) for the stage
 *   - patches the existing `expertiseStage` slug `packaging-strategy`: hero fields, SEO,
 *     `services`, `faqs`, `featuredStudies`, and body `sections[]` in the Consultative order
 *
 * Not written (editors do these in Studio):
 *   - Images: the engagement photo (`mediaFeature` renders nothing until it has one), the
 *     stage diagram / hero image and the OG image — the assets live in Drive.
 *   - The logo wall (trust strip) — pick the client logos in Studio.
 *
 * Body order: signatureSystem (why it matters + framework) → mediaFeature (how an
 * engagement starts) → benefits (what you walk away with) → caseStudiesRow (why it's
 * certain) → expertiseSequence (where this fits) → faqSection → quoteCta.
 * Lists are left empty on purpose so they inherit from the stage (ADR-020 §8):
 * services → signatureSystem, faqs → faqSection, featuredStudies → caseStudiesRow,
 * every stage in hub order → expertiseSequence.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:expertise-strategy -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:expertise-strategy -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:expertise-strategy -- --dataset production --confirm --yes-production
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseScriptArgs, describeMode } from './lib/script-args.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
loadEnv({ path: join(repoRoot, '.env.local') })
loadEnv({ path: join(repoRoot, '.env') })
loadEnv({ path: join(repoRoot, 'apps/studio/.env.local'), override: true })

const USAGE = `Usage:
  pnpm --filter @pakfactory/studio run seed:expertise-strategy -- --dataset <development|production> [--confirm] [--yes-production]

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

const STAGE_SLUG = 'packaging-strategy'
const CASE_STUDY_SLUGS = ['venture', 'serena-sleep', 'blind-barrels']

// ── Content (approved copy, PROD-1888) ──────────────────────────────────────

const STAGE = {
  tagline: 'Packaging Strategy',
  h1: 'Packaging strategy for brands built to scale.',
  description:
    'High-growth brands need more than packaging. We start with a structured consultation — mapping your brand, portfolio, goals, and operating realities — so every decision that follows is aligned to your business, not just the box.',
  heroCtaLabel: 'Book a strategy consultation',
  metaTitle: 'Packaging Strategy Services | PakFactory',
  metaDescription:
    "Align packaging with your brand, portfolio, and operations. PakFactory's 360° Strategic Framework reduces Total Cost of Ownership and risk across your product line.",
}

/** The five 360° Strategic Framework dimensions — exact labels (controlled vocabulary §4). */
const SERVICES = [
  {
    key: 'brand-equity',
    title: 'Brand Equity & Portfolio Alignment',
    summary: 'Keep brand fidelity and design consistency across a complex, growing product line.',
    points: [{ label: 'Packaging audit' }, { label: 'Market performance analysis' }, { label: 'SKU optimization' }],
  },
  {
    key: 'value-engineering',
    title: 'Value Engineering',
    summary:
      'Reduce Total Cost of Ownership (TCO) by engineering out material, structural, and freight waste.',
    points: [{ label: 'Structural optimization' }, { label: 'Material efficiency' }, { label: 'Freight-cost optimization' }],
  },
  {
    key: 'sustainability',
    title: 'Sustainability & ESG Alignment',
    summary: 'Align your portfolio with global ESG standards through assessment-led, circular design.',
    points: [
      { label: 'Circular-design principles' },
      { label: 'Life Cycle Assessments (LCA)', gloss: 'an environmental-impact analysis of a package' },
      {
        label: 'EPR optimization',
        gloss: 'lowering Extended Producer Responsibility fees through smarter design and materials',
      },
    ],
  },
  {
    key: 'supply-chain-resilience',
    title: 'Supply Chain Resilience',
    summary: "Engineer stability into sourcing and logistics so volatility doesn't threaten your launches.",
    points: [
      { label: 'Offshore & nearshore sourcing planning' },
      { label: 'Operational efficiency' },
      { label: 'Speed-to-market assurance' },
    ],
  },
  {
    key: 'compliance',
    title: 'Compliance & Risk Management',
    summary:
      'Meet the safety and environmental mandates for your categories and markets, with risks surfaced early.',
    points: [
      { label: 'AI-assisted labeling compliance checks' },
      { label: 'Global regulatory guidance' },
      { label: 'EPR compliance service', gloss: 'registration and filing across markets' },
    ],
  },
]

/** Problem label → the dimension (service key) that answers it. */
const PROBLEMS = [
  { label: 'Inconsistent branding', service: 'brand-equity' },
  { label: 'Hidden cost & waste', service: 'value-engineering' },
  { label: 'Compliance risk', service: 'compliance' },
  { label: 'Missed launch windows', service: 'supply-chain-resilience' },
  { label: 'ESG gaps', service: 'sustainability' },
]

const FAQS = [
  {
    key: 'what-is',
    question: 'What is packaging strategy?',
    answer:
      'Packaging strategy is the structured groundwork — aligning your brand, portfolio, goals, and operating realities — that guides every packaging decision that follows, from materials and structure to sourcing and compliance.',
  },
  {
    key: 'every-project',
    question: 'Do I need an in-depth strategy engagement for every project?',
    answer:
      'No — the depth scales to the project. When a product has clear specs and a tight timeline, a quick consultation is usually enough to confirm the essentials before moving into design and production. When the questions are bigger — value engineering on material and structure, EPR and compliance, supply-chain planning — we go deeper. You take on only the depth the project calls for.',
  },
  {
    key: 'value-engineering',
    question: 'How does value engineering lower my total cost?',
    answer:
      'By analyzing Total Cost of Ownership — material, structure, freight, and lifecycle cost together, not just unit price — and identifying structural and material efficiencies. The savings often come from freight and waste, not from cheaper boxes.',
  },
  {
    key: 'lca',
    question: 'What is a Life Cycle Assessment (LCA)?',
    answer:
      "An analysis of a package's environmental impact across its life, from materials through disposal. We use it, with circular-design principles, to align your portfolio with ESG standards.",
  },
  {
    key: 'vs-design',
    question: 'How is packaging strategy different from packaging design?',
    answer:
      "Strategy decides what's right for your business and why; design turns that into structure and artwork. Strategy comes first and sets the direction design executes.",
  },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

const serviceId = (key) => `expertiseService.strategy-${key}`
const faqId = (key) => `faq.expertise-strategy-${key}`

function plainBlock(text, key) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: `${key}-span`, text, marks: [] }],
  }
}

function ref(id, key) {
  return { _type: 'reference', _ref: id, ...(key ? { _key: key } : {}) }
}

function pathLink(label, relativePath) {
  return { label, linkType: 'path', relativePath }
}

function buildSections() {
  return [
    {
      _type: 'signatureSystem',
      _key: 'strategy-signature-system',
      eyebrow: 'Why strategy matters',
      heading: 'Great packaging starts long before the design.',
      intro:
        'Packaging strategy is the structured groundwork — aligning your brand, portfolio, goals, and operating realities — that guides every packaging decision that follows.',
      body: [
        plainBlock(
          "Most brands don't set that groundwork. They make packaging decisions one SKU and one vendor at a time, and it costs them: inconsistent brand presentation across a growing line, freight and material spend no one is watching, compliance gaps that surface too late, and packaging that can't keep up when volume scales or a new market opens.",
          'why-1',
        ),
        plainBlock(
          'A strategy engagement replaces that guesswork with a plan — one that protects your brand, your margins, and your ability to grow.',
          'why-2',
        ),
      ],
      problems: PROBLEMS.map((problem, index) => ({
        _type: 'signatureProblem',
        _key: `problem-${index + 1}`,
        label: problem.label,
        service: ref(serviceId(problem.service)),
      })),
      problemsCaption: "Packaging that can't scale.",
      systemName: '360° Strategic Framework',
      systemHeading: 'One framework, every angle considered.',
      systemIntro:
        'Every engagement runs on our 360° Strategic Framework — a structured method that examines your packaging from five angles at once, so your decisions hold up across your whole portfolio, not just one product.',
      listSource: 'page',
    },
    {
      _type: 'mediaFeature',
      _key: 'strategy-engagement',
      heading: 'It starts with a conversation, not a checkout.',
      body: [
        plainBlock(
          "Every engagement starts with a consultation; we understand your brand, your portfolio, and where you're headed. From there, we scope the work to what the decision in front of you actually needs: a packaging audit, value engineering, a Life Cycle Assessment, EPR filing — the right strategy services, brought straight into your project.",
          'engagement-1',
        ),
      ],
      link: pathLink('Book a strategy consultation', '/request'),
    },
    {
      _type: 'benefits',
      _key: 'strategy-benefits',
      eyebrow: 'What you walk away with',
      heading: 'What changes when strategy comes first',
      intro: 'No two brands need exactly the same strategy — but they all end up in the same place:',
      items: [
        { _key: 'clarity', title: 'Clarity', body: "You know what's right for your brand, and why.", symbol: 'clarity' },
        {
          _key: 'tco',
          title: 'Lower Total Cost of Ownership',
          body: 'With the savings identified, not assumed.',
          symbol: 'cost',
        },
        {
          _key: 'risk',
          title: 'Less risk carried into production',
          body: 'Compliance, supply, and ESG exposure surfaced early, not after the run.',
          symbol: 'risk',
        },
        {
          _key: 'scale',
          title: 'Packaging that scales',
          body: 'Decisions that still hold as you add SKUs and enter new markets.',
          symbol: 'scale',
        },
      ].map((item) => ({ _type: 'benefit', ...item })),
    },
    {
      _type: 'caseStudiesRow',
      _key: 'strategy-case-studies',
      eyebrow: 'Why our recommendations hold up',
      heading: 'Strategy from a partner who also delivers it.',
      intro:
        "Our strategy is grounded in data from thousands of production runs and shaped by consultative depth. Because we own every stage that follows, the strategy we set is one we're accountable to deliver.",
      link: pathLink('See all case studies', '/case-studies'),
      listSource: 'page',
      curatedItems: [],
    },
    {
      _type: 'expertiseSequence',
      _key: 'strategy-lifecycle',
      eyebrow: 'Where this fits',
      heading: 'One partner, every stage.',
      intro: 'PakFactory guides you from first idea to final delivery — with no handoff gaps.',
      curatedItems: [],
    },
    {
      _type: 'faqSection',
      _key: 'strategy-faqs',
      eyebrow: 'Common questions',
      heading: 'Packaging strategy, answered.',
      align: 'left',
      listSource: 'page',
    },
    {
      _type: 'quoteCta',
      _key: 'strategy-final-cta',
      heading: 'Get your packaging strategy right.',
      body: "Start with a conversation about your brand, your portfolio, and where you're headed.",
      ctaLabel: 'Book a strategy consultation',
    },
  ]
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `\nseed:expertise-strategy  project=${PROJECT_ID}  dataset=${DATASET}  ${describeMode(args)}\n`,
  )

  const stage = await client.fetch(
    `*[_type == "expertiseStage" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
      _id, title, "sectionCount": count(sections)
    }`,
    { slug: STAGE_SLUG },
  )
  if (!stage) {
    console.error(`❌  No published expertiseStage with slug "${STAGE_SLUG}" in ${DATASET}.`)
    process.exit(1)
  }

  const helpCategoryId = await client.fetch(
    `*[_type == "helpCategory" && !(_id in path("drafts.**"))] | order(_createdAt asc)[0]._id`,
  )
  if (!helpCategoryId) {
    console.error(
      `❌  No helpCategory in ${DATASET}. FAQs require one (the set is fixed — create it in Studio first).`,
    )
    process.exit(1)
  }

  const studies = await client.fetch(
    `*[_type == "caseStudy" && slug.current in $slugs && !(_id in path("drafts.**"))]{ _id, "slug": slug.current }`,
    { slugs: CASE_STUDY_SLUGS },
  )
  const studyBySlug = new Map(studies.map((s) => [s.slug, s._id]))
  const featured = CASE_STUDY_SLUGS.filter((slug) => studyBySlug.has(slug))
  const missingStudies = CASE_STUDY_SLUGS.filter((slug) => !studyBySlug.has(slug))

  const existingIds = new Set(
    await client.fetch(`*[_id in $ids]._id`, {
      ids: [...SERVICES.map((s) => serviceId(s.key)), ...FAQS.map((f) => faqId(f.key))],
    }),
  )

  console.log(`Stage: ${stage._id} (${stage.title}) — ${stage.sectionCount ?? 0} section(s) today`)
  console.log(`Help category: ${helpCategoryId}`)
  console.log(`Featured case studies: ${featured.join(', ') || '(none)'}`)
  if (missingStudies.length) {
    console.log(`  ⚠️  not found, skipped: ${missingStudies.join(', ')} (section falls back to tagged studies)`)
  }

  console.log(`\nPlanned writes:`)
  for (const s of SERVICES) {
    console.log(`  ${existingIds.has(serviceId(s.key)) ? 'replace' : 'create '} ${serviceId(s.key)} — ${s.title}`)
  }
  for (const f of FAQS) {
    console.log(`  ${existingIds.has(faqId(f.key)) ? 'replace' : 'create '} ${faqId(f.key)} — ${f.question}`)
  }
  console.log(
    `  patch   ${stage._id} — hero + SEO fields, services(${SERVICES.length}), faqs(${FAQS.length}), featuredStudies(${featured.length}), sections(7, replaces ${stage.sectionCount ?? 0})`,
  )
  console.log(`\nNote: stage.description becomes the Strategy hero subhead — the Beauty LP stage board shows it too.`)
  console.log(`Editors still add in Studio: engagement photo (mediaFeature), stage diagram, OG image, logo wall.`)

  if (!apply) {
    console.log(
      `\nDRY-RUN on ${DATASET} — nothing written. Re-run with \`--confirm\` (production also needs \`--yes-production\`).\n`,
    )
    return
  }

  const tx = client.transaction()

  for (const s of SERVICES) {
    tx.createOrReplace({
      _id: serviceId(s.key),
      _type: 'expertiseService',
      title: s.title,
      stage: ref(stage._id),
      summary: s.summary,
      points: s.points.map((point, index) => ({
        _type: 'servicePoint',
        _key: `${s.key}-point-${index + 1}`,
        ...point,
      })),
      hasPage: false,
      status: 'active',
    })
  }

  for (const f of FAQS) {
    tx.createOrReplace({
      _id: faqId(f.key),
      _type: 'faq',
      question: f.question,
      slug: { _type: 'slug', current: `packaging-strategy-${f.key}` },
      answer: [plainBlock(f.answer, `${f.key}-a`)],
      scope: 'contextual',
      category: ref(helpCategoryId),
    })
  }

  tx.patch(stage._id, (p) =>
    p.set({
      ...STAGE,
      services: SERVICES.map((s) => ref(serviceId(s.key), `service-${s.key}`)),
      faqs: FAQS.map((f) => ref(faqId(f.key), `faq-${f.key}`)),
      featuredStudies: featured.map((slug) => ref(studyBySlug.get(slug), `study-${slug}`)),
      sections: buildSections(),
    }),
  )

  const result = await tx.commit()
  console.log(`\n✅ Committed ${result.results.length} mutation(s) to dataset=${DATASET} (transaction ${result.transactionId}).\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
