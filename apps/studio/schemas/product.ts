import { defineField, defineType } from 'sanity'
import { PackageIcon } from '@sanity/icons'
import { MEDIA_TAG, taggedImageType } from '../lib/media-tags'
import { seoFields, socialFields } from '../lib/seo-fields'
import { PRODUCT_URL_TYPES, uniqueSlugAcross } from '../lib/slug-rules'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { pageSectionsField, SECTION_ALLOW } from './sections'
import { faqsField } from '../lib/faq-field'
import { deprecateField } from '../lib/schema-guards'

/**
 * Product — one orderable thing: a fully-configurable `standard` product or a
 * pre-configured `inspiration` preset (Entities/Product.md). The type every
 * factual field lands on — nothing inherits from Line or Style.
 *
 * All 26 documents are mock data due for re-seeding, so this is a rebuild to
 * spec, not a migration: retired fields are deprecated (schema-on-read keeps the
 * mock data legible until the re-seed), and the line/style single references
 * replace the old arrays. The re-seed produces correct-shaped documents.
 *
 * Source-owned fields (sku, status, moq, leadTimeDays, dimensionRange,
 * properties, availableCustomizations) are marked but kept EDITABLE — decision b,
 * PROD-2295: they flip to readOnly when the Registry/SPECs system ships.
 *
 * `sections` (page-builder) is confirmed needed but deferred until the shared
 * section inventory exists (PROD-2292).
 */

const SOURCE_OWNED_NOTE =
  'Source-owned (product data source). Editable for now; becomes read-only when the Registry ships.'

const kindOf = (doc: unknown): string | undefined => (doc as { kind?: string } | undefined)?.kind
const isStandard = (doc: unknown) => kindOf(doc) === 'standard'
const isInspiration = (doc: unknown) => kindOf(doc) === 'inspiration'

