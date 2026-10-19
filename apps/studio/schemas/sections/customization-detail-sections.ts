import {defineField, defineType, type FieldDefinition} from 'sanity'
import {
  BlockElementIcon,
  ComponentIcon,
  ComposeIcon,
  DocumentsIcon,
  ImageIcon,
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
 * All six types are chrome-only (D35). Option copy, media, properties,
 * peers, and compatible products are host-inherited on www from the
 * `customizationOption` that renders the page.
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
    'Gallery + configuration rail (Configuration, Your selection, Apply). ' +
    'Host fills media and selectable properties from the option.',
  icon: ComponentIcon,
  chrome: 'none',
})

/** Learn-first CDP hero — educate + why + properties + apply in one rail. */
export const customizationOverviewLearnFirst = cdpSectionType({
  name: 'customizationOverviewLearnFirst',
  title: 'Customization overview (learn-first)',
  description:
    'Gallery + learn-first rail (why use it, properties as facts, carry-forward value, Apply). ' +
    'Host fills glossary, benefits, and properties from the option.',
  icon: ComposeIcon,
  chrome: 'none',
})

/** Benefits + Specs band (use with standard overview; skip on learn-first). */
export const customizationBenefitsSpecs = cdpSectionType({
  name: 'customizationBenefitsSpecs',
  title: 'Customization benefits & specs',
  description:
    'Benefits story + Specs & performance table. Host fills from the option’s benefits and stated properties.',
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
  customizationCompare,
  customizationShowcase,
]
