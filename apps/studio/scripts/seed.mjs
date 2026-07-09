/**
 * PakFactory Sanity Seed Script
 * ─────────────────────────────
 * Populates all document types with realistic sample data.
 *
 * Usage (from repo root):
 *   pnpm --filter @pakfactory/studio run seed
 *
 * Reads `NEXT_PUBLIC_SANITY_*` / `SANITY_STUDIO_*` and token from repo root `.env.local`.
 * Default dataset: `development` (override via env). Legacy: `SANITY_TOKEN=<token> node scripts/seed.mjs`
 *
 * Get a token: sanity.io/manage → project → API → Tokens → Add API token (Editor)
 *
 * Safe to re-run: uses createOrReplace so existing docs are overwritten, not duplicated.
 */

import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: join(__dirname, '../../../.env.local') })
loadEnv({ path: join(__dirname, '../../../.env') })

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  '8293wrxp'
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  'development'
const TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_TOKEN ||
  process.env.SANITY_API_READ_TOKEN

if (!TOKEN) {
  console.error('❌  Missing Sanity write token.')
  console.error('   Set SANITY_API_WRITE_TOKEN (or SANITY_TOKEN) in repo root .env.local')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2024-01-01',
  token: TOKEN,
  useCdn: false,
})

// ─── Helpers ────────────────────────────────────────────────────────────────

const ref = (id) => ({ _type: 'reference', _ref: id, _key: id })
const slug = (s) => ({ _type: 'slug', current: s })
const block = (text) => ({
  _type: 'block',
  _key: Math.random().toString(36).slice(2),
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', _key: Math.random().toString(36).slice(2), text, marks: [] }],
})
const key = () => Math.random().toString(36).slice(2, 10)

// ─── Document collections ────────────────────────────────────────────────────

const capabilityCategories = [
  { _id: 'cat-material',   _type: 'capabilityCategory', title: 'Material',                  slug: slug('material'),                 description: 'Substrate and raw material capabilities — the physical surface your packaging is built from.', order: 1 },
  { _id: 'cat-finishes',   _type: 'capabilityCategory', title: 'Finishes',                  slug: slug('finishes'),                 description: 'Surface treatments applied after printing — laminates, coatings, and foils.', order: 2 },
  { _id: 'cat-printing',   _type: 'capabilityCategory', title: 'Printing',                  slug: slug('printing'),                 description: 'Ink-on-substrate processes — offset, digital, flexography, and screen.', order: 3 },
  { _id: 'cat-add-custom', _type: 'capabilityCategory', title: 'Additional Customization',  slug: slug('additional-customization'), description: 'Structural and decorative add-ons — embossing, die-cutting, inserts, and closures.', order: 4 },
  { _id: 'cat-cert',       _type: 'capabilityCategory', title: 'Certifications',            slug: slug('certifications'),           description: 'Environmental and food-safety certifications applicable to PakFactory materials.', order: 5 },
]

const capabilityTypes = [
  // Material
  { _id: 'type-paperboard',   _type: 'capabilityType', title: 'Paperboard',         slug: slug('paperboard'),         category: ref('cat-material'),   description: 'Clay-coated and uncoated paperboard grades — the primary substrate for folding carton boxes.', order: 1 },
  { _id: 'type-corrugated',   _type: 'capabilityType', title: 'Corrugated',          slug: slug('corrugated'),         category: ref('cat-material'),   description: 'Fluted corrugated board for shipping and e-commerce applications.', order: 2 },
  { _id: 'type-kraft',        _type: 'capabilityType', title: 'Kraft Paper',         slug: slug('kraft-paper'),        category: ref('cat-material'),   description: 'Natural unbleached kraft paper — earthy aesthetics, strong structural integrity.', order: 3 },
  { _id: 'type-flexible',     _type: 'capabilityType', title: 'Flexible Film',       slug: slug('flexible-film'),      category: ref('cat-material'),   description: 'Multi-layer flexible film laminates for pouches and wraps.', order: 4 },
  // Finishes
  { _id: 'type-lamination',   _type: 'capabilityType', title: 'Lamination',          slug: slug('lamination'),         category: ref('cat-finishes'),   description: 'Film bonded to the printed surface — matte, gloss, and soft-touch variants.', order: 1 },
  { _id: 'type-coating',      _type: 'capabilityType', title: 'Coating',             slug: slug('coating'),            category: ref('cat-finishes'),   description: 'Liquid applied coatings — aqueous, UV, and spot UV.', order: 2 },
  { _id: 'type-foiling',      _type: 'capabilityType', title: 'Foiling',             slug: slug('foiling'),            category: ref('cat-finishes'),   description: 'Metallic or holographic foil stamped or transferred onto the substrate.', order: 3 },
  // Printing
  { _id: 'type-offset',       _type: 'capabilityType', title: 'Offset Printing',     slug: slug('offset-printing'),    category: ref('cat-printing'),   description: 'High-fidelity CMYK+PMS lithographic printing — best for mid-to-large runs.', order: 1 },
  { _id: 'type-digital',      _type: 'capabilityType', title: 'Digital Printing',    slug: slug('digital-printing'),   category: ref('cat-printing'),   description: 'Variable data, short runs, and prototyping without plates.', order: 2 },
  { _id: 'type-flexo',        _type: 'capabilityType', title: 'Flexography',         slug: slug('flexography'),        category: ref('cat-printing'),   description: 'Rotary relief printing on corrugated and flexible substrates.', order: 3 },
  // Additional Customization
  { _id: 'type-embossing',    _type: 'capabilityType', title: 'Embossing & Debossing', slug: slug('embossing-debossing'), category: ref('cat-add-custom'), description: 'Raised or recessed relief patterns for tactile brand expression.', order: 1 },
  { _id: 'type-die-cut',      _type: 'capabilityType', title: 'Die Cutting',         slug: slug('die-cutting'),        category: ref('cat-add-custom'), description: 'Custom shapes, windows, and structural cutouts.', order: 2 },
  { _id: 'type-window',       _type: 'capabilityType', title: 'Window Patching',     slug: slug('window-patching'),    category: ref('cat-add-custom'), description: 'Clear or frosted film adhered behind a die-cut window.', order: 3 },
  // Certifications
  { _id: 'type-fsc',          _type: 'capabilityType', title: 'FSC',                 slug: slug('fsc'),                category: ref('cat-cert'),       description: 'Forest Stewardship Council chain-of-custody certification.', order: 1 },
  { _id: 'type-recyclable',   _type: 'capabilityType', title: 'Recyclable',          slug: slug('recyclable'),         category: ref('cat-cert'),       description: 'Materials certified as curbside recyclable in North America.', order: 2 },
]

const attributeGroups = [
  { _id: 'ag-source',      _type: 'attributeGroup', title: 'Source',             slug: slug('source'),             description: 'Fiber origin and raw material sourcing.',         order: 1 },
  { _id: 'ag-physical',    _type: 'attributeGroup', title: 'Physical Properties',slug: slug('physical-properties'),description: 'Tactile and structural material properties.',       order: 2 },
  { _id: 'ag-performance', _type: 'attributeGroup', title: 'Performance',         slug: slug('performance'),        description: 'Functional performance characteristics.',          order: 3 },
  { _id: 'ag-aesthetic',   _type: 'attributeGroup', title: 'Aesthetic',           slug: slug('aesthetic'),          description: 'Visual appearance and finish quality.',            order: 4 },
  { _id: 'ag-color',       _type: 'attributeGroup', title: 'Color',               slug: slug('color'),              description: 'Available base color options for this material.',  order: 5 },
  { _id: 'ag-opacity',     _type: 'attributeGroup', title: 'Opacity',             slug: slug('opacity'),            description: 'Light transmission characteristics.',              order: 6 },
  { _id: 'ag-sustain',     _type: 'attributeGroup', title: 'Sustainability',       slug: slug('sustainability'),     description: 'Environmental and recyclability attributes.',       order: 7 },
  { _id: 'ag-role',        _type: 'attributeGroup', title: 'Role',                slug: slug('role'),               description: 'Layer role in multi-layer flexible structures.',   order: 8 },
  { _id: 'ag-finish',      _type: 'attributeGroup', title: 'Finish Type',         slug: slug('finish-type'),        description: 'Surface finish classification.',                   order: 9 },
]

const attributes = [
  // Source
  { _id: 'attr-virgin',        _type: 'attribute', title: 'Virgin Fiber',        slug: slug('virgin-fiber'),        attributeGroup: ref('ag-source'),   order: 1 },
  { _id: 'attr-recycled',      _type: 'attribute', title: 'Recycled Fiber',      slug: slug('recycled-fiber'),      attributeGroup: ref('ag-source'),   order: 2 },
  { _id: 'attr-mixed',         _type: 'attribute', title: 'Mixed Fiber',         slug: slug('mixed-fiber'),         attributeGroup: ref('ag-source'),   order: 3 },
  // Physical Properties
  { _id: 'attr-coated',        _type: 'attribute', title: 'Coated',              slug: slug('coated'),              attributeGroup: ref('ag-physical'), order: 1 },
  { _id: 'attr-uncoated',      _type: 'attribute', title: 'Uncoated',            slug: slug('uncoated'),            attributeGroup: ref('ag-physical'), order: 2 },
  { _id: 'attr-smooth',        _type: 'attribute', title: 'Smooth',              slug: slug('smooth'),              attributeGroup: ref('ag-physical'), order: 3 },
  { _id: 'attr-textured',      _type: 'attribute', title: 'Textured',            slug: slug('textured'),            attributeGroup: ref('ag-physical'), order: 4 },
  { _id: 'attr-printable',     _type: 'attribute', title: 'Printable',           slug: slug('printable'),           attributeGroup: ref('ag-physical'), order: 5 },
  // Performance
  { _id: 'attr-moisture',      _type: 'attribute', title: 'Moisture Resistant',  slug: slug('moisture-resistant'),  attributeGroup: ref('ag-performance'), order: 1 },
  { _id: 'attr-tear',          _type: 'attribute', title: 'Tear Resistant',      slug: slug('tear-resistant'),      attributeGroup: ref('ag-performance'), order: 2 },
  { _id: 'attr-food-safe',     _type: 'attribute', title: 'Food Safe',           slug: slug('food-safe'),           attributeGroup: ref('ag-performance'), order: 3 },
  { _id: 'attr-grease',        _type: 'attribute', title: 'Grease Resistant',    slug: slug('grease-resistant'),    attributeGroup: ref('ag-performance'), order: 4 },
  // Aesthetic
  { _id: 'attr-premium',       _type: 'attribute', title: 'Premium Look',        slug: slug('premium-look'),        attributeGroup: ref('ag-aesthetic'), order: 1 },
  { _id: 'attr-natural',       _type: 'attribute', title: 'Natural Look',        slug: slug('natural-look'),        attributeGroup: ref('ag-aesthetic'), order: 2 },
  { _id: 'attr-bright-white',  _type: 'attribute', title: 'Bright White',        slug: slug('bright-white'),        attributeGroup: ref('ag-aesthetic'), order: 3 },
  // Color
  { _id: 'attr-col-white',     _type: 'attribute', title: 'White',               slug: slug('color-white'),         attributeGroup: ref('ag-color'),    order: 1 },
  { _id: 'attr-col-brown',     _type: 'attribute', title: 'Natural Brown',        slug: slug('color-brown'),         attributeGroup: ref('ag-color'),    order: 2 },
  { _id: 'attr-col-black',     _type: 'attribute', title: 'Black',               slug: slug('color-black'),         attributeGroup: ref('ag-color'),    order: 3 },
  // Opacity
  { _id: 'attr-opaque',        _type: 'attribute', title: 'Opaque',              slug: slug('opaque'),              attributeGroup: ref('ag-opacity'),  order: 1 },
  { _id: 'attr-translucent',   _type: 'attribute', title: 'Translucent',         slug: slug('translucent'),         attributeGroup: ref('ag-opacity'),  order: 2 },
  { _id: 'attr-transparent',   _type: 'attribute', title: 'Transparent',         slug: slug('transparent'),         attributeGroup: ref('ag-opacity'),  order: 3 },
  // Sustainability
  { _id: 'attr-recyclable',    _type: 'attribute', title: 'Recyclable',          slug: slug('recyclable'),          attributeGroup: ref('ag-sustain'),  order: 1 },
  { _id: 'attr-biodegradable', _type: 'attribute', title: 'Biodegradable',       slug: slug('biodegradable'),       attributeGroup: ref('ag-sustain'),  order: 2 },
  { _id: 'attr-compostable',   _type: 'attribute', title: 'Compostable',         slug: slug('compostable'),         attributeGroup: ref('ag-sustain'),  order: 3 },
  { _id: 'attr-fsc',           _type: 'attribute', title: 'FSC Certified',       slug: slug('fsc-certified'),       attributeGroup: ref('ag-sustain'),  order: 4 },
  { _id: 'attr-recycled-cont', _type: 'attribute', title: 'Recycled Content',    slug: slug('recycled-content'),    attributeGroup: ref('ag-sustain'),  order: 5 },
  // Role
  { _id: 'attr-outer',         _type: 'attribute', title: 'Outer Layer',         slug: slug('outer-layer'),         attributeGroup: ref('ag-role'),     order: 1 },
  { _id: 'attr-barrier',       _type: 'attribute', title: 'Barrier Layer',       slug: slug('barrier-layer'),       attributeGroup: ref('ag-role'),     order: 2 },
  { _id: 'attr-sealant',       _type: 'attribute', title: 'Sealant Layer',       slug: slug('sealant-layer'),       attributeGroup: ref('ag-role'),     order: 3 },
  // Finish Type
  { _id: 'attr-ft-matte',      _type: 'attribute', title: 'Matte',               slug: slug('finish-matte'),        attributeGroup: ref('ag-finish'),   order: 1 },
  { _id: 'attr-ft-gloss',      _type: 'attribute', title: 'Gloss',               slug: slug('finish-gloss'),        attributeGroup: ref('ag-finish'),   order: 2 },
  { _id: 'attr-ft-soft',       _type: 'attribute', title: 'Soft Touch',          slug: slug('finish-soft-touch'),   attributeGroup: ref('ag-finish'),   order: 3 },
]

