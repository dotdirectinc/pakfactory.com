import { defineField, defineType } from 'sanity'
import { createInheritedSpecInput } from '../components/InheritedSpecInput'
import { MEDIA_TAG, ogMediaTags, taggedImageField, taggedImageType } from '../lib/media-tags'

export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  groups: [
    { name: 'basic', title: 'Basic', default: true },
    { name: 'classification', title: 'Category' },
    { name: 'capabilities', title: 'Capabilities' },
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
      validation: (Rule) =>
        Rule.required().custom(async (slug, context) => {
          if (!slug?.current) return 'Slug is required'
          const client = context.getClient({ apiVersion: '2024-01-01' })
          const doc = context.document as { _id?: string }
          const id = doc?._id?.replace('drafts.', '')
          const draftId = `drafts.${id}`
          const existing = await client.fetch(
            `*[_type == "product" && slug.current == $slug && !(_id in [$id, $draftId])][0]._id`,
            { slug: slug.current, id, draftId }
          )
          return existing ? 'Slug must be unique across all products' : true
        }),
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
      name: 'primaryClassification',
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
      hidden: ({ document }) => document?.primaryClassification === 'industry',
      of: [{ type: 'reference', to: [{ type: 'productCategory' }] }],
      validation: (Rule) =>
        Rule.custom((val: unknown[] | undefined, context) => {
          const doc = context.document as { primaryClassification?: string }
          if (
            (doc?.primaryClassification === 'standard' ||
              doc?.primaryClassification === 'both') &&
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
      hidden: ({ document }) => document?.primaryClassification === 'industry',
      of: [{
        type: 'reference',
        to: [{ type: 'productStyleCategory' }],
        options: {
          filter: ({ document }: { document: { productCategories?: Array<{ _ref?: string }> } }) => {
            const refs = (document?.productCategories ?? [])
              .map((r) => r._ref)
              .filter(Boolean)
            if (!refs.length) return {}
            return { filter: 'productCategory._ref in $refs', params: { refs } }
          },
        },
      }],
    }),

    // Industry fields — visible when Product type is Industry or Both
    defineField({
      name: 'industries',
      title: 'Industries',
      type: 'array',
      group: 'classification',
      hidden: ({ document }) => document?.primaryClassification === 'standard',
      of: [{ type: 'reference', to: [{ type: 'industry' }] }],
    }),
    defineField({
      name: 'industryCategories',
      title: 'Industry segments',
      type: 'array',
      group: 'classification',
      hidden: ({ document }) => document?.primaryClassification === 'standard',
      of: [{ type: 'reference', to: [{ type: 'industryCategory' }] }],
    }),
    defineField({
      name: 'useCases',
      title: 'Use cases',
      type: 'array',
      group: 'attributes',
      of: [{ type: 'reference', to: [{ type: 'useCase' }] }],
    }),

    // ─── CAPABILITIES ─────────────────────────────────────────────────────────

    defineField({
      name: 'capabilitiesOverride',
      title: 'Capability overwrite',
      type: 'array',
      group: 'capabilities',
      description:
        'Leave empty — capabilities are inherited automatically from this product\'s category via GROQ. Add items here only to override completely (replaces the full inherited set, not a merge).',
      of: [{ type: 'reference', to: [{ type: 'capability' }] }],
    }),

    // ─── SPECS ────────────────────────────────────────────────────────────────

    defineField({
      name: 'moq',
      title: 'MOQ override',
      type: 'number',
      group: 'specs',
      description: 'Set only if this product differs from the style default.',
      components: { input: createInheritedSpecInput('defaultMoq', ' units') },
    }),
    defineField({
      name: 'leadTimeDays',
      title: 'Lead time override (days)',
      type: 'number',
      group: 'specs',
      description: 'Set only if this product differs from the style default.',
      components: { input: createInheritedSpecInput('defaultLeadTimeDays', ' days') },
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
