import { defineField, defineType } from 'sanity'
import { CogIcon } from '@sanity/icons'

export const blogSettings = defineType({
  name: 'blogSettings',
  title: 'Blog Settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    // ─── GENERAL ──────────────────────────────────────────────────────────────

    defineField({
      name: 'title',
      title: 'Blog title',
      type: 'string',
      description: 'Displayed in the blog header. Used as a meta title prefix fallback.',
    }),

    defineField({
      name: 'description',
      title: 'Blog description',
      type: 'text',
      rows: 2,
      description: 'Short description used in meta and as a subtitle on the blog landing page.',
    }),

    defineField({
      name: 'featuredPost',
      title: 'Featured post',
      type: 'reference',
      to: [{ type: 'post' }],
      description: 'Pinned to the top of the blog listing page.',
    }),

    defineField({
      name: 'defaultAuthor',
      title: 'Default author',
      type: 'reference',
      to: [{ type: 'author' }],
      description: 'Fallback author when a post has none assigned.',
    }),

    defineField({
      name: 'postsPerPage',
      title: 'Posts per page',
      type: 'number',
      initialValue: 12,
      validation: (Rule) => Rule.min(1).max(50).integer(),
    }),

    // ─── NEWSLETTER CTA ───────────────────────────────────────────────────────

    defineField({
      name: 'newsletterCta',
      title: 'Newsletter CTA',
      type: 'object',
      description: 'Shown in the blog sidebar or footer subscription block.',
      fields: [
        defineField({
          name: 'headline',
          title: 'Headline',
          type: 'string',
        }),
        defineField({
          name: 'subtext',
          title: 'Subtext',
          type: 'string',
        }),
        defineField({
          name: 'buttonLabel',
          title: 'Button label',
          type: 'string',
          initialValue: 'Subscribe',
        }),
      ],
    }),

    // ─── SEO DEFAULTS ─────────────────────────────────────────────────────────

    defineField({
      name: 'seo',
      title: 'SEO defaults',
      type: 'object',
      description: 'Used when individual posts do not have their own SEO fields.',
      fields: [
        defineField({
          name: 'metaTitle',
          title: 'Meta title',
          type: 'string',
          validation: (Rule) => Rule.max(60),
        }),
        defineField({
          name: 'metaDescription',
          title: 'Meta description',
          type: 'text',
          rows: 2,
          validation: (Rule) => Rule.max(160),
        }),
        defineField({
          name: 'ogImage',
          title: 'Default OG image',
          type: 'image',
          options: { hotspot: true },
        }),
      ],
    }),
  ],

  preview: {
    prepare() {
      return { title: 'Blog Settings' }
    },
  },
})
