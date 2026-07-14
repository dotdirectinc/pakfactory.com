import { defineField, defineType } from 'sanity'
import { BookIcon } from '@sanity/icons'
import { BlockItemPreview } from '../../components/BlockItemPreview';
import {
  dielineBorderFields,
  dielineBorderPreviewSubtitle,
} from '../../lib/dieline-border-fields';

/**
 * postSpotlightRow — a curated set of posts highlighted in a spotlight layout (a
 * lead post plus supporting posts). Page-builder block
 * (apps/blog components/blocks/post-spotlight-row).
 */
export const postSpotlightRow = defineType({
  name: 'postSpotlightRow',
  title: 'Post — Spotlight Row',
  type: 'object',
  icon: BookIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Optional. Defaults to "Spotlight".',
    }),
    defineField({
      name: 'posts',
      title: 'Spotlight posts',
      type: 'array',
      description: 'Manually curated posts. The first is the lead; the rest are supporting.',
      of: [{ type: 'reference', to: [{ type: 'post' }] }],
      validation: (Rule) => Rule.min(1),
    }),
    ...dielineBorderFields(),
  ],
  preview: {
    select: {
      heading: 'heading',
      lead: 'posts.0.title',
      count: 'posts.length',
      showTopBorder: 'showTopBorder',
      showBottomBorder: 'showBottomBorder',
    },
    prepare({ heading, lead, count, showTopBorder, showBottomBorder }) {
      const borders = dielineBorderPreviewSubtitle(showTopBorder, showBottomBorder)
      const posts = lead ? `${lead}${count ? ` (+${count - 1} more)` : ''}` : 'No posts selected'
      return {
        title: heading || 'Post — Spotlight Row',
        subtitle: [posts, borders].filter(Boolean).join(' · '),
      }
    },
  },
  components: { preview: BlockItemPreview },
})
