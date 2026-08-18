import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField } from '../lib/media-tags'
import { seoFields } from '../lib/seo-fields'

export const productStyle = defineType({
  name: 'productStyle',
  title: 'Product Style',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'seo', title: 'SEO' },
    { name: 'social', title: 'Social' },
  ],
  fields: [
    // ─── CONTENT ──────────────────────────────────────────────────────────────

    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description: 'The product style name (e.g. "Snap-Lock Mailer").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: { source: 'title' },
      description: 'URL-safe identifier, generated from the title.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'productLine',
      title: 'Parent product line',
      type: 'reference',
      group: 'content',
      description: 'The product line this style belongs to (its parent) — required.',
      to: [{ type: 'productLine' }],
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'content',
      rows: 3,
      description: 'Short intro shown on the style landing page.',
    }),
    // Nothing inherits: each product states its own MOQ and lead time, and a
    // style that needs a figure derives it from its products at read time.
    // `defaultMoq` and `defaultLeadTimeDays` were removed here — never populated.
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: 'content',
      description: 'Landing-page hero: badge, headline, supporting copy and image. Ported from the old collection hero.',
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
          description: 'Supporting copy below the headline on the style landing page.',
        }),
        defineField(taggedImageField({
          name: 'image',
          title: 'Hero image',
          type: 'image',
          mediaTags: [MEDIA_TAG.product],
          options: { hotspot: true },
          description: 'Primary hero visual. Also used as the collection card image when no banner image is set.',
          fields: [
            defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' }),
          ],
        })),
      ],
    }),
    defineField(taggedImageField({
      name: 'bannerImage',
      title: 'Banner image',
      type: 'image',
      group: 'content',
      mediaTags: [MEDIA_TAG.product],
      options: { hotspot: true },
      description: 'Optional override for product-line cards and the collection hero. Falls back to the hero image when empty.',
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' }),
      ],
    })),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'content',
      description: 'Lower numbers appear first within the parent product line.',
    }),

    // ─── SEO ──────────────────────────────────────────────────────────────────

    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: 'seo',
      description: 'Overrides the browser/search title. Aim for ≤60 characters.',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'The search-result snippet. Aim for ≤160 characters.',
      validation: (Rule) => Rule.max(160),
    }),
    // Robots toggles from the one shared definition every other page type uses.
    // This type had meta tags and no way to keep the page out of the index.
    ...seoFields({ group: 'seo', meta: false }),

    // ─── SOCIAL ───────────────────────────────────────────────────────────────

    defineField(taggedImageField({
      name: 'ogImage',
      title: 'OG image',
      type: 'image',
      group: 'social',
      mediaTags: ogMediaTags(MEDIA_TAG.product),
      options: { hotspot: true },
      description: 'Open Graph / social-share image. Falls back to the hero image when empty.',
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' }),
      ],
    })),
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
        subtitle: category ? `Style of ${category}` : 'Product Style',
        media: bannerImage ?? heroImage,
      }
    },
  },
})
