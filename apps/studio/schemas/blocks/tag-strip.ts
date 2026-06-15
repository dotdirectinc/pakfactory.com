import { defineField, defineType } from 'sanity'
import { TagIcon } from '@sanity/icons'
import { blockRowIcon } from './page-builder-preview';

/**
 * tagStrip — a horizontal strip of tag pills linking to their /tag/{slug}
 * archives (e.g. "Browse by Industries"). Page-builder block
 * (apps/blog components/blocks/tag-strip).
 */
export const tagStrip = defineType({
  name: 'tagStrip',
  title: 'Tag — Strip',
  type: 'object',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Label above the pills, e.g. "Browse by Industries".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      description: 'Tags to show as pills, in display order.',
      of: [{ type: 'reference', to: [{ type: 'blogTag' }] }],
      validation: (Rule) => Rule.min(1),
    }),
  ],
  preview: {
    select: { heading: 'heading', count: 'tags.length' },
    prepare({ heading, count }) {
      return {
        media: blockRowIcon('tagStrip'),
        title: heading || 'Tag — Strip',
        subtitle: count ? `${count} tag${count === 1 ? '' : 's'}` : 'No tags selected',
      }
    },
  },
})
