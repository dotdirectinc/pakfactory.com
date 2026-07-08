import { TrendUpwardIcon } from '@sanity/icons'
import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * bodyStatStack — inline stat callout stack for the post Portable Text body.
 *
 * One-off content authored in place. 2–3 headline figures shown in a row (each
 * with a short description), plus an optional source line. Register in
 * `schemas/inline/index.ts` to auto-join the post body `of` array.
 */
export const bodyStatStack = defineType({
  name: 'bodyStatStack',
  title: 'Stat callout stack',
  type: 'object',
  icon: TrendUpwardIcon,
  fields: [
    defineField({
      name: 'stats',
      title: 'Stats',
      type: 'array',
      description: '2–3 figures, shown side by side (stacked on mobile).',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'stat',
          fields: [
            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',
              description: 'The headline figure, e.g. "52%" or "3 in 4".',
              validation: (Rule) => Rule.required().error('A value is required.'),
            }),
            defineField({
              name: 'label',
              title: 'Description',
              type: 'text',
              rows: 2,
              description: 'Short supporting text shown under the figure.',
            }),
          ],
          preview: {
            select: { value: 'value', label: 'label' },
            prepare({ value, label }) {
              return { title: value || 'Stat', subtitle: label }
            },
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(2).max(3).error('Add 2 or 3 stats.'),
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description: 'Optional source line, e.g. "Source: Packaging World".',
    }),
  ],
  preview: {
    select: { v0: 'stats.0.value', v1: 'stats.1.value', v2: 'stats.2.value' },
    prepare({ v0, v1, v2 }) {
      const values = [v0, v1, v2].filter(Boolean)
      return {
        title: 'Stat callout stack',
        subtitle: values.join('  •  ') || 'No stats',
      }
    },
  },
})
