import { defineType, type ObjectDefinition } from 'sanity'
import {
  CaseIcon,
  UsersIcon,
  PackageIcon,
  CubeIcon,
  StackCompactIcon,
  ComponentIcon,
  BulbOutlineIcon,
  StarIcon,
  DocumentTextIcon,
  DownloadIcon,
  BookIcon,
  DocumentsIcon,
} from '@sanity/icons'
import { SectionItemPreview } from '../../components/SectionItemPreview'
import { rowSectionFields } from '../../lib/row-section-fields'
import { sectionFieldGroups } from '../../lib/section-field-groups'

/**
 * Row sections — entity insert tabs (ADR-020 §10). Each shows a strip of
 * documents and shares ONE field-set — section chrome (heading · intro · align ·
 * link · borders) plus source · count · curated override with derive fallback
 * (`rowSectionFields`). Distinct in the insert menu (own icon + `{Entity} row`
 * title), identical underneath. Theme/columns stay in React (D35).
 *
 * Video case studies live in `video-case-studies-row.ts` (mixed ref | typed).
 * Reviews (`testimonialsRow`) is a Layout section — chrome-only until item CMS.
 */

type RowSpec = {
  name: string
  title: string
  icon: ObjectDefinition['icon']
  sourceTo?: { type: string }[]
  /** Host-document list inherit chip (e.g. Related case studies). */
  pageListChip?: { label: string }
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
    groups: sectionFieldGroups(),
    fields: rowSectionFields({
      sourceTo: spec.sourceTo,
      pageListChip: spec.pageListChip,
      curatedTo: spec.curatedTo,
      itemNoun: spec.itemNoun,
      curatedTitle: spec.curatedTitle,
      defaultCount: spec.defaultCount,
    }),
    preview: {
      select: { title: 'heading', items: 'curatedItems', listSource: 'listSource', curatedSource: 'curatedSource' },
      prepare({ title, items, listSource, curatedSource }) {
        const n = Array.isArray(items) ? items.length : 0
        const source = listSource ?? curatedSource
        let subtitle = spec.title
        if (source === 'page') subtitle = 'Page list'
        else if (source === 'derive') subtitle = 'Derive from source'
        else if (n) subtitle = `${n} pinned`
        else if (source === 'custom') subtitle = 'Custom (empty)'
        return { title: title || spec.title, subtitle }
      },
    },
    components: { preview: SectionItemPreview },
  })
}

// ── Clients ──────────────────────────────────────────────────────────────────
export const logoWall = rowSection({
  name: 'logoWall', title: 'Logo wall', icon: UsersIcon,
  curatedTo: [{ type: 'client' }], itemNoun: 'clients',
})

// ── Case studies ─────────────────────────────────────────────────────────────
export const caseStudiesRow = rowSection({
  name: 'caseStudiesRow', title: 'Case study row', icon: CaseIcon,
  curatedTo: [{ type: 'caseStudy' }], itemNoun: 'case studies',
  pageListChip: { label: 'Related case studies' },
})

// ── Products ─────────────────────────────────────────────────────────────────
export const productLinesRow = rowSection({
  name: 'productLinesRow', title: 'Product line row', icon: StackCompactIcon,
  curatedTo: [{ type: 'productLine' }], itemNoun: 'lines',
})
export const productsRow = rowSection({
  name: 'productsRow', title: 'Product row', icon: PackageIcon,
  sourceTo: [{ type: 'productLine' }, { type: 'productStyle' }, { type: 'solution' }],
  curatedTo: [{ type: 'product' }], itemNoun: 'products',
})
export const bundlesRow = rowSection({
  name: 'bundlesRow', title: 'Bundle row', icon: CubeIcon,
  curatedTo: [{ type: 'bundle' }], itemNoun: 'bundles',
})

// ── Customizations ───────────────────────────────────────────────────────────
export const customizationsRow = rowSection({
  name: 'customizationsRow', title: 'Customization row', icon: ComponentIcon,
  sourceTo: [{ type: 'customizationCategory' }], curatedTo: [{ type: 'customizationOption' }], itemNoun: 'customizations',
})

// ── Solutions / Expertise ────────────────────────────────────────────────────
export const solutionsRow = rowSection({
  name: 'solutionsRow', title: 'Solution row', icon: BulbOutlineIcon,
  curatedTo: [{ type: 'solution' }], itemNoun: 'solutions',
})
export const expertiseSequence = rowSection({
  name: 'expertiseSequence', title: 'Expertise stages', icon: StarIcon,
  curatedTo: [{ type: 'expertiseStage' }], itemNoun: 'stages',
  curatedTitle: 'The ordered stages', defaultCount: 6,
})

// ── Resources ────────────────────────────────────────────────────────────────
export const guidesRow = rowSection({
  name: 'guidesRow', title: 'Guide row', icon: DocumentTextIcon,
  sourceTo: [{ type: 'productLine' }, { type: 'productStyle' }, { type: 'solution' }, { type: 'expertiseStage' }, { type: 'customizationType' }],
  curatedTo: [{ type: 'guide' }], itemNoun: 'guides',
})
export const dielinesRow = rowSection({
  name: 'dielinesRow', title: 'Dieline row', icon: DownloadIcon,
  sourceTo: [{ type: 'productStyle' }, { type: 'productLine' }, { type: 'expertiseStage' }, { type: 'solution' }],
  curatedTo: [{ type: 'dieline' }], itemNoun: 'dielines',
})
export const glossaryStrip = rowSection({
  name: 'glossaryStrip', title: 'Glossary row', icon: BookIcon,
  curatedTo: [{ type: 'glossaryTerm' }], itemNoun: 'terms',
})
export const postsRow = rowSection({
  name: 'postsRow', title: 'Post row', icon: DocumentsIcon,
  sourceTo: [{ type: 'blogCategory' }], curatedTo: [{ type: 'post' }], itemNoun: 'posts',
})

export const rowSections = [
  caseStudiesRow,
  logoWall,
  productLinesRow,
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