export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  icon: PackageIcon,
  groups: groupsFor(['content', 'categorization', 'sections', 'specs', 'seo', 'social']),
  fields: [
    // ─── CONTENT ──────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'Short canonical name (e.g. "Matte Magnetic Gift Box").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      group: GROUPS.content,
      description: 'Optional longer H1 for the product page.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      options: { source: 'title' },
      description: 'The /products/<slug> segment. Unique across Product AND Product Line.',
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(PRODUCT_URL_TYPES)),
    }),
    defineField({
      name: 'kind',
      title: 'Product type',
      type: 'string',
      group: GROUPS.content,
      description:
        'Standard = a fully-configurable line/style product. Inspiration = a pre-configured preset (breadcrumb runs through Solutions, some customizations pre-selected). Bundle is its own type, not a value here.',
      options: {
        layout: 'radio',
        list: [
          { title: 'Standard', value: 'standard' },
          { title: 'Inspiration', value: 'inspiration' },
        ],
      },
      initialValue: 'standard',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: GROUPS.content,
      description: `Lifecycle — active · coming soon · discontinued. Synced, never an unpublish. ${SOURCE_OWNED_NOTE}`,
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
      name: 'media',
      title: 'Media',
      type: 'array',
      group: GROUPS.content,
      description: 'The PDP gallery — first image is the card and the hero.',
      of: [taggedImageType([MEDIA_TAG.product], { hotspot: true })],
    }),
    defineField({
      name: 'description',
      title: 'Short description',
      type: 'text',
      group: GROUPS.content,
      rows: 3,
      description: 'Used in product cards and listing pages.',
    }),
    defineField({
      name: 'benefits',
      title: 'Benefits',
      type: 'object',
      group: GROUPS.content,
      description: 'Why choose this product (renamed from whyChooseBlock, D33). The definition lives on the Style/Glossary, not here.',
      fields: [
        defineField({ name: 'title', title: 'Title', type: 'string' }),
        defineField({ name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }] }),
      ],
    }),

    // ─── CATEGORIZATION (classification refs + curated lists) ─────────────────
    // A product can belong to MORE THAN ONE line and style (Crystal's design) —
    // these are arrays, not single references.
    defineField({
      name: 'productCategories',
      title: 'Product lines',
      type: 'array',
      group: GROUPS.categorization,
      description: `The product line(s) this product belongs to — a product can span more than one. At least one required for standard products. ${SOURCE_OWNED_NOTE}`,
      hidden: ({ document }) => isInspiration(document),
      of: [{ type: 'reference', to: [{ type: 'productLine' }], options: { disableNew: true } }],
      validation: (Rule) =>
        Rule.custom((val, context) => {
          const arr = val as unknown[] | undefined
          if (isStandard(context.document) && (!Array.isArray(arr) || arr.length === 0))
            return 'At least one product line is required for standard products.'
          return true
        }),
    }),
    defineField({
      name: 'productStyleCategories',
      title: 'Product styles',
      type: 'array',
      group: GROUPS.categorization,
      description: `The construction style(s) — a product can have more than one. Scoped to the chosen lines. At least one required for standard products. ${SOURCE_OWNED_NOTE}`,
      hidden: ({ document }) => isInspiration(document),
      of: [
        {
          type: 'reference',
          to: [{ type: 'productStyle' }],
          options: {
            disableNew: true,
            filter: ({ document }: { document: { productCategories?: Array<{ _ref?: string }> } }) => {
              const refs = (document?.productCategories ?? []).map((r) => r._ref).filter(Boolean)
              if (!refs.length) return {}
              return { filter: 'productLine._ref in $refs', params: { refs } }
            },
          },
        },
      ],
      validation: (Rule) =>
        Rule.custom((val, context) => {
          const arr = val as unknown[] | undefined
          if (isStandard(context.document) && (!Array.isArray(arr) || arr.length === 0))
            return 'At least one product style is required for standard products.'
          return true
        }),
    }),
    defineField({
      name: 'basedOn',
      title: 'Based on',
      type: 'reference',
      group: GROUPS.categorization,
      to: [{ type: 'product' }],
      options: {
        disableNew: true,
        filter: 'kind == "standard"',
      },
      description: 'The standard product this preset is built from — the way back to its construction. Required for inspiration presets; no preset of a preset.',
      hidden: ({ document }) => isStandard(document),
      validation: (Rule) =>
        Rule.custom((val, context) => {
          if (isInspiration(context.document) && !val) return 'Required for inspiration presets.'
          return true
        }),
    }),
    defineField({
      name: 'solutions',
      title: 'Solutions',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Every solution this product serves — industries, channels, focus areas and use cases in one list.',
      of: [{ type: 'reference', to: [{ type: 'solution' }], options: { disableNew: true } }],
    }),
    defineField({
      name: 'primarySolution',
      title: 'Primary solution',
      type: 'reference',
      group: GROUPS.categorization,
      to: [{ type: 'solution' }],
      options: { disableNew: true },
      description: 'The one solution this product leads with — it names the breadcrumb parent. Required for inspiration presets.',
      validation: (Rule) =>
        Rule.custom((val, context) => {
          if (isInspiration(context.document) && !val) return 'Required for inspiration presets.'
          return true
        }),
    }),
    defineField({
      name: 'relatedProducts',
      title: 'Related products',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Curated override — empty derives related products.',
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
    }),
    faqsField({ group: GROUPS.categorization, mode: 'reference', max: 6, min: 3 }),

    // ─── SPECS (source-owned facts — editable for now, decision b) ────────────
    defineField({
      name: 'sku',
      title: 'SKU',
      type: 'string',
      group: GROUPS.specs,
      description: `Required, unique. Issued by the product data source; no format rule in Sanity. ${SOURCE_OWNED_NOTE}`,
      validation: (Rule) =>
        Rule.required().custom(async (sku, context) => {
          if (!sku) return true
          const client = context.getClient({ apiVersion: '2024-01-01' })
          const id = (context.document as { _id?: string })?._id?.replace(/^drafts\./, '') ?? ''
          const dupe = await client.fetch<boolean>(
            `count(*[_type == "product" && sku == $sku && !(_id in [$id, $draftId])]) > 0`,
            { sku, id, draftId: `drafts.${id}` },
          )
          return dupe ? 'SKU must be unique.' : true
        }),
    }),
    defineField({
      name: 'properties',
      title: 'Properties',
      type: 'array',
      group: GROUPS.specs,
      description: `Every property value this product states — the picker is scoped by the line's declaration. Nothing inherits from Line or Style. ${SOURCE_OWNED_NOTE}`,
      of: [
        {
          type: 'object',
          name: 'productProperty',
          fields: [
            defineField({
              name: 'property',
              title: 'Property',
              type: 'reference',
              to: [{ type: 'property' }],
              options: { disableNew: true },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'values',
              title: 'Values',
              type: 'array',
              description: 'The value(s) this product states for the property.',
              of: [
                {
                  type: 'reference',
                  to: [{ type: 'propertyValue' }],
                  options: {
                    disableNew: true,
                    filter: ({ parent }: { parent?: { property?: { _ref?: string } } }) => {
                      const ref = parent?.property?._ref
                      if (!ref) return { filter: 'false' }
                      return { filter: 'property._ref == $ref', params: { ref } }
                    },
                  },
                },
              ],
              validation: (Rule) => Rule.unique(),
            }),
          ],
          preview: {
            select: { title: 'property.title', count: 'values.length' },
            prepare({ title, count }) {
              return { title: title || 'Property', subtitle: count ? `${count} value(s)` : 'No values' }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'availableCustomizations',
      title: 'Available customizations',
      type: 'array',
      group: GROUPS.specs,
      description: `What can be applied to this product, each flagged pre-selected or not. A preset simply has some already flagged. ${SOURCE_OWNED_NOTE}`,
      of: [
        {
          type: 'object',
          name: 'availableCustomization',
          fields: [
            defineField({
              name: 'customization',
              title: 'Customization option',
              type: 'reference',
              to: [{ type: 'customizationOption' }],
              options: { disableNew: true },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'preselected',
              title: 'Pre-selected',
              type: 'boolean',
              description: 'Rendered as already chosen on a preset. Stays changeable — a preset is a starting point.',
              initialValue: false,
            }),
          ],
          preview: {
            select: { title: 'customization.title', preselected: 'preselected' },
            prepare({ title, preselected }) {
              return { title: title || 'Customization', subtitle: preselected ? 'Pre-selected' : 'Available' }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'dimensionRange',
      title: 'Dimension range',
      type: 'object',
      group: GROUPS.specs,
      description: `Min / max for length, width and depth, in millimetres — always. ${SOURCE_OWNED_NOTE}`,
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({ name: 'lengthMin', title: 'Length min (mm)', type: 'number' }),
        defineField({ name: 'lengthMax', title: 'Length max (mm)', type: 'number' }),
        defineField({ name: 'widthMin', title: 'Width min (mm)', type: 'number' }),
        defineField({ name: 'widthMax', title: 'Width max (mm)', type: 'number' }),
        defineField({ name: 'depthMin', title: 'Depth min (mm)', type: 'number' }),
        defineField({ name: 'depthMax', title: 'Depth max (mm)', type: 'number' }),
      ],
    }),
    defineField({
      name: 'moq',
      title: 'MOQ',
      type: 'number',
      group: GROUPS.specs,
      description: `This product's own minimum order quantity, in units. Not an override. ${SOURCE_OWNED_NOTE}`,
    }),
    defineField({
      name: 'leadTimeDays',
      title: 'Lead time (days)',
      type: 'number',
      group: GROUPS.specs,
      description: `This product's own production lead time, in days. ${SOURCE_OWNED_NOTE}`,
    }),

    // ─── SEO / SOCIAL ─────────────────────────────────────────────────────────
    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: GROUPS.seo,
      description: 'Overrides the browser/search title. Aim for ≤60 characters.',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: GROUPS.seo,
      description: 'The search-result snippet. Aim for ≤160 characters.',
      validation: (Rule) => Rule.max(160),
    }),
    pageSectionsField(SECTION_ALLOW.productPage),
    ...seoFields({ group: GROUPS.seo, meta: false, canonical: true, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.product }),

    // ─── DEPRECATED (kept for schema-on-read until the mock data is re-seeded) ─
    defineField({
      name: 'cardName',
      title: 'Card name',
      type: 'string',
      group: GROUPS.content,
      ...deprecateField('Retired — one naming convention (title / displayTitle). Do not use.'),
    }),
    defineField({
      name: 'whatIsBlock',
      title: 'What is it? (old)',
      type: 'object',
      group: GROUPS.content,
      fields: [
        { name: 'title', type: 'string', title: 'Heading' },
        { name: 'body', type: 'array', title: 'Body', of: [{ type: 'block' }] },
      ],
      ...deprecateField('Retired — the definition belongs to Product Style / Glossary Term, never the product.'),
    }),
    defineField({
      name: 'whyChooseBlock',
      title: 'Why choose it? (old)',
      type: 'object',
      group: GROUPS.content,
      fields: [
        { name: 'title', type: 'string', title: 'Heading' },
        { name: 'body', type: 'array', title: 'Body', of: [{ type: 'block' }] },
      ],
      ...deprecateField('Renamed to Benefits.'),
    }),
    defineField({
      name: 'showcaseImages',
      title: 'Showcase images (old)',
      type: 'array',
      group: GROUPS.content,
      of: [taggedImageType([MEDIA_TAG.product], { hotspot: true })],
      ...deprecateField('Retired — media is the one gallery (first image = hero).'),
    }),
    defineField({
      name: 'comparedAgainst',
      title: 'Compared against (old)',
      type: 'array',
      group: GROUPS.categorization,
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
      ...deprecateField('Retired — comparison is content: a guide, written once, linked from both.'),
    }),
  ],

  preview: {
    select: { title: 'title', sku: 'sku', status: 'status', kind: 'kind', media: 'media.0' },
    prepare({ title, sku, status, kind, media }) {
      const badge = status && status !== 'active' ? `[${status.toUpperCase()}] ` : ''
      return {
        title: title || 'Untitled product',
        subtitle: `${badge}${sku ?? 'no SKU'} · ${kind ?? ''}`.trim(),
        media,
      }
    },
  },
})
