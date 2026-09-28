import { defineArrayMember, defineField, defineType } from 'sanity'
import { CheckmarkCircleIcon } from '@sanity/icons'
import { SectionItemPreview } from '../../components/SectionItemPreview'
import { sectionFieldGroups, SECTION_GROUPS } from '../../lib/section-field-groups'
import { sectionHeaderFields } from '../../lib/section-header-fields'

/**
 * Benefit symbols — a closed vocabulary. Each value names what the benefit is
 * *about*; www maps it to an icon. Add a value here and in
 * `apps/www/src/lib/sections/map-benefits.ts` together.
 */
export const BENEFIT_SYMBOLS = [
  { title: 'Clarity / insight', value: 'clarity' },
  { title: 'Cost / savings', value: 'cost' },
  { title: 'Risk / protection', value: 'risk' },
  { title: 'Scale / growth', value: 'scale' },
  { title: 'Sustainability', value: 'sustainability' },
  { title: 'Speed / time', value: 'speed' },
  { title: 'Quality / precision', value: 'quality' },
  { title: 'Delivery / logistics', value: 'delivery' },
] as const

/**
 * Benefits (PROD-2577 · ADR-020) — what a buyer walks away with: a short set of
 * outcome statements (title + one line). Not links, not a catalogue strip.
 * Use Link cards for navigational tiles and Stats for numeric proof.
 * Column count and card styling stay in React (D35).
 */
export const benefits = defineType({
  name: 'benefits',
  title: 'Benefits',
  type: 'object',
  icon: CheckmarkCircleIcon,
  groups: sectionFieldGroups(),
  fields: [
    ...sectionHeaderFields(),
    defineField({
      name: 'items',
      title: 'Benefits',
      type: 'array',
      group: SECTION_GROUPS.content,
      description: 'Two to six outcomes, in display order.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'benefit',
          title: 'Benefit',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              description: 'The outcome in a few words (e.g. "Lower Total Cost of Ownership").',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'body',
              title: 'Body',
              type: 'text',
              rows: 2,
              description: 'One supporting line.',
            }),
            defineField({
              name: 'symbol',
              title: 'Symbol',
              type: 'string',
              description: 'What the benefit is about — www picks the matching icon.',
              options: { list: [...BENEFIT_SYMBOLS] },
            }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'body' },
          },
        }),
      ],
      validation: (Rule) => Rule.min(2).max(6),
    }),
  ],
  preview: {
    select: { title: 'heading', items: 'items' },
    prepare: ({ title, items }) => ({
      title: title || 'Benefits',
      subtitle: `${Array.isArray(items) ? items.length : 0} benefit(s)`,
    }),
  },
  components: { preview: SectionItemPreview },
})