const capabilities = [
  {
    _id: 'cap-sbs', _type: 'capability',
    title: 'SBS (Solid Bleached Sulfate)',
    slug: slug('sbs'),
    category: ref('cat-material'), type: ref('type-paperboard'), status: 'active',
    applicableProductCategories: [ref('pc-folding-carton'), ref('pc-rigid')],
    materialSource: ref('attr-virgin'),
    physicalProperties: [ref('attr-coated'), ref('attr-smooth'), ref('attr-printable')],
    aesthetic: [ref('attr-bright-white'), ref('attr-premium')],
    colors: [ref('attr-col-white')],
    sustainability: [ref('attr-recyclable'), ref('attr-fsc')],
    showColorRange: false, showThicknessTable: true,
    thicknessTableOverride: [],
    whatIsBlock: { title: 'What is SBS?', body: [block('Solid Bleached Sulfate (SBS) is a premium virgin fiber paperboard with a bright white clay-coated surface on one or both sides. It is the most widely used substrate for high-end folding carton packaging.')] },
    whyChooseBlock: { title: 'Why choose SBS?', body: [block('SBS offers unmatched print fidelity, a consistent white base for accurate color reproduction, and excellent rigidity. It is the default choice for cosmetic, pharmaceutical, and premium consumer goods packaging.')] },
    comparedAgainst: [ref('cap-fbb'), ref('cap-ccnb'), ref('cap-kraft-pb')],
    faqs: [
      { _key: 'faq-sbs-1', question: 'What is SBS paperboard used for?', answer: [block('SBS is the standard substrate for premium folding carton boxes including cosmetic packaging, pharmaceutical cartons, food packaging, and luxury retail boxes.')] },
      { _key: 'faq-sbs-2', question: 'Is SBS recyclable?', answer: [block('Yes. SBS is curbside recyclable in most North American and European municipalities. It can also be produced with FSC-certified virgin fiber.')] },
    ],
    metaTitle: 'SBS Paperboard | Premium Packaging Material',
    metaDescription: 'SBS (Solid Bleached Sulfate) is a premium virgin fiber paperboard used for high-end folding carton packaging. Bright white, excellent print fidelity, FSC available.',
  },
  {
    _id: 'cap-fbb', _type: 'capability',
    title: 'FBB (Folding Box Board)',
    slug: slug('fbb'),
    category: ref('cat-material'), type: ref('type-paperboard'), status: 'active',
    applicableProductCategories: [ref('pc-folding-carton')],
    materialSource: ref('attr-virgin'),
    physicalProperties: [ref('attr-coated'), ref('attr-printable')],
    aesthetic: [ref('attr-premium'), ref('attr-bright-white')],
    colors: [ref('attr-col-white')],
    sustainability: [ref('attr-recyclable'), ref('attr-fsc')],
    showColorRange: false, showThicknessTable: true, thicknessTableOverride: [],
    whatIsBlock: { title: 'What is FBB?', body: [block('Folding Box Board (FBB) is a multi-ply virgin fiber board with a mechanical pulp middle layer sandwiched between chemical pulp outer layers. The result is a stiff, lightweight board with excellent surface for printing.')] },
    whyChooseBlock: { title: 'Why choose FBB?', body: [block('FBB delivers high stiffness at lower caliper, which means more boxes per tonne and lower shipping weight. It is the preferred choice for European-style folding cartons in food, beverage, and pharma.')] },
    comparedAgainst: [ref('cap-sbs'), ref('cap-ccnb'), ref('cap-kraft-pb')],
    faqs: [
      { _key: 'faq-fbb-1', question: 'What is the difference between FBB and SBS?', answer: [block('FBB uses a mechanical pulp middle ply which makes it stiffer at the same weight as SBS, though SBS typically has a brighter, more consistent white surface.')] },
    ],
    metaTitle: 'FBB Paperboard | High-Stiffness Folding Box Board',
    metaDescription: 'FBB (Folding Box Board) delivers high stiffness at lower caliper — preferred for food, beverage, and pharmaceutical folding carton packaging.',
  },
  {
    _id: 'cap-ccnb', _type: 'capability',
    title: 'CCNB (Coated Chip Natural Back)',
    slug: slug('ccnb'),
    category: ref('cat-material'), type: ref('type-paperboard'), status: 'active',
    applicableProductCategories: [ref('pc-folding-carton')],
    materialSource: ref('attr-recycled'),
    physicalProperties: [ref('attr-coated'), ref('attr-printable')],
    aesthetic: [ref('attr-natural')],
    colors: [ref('attr-col-brown')],
    sustainability: [ref('attr-recyclable'), ref('attr-recycled-cont')],
    showColorRange: false, showThicknessTable: true, thicknessTableOverride: [],
    whatIsBlock: { title: 'What is CCNB?', body: [block('CCNB (Coated Chip Natural Back) is a recycled-content paperboard with a clay-coated white top layer and a natural grey chipboard back. It is the economical, eco-friendly alternative to virgin fiber boards.')] },
    whyChooseBlock: { title: 'Why choose CCNB?', body: [block('CCNB uses recycled fiber, making it a lower-cost and more sustainable substrate. It works well for retail packaging where the interior of the box is not visible to the end customer.')] },
    comparedAgainst: [ref('cap-sbs'), ref('cap-fbb'), ref('cap-kraft-pb')],
    faqs: [],
    metaTitle: 'CCNB Paperboard | Recycled Coated Chipboard',
    metaDescription: 'CCNB is a recycled-content paperboard with a coated white face — the economical, sustainable choice for retail folding carton packaging.',
  },
  {
    _id: 'cap-kraft-pb', _type: 'capability',
    title: 'Kraft Paperboard',
    slug: slug('kraft-paperboard'),
    category: ref('cat-material'), type: ref('type-kraft'), status: 'active',
    applicableProductCategories: [ref('pc-folding-carton'), ref('pc-mailer')],
    materialSource: ref('attr-virgin'),
    physicalProperties: [ref('attr-uncoated'), ref('attr-textured'), ref('attr-printable')],
    aesthetic: [ref('attr-natural')],
    colors: [ref('attr-col-brown')],
    sustainability: [ref('attr-recyclable'), ref('attr-biodegradable'), ref('attr-fsc')],
    showColorRange: false, showThicknessTable: false, thicknessTableOverride: [],
    whatIsBlock: { title: 'What is Kraft Paperboard?', body: [block('Kraft paperboard is an unbleached virgin fiber substrate with a characteristic natural brown surface. The sulfate pulping process preserves long fiber length, giving kraft its distinctive strength and tear resistance.')] },
    whyChooseBlock: { title: 'Why choose Kraft?', body: [block('Kraft signals sustainability and natural craftsmanship. It is ideal for artisan food brands, eco-conscious retail, and any packaging where the "earthy" aesthetic is part of the brand story.')] },
    comparedAgainst: [ref('cap-sbs'), ref('cap-fbb'), ref('cap-ccnb')],
    faqs: [],
    metaTitle: 'Kraft Paperboard | Natural Unbleached Packaging Material',
    metaDescription: 'Natural brown kraft paperboard for eco-friendly, artisan packaging. Strong, sustainable, and FSC certified.',
  },
  {
    _id: 'cap-gloss-lam', _type: 'capability',
    title: 'Gloss Lamination',
    slug: slug('gloss-lamination'),
    category: ref('cat-finishes'), type: ref('type-lamination'), status: 'active',
    applicableProductCategories: [ref('pc-folding-carton'), ref('pc-rigid')],
    physicalProperties: [ref('attr-smooth')],
    aesthetic: [ref('attr-premium')],
    sustainability: [],
    showColorRange: false, showThicknessTable: false, thicknessTableOverride: [],
    whatIsBlock: { title: 'What is Gloss Lamination?', body: [block('Gloss lamination is a thin film bonded to the printed surface using heat and pressure, creating a high-shine reflective finish that makes colors appear more vivid and saturated.')] },
    whyChooseBlock: { title: 'Why choose Gloss Lamination?', body: [block('Gloss lam maximizes color vibrancy and perceived value. It is the most popular premium finish for cosmetic, fragrance, and electronics packaging.')] },
    comparedAgainst: [ref('cap-matte-lam'), ref('cap-soft-touch'), ref('cap-aqueous')],
    faqs: [],
    metaTitle: 'Gloss Lamination | Premium Packaging Finish',
    metaDescription: 'High-shine gloss lamination for packaging — maximizes color vibrancy and perceived premium value.',
  },
  {
    _id: 'cap-matte-lam', _type: 'capability',
    title: 'Matte Lamination',
    slug: slug('matte-lamination'),
    category: ref('cat-finishes'), type: ref('type-lamination'), status: 'active',
    applicableProductCategories: [ref('pc-folding-carton'), ref('pc-rigid')],
    physicalProperties: [ref('attr-smooth')],
    aesthetic: [ref('attr-premium'), ref('attr-natural')],
    sustainability: [],
    showColorRange: false, showThicknessTable: false, thicknessTableOverride: [],
    whatIsBlock: { title: 'What is Matte Lamination?', body: [block('Matte lamination applies a non-reflective film to the printed surface, creating a flat, subdued finish with a sophisticated understated appearance.')] },
    whyChooseBlock: { title: 'Why choose Matte Lamination?', body: [block('Matte lam communicates luxury, restraint, and modern minimalism. It pairs exceptionally well with foiling and spot UV for contrast effects.')] },
    comparedAgainst: [ref('cap-gloss-lam'), ref('cap-soft-touch'), ref('cap-aqueous')],
    faqs: [],
    metaTitle: 'Matte Lamination | Luxury Packaging Finish',
    metaDescription: 'Non-reflective matte lamination for premium packaging — communicates luxury and sophistication.',
  },
  {
    _id: 'cap-soft-touch', _type: 'capability',
    title: 'Soft Touch Lamination',
    slug: slug('soft-touch-lamination'),
    category: ref('cat-finishes'), type: ref('type-lamination'), status: 'active',
    applicableProductCategories: [ref('pc-folding-carton'), ref('pc-rigid')],
    physicalProperties: [ref('attr-smooth'), ref('attr-textured')],
    aesthetic: [ref('attr-premium')],
    sustainability: [],
    showColorRange: false, showThicknessTable: false, thicknessTableOverride: [],
    whatIsBlock: { title: 'What is Soft Touch Lamination?', body: [block('Soft touch lamination is a specialized matte film with a velvet-like tactile quality. Running a finger across the surface creates a distinctive rubberized sensation associated with ultra-premium packaging.')] },
    whyChooseBlock: { title: 'Why choose Soft Touch?', body: [block('Soft touch lam creates a multi-sensory unboxing experience. The tactile premium feel is a key differentiator for luxury cosmetics, spirits, and high-end tech accessories.')] },
    comparedAgainst: [ref('cap-gloss-lam'), ref('cap-matte-lam'), ref('cap-aqueous')],
    faqs: [],
    metaTitle: 'Soft Touch Lamination | Velvet Packaging Finish',
    metaDescription: 'Velvet-soft touch lamination for ultra-premium packaging — creates a luxury tactile unboxing experience.',
  },
  {
    _id: 'cap-aqueous', _type: 'capability',
    title: 'Aqueous Coating',
    slug: slug('aqueous-coating'),
    category: ref('cat-finishes'), type: ref('type-coating'), status: 'active',
    applicableProductCategories: [ref('pc-folding-carton'), ref('pc-mailer')],
    physicalProperties: [ref('attr-smooth'), ref('attr-printable')],
    aesthetic: [ref('attr-natural')],
    sustainability: [ref('attr-recyclable')],
    showColorRange: false, showThicknessTable: false, thicknessTableOverride: [],
    whatIsBlock: { title: 'What is Aqueous Coating?', body: [block('Aqueous coating is a water-based liquid applied inline on press. It provides scuff resistance and a clean finish without the material cost or delamination risk of film lamination.')] },
    whyChooseBlock: { title: 'Why choose Aqueous Coating?', body: [block('Aqueous is the most cost-effective protective finish. It maintains full recyclability and is appropriate for food-contact applications where film laminates may not be suitable.')] },
    comparedAgainst: [ref('cap-gloss-lam'), ref('cap-matte-lam'), ref('cap-soft-touch')],
    faqs: [],
    metaTitle: 'Aqueous Coating | Water-Based Protective Packaging Finish',
    metaDescription: 'Water-based aqueous coating for packaging — cost-effective scuff protection that maintains recyclability.',
  },
]

