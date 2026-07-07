import { defineField, defineType } from 'sanity'
import { languageField, uniqueSlugPerLanguage } from '../lib/i18n-fields'
import { MEDIA_TAG } from '../lib/media-tags'
import { seoFields, socialFields } from '../lib/seo-fields'

/**
 * blogTag — flat tag document type
 * URL pattern: /topics/{slug}
 *
 * Tags stay FLAT. Grouping for Studio and the /topics grid is via `topicGroup`
 * reference to `blogTopicGroup`. The tag URL is unaffected.
 */
export const blogTag = defineType({
  name: 'blogTag',
  title: 'Blog Topic',
  type: 'document',
  groups: [
    { name: 'details', title: 'Details', default: true },
    { name: 'seo', title: 'SEO' },
    { name: 'social', title: 'Social' },
  ],
  fields: [
    defineField(languageField),

    // ── Details ───────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Name',
      type: 'string',
      group: 'details',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'details',
      options: { source: 'title' },
      description: 'Used in the URL: /topics/{slug}. Set once — changing breaks links.',
      validation: (Rule) =>
        Rule.required().custom(uniqueSlugPerLanguage('blogTag')),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      group: 'details',
      description:
        'Short description shown on the topic landing page (/topics/{slug}); reduces thin-content risk.',
    }),
    defineField({
      name: 'topicGroup',
      title: 'Group',
      type: 'reference',
      to: [{ type: 'blogTopicGroup' }],
      group: 'details',
      description:
        'Topic group for Studio organization and the /topics index grid. Leave empty for Ungrouped.',
    }),

    // ── SEO ───────────────────────────────────────────────────────────────────
    // Tags default to noindex (BA): archives are SEO-thin. Flip Allow indexing
    // ON only for tags with ≥5 posts and clear SEO value.
    ...seoFields({ group: 'seo', indexDefault: false }),

    // ── Social ────────────────────────────────────────────────────────────────
    ...socialFields({ group: 'social', channel: MEDIA_TAG.blog }),
  ],
  preview: {
    select: {
      title: 'title',
      slug: 'slug',
      groupTitle: 'topicGroup.title',
    },
    prepare({ title, slug, groupTitle }) {
      const url = slug?.current ? `/topics/${slug.current}` : 'No slug'
      return {
        title,
        subtitle: groupTitle ? `${groupTitle} · ${url}` : url,
      }
    },
  },
  orderings: [
    {
      title: 'Title A–Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
    {
      title: 'Group → title',
      name: 'groupOrder',
      by: [
        { field: 'topicGroup.title', direction: 'asc' },
        { field: 'title', direction: 'asc' },
      ],
    },
  ],
})
