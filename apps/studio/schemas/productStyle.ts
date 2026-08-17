import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField } from '../lib/media-tags'
import { seoFields } from '../lib/seo-fields'

export const productStyle = defineType({
  name: 'productStyle',
  title: 'Product Style',
  type: 'document',
  groups: [
    { name: 'basic', title: 'Basic', default: true },
    { name: 'landing', title: 'Landing Page' },
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
      name: 'productLine',
      title: 'Parent product line',
      type: 'reference',
      group: 'basic',
      to: [{ type: 'productLine' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'basic',
      rows: 3,
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'basic',
    }),
    // Nothing inherits: each product states its own MOQ and lead time, and a
    // style that needs a figure derives it from its products at read time.
    // `defaultMoq` and `defaultLeadTimeDays` were removed here — never populated.

    // ─── LANDING PAGE ─────────────────────────────────────────────────────────
    // Ported from old productCollection hero + bannerImage pattern.
    // hero.image → primary visual; bannerImage → optional override for cards.

    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: 'landing',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'title',
          title: 'Badge label',
          type: 'string',
          description: 'Small label above the headline (e.g. "Folding Cartons").',
        }),
        defineField({
          name: 'headline',
          title: 'Headline',
          type: 'string',
          description: 'Main hero heading. Leave blank to use the site default animated headline.',
        }),
        defineField({
          name: 'description',
          title: 'Description',
          type: 'text',
          rows: 4,
          description: 'Supporting copy below the headline on the style category landing page.',
        }),
        defineField(taggedImageField({
          name: 'image',
          title: 'Hero image',
          type: 'image',
          mediaTags: [MEDIA_TAG.product],
          options: { hotspot: true },
          description: 'Primary hero visual. Also used as the collection card image when no banner image is set.',
          fields: [
            defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
          ],
        })),
      ],
    }),
    defineField(taggedImageField({
      name: 'bannerImage',
      title: 'Banner image',
      type: 'image',
      group: 'landing',
      mediaTags: [MEDIA_TAG.product],
      options: { hotspot: true },
      description: 'Optional override for product-line cards and the collection page hero image. Falls back to hero image when empty.',
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
      ],
    })),

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

    // Robots toggles from the one shared definition every other page type uses.
    // This type had meta tags and no way to keep the page out of the index.
    ...seoFields({ group: 'seo', meta: false }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'productLine.title',
      heroImage: 'hero.image',
      bannerImage: 'bannerImage',
    },
    prepare({ title, category, heroImage, bannerImage }) {
      return {
        title,
        subtitle: category,
        media: bannerImage ?? heroImage,
      }
    },
  },
})