const productCategories = [
  { _id: 'pc-folding-carton', _type: 'productCategory', title: 'Folding Carton Boxes',   slug: slug('folding-carton-boxes'),   description: 'Die-cut and scored paperboard boxes assembled without adhesive. The most common retail packaging format.', order: 1 },
  { _id: 'pc-rigid',          _type: 'productCategory', title: 'Rigid Boxes',             slug: slug('rigid-boxes'),            description: 'Thick greyboard boxes with wrapped paper — premium unboxing format for luxury goods.', order: 2 },
  { _id: 'pc-mailer',         _type: 'productCategory', title: 'Mailer Boxes',            slug: slug('mailer-boxes'),           description: 'Self-locking corrugated or paperboard boxes designed for e-commerce direct-to-consumer shipping.', order: 3 },
  { _id: 'pc-flexible',       _type: 'productCategory', title: 'Flexible Packaging',      slug: slug('flexible-packaging'),     description: 'Pouches, bags, and wraps made from multi-layer flexible film laminates.', order: 4 },
  { _id: 'pc-corrugated',     _type: 'productCategory', title: 'Corrugated Shipping',     slug: slug('corrugated-shipping'),    description: 'B-flute and E-flute corrugated boxes for outer shipping cartons and heavy-duty protection.', order: 5 },
]

const productStyleCategories = [
  // Folding Carton
  { _id: 'psc-ste',  _type: 'productStyleCategory', title: 'Straight Tuck End',     slug: slug('straight-tuck-end'),    productCategories: [ref('pc-folding-carton')], description: 'Both tuck flaps fold in the same direction — front closes at top, back at bottom.', order: 1 },
  { _id: 'psc-rte',  _type: 'productStyleCategory', title: 'Reverse Tuck End',      slug: slug('reverse-tuck-end'),     productCategories: [ref('pc-folding-carton')], description: 'Tuck flaps fold in opposite directions — front closes at top, back at top.', order: 2 },
  { _id: 'psc-auto', _type: 'productStyleCategory', title: 'Auto Bottom (123)',      slug: slug('auto-bottom'),          productCategories: [ref('pc-folding-carton')], description: 'Pre-glued base that auto-locks on opening — faster assembly, stronger base.', order: 3 },
  // Rigid
  { _id: 'psc-mag',  _type: 'productStyleCategory', title: 'Magnetic Closure',      slug: slug('magnetic-closure'),     productCategories: [ref('pc-rigid')],         description: 'Hinged lid held shut by embedded magnets — signature luxury unboxing format.', order: 1 },
  { _id: 'psc-neck', _type: 'productStyleCategory', title: 'Neck Box',              slug: slug('neck-box'),             productCategories: [ref('pc-rigid')],         description: 'Two-piece box with a raised inner tray (neck) that slides into the outer shell.', order: 2 },
  { _id: 'psc-tele', _type: 'productStyleCategory', title: 'Telescoping Box',       slug: slug('telescoping-box'),      productCategories: [ref('pc-rigid')],         description: 'Deep lid slides over a deep base — equal-depth two-piece construction.', order: 3 },
  // Mailer
  { _id: 'psc-rsc',  _type: 'productStyleCategory', title: 'Regular Slotted Container', slug: slug('regular-slotted-container'), productCategories: [ref('pc-mailer')], description: 'Standard corrugated shipper with four equal flaps meeting at center.', order: 1 },
  { _id: 'psc-snap', _type: 'productStyleCategory', title: 'Snap-Lock Mailer',      slug: slug('snap-lock-mailer'),     productCategories: [ref('pc-mailer')],        description: 'Tool-free self-locking base with hinged lid — optimized for e-commerce.', order: 2 },
]

const industries = [
  { _id: 'ind-apparel',   _type: 'industry', title: 'Apparel & Fashion',    slug: slug('apparel-fashion'),    description: 'Clothing, footwear, accessories, and textile brands.', order: 1 },
  { _id: 'ind-food',      _type: 'industry', title: 'Food & Beverage',      slug: slug('food-beverage'),      description: 'Food products, beverages, confectionery, and specialty foods.', order: 2 },
  { _id: 'ind-cosmetics', _type: 'industry', title: 'Cosmetics & Beauty',   slug: slug('cosmetics-beauty'),   description: 'Skincare, makeup, fragrance, and personal care products.', order: 3 },
  { _id: 'ind-electronics',_type: 'industry', title: 'Electronics & Tech',  slug: slug('electronics-tech'),   description: 'Consumer electronics, accessories, and tech products.', order: 4 },
  { _id: 'ind-health',    _type: 'industry', title: 'Health & Wellness',    slug: slug('health-wellness'),    description: 'Supplements, nutraceuticals, OTC, and wellness products.', order: 5 },
]

const industryCategories = [
  { _id: 'ic-apparel-fc',   _type: 'industryCategory', title: 'Apparel Folding Cartons',    slug: slug('apparel-folding-cartons'),    industry: ref('ind-apparel'),    order: 1 },
  { _id: 'ic-apparel-rigid',_type: 'industryCategory', title: 'Apparel Rigid Boxes',        slug: slug('apparel-rigid-boxes'),        industry: ref('ind-apparel'),    order: 2 },
  { _id: 'ic-food-fc',      _type: 'industryCategory', title: 'Food Folding Cartons',       slug: slug('food-folding-cartons'),       industry: ref('ind-food'),       order: 1 },
  { _id: 'ic-food-flex',    _type: 'industryCategory', title: 'Food Flexible Packaging',    slug: slug('food-flexible-packaging'),    industry: ref('ind-food'),       order: 2 },
  { _id: 'ic-cosm-rigid',   _type: 'industryCategory', title: 'Cosmetic Rigid Boxes',       slug: slug('cosmetic-rigid-boxes'),       industry: ref('ind-cosmetics'),  order: 1 },
  { _id: 'ic-cosm-fc',      _type: 'industryCategory', title: 'Cosmetic Folding Cartons',   slug: slug('cosmetic-folding-cartons'),   industry: ref('ind-cosmetics'),  order: 2 },
  { _id: 'ic-elec-rigid',   _type: 'industryCategory', title: 'Electronics Rigid Boxes',    slug: slug('electronics-rigid-boxes'),    industry: ref('ind-electronics'),order: 1 },
  { _id: 'ic-health-fc',    _type: 'industryCategory', title: 'Health Folding Cartons',     slug: slug('health-folding-cartons'),     industry: ref('ind-health'),     order: 1 },
]

const useCases = [
  { _id: 'uc-retail',   _type: 'useCase', title: 'Retail Shelf Packaging',  slug: slug('retail-shelf-packaging'),   description: 'Packaging designed to be displayed on retail shelves — shelf appeal and brand communication are primary.' },
  { _id: 'uc-ecomm',    _type: 'useCase', title: 'E-commerce Shipping',     slug: slug('ecommerce-shipping'),       description: 'Packaging that ships direct-to-consumer — protective, lightweight, and designed for the unboxing experience.' },
  { _id: 'uc-gift',     _type: 'useCase', title: 'Gift Packaging',          slug: slug('gift-packaging'),           description: 'Premium packaging for gifting contexts — elevated aesthetics and memorable presentation.' },
  { _id: 'uc-sub-box',  _type: 'useCase', title: 'Subscription Box',        slug: slug('subscription-box'),         description: 'Recurring delivery packaging — brand touchpoint designed for repeat unboxing delight.' },
  { _id: 'uc-launch',   _type: 'useCase', title: 'Product Launch',          slug: slug('product-launch'),           description: 'Limited-run or launch packaging — high-impact, conversation-worthy presentation.' },
  { _id: 'uc-travel',   _type: 'useCase', title: 'Travel & Hospitality',    slug: slug('travel-hospitality'),       description: 'Amenity and travel-size packaging for hotel, airline, and hospitality channels.' },
]

