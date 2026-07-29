import { ThListIcon } from '@sanity/icons'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { TableDataInput } from '../../components/TableDataInput'

/**
 * bodyTable — inline data table for the post Portable Text body.
 *
 * Headers first, then rows. Paste from Excel or upload .xlsx/.csv via
 * TableDataInput (PROD-2224). No max on columns or rows; blank headers OK.
 * Register in `schemas/inline/index.ts`.
 */
export const bodyTable = defineType({
  name: 'bodyTable',
  title: 'Data table',
  type: 'object',
  icon: ThListIcon,
  components: { input: TableDataInput },
  fields: [
    defineField({
      name: 'columns',
      title: 'Column headers',
      type: 'array',
      of: [{ type: 'string' }],
      description:
        'Column headers, left to right. Leave an entry blank for a headerless column. Or use Import below.',
      validation: (Rule) =>
        Rule.required().min(1).error('Add at least one column header.'),
    }),
    defineField({
      name: 'rows',
      title: 'Rows',
      type: 'array',
      description: 'Data rows. Each row’s cells follow the header order.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'tableRow',
          fields: [
            defineField({
              name: 'cells',
              title: 'Cells',
              type: 'array',
              of: [{ type: 'string' }],
              description: 'One value per column, in the same order as the headers.',
              validation: (Rule) => Rule.required().min(1),
            }),
          ],
          preview: {
            select: { cells: 'cells' },
            prepare({ cells }) {
              const list = Array.isArray(cells) ? cells.filter(Boolean) : []
              return { title: list.join(' · ') || 'Empty row' }
            },
          },
        }),
      ],
      validation: (Rule) =>
        Rule.required().min(1).error('Add at least one row.'),
    }),
    defineField({
      name: 'variant',
      title: 'Style',
      type: 'string',
      options: {
        list: [
          { title: 'Data table', value: 'data' },
          { title: 'Comparison table', value: 'comparison' },
        ],
        layout: 'radio',
      },
      initialValue: 'data',
      description:
        'Comparison style emphasizes the first column as row labels with striped rows — good for "A vs B" feature comparisons.',
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional caption / source line shown below the table.',
    }),
  ],
  preview: {
    select: { columns: 'columns', rows: 'rows', caption: 'caption' },
    prepare({ columns, rows, caption }) {
      const colCount = Array.isArray(columns) ? columns.length : 0
      const rowCount = Array.isArray(rows) ? rows.length : 0
      return {
        title: caption || 'Data table',
        subtitle: `${rowCount} row(s) × ${colCount} column(s)`,
      }
    },
  },
})
