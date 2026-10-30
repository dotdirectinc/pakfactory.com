import {defineField, defineType, type FieldDefinition} from 'sanity'
import {
  BlockElementIcon,
  ComponentIcon,
  DocumentsIcon,
  ImageIcon,
  LinkIcon,
  StackCompactIcon,
} from '@sanity/icons'
import {SectionItemPreview} from '../../components/SectionItemPreview'
import {sectionFieldGroups, SECTION_GROUPS} from '../../lib/section-field-groups'
import {sectionHeaderFields} from '../../lib/section-header-fields'

/**
 * Customization Detail Page sections (PROD-3112 · ADR-020 catalog exception).
 *
 * CDP templates are section stacks: editors arrange these types on a
 * `customizationDetailPage` document. Overview is one type with rail chrome
 * (Show CTA / Bookmark / Configuration). Benefits & specs stays a separate
 * band for Get to know / Key properties.
 *
 * All types are chrome-only (D35). Option copy, media, properties, peers,
 * compatible products, and compatible customizations are host-inherited on www
 * from the `customizationOption` that renders the page.
 */

/** Studio-only note so overview objects are not field-empty. */
const overviewHostNote = defineField({
  name: 'hostNote',
  title: 'Host content',
  type: 'string',
  group: SECTION_GROUPS.content,
  readOnly: true,
  initialValue:
    'Gallery, copy, and properties come from the customization option that uses this template. Nothing to edit here.',
  hidden: true,
})

/** Layout-only chrome for overview heroes (no eyebrow / heading / intro / link). */
function overviewLayoutFields() {
  return [
    defineField({
      name: 'paddingBlock',
      title: 'Vertical padding',
      type: 'string',
      group: SECTION_GROUPS.layout,
      description:
        'Space above and below the section content (PageDielineSection). Default Medium.',
      initialValue: 'md',
      options: {
        list: [
          {title: 'Extra small', value: 'xs'},
          {title: 'Small', value: 'sm'},
          {title: 'Medium', value: 'md'},
          {title: 'Large', value: 'lg'},
        ],
        layout: 'radio' as const,
      },
    }),
    defineField({
      name: 'showTopBorder',
      title: 'Show top dashed border',
      type: 'boolean',
      group: SECTION_GROUPS.layout,
      initialValue: true,
      description:
        'Hide when the block above already shows a dashed edge to avoid a double line.',
    }),
    defineField({
      name: 'showBottomBorder',
      title: 'Show bottom dashed border',
      type: 'boolean',
      group: SECTION_GROUPS.layout,
      initialValue: true,
      description:
        'Hide when the block below already shows a dashed edge to avoid a double line.',
    }),
    defineField({
      name: 'showCta',
      title: 'Show CTA',
      type: 'boolean',
      group: SECTION_GROUPS.layout,
      fieldset: 'overviewRail',
      initialValue: true,
      description:
        'Apply to a product. Turn off on knowledge-only layouts so this option is not added to a request.',
    }),
    defineField({
      name: 'showBookmark',
      title: 'Show Bookmark',
      type: 'boolean',
      group: SECTION_GROUPS.layout,
      fieldset: 'overviewRail',
      initialValue: true,
      description: 'Bookmark control on the overview rail.',
    }),
    defineField({
      name: 'configurationSource',
      title: 'Configuration',
      type: 'string',
      group: SECTION_GROUPS.layout,
      fieldset: 'overviewRail',
      initialValue: 'properties',
      description:
        'One source for the rail selector. Selectable properties are declared on the type. Achieves lists the customer-facing options this technical option delivers. No Configuration hides the selector (Show CTA / Bookmark stay independent).',
      options: {
        layout: 'radio',
        list: [
          {title: 'Selectable properties', value: 'properties'},
          {title: 'Achieves', value: 'achieves'},
          {title: 'No Configuration', value: 'none'},
        ],
      },
    }),
  ]
}

const OVERVIEW_RAIL_FIELDSETS = [
  {
    name: 'overviewRail',
    title: 'Overview rail',
    options: {collapsible: true, collapsed: false},
  },
]

function cdpSectionType(args: {
  name: string
  title: string
  description: string
  icon: typeof ComponentIcon
  /** Overview heroes skip heading chrome — gallery/rail is fixed. */
  chrome?: 'full' | 'none'
}) {
  const {name, title, description, icon, chrome = 'full'} = args
  return defineType({
    name,
    title,
    type: 'object',
    icon,
    groups: sectionFieldGroups(),
    ...(chrome === 'none' ? {fieldsets: OVERVIEW_RAIL_FIELDSETS} : {}),
    fields: (chrome === 'full'
      ? sectionHeaderFields()
      : [overviewHostNote, ...overviewLayoutFields()]) as FieldDefinition[],
    description,
    components: {preview: SectionItemPreview},
    preview: {
      select: {title: 'heading', eyebrow: 'eyebrow'},
      prepare({title: heading, eyebrow}: {title?: string; eyebrow?: string}) {
        return {
          title: heading || title,
          subtitle: eyebrow || description,
        }
      },
    },
  })
}

/** CDP hero — gallery + Sustainability / Applicable on / facts-well rail. */
export const customizationOverview = cdpSectionType({
  name: 'customizationOverview',
  title: 'Customization overview',
  description:
    'Gallery + overview rail (Sustainability, Applicable on, configuration, Apply). ' +
    'Show CTA / Bookmark and Configuration (properties or Achieves) are toggles on this section. ' +
    'Host fills media and option data. Pair with Benefits & specs for Get to know / Key properties.',
  icon: ComponentIcon,
  chrome: 'none',
})

/** Benefits + Specs band — separate from overview (Get to know / Key properties). */
export const customizationBenefitsSpecs = cdpSectionType({
  name: 'customizationBenefitsSpecs',
  title: 'Customization benefits & specs',
  description:
    'Benefits story + Specs & performance table (Get to know + Key properties). ' +
    'Host fills from the option’s benefits and stated properties.',
  icon: DocumentsIcon,
})

/** Compatible product styles browser. */
export const customizationWorksWith = cdpSectionType({
  name: 'customizationWorksWith',
  title: 'Customization works with',
  description:
    'Compatible product styles for Apply. Host fills products from the catalog offer index.',
  icon: StackCompactIcon,
})

/** Other customizations that can be specified together with this option. */
export const customizationCompatibleOptions = cdpSectionType({
  name: 'customizationCompatibleOptions',
  title: 'Customization compatible options',
  description:
    'Options that can be specified together with this one (both-direction compatibleCustomizations). ' +
    'Host fills cards from the option. Hidden on www when the list is empty.',
  icon: LinkIcon,
})

/** Same-category compare matrix. */
export const customizationCompare = cdpSectionType({
  name: 'customizationCompare',
  title: 'Customization compare',
  description:
    'Side-by-side compare with same-category peers. Host fills the current option and peers.',
  icon: BlockElementIcon,
})

/** Showcase / see it in use bento. */
export const customizationShowcase = cdpSectionType({
  name: 'customizationShowcase',
  title: 'Customization showcase',
  description:
    'See it in use tiles. Host fills solutions and case studies tagged to the option.',
  icon: ImageIcon,
})

export const customizationDetailSections = [
  customizationOverview,
  customizationBenefitsSpecs,
  customizationWorksWith,
  customizationCompatibleOptions,
  customizationCompare,
  customizationShowcase,
]
