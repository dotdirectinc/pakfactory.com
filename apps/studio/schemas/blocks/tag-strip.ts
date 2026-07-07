import { defineField, defineType } from 'sanity'
import { TagIcon } from '@sanity/icons'
import { BlockItemPreview } from '../../components/BlockItemPreview';

/**
 * tagStrip — a horizontal strip of topic pills linking to their /topics/{slug}
 * archives (e.g. "Browse by Industries"). Page-builder block
 * (apps/blog components/blocks/tag-strip).
 */
export const tagStrip = defineType({
  name: 'tagStrip',
  title: 'Topic — Strip',
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
      title: 'Topics',
      type: 'array',
      description: 'Topics to show as pills, in display order.',
      of: [{ type: 'reference', to: [{ type: 'blogTag' }] }],
      validation: (Rule) => Rule.min(1),
    }),
  ],
  preview: {
    select: { heading: 'heading', count: 'tags.length' },
    prepare({ heading, count }) {
      return {
        title: heading || 'Topic — Strip',
        subtitle: count ? `${count} topic${count === 1 ? '' : 's'}` : 'No topics selected',
      }
    },
  },
  components: { preview: BlockItemPreview },
})
