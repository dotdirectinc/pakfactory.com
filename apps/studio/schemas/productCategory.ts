import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField } from '../lib/media-tags'

export const productCategory = defineType({
  name: 'productCategory',
  title: 'Product Line',
  type: 'document',
  groups: [
    { name: 'basic', title: 'Basic', default: true },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    // ─── BASIC ────────────────────────────────────────────────────────────────

    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'basic',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'basic',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'basic',
      rows: 3,
    }),
    defineField(taggedImageField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      group: 'basic',
      mediaTags: [MEDIA_TAG.product],
      options: { hotspot: true },
      description: 'Used as the hero visual on the category landing page.',
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
      ],
    })),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'basic',
    }),

    // ─── SEO ──────────────────────────────────────────────────────────────────

    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: 'seo',
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
      mediaTags: ogMediaTags(MEDIA_TAG.product),
      options: { hotspot: true },
    })),
  ],
  preview: {
    select: { title: 'title', media: 'heroImage' },
    prepare({ title, media }) {
      return { title, media }
    },
  },
})
