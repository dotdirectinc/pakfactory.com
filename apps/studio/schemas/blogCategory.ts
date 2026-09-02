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
    // `summary` / `heroImage` (PROD-2293) — added beside the deprecated
    // originals; the query reads the new field and falls back to the old until
    // migrate:blogcategory-rename-fields has run, so the blog app is untouched.
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 2,
      group: 'details',
      description:
        'Short teaser shown in the blog homepage category section. Aim for ≤100 characters (spaces included); the homepage falls back to the Long description when this is blank.',
      validation: (Rule) =>
        Rule.max(100).warning(
          'Keep it under ~100 characters (spaces included) so it fits the homepage category card.',
        ),
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short description (deprecated)',
      type: 'text',
      rows: 2,
      group: 'details',
      readOnly: true,
      deprecated: { reason: 'Renamed to Summary (PROD-2293). Run migrate:blogcategory-rename-fields; removed after.' },
      description: 'Deprecated — use Summary above. Kept until its value is migrated.',
    }),
    defineField({
      name: 'description',
      title: 'Long description',
      type: 'array',
      group: 'details',
      of: [{ type: 'block' }],
      description:
        '100–200 words. Renders on the category landing page, is the primary on-page SEO signal, and the meta-description fallback. Do not leave blank.',
      validation: (Rule) => Rule.required(),
    }),
    defineField(taggedImageField({
      name: 'heroImage',
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
    defineField(taggedImageField({
      name: 'bannerImage',
      title: 'Featured image / banner (deprecated)',
      type: 'image',
      group: 'details',
      readOnly: true,
      deprecated: { reason: 'Renamed to Featured image (heroImage) (PROD-2293). Run migrate:blogcategory-rename-fields; removed after.' },
      mediaTags: [MEDIA_TAG.blog],
      options: { hotspot: true },
      description: 'Deprecated — use the Featured image above. Kept until its value is migrated.',
      fields: [
        defineField({ name: 'alt', title: 'Alt text override', type: 'string' }),
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
