import { BarChartIcon } from '@sanity/icons'
import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * bodyBarChart — inline titled bar chart for the post Portable Text body.
 *
 * One-off content authored in place. 2–20 labelled data points; rendered as a
 * dependency-free token-driven bar chart with an accessible data-table text
 * alternative. Register in `schemas/inline/index.ts` to auto-join the post body.
 */
export const bodyBarChart = defineType({
  name: 'bodyBarChart',
  title: 'Bar chart',
  type: 'object',
  icon: BarChartIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Chart title shown above the bars.',
    }),
    defineField({
      name: 'data',
      title: 'Data',
      type: 'array',
      description:
        'Chart data points (label + value). Use the "Paste data" tool for large sets.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'dataPoint',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required().error('A label is required.'),
            }),
            defineField({
              name: 'value',
              title: 'Value',
              type: 'number',
              validation: (Rule) => Rule.required().min(0).error('A non-negative value is required.'),
            }),
          ],
          preview: {
            select: { label: 'label', value: 'value' },
            prepare({ label, value }) {
              return { title: `${label ?? 'Untitled'} · ${value ?? 0}` }
            },
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(2).error('Add at least 2 data points.'),
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description: 'Optional source line shown below the chart.',
    }),
  ],
  preview: {
    select: { title: 'title', data: 'data' },
    prepare({ title, data }) {
      const count = Array.isArray(data) ? data.length : 0
      return { title: title || 'Bar chart', subtitle: `${count} data point(s)` }
    },
  },
})
