import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField, taggedImageType } from '../lib/media-tags'
import { seoFields } from '../lib/seo-fields'
import { PRODUCT_URL_TYPES, uniqueSlugAcross } from '../lib/slug-rules'

export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  groups: [
    { name: 'basic', title: 'Basic', default: true },
    { name: 'classification', title: 'Category' },
    { name: 'attributes', title: 'Attributes' },
    { name: 'specs', title: 'Specs' },
    { name: 'page', title: 'Page' },
    { name: 'related', title: 'Related' },
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
      name: 'sku',
      title: 'SKU',
      type: 'string',
      group: 'basic',
      description: 'Format: XXX-NNN (e.g. FCB-001, RIG-042)',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'cardName',
      title: 'Card name',
      type: 'string',
      group: 'basic',
      description: 'Optional display name override for product listing cards. Leave blank to use Title.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'basic',
      options: { source: 'title' },
      description: 'The /products/ URL segment. Must be unique across products and product lines.',
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(PRODUCT_URL_TYPES)),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'basic',
      options: {
        layout: 'radio',
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Coming soon', value: 'coming-soon' },
          { title: 'Discontinued', value: 'discontinued' },
        ],
      },
      initialValue: 'active',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Product type',
      type: 'string',
      group: 'basic',
      options: {
        layout: 'radio',
        list: [
          { title: 'Standard', value: 'standard' },
          { title: 'Industry', value: 'industry' },
          { title: 'Both', value: 'both' },
        ],
      },
      initialValue: 'standard',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      group: 'basic',
      description: 'First image = hero.',
      of: [taggedImageType([MEDIA_TAG.product], { hotspot: true })],
    }),

    // ─── CLASSIFICATION ───────────────────────────────────────────────────────

    // Standard fields — visible when Product type is Standard or Both
    defineField({
      name: 'productCategories',
      title: 'Product lines',
      type: 'array',
      group: 'classification',
      hidden: ({ document }) => document?.kind === 'industry',
      of: [{ type: 'reference', to: [{ type: 'productLine' }] }],
      validation: (Rule) =>
        Rule.custom((val: unknown[] | undefined, context) => {
          const doc = context.document as { kind?: string }
          if (
            (doc?.kind === 'standard' ||
              doc?.kind === 'both') &&
            (!val || val.length === 0)
          ) {
            return 'At least one product line is required for standard products'
          }
          return true
        }),
    }),
    defineField({
      name: 'productStyleCategories',
      title: 'Product styles',
      type: 'array',
      group: 'classification',
      hidden: ({ document }) => document?.kind === 'industry',
      of: [{
        type: 'reference',
        to: [{ type: 'productStyle' }],
        options: {
          filter: ({ document }: { document: { productCategories?: Array<{ _ref?: string }> } }) => {
            const refs = (document?.productCategories ?? [])
              .map((r) => r._ref)
              .filter(Boolean)
            if (!refs.length) return {}
            return { filter: 'productLine._ref in $refs', params: { refs } }
          },
        },
      }],
    }),

    // ─── SOLUTIONS ────────────────────────────────────────────────────────────
    // The single Solutions field. It replaced the legacy `industries`,
    // `industryCategories` and `useCases` reference arrays, which were retired in
    // PROD-2298 / PROD-2299 (data repointed to Solutions on production) and removed
    // from the schema here in PROD-2284 along with the industry/useCase types.

    defineField({
      name: 'solutions',
      title: 'Solutions',
      type: 'array',
      group: 'related',
      description:
        'Every solution this product serves — industries, channels, focus areas and use cases in one list. Replaces the separate Industries, Industry segments and Use cases fields.',
      of: [{
        type: 'reference',
        to: [{ type: 'solution' }],
        options: { disableNew: true },
      }],
    }),

    defineField({
      name: 'primarySolution',
      title: 'Primary solution',
      type: 'reference',
      group: 'related',
      to: [{ type: 'solution' }],
      options: { disableNew: true },
      description:
        'The one solution this product leads with — it names the parent in the breadcrumb. Required for inspiration presets once the Product type field lands; optional for standard products.',
    }),

    // ─── SPECS ────────────────────────────────────────────────────────────────

    defineField({
      name: 'moq',
      title: 'MOQ',
      type: 'number',
      group: 'specs',
      description:
        'This product\'s own minimum order quantity, in units. Not an override — there is no style default to override, and a style that needs a figure takes the lowest among its products.',
    }),
    defineField({
      name: 'leadTimeDays',
      title: 'Lead time (days)',
      type: 'number',
      group: 'specs',
      description: 'This product\'s own production lead time, in days.',
    }),
    // ─── PAGE ─────────────────────────────────────────────────────────────────

    defineField({
      name: 'description',
      title: 'Short description',
      type: 'text',
      group: 'page',
      rows: 3,
      description: 'Used in product cards and listing pages.',
    }),
    defineField({
      name: 'whatIsBlock',
      title: 'What is it?',
      type: 'object',
      group: 'page',
      fields: [
        { name: 'title', type: 'string', title: 'Heading' },
        { name: 'body', type: 'array', title: 'Body', of: [{ type: 'block' }] },
      ],
    }),
    defineField({
      name: 'whyChooseBlock',
      title: 'Why choose it?',
      type: 'object',
      group: 'page',
      fields: [
        { name: 'title', type: 'string', title: 'Heading' },
        { name: 'body', type: 'array', title: 'Body', of: [{ type: 'block' }] },
      ],
    }),
    defineField({
      name: 'faqs',
      title: 'FAQs',
      type: 'array',
      group: 'page',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'question', type: 'string', title: 'Question' },
            { name: 'answer', type: 'array', title: 'Answer', of: [{ type: 'block' }] },
          ],
          preview: { select: { title: 'question' } },
        },
      ],
    }),
    defineField({
      name: 'showcaseImages',
      title: 'Showcase images',
      type: 'array',
      group: 'page',
      of: [taggedImageType([MEDIA_TAG.product], { hotspot: true })],
    }),

    // ─── RELATED ──────────────────────────────────────────────────────────────

    defineField({
      name: 'comparedAgainst',
      title: 'Compared against',
      type: 'array',
      group: 'related',
      description: 'Sibling comparison — minimum 3.',
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
      validation: (Rule) =>
        Rule.custom((val: unknown[] | undefined) => {
          if (!val || val.length === 0) return true
          return val.length >= 3 ? true : 'Comparison requires at least 3 products'
        }),
    }),
    defineField({
      name: 'relatedProducts',
      title: 'Related products',
      type: 'array',
      group: 'related',
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
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

    // The three robots toggles, from the one shared definition every blog type
    // already uses. Product had none at all — no way to keep a page out of the
    // index on what will be the site's highest-volume type. Meta fields are not
    // taken from the shared set: its copy describes the blog's fallback chain.
    ...seoFields({ group: 'seo', meta: false }),
  ],

  preview: {
    select: {
      title: 'title',
      sku: 'sku',
      status: 'status',
      media: 'media.0',
    },
    prepare({ title, sku, status, media }) {
      return {
        title,
        subtitle: status === 'active' ? sku : `[${status?.toUpperCase()}] ${sku}`,
        media,
      }
    },
  },
})
