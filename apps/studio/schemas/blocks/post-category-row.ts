import { defineField, defineType } from 'sanity'
import { ThLargeIcon } from '@sanity/icons'
import { blockRowIcon } from './page-builder-preview';

/**
 * postCategoryRow — one homepage row of the newest posts in a single category,
 * with a "View all" link. Add multiple blocks to show multiple categories.
 * Page-builder block (apps/blog components/blocks/post-category-row).
 */
export const postCategoryRow = defineType({
  name: 'postCategoryRow',
  title: 'Post — Category Row',
  type: 'object',
  icon: ThLargeIcon,
  fields: [
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'blogCategory' }],
      description: 'The blog category whose newest posts are shown in this row.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'postsCount',
      title: 'Posts to show',
      type: 'number',
      description: 'How many posts to show in this category row.',
      initialValue: 3,
      validation: (Rule) => Rule.min(1).max(6).integer(),
    }),
  ],
  preview: {
    select: { title: 'category.title', slug: 'category.slug.current' },
    prepare({ title, slug }) {
      return {
        media: blockRowIcon('postCategoryRow'),
        title: title ? `Category — ${title}` : 'Post — Category Row',
        subtitle: slug ? `/${slug}` : 'No category selected',
      }
    },
  },
})
