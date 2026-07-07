import { defineField, defineType } from 'sanity'
import { TrendUpwardIcon } from '@sanity/icons'
import { BlockItemPreview } from '../../components/BlockItemPreview'
import {
  dielineBorderFields,
  dielineBorderPreviewSubtitle,
} from '../../lib/dieline-border-fields'

/**
 * postPopularRow — auto-populated row of the most popular posts this month
 * (published in the current calendar month, with fallback to latest).
 * Page-builder block (apps/blog components/blocks/post-popular-row).
 */
export const postPopularRow = defineType({
  name: 'postPopularRow',
  title: 'Post — Popular Row',
  type: 'object',
  icon: TrendUpwardIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Section heading shown above the post row.',
      initialValue: 'Popular this month',
    }),
    defineField({
      name: 'postsCount',
      title: 'Posts to show',
      type: 'number',
      description: 'How many posts to show in this row.',
      initialValue: 3,
      validation: (Rule) => Rule.min(1).max(6).integer(),
    }),
    ...dielineBorderFields(),
  ],
  preview: {
    select: {
      heading: 'heading',
      postsCount: 'postsCount',
      showTopBorder: 'showTopBorder',
      showBottomBorder: 'showBottomBorder',
    },
    prepare({ heading, postsCount, showTopBorder, showBottomBorder }) {
      const count = postsCount ?? 3
      const borders = dielineBorderPreviewSubtitle(showTopBorder, showBottomBorder)
      return {
        title: 'Post — Popular Row',
        subtitle: [heading || 'Popular this month', `${count} posts`, borders]
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
  components: { preview: BlockItemPreview },
})
