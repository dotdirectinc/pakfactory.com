#!/usr/bin/env node
/**
 * Seed the Packaging Strategy expertise stage page (PROD-2577 · ADR-020).
 *
 * Copy is Crystal's approved Strategy copy — the `Expertise_Packaging_Strategy_Page_Copy_v1.md`
 * attachment on PROD-1888 (Consultative archetype), NOT the edited copy in the POC repo.
 * Additions on top of it, kept by product decision (2026-09-25): section labels above
 * headings, the FAQ heading, and case-study cards under the S6 text. Writes:
 *   - 5 `expertiseService` docs — the 360° Strategic Framework dimensions (summary + points)
 *   - 5 `faq` docs (contextual) for the stage
 *   - patches the existing `expertiseStage` slug `packaging-strategy`: hero fields, SEO,
 *     `services`, `faqs`, `featuredStudies`, and body `sections[]` in the Consultative order
 *
 * The body is written to the Expertise Page template "Packaging Strategy"
 * (`expertiseStagePage.packaging-strategy`, Main Website → Expertise Pages); the
 * stage selects it. Trust strip = Logo wall of the POC's 10 clients.
 *
 * Not written (editors do these in Studio):
 *   - Images: the engagement photo (`mediaFeature` renders nothing until it has one), the
 *     stage diagram / hero image and the OG image — the assets live in Drive.
 *   - The logo wall (trust strip) — pick the client logos in Studio.
 *
 * Body order: logoWall (trust strip) → signatureSystem (why it matters + framework) → mediaFeature (how an
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

import {
  pathLink,
  plainBlock,
  ref,
  runExpertiseStageSeed,
  TRUST_STRIP_CLIENT_SLUGS,
  trustStripSection,
} from './lib/expertise-stage-seed.mjs'

const CASE_STUDY_SLUGS = ['venture', 'serena-sleep', 'blind-barrels']

// ── Content (approved copy, PROD-1888) ──────────────────────────────────────

const STAGE = {
  tagline: 'Packaging Strategy',
  h1: 'Get the strategy right before the first box is made.',
  description:
    'High-growth brands need more than packaging. We start with a structured consultation — mapping your brand, portfolio, goals, and operating realities — so every decision that follows is aligned to your business, not just the box.',
  heroCtaLabel: 'Book a strategy consultation',
  heroSecondaryLabel: 'See how an engagement works',
  heroSecondaryTarget: 'mediaFeature',
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

function buildSections({ serviceId, clientIdBySlug }) {
  return [
    trustStripSection('strategy-trust-strip', clientIdBySlug),
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
      // Crystal's approved S6 body (PROD-1888); case-study cards below it are a product
      // decision on top of her text-only layout (2026-09-25).
      intro:
        "A strategy is only as good as what gets built from it. Ours is grounded in data from thousands of production runs across our global network — so your plan reflects what's achievable in production — and shaped by consultative depth, not a generic template. Because we own every stage that follows, from design to delivery, the strategy we set is one we're accountable for executing.",
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

runExpertiseStageSeed({
  task: 'seed:expertise-strategy',
  stageSlug: 'packaging-strategy',
  idPrefix: 'strategy',
  templateTitle: 'Packaging Strategy',
  logoClientSlugs: TRUST_STRIP_CLIENT_SLUGS,
  stage: STAGE,
  services: SERVICES,
  faqs: FAQS,
  caseStudySlugs: CASE_STUDY_SLUGS,
  buildSections,
  editorNotes: [
    'engagement photo (mediaFeature renders nothing without one), stage diagram, OG image.',
  ],
}).catch((err) => {
  console.error(err)
  process.exit(1)
})
