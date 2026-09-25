#!/usr/bin/env node
/**
 * Seed the Packaging Design expertise stage page (PROD-2578 · ADR-020).
 *
 * Copy is the approved Design copy (PROD-1888 — `Expertise_Packaging_Design_Page_Copy_v1.md`,
 * Experiential archetype: show first, then explain). Writes 4 `expertiseService` docs
 * (the design services), 6 contextual `faq` docs, and patches the existing
 * `expertiseStage` slug `packaging-design` (hero, SEO, services, FAQs, featured case
 * studies, body `sections[]`). Runner: `lib/expertise-stage-seed.mjs`.
 *
 * The body is written to the Expertise Page template "Packaging Design"
 * (`expertiseStagePage.packaging-design`, Main Website → Expertise Pages); the
 * stage selects it. Updated to the POC (localhost:8888/expertise/design):
 * trust strip first, and a case-study-led work gallery.
 *
 * Body order: logoWall (trust strip) → inspirationsGrid (our work) → signatureSystem with no system name (what
 * our designers do) → steps (how the work happens) → caseStudiesRow (why it holds up)
 * → expertiseSequence (where this fits) → faqSection → quoteCta.
 *
 * Not written (editors do these in Studio):
 *   - The design team's curated work set (the seeded gallery reuses 5 case studies).
 *   - Service images (shown beside the services list), stage diagram / hero image, OG image.
 *   - The "Browse the Option Library" link on Option Selection & Optimization — services
 *     carry no link field yet.
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:expertise-design -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:expertise-design -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:expertise-design -- --dataset production --confirm --yes-production
 */

import {
  caseStudyGalleryCards,
  catalogueGalleryRefs,
  internalLink,
  pathLink,
  runExpertiseStageSeed,
  TRUST_STRIP_CLIENT_SLUGS,
  trustStripSection,
} from './lib/expertise-stage-seed.mjs'

/** "Our work" — the POC's case-study-led gallery: real, published work. */
const GALLERY_CASE_STUDY_SLUGS = ['blind-barrels', 'via-carota', 'hello-adorn', 'venture', 'serena-sleep']

/**
 * "Our work" second row — catalogue pieces that glide under the case studies (POC
 * `projects`, itself a placeholder drawn from the product library). The runner picks this
 * many uploaded Solution Styles with images; editors swap in the design team's curated set.
 */
const GALLERY_CATALOGUE_COUNT = 6

// ── Content (approved copy, PROD-1888) ──────────────────────────────────────

const STAGE = {
  tagline: 'Packaging Design',
  h1: 'Designed to impress. Engineered to perform.',
  description:
    'Our expert team creates custom packaging designs around your brand and your product, making sure they are production-ready and built for an unboxing moment worth sharing.',
  // [OPEN] in the copy doc: "Request a sample" vs "Get a quote" — both open the quote request.
  heroCtaLabel: 'Request a sample',
  heroSecondaryLabel: 'See our work',
  heroSecondaryTarget: 'inspirationsGrid',
  metaTitle: 'Custom Packaging Design Services | PakFactory',
  metaDescription:
    "Packaging design that's brand-aligned and built to produce — structural dielines, full creative execution, and production-ready files. See our work and request a sample.",
}

/** Four services, simplest to most complex. */
const SERVICES = [
  {
    key: 'optimization',
    title: 'Option Selection & Optimization',
    summary:
      'We audit your existing packaging and recommend alternative materials, finishes, and print methods that lift both its brand presence and its performance.',
  },
  {
    key: 'structural',
    title: 'Precision Structural Design',
    summary:
      'You bring the artwork; we build the structure around it — tailoring a dieline (the flat cutting template that defines a package’s structure) to your product’s exact dimensions and setting your artwork up to print faithfully: right fit, clean registration, production-ready files.',
  },
  {
    key: 'creative',
    title: 'Integrated Creative Design',
    summary:
      "Full brand execution: we design the artwork and the structure as one, with material, finish, and print choices built in — because artwork and the dieline aren't separate jobs, and packaging only creates impact when they're designed together.",
  },
  {
    key: 'engineering',
    title: 'Advanced Packaging Engineering',
    summary:
      'When no existing format or design fits, we engineer a solution from the ground up — through material innovation, structural engineering, and design — to solve your specific challenge.',
  },
]

const FAQS = [
  {
    key: 'what-is',
    question: 'What is packaging design?',
    answer:
      'Packaging design is more than how a package looks. It’s also how a package functions — protecting the product through transit and handling — and how it performs, catching attention on the shelf and shaping how a customer feels when they open it. At PakFactory, design is grounded in manufacturing: because we also produce what we design, we make sure even the most ambitious ideas stay practical, feasible, and ready to build.',
  },
  {
    key: 'agency',
    question: 'Do you offer custom packaging design services — are you a design agency?',
    answer:
      "We're more than a design agency. PakFactory offers full custom packaging design services, creative and structural — and because we also manufacture, we carry your design through to production. One partner for design and build, not a studio that hands you a file.",
  },
  {
    key: 'brand-match',
    question: 'Can you match our existing brand and aesthetic?',
    answer:
      "Yes. Whether we're optimizing packaging you already have or designing from scratch, the work starts from your brand — its look, its standards, and how it needs to feel in a customer's hands.",
  },
  {
    key: 'production-files',
    question: 'Do you provide production-ready files and dielines?',
    answer:
      "Yes. Our creative and structural design deliver production-ready artwork and dielines built to your product's exact dimensions — not concepts that can't be manufactured.",
  },
  {
    key: 'formats',
    question: 'Do you design for one format, or any packaging type?',
    answer:
      'Any type. Our designers work across the full format range, from rigid boxes and folding cartons to mailers and specialty structures.',
  },
  {
    key: 'iterations',
    question: 'Can you handle design iterations and artwork updates?',
    answer:
      'Yes. Design is iterative by nature, so rounds of refinement are built in — and we turn around artwork updates and late changes quickly, keeping your project moving without long back-and-forth.',
  },
]

