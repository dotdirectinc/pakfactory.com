import { sectionsField, type SectionInsertGroup } from '../../lib/sections'
import type { GroupName } from '../../lib/field-groups'
import { contentSections } from './content-sections'
import { rowSections } from './row-sections'
import { conversionSections } from './conversion-sections'

/**
 * The website section inventory (PROD-2292 pt 2 · Section inventory proposal).
 * 24 sections, grouped for the insert menu, presentation-free (D35). Every row
 * section shares one field-set (`rowSectionFields`).
 *
 * `pageSectionsField(allow)` returns the single `sections` field for a page,
 * scoped to the families that page may use — never two section fields on one form.
 *
 * ⚠️ Testimonials row is not here yet — its `testimonial` type is extracted in
 * PROD-2293; it joins the Proof group then.
 */

export const websiteSections = [...contentSections, ...rowSections, ...conversionSections]

/** Section names grouped by family (also the insert-menu grouping). */
const FAMILY = {
  content: ['richText', 'mediaFeature', 'stats', 'steps', 'faqSection'],
  proof: ['caseStudiesRow', 'logoWall'],
  catalogue: ['productLinesRow', 'productStylesRow', 'productsRow', 'bundlesRow', 'customizationsRow'],
  market: ['solutionsRow', 'expertiseSequence', 'guidesRow', 'dielinesRow', 'glossaryStrip', 'postsRow'],
  conversion: ['quoteCta', 'newsletterCta', 'linkCards', 'contactForm'],
} as const

const INSERT_GROUPS: SectionInsertGroup[] = [
  { name: 'content', title: 'Content', of: [...FAMILY.content] },
  { name: 'proof', title: 'Proof', of: [...FAMILY.proof] },
  { name: 'catalogue', title: 'Catalogue', of: [...FAMILY.catalogue] },
  { name: 'market', title: 'Market & resources', of: [...FAMILY.market] },
  { name: 'conversion', title: 'Conversion', of: [...FAMILY.conversion] },
]

/** Which sections each page family may insert (Section inventory → "Which pages get which"). */
export const SECTION_ALLOW = {
  // Home argues across every area — all of them.
  home: [...FAMILY.content, ...FAMILY.proof, ...FAMILY.catalogue, ...FAMILY.market, ...FAMILY.conversion],
  // A listing shows the row for its own collection (route-scoped on the front end),
  // plus FAQs, Quote CTA and rich text.
  listing: [...FAMILY.catalogue, ...FAMILY.proof, ...FAMILY.market, 'faqSection', 'quoteCta', 'richText'],
  // Company pages: content · proof · conversion — NO catalogue.
  content: [...FAMILY.content, ...FAMILY.proof, ...FAMILY.conversion],
  // Content-area page types (wired in pt 3):
  productPage: [...FAMILY.catalogue, ...FAMILY.proof, 'faqSection', ...FAMILY.content, 'quoteCta'],
  marketPage: [...FAMILY.market, ...FAMILY.catalogue, ...FAMILY.proof, ...FAMILY.content, 'quoteCta'],
} as const

/**
 * The one `sections` field for a page, scoped to `allow`. The insert menu is
 * filtered to the allowed sections and keeps its grouping/icons.
 */
export function pageSectionsField(allow: readonly string[], group: GroupName = 'sections') {
  const list = [...allow]
  const insertGroups = INSERT_GROUPS.map((g) => ({
    ...g,
    of: g.of.filter((n) => list.includes(n)),
  })).filter((g) => g.of.length > 0)
  return sectionsField({ allow: list, insertGroups, group })
}
