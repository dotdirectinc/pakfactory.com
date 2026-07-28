import { ThListIcon } from '@sanity/icons'
import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * bodyTable — inline data table for the post Portable Text body.
 *
 * Column-first authoring (PROD-2224), same nested-array pattern as footer
 * link columns: add a column, set its header, then add cells top → bottom.
 * The blog renderer transposes columns → HTML rows and pads short columns.
 * Register in `schemas/inline/index.ts` to auto-join the post body.
 */

const tableCellMember = defineArrayMember({
  type: 'object',
  name: 'tableCell',
  fields: [
    defineField({
      name: 'value',
      title: 'Value',
      type: 'string',
    }),
  ],
  preview: {
    select: { title: 'value' },
    prepare({ title }) {
      const t = typeof title === 'string' ? title.trim() : ''
      return { title: t || 'Empty cell' }
    },
  },
})

const tableColumnMember = defineArrayMember({
  type: 'object',
  name: 'tableColumn',
  fields: [
    defineField({
      name: 'header',
      title: 'Column header',
      type: 'string',
      validation: (Rule) => Rule.required().error('A column header is required.'),
    }),
    defineField({
      name: 'cells',
      title: 'Cells',
      type: 'array',
      description:
        'Values top to bottom (one per table row). Keep the same number of cells across columns so rows stay aligned.',
      of: [tableCellMember],
      validation: (Rule) =>
        Rule.required()
          .min(2)
          .max(10)
          .error('Add between 2 and 10 cells in this column.'),
    }),
  ],
  preview: {
    select: { header: 'header', cells: 'cells' },
    prepare({ header, cells }) {
      const count = Array.isArray(cells) ? cells.length : 0
      const title = typeof header === 'string' ? header.trim() : ''
      return {
        title: title || 'Untitled column',
        subtitle: count === 1 ? '1 cell' : `${count} cells`,
      }
    },
  },
})

export const bodyTable = defineType({
  name: 'bodyTable',
  title: 'Data table',
  type: 'object',
  icon: ThListIcon,
  fields: [
    defineField({
      name: 'columns',
      title: 'Columns',
      type: 'array',
      description:
        'Up to 4 columns, left to right. Open each column to set the header and add cells top to bottom.',
      of: [tableColumnMember],
      validation: (Rule) => [
        Rule.required()
          .min(1)
          .max(4)
          .error('Use between 1 and 4 columns.'),
        Rule.custom((columns) => {
          if (!Array.isArray(columns) || columns.length < 2) return true
          const lengths = columns.map((col) => {
            const cells = (col as { cells?: unknown[] } | undefined)?.cells
            return Array.isArray(cells) ? cells.length : 0
          })
          const first = lengths[0]
          if (lengths.every((n) => n === first)) return true
          return 'Columns have different cell counts — rows may misalign on the site. Match the number of cells in each column.'
        }).warning(),
      ],
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
    select: { columns: 'columns', caption: 'caption' },
    prepare({ columns, caption }) {
      const list = Array.isArray(columns) ? columns : []
      const colCount = list.length
      const rowCount = list.reduce((max, col) => {
        const cells = (col as { cells?: unknown[] } | undefined)?.cells
        const n = Array.isArray(cells) ? cells.length : 0
        return Math.max(max, n)
      }, 0)
      return {
        title: caption || 'Data table',
        subtitle: `${rowCount} row(s) × ${colCount} column(s)`,
      }
    },
  },
})