/** Stage slug → internal link on a process step (skipped when the stage is missing). */
function stageLink(stageIdBySlug, label, slug) {
  const id = stageIdBySlug.get(slug)
  return id ? { link: internalLink(label, id) } : {}
}

function buildSections({ stageIdBySlug, clientIdBySlug, caseStudyBySlug, catalogueIds }) {
  return [
    trustStripSection('design-trust-strip', clientIdBySlug),
    {
      _type: 'inspirationsGrid',
      _key: 'design-work',
      eyebrow: 'Our work',
      heading: 'First impressions, made to last.',
      intro:
        'Great packaging design earns attention on the shelf and turns the unboxing into a reason customers come back.',
      // Case-study-led, as in the POC: each card reuses the study's card image and
      // links to it. Swap for the design team's curated set when it exists.
      listSource: 'custom',
      cards: [
        ...caseStudyGalleryCards(GALLERY_CASE_STUDY_SLUGS, caseStudyBySlug),
        ...catalogueGalleryRefs(catalogueIds),
      ],
    },
    {
      _type: 'signatureSystem',
      _key: 'design-services',
      eyebrow: 'What our designers do',
      heading: 'Packaging design services, from optimization to ground-up engineering.',
      intro:
        'Our design expertise scales to your starting point — from refining packaging you already have to engineering a new structure from the ground up. And unlike studios that treat artwork and structure as separate jobs, we design them together: packaging only creates impact when the visual and the structural are built as one.',
      // No named method for Design — the section lists the services with their images.
      listSource: 'page',
    },
    {
      _type: 'steps',
      _key: 'design-process',
      eyebrow: 'How the work happens',
      heading: 'One continuous process, from first conversation to production.',
      intro:
        "Design isn't a straight line, and it doesn't stop at a finished file. As your single partner across the whole packaging lifecycle, we carry the work from the first conversation through to production.",
      items: [
        {
          _key: 'consultation',
          title: 'Consultation',
          body: 'We start by understanding your brand, your product, and your goals.',
        },
        {
          _key: 'concept',
          title: 'Concept development',
          body: 'We explore design directions together: the base structure, the materials, finishes, and structural add-ons, and the artwork concept.',
        },
        {
          _key: 'structure',
          title: 'Structural design',
          body: "We create the dieline to your product's exact dimensions.",
        },
        {
          _key: 'artwork',
          title: 'Artwork design & placement',
          body: 'We design the artwork for that structure, place it on the dieline, and prepare it for print.',
        },
        {
          _key: 'validation',
          title: 'Refinement & validation',
          body: "We prove the design through sampling and testing, refining until it's right.",
          ...stageLink(stageIdBySlug, 'Prototyping', 'prototyping'),
        },
        {
          _key: 'production',
          title: 'Production realization',
          body: "When it's right, the approved design moves into manufacturing.",
          ...stageLink(stageIdBySlug, 'Managed Manufacturing', 'managed-manufacturing'),
        },
      ].map((item) => ({ _type: 'step', ...item })),
    },
    {
      _type: 'caseStudiesRow',
      _key: 'design-case-studies',
      eyebrow: 'Why it holds up',
      heading: 'We design for more than looks.',
      intro:
        "Our designers shape not just how your packaging looks, but how it's made, how it works, and how it delights your customers — the things that define your brand's and your product's success.",
      link: pathLink('See all case studies', '/case-studies'),
      listSource: 'page',
      curatedItems: [],
    },
    {
      _type: 'expertiseSequence',
      _key: 'design-lifecycle',
      eyebrow: 'Where this fits',
      heading: 'One partner, every stage.',
      intro: 'PakFactory guides you from first idea to final delivery — with no handoff gaps.',
      curatedItems: [],
    },
    {
      _type: 'faqSection',
      _key: 'design-faqs',
      eyebrow: 'Questions',
      heading: 'Packaging design, answered.',
      align: 'left',
      listSource: 'page',
    },
    {
      _type: 'quoteCta',
      _key: 'design-final-cta',
      heading: 'Ready for packaging that impresses and performs?',
      body: 'Tell us about your brand and your product, and we’ll take it from there.',
      ctaLabel: 'Request a sample',
    },
  ]
}

runExpertiseStageSeed({
  task: 'seed:expertise-design',
  stageSlug: 'packaging-design',
  idPrefix: 'design',
  templateTitle: 'Packaging Design',
  logoClientSlugs: TRUST_STRIP_CLIENT_SLUGS,
  galleryCaseStudySlugs: GALLERY_CASE_STUDY_SLUGS,
  galleryCatalogueCount: GALLERY_CATALOGUE_COUNT,
  stage: STAGE,
  services: SERVICES,
  faqs: FAQS,
  // [VERIFY] the copy doc asks for 1–2 Design-shaped studies; these stand in until supplied.
  caseStudySlugs: ['blind-barrels', 'via-carota', 'hello-adorn'],
  buildSections,
  editorNotes: [
    'work gallery (Our work) is seeded from 5 case studies — replace with the design team\'s curated set when ready.',
    'service images (beside the services list), stage diagram, OG image.',
  ],
}).catch((err) => {
  console.error(err)
  process.exit(1)
})
