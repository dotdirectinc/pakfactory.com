import { defineArrayMember, defineField, defineType } from 'sanity'
import { TargetIcon } from '@sanity/icons'
import { SectionItemPreview } from '../../components/SectionItemPreview'
import { sectionFieldGroups, SECTION_GROUPS } from '../../lib/section-field-groups'
import { sectionHeaderFields } from '../../lib/section-header-fields'
import {
  hideUnlessCustomList,
  sectionListSourceField,
} from '../../lib/section-list-source-fields'

/**
 * Signature system (PROD-2577 · ADR-020) — an expertise stage's named method
 * (e.g. Strategy's "360° Strategic Framework"), framed by the problems it answers.
 *
 * One job: explain *why* this stage matters and *how* PakFactory approaches it.
 * The "why" (heading · intro · body · problems) and the method (system name ·
 * dimensions) are one band on purpose — each problem opens the dimension that
 * answers it, so splitting them into two Sections would let an editor break that
 * link by reordering or deleting one half.
 *
 * Dimensions are Expertise Service documents. Default: inherit the host stage's
 * `services` in order (ADR-020 §8, "Page services" chip); Custom list overrides.
 * Presentation (disclosure list + decorative ring) stays in React (D35).
 */
export const signatureSystem = defineType({
  name: 'signatureSystem',
  title: 'Signature system',
  type: 'object',
  icon: TargetIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields(),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: SECTION_GROUPS.content,
      description: 'Why this stage matters — the paragraphs under the intro.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
            ],
            annotations: [],
          },
        }),
      ],
    }),
    defineField({
      name: 'problems',
      title: 'Problems',
      type: 'array',
      group: SECTION_GROUPS.content,
      description:
        'Short pain-point labels (e.g. "Hidden cost & waste"). Link each to the service that answers it — selecting the label opens that dimension.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'signatureProblem',
          title: 'Problem',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'Two to four words.',
              validation: (Rule) => Rule.required().max(40),
            }),
            defineField({
              name: 'service',
              title: 'Answered by',
              type: 'reference',
              to: [{ type: 'expertiseService' }],
              options: { disableNew: true },
              description:
                'The dimension that answers this problem. Leave empty for a plain label.',
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'service.title' },
          },
        }),
      ],
      validation: (Rule) => Rule.max(6),
    }),
    defineField({
      name: 'problemsCaption',
      title: 'Problems caption',
      type: 'string',
      group: SECTION_GROUPS.content,
      description: 'Optional one-liner under the problem labels (e.g. "Packaging that can\'t scale.").',
    }),
    defineField({
      name: 'systemName',
      title: 'System name',
      type: 'string',
      group: SECTION_GROUPS.content,
      description:
        'The named method, exactly as the vocabulary locks it (e.g. "360° Strategic Framework").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'systemHeading',
      title: 'System heading',
      type: 'string',
      group: SECTION_GROUPS.content,
      description: 'Heading above the dimensions (e.g. "One framework, every angle considered.").',
    }),
    defineField({
      name: 'systemIntro',
      title: 'System intro',
      type: 'text',
      rows: 3,
      group: SECTION_GROUPS.content,
      description: 'One or two sentences introducing the method.',
    }),
    sectionListSourceField({
      mode: 'page',
      chipLabel: 'Page services',
    }),
    defineField({
      name: 'services',
      title: 'Dimensions',
      type: 'array',
      group: SECTION_GROUPS.content,
      description:
        'Custom dimensions, in display order. Shown when List source is Custom; otherwise the page\'s Services are used.',
      hidden: hideUnlessCustomList,
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'expertiseService' }],
          options: { disableNew: true },
        }),
      ],
      validation: (Rule) => Rule.max(8).unique(),
    }),
  ],
  preview: {
    select: {
      title: 'heading',
      systemName: 'systemName',
      listSource: 'listSource',
      services: 'services',
    },
    prepare: ({ title, systemName, listSource, services }) => {
      const count = Array.isArray(services) ? services.length : 0
      const source =
        listSource === 'custom' ? `${count} dimension(s)` : 'Page services'
      return {
        title: title || systemName || 'Signature system',
        subtitle: [systemName, source].filter(Boolean).join(' · '),
      }
    },
  },
  components: { preview: SectionItemPreview },
})
