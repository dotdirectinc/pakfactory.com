#!/usr/bin/env node
/**
 * Educate → RFQ content for Product Line LPs:
 *   1. Patch shared `productLinePage` section chrome (tokenized copy)
 *   2. Create 4 contextual FAQs for rigid boxes
 *   3. Patch `[Test] Rigid Boxes` hero + faqs + band content
 *
 * ⚠️ Written by an agent, RUN BY A HUMAN. Agents never write documents on any
 * dataset (AGENTS.md § Sanity content — agent guardrails).
 *
 *   pnpm --filter @pakfactory/studio run seed:test-rigid-line-lp -- --dataset development
 *   pnpm --filter @pakfactory/studio run seed:test-rigid-line-lp -- --dataset development --confirm
 *   pnpm --filter @pakfactory/studio run seed:test-rigid-line-lp -- --dataset production --confirm --yes-production
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
  pnpm --filter @pakfactory/studio run seed:test-rigid-line-lp -- --dataset <development|production> [--confirm] [--yes-production]

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
  perspective: 'published',
})

const TEMPLATE_ID = 'productLinePage'
const LINE_ID = 'line.test-rigid-boxes'
const HELP_CATEGORY_ID = '893d649a-31d3-4e43-9438-0c3c8719e99c'

/** Template section keys (order stays as-authored on productLinePage). */
const KEY = {
  logoWall: '8830d609b3cb',
  styles: 'a0eaf49b6425',
  mediaFeature: '1a696fc91796',
  caseStudies: 'd1b26bad9c3a',
  testimonials: '797f110de909',
  faq: '1eb470ff9b4c',
}

/** Drop test-kids fixture; keep strong logos + two more brand marks. */
const LOGO_CLIENT_IDS = [
  '3d4ed5a7-5300-4edd-b5ce-de9aa9057645', // Anfield Shop
  'fd2beb50-3199-4e4d-b2b8-a6ed7fd70901', // HRBLS
  '3188bac4-3d2d-4b77-a3af-412f53499a7f', // Hex Coffee
  'df695882-81ee-451d-b79c-263db21b6bb9', // Ammu Beauty
  'client.beauty-seed-benefit', // Benefit
]

const FEATURED_STUDY_IDS = [
  '044d8f1d-fc04-404d-be92-4f7c2c566a04', // East West Bank
  '0d6555b6-8039-4df8-9b4a-3629c8c2ef41', // Hello Adorn
]

const HERO = {
  shortName: 'Rigid Boxes',
  h1: 'Rigid boxes built for the unboxing',
  shortDescription:
    'Premium set-up boxes with structure you can feel — for gifts, beauty, and brands that need the reveal to land.',
  description:
    'A rigid box starts with a chipboard core, wrap, and a fitted lid or base — packaging you feel before you open. Choose it when the unboxing matters as much as the product: gifts, beauty, and premium brands that need structure folding cartons cannot match. Every style is fully customizable. Browse constructions below, or talk to packaging experts for a quote.',
}

const FAQ_SPECS = [
  {
    id: 'faq.test-rigid-vs-folding',
    slug: 'test-rigid-vs-folding-carton',
    question: 'What makes a rigid box different from a folding carton?',
    answer:
      'A rigid box uses a thick chipboard core that holds its shape when empty — the lid and base feel solid in hand. A folding carton ships flat and relies on folds for structure. Choose rigid when the reveal, shelf presence, or gift moment needs that weight; choose folding carton when you need volume efficiency and lower cost at scale.',
  },
  {
    id: 'faq.test-rigid-moq-lead',
    slug: 'test-rigid-moq-lead-times',
    question:
      'What MOQs and lead times should I expect for custom rigid boxes?',
    answer:
      'Minimums and lead times depend on construction, materials, and finishing. Rigid programs usually start in the hundreds of units, with longer lead times when custom wraps, inserts, or specialty finishes are involved. Share your style, approximate size, and timeline when you request a quote — we price from the brief, not a one-size catalog number.',
  },
  {
    id: 'faq.test-rigid-quote-details',
    slug: 'test-rigid-quote-details',
    question: 'Which details do you need to quote a rigid box?',
    answer:
      'Style or construction preference, outer dimensions, estimated quantity, target ship date, and any must-have finishes or inserts. Artwork can follow — a clear brief on how the box should open and what it protects is enough to start. Get a quote and a packaging expert will confirm what is missing.',
  },
  {
    id: 'faq.test-rigid-mix-custom',
    slug: 'test-rigid-mix-styles-custom',
    question: 'Can I mix styles or add inserts and custom wraps?',
    answer:
      'Yes. Most rigid programs combine a primary construction with custom wraps, printing, and fitted inserts. Mixing styles in one order is possible when production allows — tell us the assortment in the quote request so we can plan tooling and pricing together.',
  },
]