const products = [
  {
    _id: 'prod-ste-001', _type: 'product',
    title: 'Straight Tuck End Box',
    sku: 'FCB-STE-001',
    slug: slug('straight-tuck-end-box'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-folding-carton')],
    productStyleCategories: [ref('psc-ste')],
    useCases: [ref('uc-retail'), ref('uc-ecomm')],
    capabilitiesOverride: [],
    dimensions: { length: 100, width: 70, height: 30 },
    moq: 500,
    leadTimeDays: 14,
    description: 'The industry-standard retail folding carton — straight tuck end closure on both top and bottom. Versatile across virtually every product category.',
    whatIsBlock: {
      title: 'The classic folding carton',
      body: [block('The Straight Tuck End Box (STE) is the most common folding carton structure in retail. Both the top and bottom tuck flaps fold in the same direction — front tucks at the top, back tucks at the bottom. Clean, efficient, and endlessly versatile.')],
    },
    whyChooseBlock: {
      title: 'Why the STE is the workhorse of retail packaging',
      body: [block('STE boxes are economical to produce, easy to assemble, and compatible with automated filling lines. They work for virtually any product that fits in a rectangular carton — pharmaceuticals, cosmetics, food, tech accessories.')],
    },
    faqs: [
      { _key: 'faq-ste-1', question: 'What is the minimum order quantity?', answer: [block('Our standard MOQ for STE boxes is 500 units. Custom sizes and substrates may have different MOQs — request a quote for specifics.')] },
      { _key: 'faq-ste-2', question: 'Can I get a physical sample before ordering?', answer: [block('Yes. We provide unprinted structural samples (white box) for free, and printed production samples for a nominal tooling fee.')] },
    ],
    comparedAgainst: [ref('prod-rte-001'), ref('prod-auto-001'), ref('prod-ste-custom')],
    metaTitle: 'Straight Tuck End Boxes | Custom Folding Cartons',
    metaDescription: 'Custom straight tuck end folding carton boxes — the most versatile retail packaging format. MOQ 500 units, 14-day lead time.',
  },
  {
    _id: 'prod-rte-001', _type: 'product',
    title: 'Reverse Tuck End Box',
    sku: 'FCB-RTE-001',
    slug: slug('reverse-tuck-end-box'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-folding-carton')],
    productStyleCategories: [ref('psc-rte')],
    useCases: [ref('uc-retail')],
    capabilitiesOverride: [],
    moq: 500, leadTimeDays: 14,
    description: 'Reverse tuck end closure — top and bottom flaps fold in opposite directions, offering a cleaner back panel appearance.',
    whatIsBlock: { title: 'What is a Reverse Tuck End Box?', body: [block('In a Reverse Tuck End (RTE) box, the top tuck flap folds to the front while the bottom tuck flap folds to the rear. This creates a cleaner appearance on the back panel — useful when the back of the box is visible on shelf.')] },
    whyChooseBlock: { title: 'When to choose RTE over STE', body: [block('Choose RTE when your back panel design requires a clean surface without a visible tuck flap edge. Common in cosmetics and pharmaceutical packaging where both front and back panels carry important copy.')] },
    faqs: [],
    comparedAgainst: [ref('prod-ste-001'), ref('prod-auto-001'), ref('prod-ste-custom')],
    metaTitle: 'Reverse Tuck End Boxes | Custom Folding Cartons',
    metaDescription: 'Custom reverse tuck end folding carton boxes with a cleaner back panel — ideal for cosmetic and pharmaceutical packaging.',
  },
  {
    _id: 'prod-auto-001', _type: 'product',
    title: 'Auto Bottom Box (1-2-3)',
    sku: 'FCB-AUTO-001',
    slug: slug('auto-bottom-box'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-folding-carton')],
    productStyleCategories: [ref('psc-auto')],
    useCases: [ref('uc-retail'), ref('uc-ecomm')],
    capabilitiesOverride: [],
    moq: 500, leadTimeDays: 16,
    description: 'Pre-glued auto-lock base that pops open automatically — faster assembly on the packing line and stronger base panel.',
    whatIsBlock: { title: 'What is an Auto Bottom Box?', body: [block('The Auto Bottom box (also called 1-2-3 bottom) has a pre-glued base that automatically locks into a flat base when the box is opened. No separate base tuck required — just pop and fill.')] },
    whyChooseBlock: { title: 'Why choose Auto Bottom?', body: [block('Auto Bottom boxes are up to 3× faster to assemble than standard tuck-end boxes. The glued base is also significantly stronger, making it the right choice for heavier products or high-volume filling lines.')] },
    faqs: [],
    comparedAgainst: [ref('prod-ste-001'), ref('prod-rte-001'), ref('prod-ste-custom')],
    metaTitle: 'Auto Bottom Boxes | Self-Locking Folding Cartons',
    metaDescription: 'Auto-lock bottom folding carton boxes — 3× faster assembly, stronger base. Ideal for heavy products and high-speed packing lines.',
  },
  {
    _id: 'prod-ste-custom', _type: 'product',
    title: 'Custom Tuck End Box',
    sku: 'FCB-CUST-001',
    slug: slug('custom-tuck-end-box'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-folding-carton')],
    productStyleCategories: [ref('psc-ste')],
    useCases: [ref('uc-retail'), ref('uc-gift'), ref('uc-launch')],
    capabilitiesOverride: [],
    moq: 250, leadTimeDays: 18,
    description: 'Fully custom-dimensioned tuck end carton — any size, any substrate, any finish combination.',
    whatIsBlock: { title: 'Custom to your exact specs', body: [block('PakFactory\'s custom tuck end program accepts any dimension, substrate, and finish combination. Our structural engineers optimize the die-line for minimum waste and maximum stackability.')] },
    whyChooseBlock: { title: 'When off-the-shelf isn\'t an option', body: [block('Custom dimensions, non-standard aspect ratios, multi-panel printing, or specialty substrates — our custom program handles anything a standard catalog box cannot.')] },
    faqs: [],
    comparedAgainst: [ref('prod-ste-001'), ref('prod-rte-001'), ref('prod-auto-001')],
    metaTitle: 'Custom Tuck End Boxes | Fully Bespoke Folding Cartons',
    metaDescription: 'Fully custom folding carton boxes — any dimension, substrate, and finish. Structural engineering included.',
  },
  {
    _id: 'prod-mag-001', _type: 'product',
    title: 'Magnetic Closure Rigid Box',
    sku: 'RIG-MAG-001',
    slug: slug('magnetic-closure-rigid-box'),
    status: 'active',
    primaryClassification: 'both',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    industries: [ref('ind-cosmetics'), ref('ind-apparel')],
    industryCategories: [ref('ic-cosm-rigid'), ref('ic-apparel-rigid')],
    useCases: [ref('uc-retail'), ref('uc-gift'), ref('uc-launch')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Premium hinged-lid rigid box with embedded neodymium magnets — the signature luxury unboxing format for cosmetics, accessories, and gift packaging.',
    whatIsBlock: { title: 'The gold standard of unboxing', body: [block('The Magnetic Closure Rigid Box is constructed from 2–3mm greyboard wrapped in specialty papers, with rare-earth magnets embedded in the lid and base. The satisfying magnetic snap is a tactile signal of premium quality.')] },
    whyChooseBlock: { title: 'Why rigid boxes command attention', body: [block('Rigid boxes are 4× thicker than folding cartons. They are reusable by consumers, making them a long-lived brand ambassador. The magnetic closure creates a ritual unboxing moment that elevates even modest products.')] },
    faqs: [
      { _key: 'faq-mag-1', question: 'Can the magnet strength be customized?', answer: [block('Yes. We offer standard (N35) and strong (N52) neodymium magnet grades. Heavier lids and larger box formats typically require N52 for a firm close.')] },
    ],
    comparedAgainst: [ref('prod-neck-001'), ref('prod-tele-001'), ref('prod-snap-001')],
    metaTitle: 'Magnetic Closure Rigid Boxes | Luxury Packaging',
    metaDescription: 'Premium magnetic closure rigid boxes for luxury cosmetics, accessories, and gift packaging. Neodymium magnets, greyboard construction, MOQ 100.',
  },
  {
    _id: 'prod-neck-001', _type: 'product',
    title: 'Neck Box',
    sku: 'RIG-NECK-001',
    slug: slug('neck-box'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-neck')],
    useCases: [ref('uc-retail'), ref('uc-gift')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Two-piece rigid box with an internal neck tray — the lid slides over the neck for a reveal-style opening.',
    whatIsBlock: { title: 'What is a Neck Box?', body: [block('A Neck Box consists of an outer shell (cap) and an inner tray with raised walls (the neck). When the cap is lifted, the product is dramatically revealed — making it a favorite for fragrance, jewelry, and tech unboxing.')] },
    whyChooseBlock: { title: 'The reveal box', body: [block('The neck creates a natural product-reveal moment. It also provides structural support so the product sits elevated and centered — ideal for hero SKUs where presentation is everything.')] },
    faqs: [],
    comparedAgainst: [ref('prod-mag-001'), ref('prod-tele-001'), ref('prod-snap-001')],
    metaTitle: 'Neck Box | Premium Two-Piece Rigid Packaging',
    metaDescription: 'Luxury neck rigid boxes with inner tray — classic reveal-style opening for fragrance, jewelry, and premium tech packaging.',
  },
  {
    _id: 'prod-tele-001', _type: 'product',
    title: 'Telescoping Box',
    sku: 'RIG-TELE-001',
    slug: slug('telescoping-rigid-box'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-tele')],
    useCases: [ref('uc-retail'), ref('uc-gift')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Full-depth lid and base of equal depth — lid slides completely over the base for a clean, seamless exterior.',
    whatIsBlock: { title: 'What is a Telescoping Box?', body: [block('A Telescoping Box has a lid and base of equal or near-equal depth. The lid slides fully over the base, creating a seamless exterior with no visible shoulder. Common in apparel, footwear, and high-end retail gifting.')] },
    whyChooseBlock: { title: 'Clean lines, maximum presence', body: [block('The telescoping format maximizes the printable exterior surface. There is no lid-base step to interrupt the design — brand graphics wrap seamlessly from lid to base for a monolithic presentation.')] },
    faqs: [],
    comparedAgainst: [ref('prod-mag-001'), ref('prod-neck-001'), ref('prod-snap-001')],
    metaTitle: 'Telescoping Rigid Boxes | Premium Apparel & Gift Packaging',
    metaDescription: 'Equal-depth telescoping rigid boxes — seamless exterior, maximum printable surface for apparel, footwear, and gift packaging.',
  },
  {
    _id: 'prod-snap-001', _type: 'product',
    title: 'Snap-Lock Mailer Box',
    sku: 'MLR-SNAP-001',
    slug: slug('snap-lock-mailer-box'),
    status: 'active',
    primaryClassification: 'both',
    productCategories: [ref('pc-mailer')],
    productStyleCategories: [ref('psc-snap')],
    industries: [ref('ind-apparel'), ref('ind-cosmetics')],
    industryCategories: [ref('ic-apparel-fc')],
    useCases: [ref('uc-ecomm'), ref('uc-sub-box')],
    capabilitiesOverride: [],
    moq: 250, leadTimeDays: 14,
    description: 'Self-locking mailer box — no tape required. Hinged lid with snap closure, ideal for e-commerce and subscription packaging.',
    whatIsBlock: { title: 'What is a Snap-Lock Mailer Box?', body: [block('The Snap-Lock Mailer (also called a pizza-style or crash-lock mailer) is a single-piece corrugated or paperboard box that folds and locks without tape. The hinged lid folds over and the tuck tabs lock securely into the base slots.')] },
    whyChooseBlock: { title: 'The e-commerce workhorse', body: [block('Snap-lock mailers eliminate packing tape from the fulfillment line, reducing time-per-pack by up to 40%. The clean exterior is fully printable — making it a brand touchpoint from warehouse to doorstep.')] },
    faqs: [
      { _key: 'faq-snap-1', question: 'Does the snap-lock hold during shipping?', answer: [block('Yes. Our snap-lock geometry is tested to ISTA 2A (simulated parcel delivery). The tabs are sized to hold under typical e-commerce transit conditions without tape reinforcement.')] },
    ],
    comparedAgainst: [ref('prod-mag-001'), ref('prod-neck-001'), ref('prod-tele-001')],
    metaTitle: 'Snap-Lock Mailer Boxes | Custom E-Commerce Packaging',
    metaDescription: 'Tape-free snap-lock mailer boxes for e-commerce and subscription packaging. Fully printable, ISTA 2A tested, MOQ 250.',
  },

  // ─── Rigid Boxes — Magnetic Closure ─────────────────────────────────────────

  {
    _id: 'prod-rgd-001', _type: 'product',
    title: 'Custom Flip Top Lid Rigid Box with Buffer Wall Tray',
    sku: 'RGD-001',
    slug: slug('custom-flip-top-lid-rigid-box-buffer-wall-tray'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Magnetic closure box with a buffered inner tray for enhanced protection.',
    whatIsBlock: { title: 'What is a Flip Top Lid Rigid Box with Buffer Wall Tray?', body: [block('This magnetic closure rigid box features a hinged flip top lid and a built-in buffer wall tray inside the base. The inner tray walls cushion the product on all sides, eliminating the need for separate foam inserts.')] },
    whyChooseBlock: { title: 'Protection meets presentation', body: [block('The buffer wall tray keeps products perfectly centred and secured during transit and on shelf. Ideal for fragrance, electronics accessories, and any product where movement inside the box would damage the experience.')] },
    faqs: [],
    metaTitle: 'Custom Flip Top Lid Rigid Box with Buffer Wall Tray | PakFactory',
    metaDescription: 'Magnetic closure rigid box with built-in buffer wall tray — secure product positioning, premium unboxing. MOQ 100 units.',
  },
  {
    _id: 'prod-rgd-002', _type: 'product',
    title: 'Custom Low-Front Flip Top Magnetic Boxes',
    sku: 'RGD-002',
    slug: slug('custom-low-front-flip-top-magnetic-boxes'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Shortened front allows clear product display and easy access when opened.',
    whatIsBlock: { title: 'What is a Low-Front Flip Top Magnetic Box?', body: [block('The Low-Front Flip Top is a magnetic closure rigid box with a reduced-height front wall. When the lid is open, the product is fully visible and easily accessible — no need to tip or turn the box to retrieve its contents.')] },
    whyChooseBlock: { title: 'Display-ready from the moment it opens', body: [block('The low front wall creates a natural product showcase the moment the lid lifts. Particularly effective for jewelry, watches, cosmetics, and any product where visual reveal is part of the brand experience.')] },
    faqs: [],
    metaTitle: 'Custom Low-Front Flip Top Magnetic Rigid Boxes | PakFactory',
    metaDescription: 'Low-front flip top magnetic rigid boxes — clear product display and effortless access. Premium unboxing, MOQ 100.',
  },
  {
    _id: 'prod-rgd-003', _type: 'product',
    title: 'Custom Half-Flap Magnetic Boxes',
    sku: 'RGD-003',
    slug: slug('custom-half-flap-magnetic-boxes'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Magnetic flap covers half the front panel for an elegant presentation.',
    whatIsBlock: { title: 'What is a Half-Flap Magnetic Box?', body: [block('The Half-Flap Magnetic Box features a lid that extends halfway down the front panel of the base, secured by embedded magnets. The partial flap creates a distinctive silhouette while maintaining the satisfying magnetic closure snap.')] },
    whyChooseBlock: { title: 'Distinctive structure, premium closure', body: [block('The half-flap format stands out from standard full-lid rigid boxes on shelf. The exposed lower base adds a structural design element that differentiates your packaging while keeping the premium magnetic close.')] },
    faqs: [],
    metaTitle: 'Custom Half-Flap Magnetic Rigid Boxes | PakFactory',
    metaDescription: 'Half-flap magnetic rigid boxes with elegant partial lid design — distinctive shelf presence, secure magnetic closure. MOQ 100.',
  },
  {
    _id: 'prod-rgd-004', _type: 'product',
    title: 'Custom Flip Top Boxes',
    sku: 'RGD-004',
    slug: slug('custom-flip-top-rigid-boxes'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Features a magnetic closure flip top that lays flat when opened.',
    whatIsBlock: { title: 'What is a Flip Top Rigid Box?', body: [block('The Flip Top Rigid Box is a hinged-lid rigid box where the lid rotates fully back to lay flat against the base when open. The magnetic closure holds the lid securely shut and the flat-open design keeps the lid out of the way during product retrieval.')] },
    whyChooseBlock: { title: 'Clean open, clean close', body: [block('The full-flat open position means nothing obstructs access to the product. Retailers and consumers alike appreciate the stable open position — particularly useful for heavier or bulkier products that need two hands to retrieve.')] },
    faqs: [],
    metaTitle: 'Custom Flip Top Rigid Boxes | Magnetic Closure | PakFactory',
    metaDescription: 'Flip top magnetic rigid boxes with full-flat open lid — clean, stable access and premium magnetic closure. MOQ 100.',
  },
  {
    _id: 'prod-rgd-005', _type: 'product',
    title: 'Custom Magnetic Closure Boxes',
    sku: 'RGD-005',
    slug: slug('custom-magnetic-closure-boxes'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift'), ref('uc-launch')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Rigid box with magnetic closure for premium appeal and smooth unboxing.',
    whatIsBlock: { title: 'The classic magnetic closure rigid box', body: [block('The Custom Magnetic Closure Box is PakFactory\'s flagship rigid box format — 2–3mm greyboard construction wrapped in specialty paper, with rare-earth neodymium magnets embedded in lid and base for a firm, satisfying close.')] },
    whyChooseBlock: { title: 'The unboxing format brands trust', body: [block('Magnetic closure rigid boxes are the most widely recognised luxury packaging format globally. The magnetic snap communicates quality before the product is even seen — a tactile first impression that sets the tone for everything inside.')] },
    faqs: [],
    metaTitle: 'Custom Magnetic Closure Rigid Boxes | PakFactory',
    metaDescription: 'Custom magnetic closure rigid boxes — premium greyboard construction, neodymium magnets, full customisation. MOQ 100.',
  },
  {
    _id: 'prod-rgd-006', _type: 'product',
    title: 'Custom Friction Fit / Lip Closure Book Style Boxes',
    sku: 'RGD-006',
    slug: slug('custom-friction-fit-lip-closure-book-style-boxes'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Features an inner flap that fits snugly over the base for added security.',
    whatIsBlock: { title: 'What is a Friction Fit Lip Closure Book Style Box?', body: [block('This book-style rigid box uses a friction fit closure — an inner lip on the lid fits snugly inside the base walls, holding the box shut through tension rather than magnets. The book-style opening adds a premium reveal element to the friction fit format.')] },
    whyChooseBlock: { title: 'Secure without magnets', body: [block('Friction fit closures are ideal for products that will be shipped without outer packaging, or for markets where magnet use is restricted. The snug inner lip provides a satisfying resistance when opening that signals quality construction.')] },
    faqs: [],
    metaTitle: 'Custom Friction Fit Lip Closure Book Style Rigid Boxes | PakFactory',
    metaDescription: 'Friction fit lip closure book style rigid boxes — secure tension closure, no magnets required. Premium rigid construction, MOQ 100.',
  },
  {
    _id: 'prod-rgd-007', _type: 'product',
    title: 'Custom Magnetic Closure Book Style Rigid Boxes',
    sku: 'RGD-007',
    slug: slug('custom-magnetic-closure-book-style-rigid-boxes'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift'), ref('uc-launch')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Opens like a book with concealed magnet closure for a premium look.',
    whatIsBlock: { title: 'What is a Magnetic Closure Book Style Rigid Box?', body: [block('The Book Style Rigid Box opens from the side like a hardcover book, with magnets concealed within the spine and front edge. The lateral opening creates a dramatic reveal moment — especially effective for sets, collections, and high-value single items.')] },
    whyChooseBlock: { title: 'Drama in every opening', body: [block('The book-open format creates a natural left-right reveal that photography and video capture beautifully. It is the preferred rigid box format for luxury cosmetic sets, tech accessories, and collector editions where the opening itself is part of the brand story.')] },
    faqs: [],
    metaTitle: 'Custom Magnetic Closure Book Style Rigid Boxes | PakFactory',
    metaDescription: 'Book-style magnetic closure rigid boxes — lateral opening, concealed magnets, dramatic reveal. Premium luxury packaging, MOQ 100.',
  },
  {
    _id: 'prod-rgd-008', _type: 'product',
    title: 'Custom Diagonal Pull Open Magnetic Rigid Box',
    sku: 'RGD-008',
    slug: slug('custom-diagonal-pull-open-magnetic-rigid-box'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift'), ref('uc-launch')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Outer rigid case opens diagonally half the front panel for a striking, elegant presentation.',
    whatIsBlock: { title: 'What is a Diagonal Pull Open Magnetic Rigid Box?', body: [block('The Diagonal Pull Open box features an outer sleeve or lid that slides or pivots diagonally across the front face of the base. The angled opening geometry is immediately eye-catching and creates a unique interaction ritual distinct from standard flip-lid or book-style formats.')] },
    whyChooseBlock: { title: 'Unexpected geometry, unforgettable opening', body: [block('When every brand is using a standard magnetic flip lid, a diagonal open format signals creative confidence. It is the structural choice for brands that want their packaging to be a conversation starter — on shelf, in social content, and during gifting.')] },
    faqs: [],
    metaTitle: 'Custom Diagonal Pull Open Magnetic Rigid Box | PakFactory',
    metaDescription: 'Diagonal pull-open magnetic rigid boxes — striking angled opening geometry for a unique, memorable unboxing. MOQ 100.',
  },
  {
    _id: 'prod-rgd-009', _type: 'product',
    title: 'Custom Magnetic Closure Book Style Rigid Box with Rounded Spine',
    sku: 'RGD-009',
    slug: slug('custom-magnetic-closure-book-style-rigid-box-rounded-spine'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Designed to look like a book with rounded spine and secure magnetic closure.',
    whatIsBlock: { title: 'Book Style with Rounded Spine', body: [block('This variant of the book-style rigid box adds a rounded spine — a curved structural edge that mimics the look and feel of a premium hardcover book. The rounded spine adds tactile sophistication and a distinctive silhouette on shelf.')] },
    whyChooseBlock: { title: 'The collector\'s edition format', body: [block('The rounded spine elevates the book-style box into a true collector\'s piece. Brands use it for limited editions, annual sets, and flagship SKUs where the packaging is intended to be kept and displayed long after the product is used.')] },
    faqs: [],
    metaTitle: 'Custom Book Style Rigid Box with Rounded Spine | PakFactory',
    metaDescription: 'Magnetic closure book-style rigid box with rounded spine — premium collector\'s edition format for luxury brands. MOQ 100.',
  },
  {
    _id: 'prod-rgd-010', _type: 'product',
    title: 'Custom Collapsible / Foldable Double Door Rigid Boxes',
    sku: 'RGD-010',
    slug: slug('custom-collapsible-foldable-double-door-rigid-boxes'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift'), ref('uc-ecomm')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Feature two flip panels open from the centre, secured with magnetic closure that folds flat to save costs.',
    whatIsBlock: { title: 'What is a Collapsible Double Door Rigid Box?', body: [block('The Collapsible Double Door Rigid Box combines the dramatic centre-split opening of a double door format with a foldable construction. Two magnetic panels open outward from the centre, then the entire box folds flat for storage and shipping — reducing volume by up to 70%.')] },
    whyChooseBlock: { title: 'Premium presentation, practical economics', body: [block('Collapsible rigid boxes deliver the full visual impact of a traditional rigid box at a significantly lower shipping and storage cost. They are the preferred format for high-volume subscription boxes and seasonal gift programs where cost-per-unit and cubic freight both matter.')] },
    faqs: [],
    metaTitle: 'Custom Collapsible Double Door Rigid Boxes | PakFactory',
    metaDescription: 'Collapsible foldable double door rigid boxes — dramatic centre-open, flat-pack shipping. Premium presentation with practical logistics. MOQ 100.',
  },
  {
    _id: 'prod-rgd-011', _type: 'product',
    title: 'Custom One-Piece Foldable Flip Top Magnetic Rigid Boxes',
    sku: 'RGD-011',
    slug: slug('custom-one-piece-foldable-flip-top-magnetic-rigid-boxes'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift'), ref('uc-ecomm')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Foldable design with enhanced durability; secure and efficient packaging.',
    whatIsBlock: { title: 'One-Piece Foldable Flip Top Magnetic Rigid Box', body: [block('This one-piece construction folds into a full rigid box with magnetic flip top, then collapses flat when empty. Unlike multi-piece rigid boxes, the one-piece format requires no separate lid assembly — reducing production complexity while maintaining the premium rigid aesthetic.')] },
    whyChooseBlock: { title: 'Rigid look, flexible logistics', body: [block('One-piece construction ships flat and assembles in seconds at the packing station. The result is a box that looks and feels like a traditional rigid setup box, but with the storage and freight economics of a folding carton.')] },
    faqs: [],
    metaTitle: 'Custom One-Piece Foldable Flip Top Magnetic Rigid Boxes | PakFactory',
    metaDescription: 'One-piece foldable flip top magnetic rigid boxes — premium rigid aesthetic with flat-pack logistics efficiency. MOQ 100.',
  },
  {
    _id: 'prod-rgd-012', _type: 'product',
    title: 'Custom Collapsible / Foldable Rigid Boxes',
    sku: 'RGD-012',
    slug: slug('custom-collapsible-foldable-rigid-boxes'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift'), ref('uc-ecomm')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Premium magnetic boxes that fold flat for instant set up and cost-saving.',
    whatIsBlock: { title: 'What is a Collapsible Rigid Box?', body: [block('The Collapsible Rigid Box is a standard magnetic closure rigid box engineered with fold-flat capability. The greyboard panels are scored and hinged so the box ships and stores completely flat, then pops into shape instantly at the fulfilment stage.')] },
    whyChooseBlock: { title: 'The DTC rigid box solution', body: [block('For brands shipping rigid boxes direct to consumer, collapsible construction cuts freight costs dramatically. A pallet of flat-pack rigid boxes holds 3–5× more units than pre-assembled boxes — a meaningful saving at scale without sacrificing any of the premium unboxing experience.')] },
    faqs: [],
    metaTitle: 'Custom Collapsible Foldable Rigid Boxes | PakFactory',
    metaDescription: 'Premium collapsible magnetic closure rigid boxes — flat-pack shipping, instant setup, luxury unboxing. MOQ 100.',
  },
  {
    _id: 'prod-rgd-013', _type: 'product',
    title: 'Custom Flip Top Hexagon Boxes with Magnetic Closure',
    sku: 'RGD-013',
    slug: slug('custom-flip-top-hexagon-boxes-magnetic-closure'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift'), ref('uc-launch')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 25,
    description: 'Unique hexagonal shape with secure magnetic flip-top lid.',
    whatIsBlock: { title: 'What is a Hexagon Flip Top Magnetic Box?', body: [block('The Hexagon Flip Top Box is a six-sided rigid box with a hinged magnetic lid. The hexagonal footprint is structurally efficient — each flat panel provides a display surface — and the geometric shape instantly differentiates from standard rectangular rigid boxes on shelf.')] },
    whyChooseBlock: { title: 'Geometry as brand language', body: [block('A hexagonal rigid box is a structural statement. It communicates that your brand thinks differently — and it photographs distinctively. Used widely in artisan beauty, specialty food, and limited-edition gifting where the box itself is a desirable object.')] },
    faqs: [],
    metaTitle: 'Custom Hexagon Flip Top Rigid Boxes with Magnetic Closure | PakFactory',
    metaDescription: 'Six-sided hexagon magnetic closure rigid boxes — unique geometry for premium gifting and limited editions. MOQ 100.',
  },
  {
    _id: 'prod-rgd-014', _type: 'product',
    title: 'Custom Double Door Flap Opening Rigid Box with Magnetic Interlocking Panel',
    sku: 'RGD-014',
    slug: slug('custom-double-door-flap-opening-rigid-box-magnetic-interlocking-panel'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift'), ref('uc-launch')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Elegant dual door design with an extra magnet panel for secure closure.',
    whatIsBlock: { title: 'Double Door with Magnetic Interlocking Panel', body: [block('This rigid box features two front-opening doors that meet in the centre, plus an additional magnetic interlocking panel that spans the join. The interlocking panel creates a triple-layer closure — two door magnets plus one centre panel magnet — for a supremely secure and dramatic opening sequence.')] },
    whyChooseBlock: { title: 'A three-act opening', body: [block('The interlocking panel adds a third reveal moment to the standard double-door opening: unlatch the panel, swing the doors, discover the product. Each step builds anticipation. Ideal for high-value gifting, product launches, and collector editions where the opening is as important as what\'s inside.')] },
    faqs: [],
    metaTitle: 'Custom Double Door Rigid Box with Magnetic Interlocking Panel | PakFactory',
    metaDescription: 'Double door rigid box with magnetic interlocking panel — triple-layer closure, three-act reveal. Premium luxury packaging, MOQ 100.',
  },
  {
    _id: 'prod-rgd-015', _type: 'product',
    title: 'Custom Double Door Rigid Boxes',
    sku: 'RGD-015',
    slug: slug('custom-double-door-rigid-boxes'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Feature two flip panels open from the centre, secured with magnetic closure.',
    whatIsBlock: { title: 'What is a Double Door Rigid Box?', body: [block('The Double Door Rigid Box has two symmetrical hinged panels that open outward from a centre split, each secured by embedded magnets. Opening both doors simultaneously creates a wide, unobstructed view of the product — a theatrical reveal used widely in luxury retail.')] },
    whyChooseBlock: { title: 'The grand reveal format', body: [block('Double door opening is the most dramatic reveal structure in the rigid box category. Both panels open together in a single gesture — wide, symmetrical, and immediately impactful on camera and in person. Standard for high-end jewellery, watches, and flagship beauty launches.')] },
    faqs: [],
    metaTitle: 'Custom Double Door Rigid Boxes | Magnetic Closure | PakFactory',
    metaDescription: 'Double door magnetic closure rigid boxes — symmetrical centre-open, grand reveal format for luxury retail. MOQ 100.',
  },
  {
    _id: 'prod-rgd-020', _type: 'product',
    title: 'Custom Double Overlapping Flap Door Rigid Boxes',
    sku: 'RGD-020',
    slug: slug('custom-double-overlapping-flap-door-rigid-boxes'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift'), ref('uc-launch')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Features double-layered front panels for grand product reveal.',
    whatIsBlock: { title: 'What is a Double Overlapping Flap Door Rigid Box?', body: [block('The Double Overlapping Flap Door box features two front panels of different widths that overlap when closed, secured by magnets. The wider outer flap tucks over the narrower inner flap, creating a layered closure that opens in two distinct steps.')] },
    whyChooseBlock: { title: 'Two-stage reveal, maximum drama', body: [block('The overlapping flap construction creates a deliberate two-stage opening ritual. Peeling back the outer flap reveals the inner panel before the product itself is seen — building anticipation in a way that single-panel formats cannot replicate.')] },
    faqs: [],
    metaTitle: 'Custom Double Overlapping Flap Door Rigid Boxes | PakFactory',
    metaDescription: 'Double overlapping flap door rigid boxes — two-stage reveal, layered magnetic closure. Premium luxury gifting packaging, MOQ 100.',
  },
  {
    _id: 'prod-rgd-023', _type: 'product',
    title: 'Custom Overlapping Flip Top Magnetic Rigid Boxes',
    sku: 'RGD-023',
    slug: slug('custom-overlapping-flip-top-magnetic-rigid-boxes'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Features overlapping panels and concealed magnets for secure closure.',
    whatIsBlock: { title: 'What is an Overlapping Flip Top Magnetic Rigid Box?', body: [block('The Overlapping Flip Top features a lid panel that extends beyond the base walls to create an overlap when closed. Concealed magnets are embedded within the overlapping edge, keeping the lid perfectly flush with no visible gap or hardware.')] },
    whyChooseBlock: { title: 'Seamless close, clean silhouette', body: [block('The overlapping construction eliminates the visible lid-base gap present in standard flip top rigid boxes. The result is a monolithic exterior silhouette with a flush, seamless appearance — making it ideal for full-wrap printed designs where continuity across the closure line matters.')] },
    faqs: [],
    metaTitle: 'Custom Overlapping Flip Top Magnetic Rigid Boxes | PakFactory',
    metaDescription: 'Overlapping flip top magnetic rigid boxes — concealed magnets, flush seamless closure, monolithic exterior. MOQ 100.',
  },
  {
    _id: 'prod-rgd-042', _type: 'product',
    title: 'Custom Magnetic Closure Box with Window',
    sku: 'RGD-042',
    slug: slug('custom-magnetic-closure-box-with-window'),
    status: 'active',
    primaryClassification: 'standard',
    productCategories: [ref('pc-rigid')],
    productStyleCategories: [ref('psc-mag')],
    useCases: [ref('uc-retail'), ref('uc-gift')],
    capabilitiesOverride: [],
    moq: 100, leadTimeDays: 21,
    description: 'Secure magnetic gift box with a clear window for product transparency.',
    whatIsBlock: { title: 'What is a Magnetic Closure Box with Window?', body: [block('This magnetic closure rigid box features a die-cut window on the lid or front panel, covered with clear PET or acetate film. The window allows the product to be seen without opening the box — combining the security of a rigid magnetic closure with the display transparency of open-face packaging.')] },
    whyChooseBlock: { title: 'Show what\'s inside without opening', body: [block('A window rigid box bridges the gap between premium gift packaging and retail display functionality. Consumers can see the product before purchase or receipt, reducing returns, building trust, and creating a more compelling shelf presence than opaque alternatives.')] },
    faqs: [],
    metaTitle: 'Custom Magnetic Closure Rigid Box with Window | PakFactory',
    metaDescription: 'Magnetic closure rigid box with clear window — product visibility without opening, premium gift presentation. MOQ 100.',
  },
]

const pages = [
  {
    _id: 'page-home', _type: 'page',
    title: 'Home',
    slug: slug('home'),
    pageType: 'home',
    headline: 'Custom Packaging, Engineered for Your Brand',
    subheadline: 'From structural engineering to 3D visualization to manufacturing — PakFactory manages your full packaging lifecycle.',
    metaTitle: 'PakFactory | Custom Packaging Solutions',
    metaDescription: 'PakFactory is a global B2B custom packaging platform. Folding cartons, rigid boxes, mailers, flexible packaging — engineered and manufactured to your exact spec.',
  },
  {
    _id: 'page-folding-carton', _type: 'page',
    title: 'Folding Carton Boxes',
    slug: slug('folding-carton-boxes'),
    pageType: 'landing-category',
    headline: 'Custom Folding Carton Boxes',
    subheadline: 'The most versatile retail packaging format — engineered for shelf presence, print fidelity, and assembly efficiency.',
    metaTitle: 'Custom Folding Carton Boxes | PakFactory',
    metaDescription: 'Custom folding carton packaging — straight tuck, reverse tuck, auto-bottom. Any size, substrate, and finish. Request a quote in minutes.',
  },
  {
    _id: 'page-rigid', _type: 'page',
    title: 'Rigid Boxes',
    slug: slug('rigid-boxes'),
    pageType: 'landing-category',
    headline: 'Custom Rigid Boxes',
    subheadline: 'Premium greyboard construction for luxury unboxing. Magnetic closures, neck boxes, telescoping formats — built to the shelf and beyond.',
    metaTitle: 'Custom Rigid Boxes | Luxury Packaging | PakFactory',
    metaDescription: 'Custom rigid box packaging — magnetic closure, neck box, telescoping. Premium greyboard construction for cosmetics, apparel, and electronics.',
  },
  {
    _id: 'page-apparel', _type: 'page',
    title: 'Apparel & Fashion Packaging',
    slug: slug('apparel-fashion-packaging'),
    pageType: 'landing-industry',
    headline: 'Packaging Built for Fashion Brands',
    subheadline: 'From folding carton hang-tag boxes to telescoping rigid boxes — custom packaging that tells your brand story at every touchpoint.',
    metaTitle: 'Apparel & Fashion Packaging | PakFactory',
    metaDescription: 'Custom apparel packaging — rigid boxes, folding cartons, mailers. Designed for fashion brands that need packaging as distinctive as their product.',
  },
]

const blogCategories = [
  {
    _id: 'bcat-trends', _type: 'blogCategory',
    title: 'Trends',
    slug: slug('trends'),
    order: 1,
    description: [block('Packaging is never static — materials science, consumer expectations, retail dynamics, and manufacturing capabilities shift every season. The Trends category is PakFactory\'s forward-looking research desk: market shifts, emerging formats, design movements, and technology disruptions shaping the industry over the next 12–36 months. Every piece here is grounded in supply chain data, buyer behavior signals, and direct input from our engineering and sourcing teams. If you want to know what\'s coming before your competitors do, this is where to start.')],
    metaTitle: 'Packaging Trends — PakFactory Blog',
    metaDescription: 'Forward-looking packaging trend research — market shifts, emerging materials, design movements, and technology disruptions from PakFactory\'s editorial desk.',
  },
  {
    _id: 'bcat-sustainability', _type: 'blogCategory',
    title: 'Sustainability',
    slug: slug('sustainability'),
    order: 2,
    description: [block('Sustainability in packaging is no longer optional — it\'s a sourcing requirement, a regulatory mandate, and increasingly a consumer expectation enforced at the shelf. PakFactory\'s Sustainability category covers the full spectrum: materials science (PCR content, bioplastics, mono-materials), certification pathways (FSC, BPI, How2Recycle), lifecycle analysis, and strategic frameworks for brands navigating greenwashing risk and genuine circular design. Our coverage is technical and commercially grounded — written by practitioners, not press releases.')],
    metaTitle: 'Sustainable Packaging — PakFactory Blog',
    metaDescription: 'Technical coverage of sustainable packaging — materials science, certifications, lifecycle analysis, and circular design strategy from PakFactory\'s sustainability team.',
  },
  {
    _id: 'bcat-business-strategy', _type: 'blogCategory',
    title: 'Business Strategy',
    slug: slug('business-strategy'),
    order: 3,
    description: [block('Packaging decisions are business decisions. The Business Strategy category covers the commercial and operational dimensions of packaging — supplier evaluation frameworks, MOQ negotiation tactics, total cost of ownership analysis, supply chain resilience, and brand strategy. Whether you\'re a founder choosing your first packaging supplier or a procurement director managing a global vendor portfolio, this category gives you the frameworks and benchmarks to make better decisions faster. No vendor pitches. No fluff. Just actionable strategy.')],
    metaTitle: 'Packaging Business Strategy — PakFactory Blog',
    metaDescription: 'Packaging sourcing, procurement, and brand strategy for buyers and operators — frameworks, benchmarks, and decision guides from PakFactory.',
  },
  {
    _id: 'bcat-design-inspiration', _type: 'blogCategory',
    title: 'Design Inspiration',
    slug: slug('design-inspiration'),
    order: 4,
    description: [block('Great packaging starts with a strong design brief — and great briefs come from a well-stocked visual library. Design Inspiration is PakFactory\'s editorial showcase: structural design analyses, multi-brand roundups, award-winning work, 3D render galleries, and deep dives into the design decisions behind iconic packaging. Coverage spans beauty, spirits, food, electronics, and beyond. Each piece is curated for brand and product design teams who need to translate visual references into manufacturable specs — so we always bridge the gap between what looks good and what can actually be built.')],
    metaTitle: 'Packaging Design Inspiration — PakFactory Blog',
    metaDescription: 'Curated packaging design showcases, structural analyses, and award-winning work — for brand and product design teams who need inspiration they can actually build.',
  },
  {
    _id: 'bcat-packaging-news', _type: 'blogCategory',
    title: 'Packaging News',
    slug: slug('packaging-news'),
    order: 5,
    description: [block('The packaging industry moves fast — M&A activity, regulatory shifts, material science breakthroughs, new product launches, and trade show highlights all have downstream implications for brands and buyers. Packaging News is PakFactory\'s reactive reporting desk: time-stamped coverage of specific events and announcements, with editorial context on what each development means for sourcing, compliance, and design decisions. Unlike our Trends coverage (which interprets patterns), Packaging News reports what just happened — and why it matters to you.')],
    metaTitle: 'Packaging Industry News — PakFactory Blog',
    metaDescription: 'Timely packaging industry news — M&A, regulatory updates, product launches, material breakthroughs, and trade show coverage with editorial context from PakFactory.',
  },
].map((category) => ({ ...category }))

const authors = [
  {
    _id: 'author-sarah-chen', _type: 'author',
    name: 'Sarah Chen',
    slug: slug('sarah-chen'),
    role: 'Senior Packaging Engineer, PakFactory',
    experience: '12+ years in structural packaging engineering · 200+ brand programs',
    shortBio: '12+ years in structural design and substrate specification for 200+ brands.',
    bio: [block('Sarah Chen is a Senior Packaging Engineer at PakFactory with 12 years of experience in structural design and substrate specification. She has led packaging programs for 200+ brands across cosmetics, food & beverage, and consumer electronics. Sarah holds a BSc in Packaging Science from Ryerson University and is a member of the Institute of Packaging Professionals (IoPP).')],
    socialLinks: [
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/in/sarah-chen-packaging',
        label: 'Sarah Chen',
      },
    ],
    metaTitle: 'Sarah Chen — PakFactory Blog',
    metaDescription: 'Sarah Chen is a Senior Packaging Engineer at PakFactory with 12 years of experience in structural design, substrate specification, and packaging programs for 200+ brands.',
  },
  {
    _id: 'author-marcus-wright', _type: 'author',
    name: 'Marcus Wright',
    slug: slug('marcus-wright'),
    role: 'Director of Sustainability, PakFactory',
    experience: '8+ years guiding brands through FSC, BPI, and How2Recycle programs',
    shortBio: '8+ years guiding brands on material choices, lifecycle analysis, and certifications.',
    bio: [block('Marcus Wright leads PakFactory\'s sustainability practice, advising brands on material choices, lifecycle analysis, and certification strategy. He has guided over 80 brands through FSC, BPI, and How2Recycle certification programs. Marcus holds an MSc in Environmental Management from the University of British Columbia.')],
    socialLinks: [
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/in/marcus-wright-sustainability',
        label: 'Marcus Wright',
      },
    ],
    metaTitle: 'Marcus Wright — PakFactory Blog',
    metaDescription: 'Marcus Wright is PakFactory\'s Director of Sustainability, advising brands on material choices, lifecycle analysis, and FSC, BPI, and How2Recycle certification strategy.',
  },
  {
    _id: 'author-priya-nair', _type: 'author',
    name: 'Priya Nair',
    slug: slug('priya-nair'),
    role: 'Head of Brand Strategy, PakFactory',
    experience: '9+ years translating brand identity into manufacturable packaging',
    shortBio: 'Head of Brand Strategy at PakFactory; former Packaging Creative Director at Glossier.',
    bio: [block('Priya Nair leads brand strategy at PakFactory, helping emerging and enterprise brands translate their identity into packaging decisions. With a background in industrial design and 9 years of brand-side experience, she brings a commercial lens to the technical decisions that define unboxing experiences.')],
    socialLinks: [
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/in/priya-nair-packaging',
        label: 'Priya Nair',
      },
      {
        platform: 'x',
        url: 'https://x.com/priya_pakfactory',
        label: 'Priya Nair',
      },
    ],
    metaTitle: 'Priya Nair — PakFactory Blog',
    metaDescription: 'Priya Nair is Head of Brand Strategy at PakFactory, helping brands translate identity into packaging decisions. Former Packaging Creative Director at Glossier.',
  },
]

const posts = [
  {
    _id: 'post-paperboard-guide', _type: 'post',
    title: 'The Complete Guide to Paperboard Types for Packaging',
    slug: slug('complete-guide-paperboard-types-packaging'),
    publishedAt: '2026-04-15T09:00:00Z',
    category: ref('bcat-business-strategy'),
    author: ref('author-sarah-chen'),
    excerpt: 'SBS, FBB, CCNB, kraft — every paperboard type explained. How to choose the right substrate for your product, price point, and sustainability goals.',
    tags: [ref('btag-paperboard'), ref('btag-sourcing'), ref('btag-folding-carton')],
    metaTitle: 'Complete Guide to Paperboard Types | PakFactory',
    metaDescription: 'SBS vs FBB vs CCNB vs Kraft — every paperboard type explained for packaging buyers. Choose the right substrate for your product and budget.',
  },
  {
    _id: 'post-box-styles', _type: 'post',
    title: 'How to Choose the Right Box Style for Your Product',
    slug: slug('how-to-choose-right-box-style-product'),
    publishedAt: '2026-04-22T09:00:00Z',
    category: ref('bcat-design-inspiration'),
    author: ref('author-priya-nair'),
    excerpt: 'Folding carton or rigid box? Tuck end or auto-bottom? This decision framework walks you through the key variables: product weight, price point, assembly volume, and brand positioning.',
    tags: [ref('btag-rigid-box'), ref('btag-folding-carton'), ref('btag-minimalist')],
    metaTitle: 'How to Choose the Right Box Style | PakFactory',
    metaDescription: 'Folding carton vs rigid box, tuck end vs auto-bottom — a practical decision framework for packaging buyers based on product, volume, and brand positioning.',
  },
  {
    _id: 'post-lamination-guide', _type: 'post',
    title: 'Matte vs Gloss vs Soft Touch: Choosing the Right Lamination',
    slug: slug('matte-vs-gloss-vs-soft-touch-lamination'),
    publishedAt: '2026-04-29T09:00:00Z',
    category: ref('bcat-sustainability'),
    author: ref('author-marcus-wright'),
    excerpt: 'Lamination is the finishing decision with the biggest impact on perceived brand quality. Here is how matte, gloss, and soft touch differ — and when each one wins.',
    tags: [ref('btag-matte'), ref('btag-gloss'), ref('btag-soft-touch'), ref('btag-sustainability')],
    metaTitle: 'Matte vs Gloss vs Soft Touch Lamination | PakFactory',
    metaDescription: 'Matte, gloss, and soft touch lamination compared — learn which finish signals the right brand positioning for your packaging.',
  },
]

// ─── Blog Topic Groups ───────────────────────────────────────────────────────
// CMS-managed groups for /topics grid + Studio organization.
// Humans: run seed after schema deploy; agents must not execute seed scripts.

const blogTopicGroups = [
  { _id: 'btgrp-material',       _type: 'blogTopicGroup', title: 'Material',       slug: slug('material'),       order: 0 },
  { _id: 'btgrp-packaging-type', _type: 'blogTopicGroup', title: 'Packaging Type', slug: slug('packaging-type'), order: 1 },
  { _id: 'btgrp-finish',         _type: 'blogTopicGroup', title: 'Finish',         slug: slug('finish'),         order: 2 },
  { _id: 'btgrp-industry',       _type: 'blogTopicGroup', title: 'Industry',       slug: slug('industry'),       order: 3 },
  { _id: 'btgrp-channel',        _type: 'blogTopicGroup', title: 'Channel',        slug: slug('channel'),        order: 4 },
  { _id: 'btgrp-design-style',   _type: 'blogTopicGroup', title: 'Design Style',   slug: slug('design-style'),   order: 5 },
  { _id: 'btgrp-topic',          _type: 'blogTopicGroup', title: 'Topic',          slug: slug('topic'),          order: 6 },
]

const topicGroupRef = {
  material: ref('btgrp-material'),
  'packaging-type': ref('btgrp-packaging-type'),
  finish: ref('btgrp-finish'),
  industry: ref('btgrp-industry'),
  channel: ref('btgrp-channel'),
  'design-style': ref('btgrp-design-style'),
  topic: ref('btgrp-topic'),
}

// ─── Blog Tags ───────────────────────────────────────────────────────────────
// Flat topics; grouping via topicGroup → blogTopicGroup.

const blogTags = [
  { _id: 'btag-paperboard',     _type: 'blogTag', title: 'Paperboard',     slug: slug('paperboard'),     topicGroup: topicGroupRef.material,       description: 'White or coated paperboard, folding carton stock.' },
  { _id: 'btag-corrugated',     _type: 'blogTag', title: 'Corrugated',      slug: slug('corrugated'),      topicGroup: topicGroupRef.material,       description: 'Corrugated cardboard — single and double wall.' },
  { _id: 'btag-kraft',          _type: 'blogTag', title: 'Kraft',           slug: slug('kraft'),           topicGroup: topicGroupRef.material,       description: 'Unbleached kraft paper / kraft board.' },
  { _id: 'btag-rigid-box',      _type: 'blogTag', title: 'Rigid Box',       slug: slug('rigid-box'),       topicGroup: topicGroupRef['packaging-type'], description: 'Setup/luxury rigid boxes.' },
  { _id: 'btag-folding-carton', _type: 'blogTag', title: 'Folding Carton',  slug: slug('folding-carton'),  topicGroup: topicGroupRef['packaging-type'], description: 'Folded paperboard cartons.' },
  { _id: 'btag-mailer-box',     _type: 'blogTag', title: 'Mailer Box',      slug: slug('mailer-box'),      topicGroup: topicGroupRef['packaging-type'], description: 'E-commerce shipping mailers.' },
  { _id: 'btag-matte',          _type: 'blogTag', title: 'Matte',           slug: slug('matte'),           topicGroup: topicGroupRef.finish,         description: 'Matte lamination or coating.' },
  { _id: 'btag-gloss',          _type: 'blogTag', title: 'Gloss',           slug: slug('gloss'),           topicGroup: topicGroupRef.finish,         description: 'Gloss lamination or coating.' },
  { _id: 'btag-soft-touch',     _type: 'blogTag', title: 'Soft Touch',      slug: slug('soft-touch'),      topicGroup: topicGroupRef.finish,         description: 'Soft-touch lamination — velvety tactile finish.' },
  { _id: 'btag-foil-stamp',     _type: 'blogTag', title: 'Foil Stamp',       slug: slug('foil-stamp'),      topicGroup: topicGroupRef.finish,         description: 'Hot foil stamping.' },
  { _id: 'btag-sustainability', _type: 'blogTag', title: 'Sustainability',  slug: slug('sustainability'),  topicGroup: topicGroupRef.topic,        description: 'Sustainable packaging materials, certifications, and strategy.' },
  { _id: 'btag-dtc',            _type: 'blogTag', title: 'DTC',             slug: slug('dtc'),             topicGroup: topicGroupRef.channel,        description: 'Direct-to-consumer / e-commerce packaging.' },
  { _id: 'btag-retail',         _type: 'blogTag', title: 'Retail',          slug: slug('retail'),          topicGroup: topicGroupRef.channel,        description: 'Brick-and-mortar retail and shelf packaging.' },
  { _id: 'btag-beauty',         _type: 'blogTag', title: 'Beauty',          slug: slug('beauty'),          topicGroup: topicGroupRef.industry,       description: 'Beauty, cosmetics, skincare, and personal care packaging.' },
  { _id: 'btag-food-beverage',  _type: 'blogTag', title: 'Food & Beverage', slug: slug('food-beverage'),   topicGroup: topicGroupRef.industry,       description: 'Food, drink, snack, and beverage packaging.' },
  { _id: 'btag-sourcing',       _type: 'blogTag', title: 'Sourcing',        slug: slug('sourcing'),        topicGroup: topicGroupRef.topic,        description: 'Supplier sourcing, MOQs, and procurement.' },
  { _id: 'btag-unboxing',       _type: 'blogTag', title: 'Unboxing',        slug: slug('unboxing'),        topicGroup: topicGroupRef.topic,        description: 'Unboxing experience and customer reveal design.' },
  { _id: 'btag-minimalist',     _type: 'blogTag', title: 'Minimalist',      slug: slug('minimalist'),      topicGroup: topicGroupRef['design-style'], description: 'Clean, restrained design with generous white space.' },
  { _id: 'btag-luxury',         _type: 'blogTag', title: 'Luxury',          slug: slug('luxury'),          topicGroup: topicGroupRef['design-style'], description: 'Premium and luxury packaging design and materials.' },
  { _id: 'btag-trends',         _type: 'blogTag', title: 'Trends',          slug: slug('trends'),          topicGroup: topicGroupRef.topic,        description: 'Emerging packaging trends and market shifts.' },
]

const settingsDoc = {
  _id: 'settings',
  _type: 'settings',
  siteTitle: 'PakFactory',
  siteDescription: 'Global B2B custom packaging platform — structural engineering, 3D visualization, manufacturing, and logistics.',
  primaryCta: { text: 'Get an Instant Quote', url: '/quote' },
  socialLinks: [
    { _key: 'social-linkedin', platform: 'LinkedIn', url: 'https://www.linkedin.com/company/pakfactory' },
    { _key: 'social-instagram', platform: 'Instagram', url: 'https://www.instagram.com/pakfactory' },
  ],
}

// ─── Seed execution ──────────────────────────────────────────────────────────

const allDocs = [
  ...capabilityCategories,
  ...capabilityTypes,
  ...attributeGroups,
  ...attributes,
  ...productCategories,
  ...productStyleCategories,
  ...industries,
  ...industryCategories,
  ...useCases,
  ...capabilities,
  ...products,
  ...pages,
  ...blogCategories,
  ...blogTopicGroups,
  ...blogTags,
  ...authors,
  ...posts,
  settingsDoc,
]

async function seed() {
  console.log(`\n🌱  Seeding ${allDocs.length} documents into ${DATASET} (project ${PROJECT_ID})\n`)

  // Single transaction so all cross-document references resolve together
  const transaction = client.transaction()
  allDocs.forEach((doc) => transaction.createOrReplace(doc))
  await transaction.commit()
  console.log(`  ✓  ${allDocs.length}/${allDocs.length} documents written`)

  console.log('\n✅  Seed complete. Refresh your Studio.\n')
  console.log('  Document counts:')
  console.log(`    Capability Categories : ${capabilityCategories.length}`)
  console.log(`    Capability Types      : ${capabilityTypes.length}`)
  console.log(`    Attribute Groups      : ${attributeGroups.length}`)
  console.log(`    Attributes            : ${attributes.length}`)
  console.log(`    Product Categories    : ${productCategories.length}`)
  console.log(`    Product Style Cats    : ${productStyleCategories.length}`)
  console.log(`    Industries            : ${industries.length}`)
  console.log(`    Industry Categories   : ${industryCategories.length}`)
  console.log(`    Use Cases             : ${useCases.length}`)
  console.log(`    Capabilities          : ${capabilities.length}`)
  console.log(`    Products              : ${products.length} (incl. ${products.filter(p => p.productStyleCategories?.some(s => s._ref === 'psc-mag')).length} Magnetic Closure)`)
  console.log(`    Pages                 : ${pages.length}`)
  console.log(`    Blog Categories       : ${blogCategories.length}`)
  console.log(`    Blog Topic Groups     : ${blogTopicGroups.length}`)
  console.log(`    Blog Tags             : ${blogTags.length}`)
  console.log(`    Authors               : ${authors.length}`)
  console.log(`    Posts                 : ${posts.length}`)
  console.log(`    Settings              : 1`)
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err.message)
  process.exit(1)
})
