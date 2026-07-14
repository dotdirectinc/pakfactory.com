import { defineField, defineType } from 'sanity'
import { BlockContentIcon } from '@sanity/icons'
import { BlockItemPreview } from '../../components/BlockItemPreview';

/**
 * richTextBand — generic heading + portable text for landing/static pages.
 */
export const richTextBand = defineType({
  name: 'richTextBand',
  title: 'Rich text band',
  type: 'object',
  icon: BlockContentIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }],
    }),
  ],
  preview: {
    select: { heading: 'heading' },
    prepare({ heading }) {
      return {
        title: 'Rich text band', subtitle: heading || 'Untitled' }
    },
  },
  components: { preview: BlockItemPreview },
})
