import { defineField, defineType } from 'sanity'
import { languageField, uniqueSlugPerLanguage } from '../lib/i18n-fields'
import { MEDIA_TAG, ogMediaTags, taggedImageField } from '../lib/media-tags'

export const blogCategory = defineType({
  name: 'blogCategory',
  title: 'Blog Category',
  type: 'document',
  groups: [
    { name: 'overview', title: 'Overview', default: true },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField(languageField),
    // ── Overview ────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'overview',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'overview',
      options: { source: 'title' },
      description: 'Used in the URL: /blog/{slug}. Must match the CATEGORY_SLUGS constant in Next.js.',
      validation: (Rule) =>
        Rule.required()
          .custom((slug) => {
          const allowed = [
            'trends',
            'sustainability',
            'business-strategy',
            'design-inspiration',
            'packaging-news',
          ]
          if (!slug?.current) return 'Slug is required'
          return allowed.includes(slug.current)
            ? true
            : `Slug must be one of: ${allowed.join(', ')}. Adding a new category requires updating the Next.js CATEGORY_SLUGS constant too.`
        })
          .custom(uniqueSlugPerLanguage('blogCategory')),
    }),
    defineField({
      name: 'description',
      title: 'Category description',
      type: 'array',
      group: 'overview',
      of: [{ type: 'block' }],
      description:
        '100–200 words. This copy renders on the category landing page and is the primary on-page SEO signal for category-level keyword targeting. Do not leave blank.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'overview',
      description: 'Controls order in nav/category strip. Lower = first.',
      validation: (Rule) => Rule.required().integer().positive(),
    }),

    // ── SEO ──────────────────────────────────────────────────────────────────
    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: 'seo',
      description: 'Defaults to "{Title} — PakFactory Blog". Override only if needed.',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: 'seo',
      validation: (Rule) => Rule.max(160),
    }),
    defineField(taggedImageField({
      name: 'ogImage',
      title: 'OG image',
      type: 'image',
      group: 'seo',
      mediaTags: ogMediaTags(MEDIA_TAG.blog),
      options: { hotspot: true },
      description: 'Social share image. Falls back to site default if not set.',
    })),
  ],
  preview: {
    select: { title: 'title', subtitle: 'slug' },
    prepare({ title, subtitle }) {
      return { title, subtitle: subtitle?.current ? `/blog/${subtitle.current}` : 'No slug' }
    },
  },
  orderings: [
    {
      title: 'Display order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
})