function plainBlock(text, key) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: `${key}-span`, marks: [], text }],
  }
}

function ref(id, key) {
  return {
    _type: 'reference',
    _ref: id,
    _key: key ?? randomUUID().replace(/-/g, '').slice(0, 12),
  }
}

function videoCaseStudyRef(id, key) {
  return {
    _type: 'videoCaseStudyRef',
    _ref: id,
    _key: key ?? randomUUID().replace(/-/g, '').slice(0, 12),
  }
}

/** Patch chrome on a template section; leave content fields unless overridden. */
function patchTemplateChrome(sections) {
  return sections.map((section) => {
    if (section._key === KEY.logoWall) {
      return {
        ...section,
        intro: 'Brands that trust us with %shortName%.',
      }
    }
    if (section._key === KEY.styles) {
      return {
        ...section,
        eyebrow: '%shortName% Styles',
        heading: 'Explore %title% by style',
        intro:
          'Each construction solves a different reveal, fit, and shipping job. Start with the style that matches how your product should open.',
        link: {
          ...(section.link ?? {}),
          label: section.link?.label || 'Browse more Styles',
          linkType: 'path',
          relativePath: '/products/%slug%',
        },
      }
    }
    if (section._key === KEY.mediaFeature) {
      return {
        ...section,
        eyebrow: 'Customization',
        heading: 'Finish, structure, and detail — matched to the brief',
        intro:
          'Materials, wraps, inserts, and closures are chosen with the product and the unboxing in mind — not a one-size catalog.',
      }
    }
    if (section._key === KEY.caseStudies) {
      return {
        ...section,
        eyebrow: 'Case studies',
        heading: 'How brands use packaging like this',
        intro:
          'Real projects — structure, print, and production decisions that held up in market.',
        listSource: 'page',
        cards: [],
      }
    }
    if (section._key === KEY.testimonials) {
      return {
        ...section,
        heading: 'What customers say',
      }
    }
    if (section._key === KEY.faq) {
      return {
        ...section,
        eyebrow: 'FAQ',
        heading: 'Questions before you request a quote',
        intro:
          'Straight answers on MOQs, lead times, and what we need to price %shortName%.',
        listSource: 'page',
        faqs: [],
      }
    }
    return section
  })
}

