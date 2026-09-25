import { sectionsField, type SectionInsertGroup } from '../../lib/sections'
import type { GroupName } from '../../lib/field-groups'
import { sectionPreviewUrl } from './section-preview'
import { SECTION_ENTITY_TITLE } from './section-entity'
import { contentSections } from './content-sections'
import { rowSections } from './row-sections'
import { conversionSections } from './conversion-sections'
import { customizationsCatalog } from './customizations-catalog'
import { inspirationsGrid } from './inspirations-grid'
import { benefits } from './benefits'
import { productStylesRow } from './product-styles-row'
import { signatureSystem } from './signature-system'
import { testimonialsRow } from './testimonials-row'
import { videoCaseStudiesRow } from './video-case-studies-row'

export {
  SECTION_ENTITY,
  SECTION_ENTITY_TITLE,
  type SectionEntityTab,
} from './section-entity'

/**
 * The website section inventory (PROD-2292 · ADR-020 §10).
 * Insert menu is grouped by **core CMS entity** (Solutions · Case studies ·
 * Products · …), not Proof / Catalogue / Market. Every row section shares one
 * field-set (`rowSectionFields`). Gap types: `inspirationsGrid`,
 * `productStylesRow`, `videoCaseStudiesRow`. Presentation-free (D35).
 *
 * `pageSectionsField(allow)` returns the single `sections` field for a page,
 * scoped to the families that page may use — never two section fields on one form.
 *
 * `testimonialsRow` (Layout · Reviews) is chrome-only for now — quote items
 * still mock on www until a shared `testimonial` document lands.
 *
 * PROD-2577 adds `signatureSystem` (Expertise · a stage's named method + the
 * problems it answers) and `benefits` (Layout · outcome statements).
 *
 * PROD-1288 adds `customizationsCatalog` (filterable library) alongside
 * `customizationsRow` (catalogue strip) — do not conflate them.
 */

export const websiteSections = [
  ...contentSections,
  ...rowSections,
  inspirationsGrid,
  productStylesRow,
  videoCaseStudiesRow,
  testimonialsRow,
  customizationsCatalog,
  signatureSystem,
  benefits,
  ...conversionSections,
]

/** Section names grouped by entity (also the insert-menu grouping). */
const FAMILY = {
  solution: ['solutionsRow', 'inspirationsGrid'],
  caseStudy: ['caseStudiesRow', 'videoCaseStudiesRow'],
  product: [
    'productLinesRow',
    'productStylesRow',
    'productsRow',
    'bundlesRow',
  ],
  customization: ['customizationsRow', 'customizationsCatalog'],
  expertise: ['expertiseSequence', 'signatureSystem'],
  resource: ['guidesRow', 'dielinesRow', 'glossaryStrip', 'postsRow'],
  client: ['logoWall'],
  layout: [
    'richText',
    'mediaFeature',
    'stats',
    'steps',
    'faqSection',
    'testimonialsRow',
    'benefits',
  ],
  cta: ['quoteCta', 'newsletterCta', 'linkCards', 'contactForm'],
} as const

const INSERT_GROUPS: SectionInsertGroup[] = [
  { name: 'solution', title: SECTION_ENTITY_TITLE.solution, of: [...FAMILY.solution] },
  { name: 'caseStudy', title: SECTION_ENTITY_TITLE.caseStudy, of: [...FAMILY.caseStudy] },
  { name: 'product', title: SECTION_ENTITY_TITLE.product, of: [...FAMILY.product] },
  {
    name: 'customization',
    title: SECTION_ENTITY_TITLE.customization,
    of: [...FAMILY.customization],
  },
  { name: 'expertise', title: SECTION_ENTITY_TITLE.expertise, of: [...FAMILY.expertise] },
  { name: 'resource', title: SECTION_ENTITY_TITLE.resource, of: [...FAMILY.resource] },
  { name: 'client', title: SECTION_ENTITY_TITLE.client, of: [...FAMILY.client] },
  { name: 'layout', title: SECTION_ENTITY_TITLE.layout, of: [...FAMILY.layout] },
  { name: 'cta', title: SECTION_ENTITY_TITLE.cta, of: [...FAMILY.cta] },
]

/** Which sections each page family may insert (Section inventory → "Which pages get which"). */
export const SECTION_ALLOW = {
  // Home argues across every area — all of them.
  home: [
    ...FAMILY.solution,
    ...FAMILY.caseStudy,
    ...FAMILY.product,
    ...FAMILY.customization,
    ...FAMILY.expertise,
    ...FAMILY.resource,
    ...FAMILY.client,
    ...FAMILY.layout,
    ...FAMILY.cta,
  ],
  // A listing shows the row for its own collection (route-scoped on the front end),
  // plus FAQs, Quote CTA and rich text.
  listing: [
    ...FAMILY.product,
    ...FAMILY.customization,
    ...FAMILY.caseStudy,
    ...FAMILY.client,
    ...FAMILY.solution,
    ...FAMILY.expertise,
    ...FAMILY.resource,
    'faqSection',
    'quoteCta',
    'richText',
  ],
  // Product / Customization catalog indexes (PROD-2589) — sections below the
  // route-owned faceted grid. Exclude `customizationsCatalog` so editors cannot
  // nest a second full library under the fixed grid.
  catalogIndex: [
    ...FAMILY.product,
    'customizationsRow',
    ...FAMILY.caseStudy,
    ...FAMILY.client,
    ...FAMILY.solution,
    ...FAMILY.expertise,
    ...FAMILY.resource,
    ...FAMILY.layout,
    ...FAMILY.cta,
  ],
  // Company pages: layout · proof-ish rows · CTAs — NO catalogue product strips.
  content: [
    ...FAMILY.layout,
    ...FAMILY.caseStudy,
    ...FAMILY.client,
    ...FAMILY.cta,
  ],
  // Content-area page types (wired in pt 3):
  productPage: [
    ...FAMILY.product,
    ...FAMILY.customization,
    ...FAMILY.caseStudy,
    ...FAMILY.client,
    ...FAMILY.layout,
    'quoteCta',
  ],
  marketPage: [
    ...FAMILY.solution,
    ...FAMILY.caseStudy,
    ...FAMILY.product,
    ...FAMILY.customization,
    ...FAMILY.expertise,
    ...FAMILY.resource,
    ...FAMILY.client,
    ...FAMILY.layout,
    'quoteCta',
  ],
} as const

/**
 * The one `sections` field for a page, scoped to `allow`. The insert menu is
 * filtered to the allowed sections and keeps its entity grouping / icons /
 * optional thumbnails.
 */
export function pageSectionsField(
  allow: readonly string[],
  group: GroupName = 'sections',
  description?: string,
) {
  // Dedupe — a family spread can overlap an explicit entry (e.g. faqSection lives
  // in `layout`), and a `sections` array can't hold the same type twice.
  const list = Array.from(new Set(allow))
  const insertGroups = INSERT_GROUPS.map((g) => ({
    ...g,
    of: g.of.filter((n) => list.includes(n)),
  })).filter((g) => g.of.length > 0)
  return sectionsField({
    allow: list,
    insertGroups,
    group,
    previewImageUrl: sectionPreviewUrl,
    ...(description ? { description } : {}),
  })
}
