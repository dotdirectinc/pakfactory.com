import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField, taggedImageType } from '../lib/media-tags'

export const capability = defineType({
  name: 'capability',
  title: 'Capability',
  type: 'document',
  groups: [
    { name: 'basic', title: 'Basic', default: true },
    { name: 'attributes', title: 'Attributes' },
    { name: 'page', title: 'Page' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    // ─── BASIC TAB ────────────────────────────────────────────────────────────

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
      validation: (Rule) =>
        Rule.required().custom(async (slug, context) => {
          if (!slug?.current) return 'Slug is required'
          const client = context.getClient({ apiVersion: '2024-01-01' })
          const doc = context.document as { _id?: string }
          const id = doc?._id?.replace('drafts.', '')
          const draftId = `drafts.${id}`
          const existing = await client.fetch(
            `*[_type == "capability" && slug.current == $slug && !(_id in [$id, $draftId])][0]._id`,
            { slug: slug.current, id, draftId }
          )
          return existing ? 'Slug must be unique across all capabilities' : true
        }),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      group: 'basic',
      to: [{ type: 'capabilityCategory' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'reference',
      group: 'basic',
      to: [{ type: 'capabilityType' }],
      description: 'Filtered by the selected category. Select a category first.',
      options: {
        filter: ({ document }: { document: { category?: { _ref?: string } } }) => {
          const categoryRef = document?.category?._ref
          if (!categoryRef) return { filter: 'false' }
          return {
            filter: 'category._ref == $categoryRef',
            params: { categoryRef },
          }
        },
      },
      hidden: ({ document }) => !document?.category,
      validation: (Rule) => Rule.required(),
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
          { title: 'Future', value: 'future' },
          { title: 'Deprecated', value: 'deprecated' },
        ],
      },
      initialValue: 'active',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      group: 'basic',
      description: 'Add images in render order — first image = hero.',
      of: [taggedImageType([MEDIA_TAG.capability], { hotspot: true })],
    }),

    // ─── ATTRIBUTES TAB ───────────────────────────────────────────────────────

    defineField({
      name: 'applicableProductCategories',
      title: 'Applicable product categories',
      type: 'array',
      group: 'attributes',
      description: 'Which product groupings use this capability?',
      of: [{ type: 'reference', to: [{ type: 'productCategory' }] }],
    }),
    defineField({
      name: 'applicableProductStyleCategories',
      title: 'Applicable product style categories',
      type: 'array',
      group: 'attributes',
      description: 'Which structural styles specifically?',
      of: [{ type: 'reference', to: [{ type: 'productStyleCategory' }] }],
    }),
    defineField({
      name: 'applicableIndustryCategories',
      title: 'Applicable industry categories',
      type: 'array',
      group: 'attributes',
      description: 'Any industry-specific intersections?',
      of: [{ type: 'reference', to: [{ type: 'industryCategory' }] }],
    }),
    defineField({
      name: 'useCases',
      title: 'Use cases',
      type: 'array',
      group: 'attributes',
      of: [{ type: 'reference', to: [{ type: 'useCase' }] }],
    }),
    defineField({
      name: 'industries',
      title: 'Industries',
      type: 'array',
      group: 'attributes',
      of: [{ type: 'reference', to: [{ type: 'industry' }] }],
    }),
    defineField({
      name: 'materialSource',
      title: 'Material source',
      type: 'reference',
      group: 'attributes',
      to: [{ type: 'attribute' }],
      options: {
        filter: 'attributeGroup->slug.current == "source"',
      },
    }),
    defineField({
      name: 'physicalProperties',
      title: 'Physical properties',
      type: 'array',
      group: 'attributes',
      of: [{ type: 'reference', to: [{ type: 'attribute' }] }],
      options: {
        filter: 'attributeGroup->slug.current == "physical-properties"',
      } as never,
    }),
    defineField({
      name: 'performance',
      title: 'Performance',
      type: 'array',
      group: 'attributes',
      of: [{ type: 'reference', to: [{ type: 'attribute' }] }],
      options: {
        filter: 'attributeGroup->slug.current == "performance"',
      } as never,
    }),
    defineField({
      name: 'aesthetic',
      title: 'Aesthetic',
      type: 'array',
      group: 'attributes',
      of: [{ type: 'reference', to: [{ type: 'attribute' }] }],
      options: {
        filter: 'attributeGroup->slug.current == "aesthetic"',
      } as never,
    }),
    defineField({
      name: 'colors',
      title: 'Colors',
      type: 'array',
      group: 'attributes',
      of: [{ type: 'reference', to: [{ type: 'attribute' }] }],
      options: {
        filter: 'attributeGroup->slug.current == "color"',
      } as never,
    }),
    defineField({
      name: 'opacity',
      title: 'Opacity',
      type: 'array',
      group: 'attributes',
      of: [{ type: 'reference', to: [{ type: 'attribute' }] }],
      options: {
        filter: 'attributeGroup->slug.current == "opacity"',
      } as never,
    }),
    defineField({
      name: 'sustainability',
      title: 'Sustainability',
      type: 'array',
      group: 'attributes',
      of: [{ type: 'reference', to: [{ type: 'attribute' }] }],
      options: {
        filter: 'attributeGroup->slug.current == "sustainability"',
      } as never,
    }),
    // role field: only visible when type.slug === 'pouch-layer'
    defineField({
      name: 'role',
      title: 'Role',
      type: 'array',
      group: 'attributes',
      description: 'Pouch layer roles (e.g. outer, barrier, sealant).',
      of: [{ type: 'reference', to: [{ type: 'attribute' }] }],
      options: {
        filter: 'attributeGroup->slug.current == "role"',
      } as never,
      hidden: ({ document }: { document: { type?: { slug?: { current?: string } } } }) =>
        document?.type?.slug?.current !== 'pouch-layer',
    }),

    // ─── PAGE TAB ─────────────────────────────────────────────────────────────

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

    // Options: show toggles + override arrays
    defineField({
      name: 'showColorRange',
      title: 'Show color range',
      type: 'boolean',
      group: 'page',
      description: 'Inherit color range from parent Capability Type.',
      initialValue: false,
    }),
    defineField({
      name: 'colorRangeOverride',
      title: 'Color range override',
      type: 'array',
      group: 'page',
      description: 'Leave empty to inherit from parent Type. Add items to override completely.',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'name', type: 'string', title: 'Color name' },
            { name: 'hex', type: 'string', title: 'Hex code' },
          ],
        },
      ],
      hidden: ({ document }: { document: { showColorRange?: boolean } }) =>
        !document?.showColorRange,
    }),
    defineField({
      name: 'showThicknessTable',
      title: 'Show thickness table',
      type: 'boolean',
      group: 'page',
      description: 'Inherit thickness table from parent Capability Type.',
      initialValue: false,
    }),
    defineField({
      name: 'thicknessTableOverride',
      title: 'Thickness table override',
      type: 'array',
      group: 'page',
      description: 'Leave empty to inherit from parent Type. Add items to override completely.',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'gsm', type: 'number', title: 'GSM' },
            { name: 'caliper', type: 'string', title: 'Caliper (mm)' },
            { name: 'notes', type: 'string', title: 'Notes' },
          ],
        },
      ],
      hidden: ({ document }: { document: { showThicknessTable?: boolean } }) =>
        !document?.showThicknessTable,
    }),
    defineField({
      name: 'showFluteTypeTable',
      title: 'Show flute type table',
      type: 'boolean',
      group: 'page',
      description: 'Inherit flute type table from parent Capability Type.',
      initialValue: false,
    }),

    // Related items
    defineField({
      name: 'applicableCapabilities',
      title: 'Applicable capabilities',
      type: 'array',
      group: 'page',
      description: 'What can be applied TO or used WITH this?',
      of: [{ type: 'reference', to: [{ type: 'capability' }] }],
    }),
    defineField({
      name: 'comparedAgainst',
      title: 'Compared against',
      type: 'array',
      group: 'page',
      description: 'Sibling comparison — minimum 3 required.',
      of: [{ type: 'reference', to: [{ type: 'capability' }] }],
      validation: (Rule) =>
        Rule.custom((val: unknown[] | undefined) => {
          if (!val || val.length === 0) return true
          return val.length >= 3 ? true : 'Comparison requires at least 3 items'
        }),
    }),
    defineField({
      name: 'relatedCapabilities',
      title: 'Related capabilities',
      type: 'array',
      group: 'page',
      description: 'See also — cross-category links.',
      of: [{ type: 'reference', to: [{ type: 'capability' }] }],
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
            {
              name: 'answer',
              type: 'array',
              title: 'Answer',
              of: [{ type: 'block' }],
            },
          ],
          preview: { select: { title: 'question' } },
        },
      ],
    }),

    // ─── SEO TAB ──────────────────────────────────────────────────────────────

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
      mediaTags: ogMediaTags(MEDIA_TAG.capability),
      options: { hotspot: true },
    })),
  ],

  preview: {
    select: {
      title: 'title',
      status: 'status',
      category: 'category.title',
      type: 'type.title',
      media: 'media.0',
    },
    prepare({ title, status, category, type, media }) {
      const subtitle = [category, type].filter(Boolean).join(' → ')
      return {
        title,
        subtitle: status === 'active' ? subtitle : `[${status?.toUpperCase()}] ${subtitle}`,
        media,
      }
    },
  },
})
