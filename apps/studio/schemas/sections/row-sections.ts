import { defineType, type ObjectDefinition } from 'sanity'
import {
  CaseIcon,
  UsersIcon,
  PackageIcon,
  ThLargeIcon,
  ComponentIcon,
  BulbOutlineIcon,
  StarIcon,
  DocumentTextIcon,
  DownloadIcon,
  BookIcon,
  DocumentsIcon,
} from '@sanity/icons'
import { rowSectionFields } from '../../lib/row-section-fields'

/**
 * Row sections (Section inventory → Proof · Catalogue · Market & resources). Each
 * shows a strip of documents and shares ONE field-set — heading · intro · source ·
 * count · curated override with derive fallback (`rowSectionFields`, Foundations).
 * Distinct in the insert menu (own icon + label), identical underneath, so they
 * can't drift. No presentation fields (D35).
 *
 * `sourceTo` omitted = the row derives from the page's own subject / all items
 * (Case studies, Product lines, Bundles, Solutions, Glossary, the Expertise
 * sequence). Where a source is given, the editor names the source and the count,
 * not the items, so the section never goes stale.
 *
 * Deferred: the Testimonials row — its `testimonial` type is extracted in
 * PROD-2293. It joins this file then.
 */

type RowSpec = {
  name: string
  title: string
  icon: ObjectDefinition['icon']
  sourceTo?: { type: string }[]
  curatedTo: { type: string }[]
  itemNoun: string
  curatedTitle?: string
  defaultCount?: number
}

function rowSection(spec: RowSpec) {
  return defineType({
    name: spec.name,
    title: spec.title,
    type: 'object',
    icon: spec.icon,
    fields: rowSectionFields({
      sourceTo: spec.sourceTo,
      curatedTo: spec.curatedTo,
      itemNoun: spec.itemNoun,
      curatedTitle: spec.curatedTitle,
      defaultCount: spec.defaultCount,
    }),
    preview: {
      select: { title: 'heading', items: 'curatedItems' },
      prepare({ title, items }) {
        const n = Array.isArray(items) ? items.length : 0
        return { title: title || spec.title, subtitle: n ? `${n} pinned` : spec.title }
      },
    },
  })
}

// ── Proof ────────────────────────────────────────────────────────────────────
export const caseStudiesRow = rowSection({
  name: 'caseStudiesRow', title: 'Case studies', icon: CaseIcon,
  curatedTo: [{ type: 'caseStudy' }], itemNoun: 'case studies',
})
export const logoWall = rowSection({
  name: 'logoWall', title: 'Logo wall', icon: UsersIcon,
  curatedTo: [{ type: 'client' }], itemNoun: 'clients',
})

// ── Catalogue ────────────────────────────────────────────────────────────────
export const productLinesRow = rowSection({
  name: 'productLinesRow', title: 'Product lines', icon: PackageIcon,
  curatedTo: [{ type: 'productLine' }], itemNoun: 'lines',
})
export const productStylesRow = rowSection({
  name: 'productStylesRow', title: 'Product styles', icon: ThLargeIcon,
  sourceTo: [{ type: 'productLine' }], curatedTo: [{ type: 'productStyle' }], itemNoun: 'styles',
})
export const productsRow = rowSection({
  name: 'productsRow', title: 'Products', icon: PackageIcon,
  sourceTo: [{ type: 'productLine' }, { type: 'productStyle' }, { type: 'solution' }],
  curatedTo: [{ type: 'product' }], itemNoun: 'products',
})
export const bundlesRow = rowSection({
  name: 'bundlesRow', title: 'Bundles', icon: PackageIcon,
  curatedTo: [{ type: 'bundle' }], itemNoun: 'bundles',
})
export const customizationsRow = rowSection({
  name: 'customizationsRow', title: 'Customizations', icon: ComponentIcon,
  sourceTo: [{ type: 'customizationCategory' }], curatedTo: [{ type: 'customizationOption' }], itemNoun: 'customizations',
})

// ── Market & resources ───────────────────────────────────────────────────────
export const solutionsRow = rowSection({
  name: 'solutionsRow', title: 'Solutions', icon: BulbOutlineIcon,
  curatedTo: [{ type: 'solution' }], itemNoun: 'solutions',
})
export const expertiseSequence = rowSection({
  name: 'expertiseSequence', title: 'Expertise sequence', icon: StarIcon,
  curatedTo: [{ type: 'expertiseStage' }], itemNoun: 'stages',
  curatedTitle: 'The ordered stages', defaultCount: 6,
})
export const guidesRow = rowSection({
  name: 'guidesRow', title: 'Guides', icon: DocumentTextIcon,
  sourceTo: [{ type: 'productLine' }, { type: 'productStyle' }, { type: 'solution' }, { type: 'expertiseStage' }, { type: 'customizationType' }],
  curatedTo: [{ type: 'guide' }], itemNoun: 'guides',
})
export const dielinesRow = rowSection({
  name: 'dielinesRow', title: 'Dielines', icon: DownloadIcon,
  sourceTo: [{ type: 'productStyle' }, { type: 'productLine' }, { type: 'expertiseStage' }, { type: 'solution' }],
  curatedTo: [{ type: 'dieline' }], itemNoun: 'dielines',
})
export const glossaryStrip = rowSection({
  name: 'glossaryStrip', title: 'Glossary strip', icon: BookIcon,
  curatedTo: [{ type: 'glossaryTerm' }], itemNoun: 'terms',
})
export const postsRow = rowSection({
  name: 'postsRow', title: 'Posts', icon: DocumentsIcon,
  sourceTo: [{ type: 'blogCategory' }], curatedTo: [{ type: 'post' }], itemNoun: 'posts',
})

export const rowSections = [
  caseStudiesRow,
  logoWall,
  productLinesRow,
  productStylesRow,
  productsRow,
  bundlesRow,
  customizationsRow,
  solutionsRow,
  expertiseSequence,
  guidesRow,
  dielinesRow,
  glossaryStrip,
  postsRow,
]
