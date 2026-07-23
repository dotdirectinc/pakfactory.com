import { defineField, defineType } from 'sanity'
import { languageField, uniqueSlugPerLanguage } from '../lib/i18n-fields'
import { MEDIA_TAG, taggedImageField } from '../lib/media-tags'
import { seoFields, socialFields } from '../lib/seo-fields'

export const blogCategory = defineType({
  name: 'blogCategory',
  title: 'Blog Category',
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
      name: 'navLabel',
      title: 'Nav label',
      type: 'string',
      group: 'details',
      description:
        'Optional short label shown for this category in the primary navigation bar. When blank, the Name is used.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'details',
      options: { source: 'title' },
      description: 'Used in the URL: /blog/{slug}. Must be lowercase, hyphen-separated, and unique per language.',
      validation: (Rule) =>
        Rule.required()
          .custom(uniqueSlugPerLanguage('blogCategory')),
    }),
    defineField({
      name: 'description',
      title: 'Category description',
      type: 'array',
      group: 'details',
      of: [{ type: 'block' }],
      description:
        '100–200 words. Renders on the category landing page, is the primary on-page SEO signal, and the meta-description fallback. Do not leave blank.',
      validation: (Rule) => Rule.required(),
    }),
    defineField(taggedImageField({
      name: 'bannerImage',
      title: 'Featured image / banner',
      type: 'image',
      group: 'details',
      mediaTags: [MEDIA_TAG.blog],
      options: { hotspot: true },
      description:
        'Hero on the category landing page, and the default OG image for posts in this category (unless a post overrides it).',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text override',
          type: 'string',
          description: 'Optional. Falls back to the alt text on the image asset.',
        }),
      ],
    })),

    // ── SEO ───────────────────────────────────────────────────────────────────
    ...seoFields({ group: 'seo', typeSettingsId: 'categorySettings' }),

    // ── Social ────────────────────────────────────────────────────────────────
    ...socialFields({ group: 'social', channel: MEDIA_TAG.blog }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'slug' },
    prepare({ title, subtitle }) {
      return { title, subtitle: subtitle?.current ? `/blog/${subtitle.current}` : 'No slug' }
    },
  },
})
