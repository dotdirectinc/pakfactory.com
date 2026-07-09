import { defineField, defineType } from 'sanity'
import { TagIcon } from '@sanity/icons'
import { BlockItemPreview } from '../../components/BlockItemPreview'
import {
  dielineBorderFields,
  dielineBorderPreviewSubtitle,
} from '../../lib/dieline-border-fields'

/**
 * topicStrip — curated topic chips with an "Explore topics" pill (404/search parity).
 * Page-builder block (apps/blog components/blocks/topic-strip).
 */
export const topicStrip = defineType({
  name: 'topicStrip',
  title: 'Topic Strip',
  type: 'object',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Label above the chips, e.g. "Browse by topic".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'topics',
      title: 'Topics',
      type: 'array',
      description: 'Curated topics shown as pills, in display order.',
      of: [{ type: 'reference', to: [{ type: 'blogTag' }] }],
      validation: (Rule) => Rule.min(1),
    }),
    ...dielineBorderFields(),
  ],
  preview: {
    select: {
      heading: 'heading',
      count: 'topics.length',
      showTopBorder: 'showTopBorder',
      showBottomBorder: 'showBottomBorder',
    },
    prepare({ heading, count, showTopBorder, showBottomBorder }) {
      const borders = dielineBorderPreviewSubtitle(showTopBorder, showBottomBorder)
      const topics = count
        ? `${count} topic${count === 1 ? '' : 's'}`
        : 'No topics selected'
      return {
        title: heading || 'Topic Strip',
        subtitle: [topics, borders].filter(Boolean).join(' · '),
      }
    },
  },
  components: { preview: BlockItemPreview },
})
