/**
 * Section `_type` → insert-menu entity tab (ADR-020 §10).
 * Kept free of schema/component imports so SectionItemPreview can use it
 * without a circular dependency.
 */

export const SECTION_ENTITY = {
  solutionsRow: 'solution',
  inspirationsGrid: 'solution',
  caseStudiesRow: 'caseStudy',
  videoCaseStudiesRow: 'caseStudy',
  productLinesRow: 'product',
  productStylesRow: 'product',
  productsRow: 'product',
  bundlesRow: 'product',
  customizationsRow: 'customization',
  customizationsCatalog: 'customization',
  expertiseSequence: 'expertise',
  guidesRow: 'resource',
  dielinesRow: 'resource',
  glossaryStrip: 'resource',
  postsRow: 'resource',
  logoWall: 'client',
  richText: 'layout',
  mediaFeature: 'layout',
  stats: 'layout',
  steps: 'layout',
  faqSection: 'layout',
  quoteCta: 'cta',
  newsletterCta: 'cta',
  linkCards: 'cta',
  contactForm: 'cta',
} as const

export type SectionEntityTab = (typeof SECTION_ENTITY)[keyof typeof SECTION_ENTITY]

/** Human tab titles for insert menu + array badges. */
export const SECTION_ENTITY_TITLE: Record<SectionEntityTab, string> = {
  solution: 'Solutions',
  caseStudy: 'Case studies',
  product: 'Products',
  customization: 'Customizations',
  expertise: 'Expertise',
  resource: 'Resources',
  client: 'Clients',
  layout: 'Layout',
  cta: 'CTAs',
}
