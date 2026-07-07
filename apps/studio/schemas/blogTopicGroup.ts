import { defineField, defineType } from 'sanity'
import { languageField, uniqueSlugPerLanguage } from '../lib/i18n-fields'

/**
 * blogTopicGroup — editor-managed topic classification for /topics grid sections.
 * Topics (`blogTag`) reference a group; the front end renders one block per group.
 */
export const blogTopicGroup = defineType({
  name: 'blogTopicGroup',
  title: 'Topic Group',
  type: 'document',
  fields: [
    defineField(languageField),
    defineField({
      name: 'title',
      title: 'Name',
      type: 'string',
      description: 'Section label on the /topics grid (e.g. Material, Industry).',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      description:
        'Stable key for ?group= deep links and industry filters. Kebab-case; do not change after topics use this group.',
      validation: (Rule) =>
        Rule.required().custom(uniqueSlugPerLanguage('blogTopicGroup')),
    }),
    defineField({
      name: 'order',
      title: 'Sort order',
      type: 'number',
      description:
        'Default order for groups not listed on the Topic page Overview, and for Studio desk folders.',
      initialValue: 0,
      validation: (Rule) => Rule.integer().min(0),
    }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug', order: 'order' },
    prepare({ title, slug, order }) {
      const key = slug?.current ? `/${slug.current}` : 'No slug'
      return {
        title,
        subtitle: [order != null ? `order ${order}` : null, key]
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
  orderings: [
    {
      title: 'Sort order',
      name: 'orderAsc',
      by: [
        { field: 'order', direction: 'asc' },
        { field: 'title', direction: 'asc' },
      ],
    },
    {
      title: 'Title A–Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
})
