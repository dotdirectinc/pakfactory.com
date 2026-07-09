import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField } from '../lib/media-tags'

export const productStyleCategory = defineType({
  name: 'productStyleCategory',
  title: 'Product Style',
  type: 'document',
  groups: [
    { name: 'basic', title: 'Basic', default: true },
    { name: 'landing', title: 'Landing Page' },
    { name: 'capabilities', title: 'Capabilities' },
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
      name: 'productCategory',
      title: 'Parent product line',
      type: 'reference',
      group: 'basic',
      to: [{ type: 'productCategory' }],
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
    defineField({
      name: 'defaultMoq',
      title: 'Default MOQ',
      type: 'number',
      group: 'basic',
      description: 'Default minimum order quantity for products in this style. Individual products inherit this value unless they set their own MOQ.',
    }),
    defineField({
      name: 'defaultLeadTimeDays',
      title: 'Default lead time (days)',
      type: 'number',
      group: 'basic',
      description: 'Default production lead time in days for this style. Individual products inherit this unless they set their own lead time.',
    }),

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

    // ─── CAPABILITIES ─────────────────────────────────────────────────────────

    defineField({
      name: 'defaultCapabilities',
      title: 'Default capabilities',
      type: 'array',
      group: 'capabilities',
      description:
        'Capabilities typical for products in this style category. Products inherit these automatically via GROQ; add to a product\'s capabilitiesOverride only to replace the full set.',
      of: [{ type: 'reference', to: [{ type: 'capability' }] }],
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
    select: {
      title: 'title',
      category: 'productCategory.title',
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
