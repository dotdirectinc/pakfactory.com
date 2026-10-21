import {defineField, defineType, type FieldDefinition} from 'sanity'
import {
  BlockElementIcon,
  ComponentIcon,
  ComposeIcon,
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
 * `customizationDetailPage` document. Overview chrome is which overview
 * `_type` is inserted — not a layout radio on the template document.
 *
 * All seven types are chrome-only (D35). Option copy, media, properties,
 * peers, compatible products, and compatible customizations are
 * host-inherited on www from the `customizationOption` that renders the page.
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
      initialValue: true,
      description:
        'Apply to a product. Turn off on knowledge-only layouts so this option is not added to a request.',
    }),
    defineField({
      name: 'showBookmark',
      title: 'Show Bookmark',
      type: 'boolean',
      group: SECTION_GROUPS.layout,
      initialValue: true,
      description: 'Bookmark control on the overview rail.',
    }),
    defineField({
      name: 'configurationSource',
      title: 'Configuration',
      type: 'string',
      group: SECTION_GROUPS.layout,
      initialValue: 'properties',
      description:
        'One source for the rail selector. Selectable properties are declared on the type. Achieves lists the customer-facing options this technical option delivers.',
      options: {
        layout: 'radio',
        list: [
          {title: 'Selectable properties', value: 'properties'},
          {title: 'Achieves', value: 'achieves'},
        ],
      },
    }),
  ]
}

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

/** Existing CDP hero — gallery + Configuration / Your selection / Apply. */
export const customizationOverviewStandard = cdpSectionType({
  name: 'customizationOverviewStandard',
  title: 'Customization overview (standard)',
  description:
    'Gallery + configuration rail. Show CTA / Bookmark and Configuration ' +
    '(selectable properties or Achieves) are layout toggles on this section. ' +
    'Host fills media and option data.',
  icon: ComponentIcon,
  chrome: 'none',
})

/** Learn-first CDP hero — type eyebrow, sustainability, applicable-on, specs, apply. */
export const customizationOverviewLearnFirst = cdpSectionType({
  name: 'customizationOverviewLearnFirst',
  title: 'Customization overview (learn-first)',
  description:
    'Gallery + learn-first rail. Same Show CTA / Bookmark and Configuration ' +
    'toggles as the standard overview. Host fills glossary and option data. ' +
    'Pair with Benefits & specs for Get to know / Key properties.',
  icon: ComposeIcon,
  chrome: 'none',
})

/** Benefits + Specs band (standard + learn-first). */
export const customizationBenefitsSpecs = cdpSectionType({
  name: 'customizationBenefitsSpecs',
  title: 'Customization benefits & specs',
  description:
    'Benefits story + Specs & performance table (Get to know + Key properties on learn-first). ' +
    'Host fills from the option’s benefits and stated properties. Recommended on learn-first as well as Default.',
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
  customizationOverviewStandard,
  customizationOverviewLearnFirst,
  customizationBenefitsSpecs,
  customizationWorksWith,
  customizationCompatibleOptions,
  customizationCompare,
  customizationShowcase,
]