async function main() {
  console.log(
    `\nSeed [Test] Rigid Boxes LP content — ${describeMode(args)}\n`,
  )
  console.log(`project ${PROJECT_ID} / dataset ${DATASET}`)

  const template = await client.fetch(`*[_id == $id][0]{_id, sections}`, {
    id: TEMPLATE_ID,
  })
  if (!template?.sections?.length) {
    console.error(`❌  Missing ${TEMPLATE_ID} or it has no sections`)
    process.exit(1)
  }

  const line = await client.fetch(`*[_id == $id][0]{_id, title, slug}`, {
    id: LINE_ID,
  })
  if (!line) {
    console.error(
      `❌  Missing ${LINE_ID}. Run clone:test-rigid-book-style --confirm first.`,
    )
    process.exit(1)
  }

  const helpCategory = await client.fetch(`*[_id == $id][0]._id`, {
    id: HELP_CATEGORY_ID,
  })
  if (!helpCategory) {
    console.error(`❌  Missing helpCategory ${HELP_CATEGORY_ID}`)
    process.exit(1)
  }

  const clients = await client.fetch(
    `*[_id in $ids]{_id, name, "hasLogo": defined(logo.asset)}`,
    { ids: LOGO_CLIENT_IDS },
  )
  const missingClients = LOGO_CLIENT_IDS.filter(
    (id) => !clients.some((c) => c._id === id && c.hasLogo),
  )
  if (missingClients.length) {
    console.error(
      `❌  Logo clients missing or without logo: ${missingClients.join(', ')}`,
    )
    process.exit(1)
  }

  const studies = await client.fetch(
    `*[_id in $ids]{_id, title, "slug": slug.current, "hasImage": defined(cardImage.asset)}`,
    { ids: FEATURED_STUDY_IDS },
  )
  if (studies.length !== FEATURED_STUDY_IDS.length) {
    console.error('❌  One or more featured case studies are missing')
    process.exit(1)
  }

  const nextTemplateSections = patchTemplateChrome(template.sections)

  const faqDocs = FAQ_SPECS.map((spec) => ({
    _id: spec.id,
    _type: 'faq',
    question: spec.question,
    slug: { _type: 'slug', current: spec.slug },
    answer: [plainBlock(spec.answer, `${spec.slug}-a`)],
    scope: 'contextual',
    category: { _type: 'reference', _ref: HELP_CATEGORY_ID },
  }))

  const lineSections = [
    {
      _key: KEY.logoWall,
      _type: 'logoWall',
      curatedItems: LOGO_CLIENT_IDS.map((id, i) => ref(id, `logo-${i}`)),
    },
    {
      _key: KEY.caseStudies,
      _type: 'videoCaseStudiesRow',
      listSource: 'custom',
      cards: FEATURED_STUDY_IDS.map((id, i) =>
        videoCaseStudyRef(id, `study-${i}`),
      ),
    },
  ]

  /** @type {{ kind: string, id: string, detail: string }[]} */
  const planned = [
    {
      kind: 'patch',
      id: TEMPLATE_ID,
      detail: 'Product Line Page chrome (6 sections)',
    },
    ...faqDocs.map((f) => ({
      kind: 'createOrReplace',
      id: f._id,
      detail: f.question,
    })),
    {
      kind: 'patch',
      id: LINE_ID,
      detail: 'Hero + faqs + logo wall + case study cards',
    },
  ]

  console.log(`\nLine: ${line.title} (${line._id})`)
  console.log(`Featured studies: ${studies.map((s) => s.title).join('; ')}`)
  console.log(`Logo clients: ${clients.map((c) => c.name).join(', ')}`)

  console.log(`\nPlanned writes (${planned.length}):`)
  for (const row of planned) {
    console.log(`  ${row.kind.padEnd(14)} ${row.id} — ${row.detail}`)
  }

  if (!apply) {
    console.log(
      `\n${planned.length} write(s) pending on ${DATASET}. DRY-RUN — re-run with \`--confirm\`.\n`,
    )
    return
  }

  const tx = client.transaction()
  tx.patch(TEMPLATE_ID, (p) => p.set({ sections: nextTemplateSections }))
  for (const faq of faqDocs) tx.createOrReplace(faq)
  tx.patch(LINE_ID, (p) =>
    p.set({
      shortName: HERO.shortName,
      h1: HERO.h1,
      shortDescription: HERO.shortDescription,
      description: [plainBlock(HERO.description, 'test-rigid-desc')],
      allowIndex: false,
      faqs: FAQ_SPECS.map((f, i) => ref(f.id, `faq-${i}`)),
      featuredStudies: FEATURED_STUDY_IDS.map((id, i) =>
        ref(id, `feat-${i}`),
      ),
      sections: lineSections,
    }),
  )
  await tx.commit()

  console.log(`\n✅  Wrote ${planned.length} operation(s) to ${DATASET}.`)
  console.log('Open /products/test-rigid-boxes to review.\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
