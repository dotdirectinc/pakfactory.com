import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField, taggedImageType } from '../lib/media-tags'

export const capabilityType = defineType({
  name: 'capabilityType',
  title: 'Customization Type',
  type: 'document',
  groups: [
    { name: 'basic', title: 'Basic', default: true },
    { name: 'sharedSpecs', title: 'Shared Specs' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    // Basic tab
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
      name: 'category',
      title: 'Category',
      type: 'reference',
      group: 'basic',
      to: [{ type: 'capabilityCategory' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'basic',
      rows: 3,
    }),
    // ─── PROPERTIES ───────────────────────────────────────────────────────────
    // The Type declares which properties apply to the options beneath it, and
    // how each one is used. This declaration is what scopes the Option's
    // `properties` picker — the eight per-topic fields it replaces each carried
    // their own hardcoded group filter, which is why Finish Type was unreachable
    // from any deployed type.

    defineField({
      name: 'properties',
      title: 'Properties',
      type: 'array',
      group: 'basic',
      description:
        'Which properties the options under this type describe themselves with. An option can only pick values from the properties listed here, so an empty list means its Properties field will have nothing to choose from.',
      of: [{
        type: 'object',
        name: 'declaredProperty',
        fields: [
          defineField({
            name: 'property',
            title: 'Property',
            type: 'reference',
            to: [{ type: 'attributeGroup' }],
            options: { disableNew: true },
            description: 'The named dimension — Sustainability, Colour, Finish Type.',
            validation: (Rule) => Rule.required(),
          }),
          defineField({
            name: 'usage',
            title: 'How it is used',
            type: 'string',
            description:
              'Stated — the option asserts this as a fact about itself. Selectable — the customer chooses a value for it when configuring.',
            options: {
              layout: 'radio',
              list: [
                { title: 'Stated', value: 'stated' },
                { title: 'Selectable', value: 'selectable' },
              ],
            },
            initialValue: 'stated',
            validation: (Rule) => Rule.required(),
          }),
        ],
        preview: {
          select: { title: 'property.title', subtitle: 'usage' },
        },
      }],
    }),

    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'basic',
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      group: 'basic',
      of: [taggedImageType([MEDIA_TAG.capability], { hotspot: true })],
    }),

    // Shared Specs tab
    // `sharedSpecsNote` was help text stored as content — the same sentence on
    // 9 documents in two variants. It is now a schema description, written once
    // on each table below. The field is deprecated rather than dropped because
    // those 9 values still exist; it comes out once they are cleared.
    defineField({
      name: 'sharedSpecsNote',
      title: 'About Shared Specs',
      type: 'string',
      group: 'sharedSpecs',
      readOnly: true,
      deprecated: {
        reason:
          'Help text belongs in the schema, not in a field. It also describes inheritance, which no longer exists — the option states its own rows. Do not write to this field.',
      },
    }),
    defineField({
      name: 'colorRange',
      title: 'Color range',
      type: 'array',
      group: 'sharedSpecs',
      description:
        'Rows the options of this type may draw on. Nothing is inherited — each option states its own complete rows, so a table left empty here is not a gap.',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'name', type: 'string', title: 'Color name' },
            { name: 'hex', type: 'string', title: 'Hex code' },
          ],
          preview: { select: { title: 'name', subtitle: 'hex' } },
        },
      ],
    }),
    defineField({
      name: 'thicknessTable',
      title: 'Thickness table',
      type: 'array',
      group: 'sharedSpecs',
      description:
        'Rows the options of this type may draw on. Nothing is inherited — each option states its own complete rows, so a table left empty here is not a gap.',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'gsm', type: 'number', title: 'GSM' },
            { name: 'caliper', type: 'string', title: 'Caliper (mm)' },
            { name: 'notes', type: 'string', title: 'Notes' },
          ],
          preview: { select: { title: 'gsm', subtitle: 'caliper' } },
        },
      ],
    }),
    defineField({
      name: 'fluteTypeTable',
      title: 'Flute type table',
      type: 'array',
      group: 'sharedSpecs',
      description:
        'Rows the options of this type may draw on. Nothing is inherited — each option states its own complete rows, so a table left empty here is not a gap.',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'fluteType', type: 'string', title: 'Flute type (e.g. B, C, E)' },
            { name: 'flute', type: 'string', title: 'Flute description' },
            { name: 'liner', type: 'string', title: 'Liner' },
            { name: 'notes', type: 'string', title: 'Notes' },
          ],
          preview: { select: { title: 'fluteType', subtitle: 'notes' } },
        },
      ],
    }),

    // SEO tab
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
    select: { title: 'title', category: 'category.title' },
    prepare({ title, category }) {
      return { title, subtitle: category }
    },
  },
})
