import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField, taggedImageType } from '../lib/media-tags'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'

export const customizationType = defineType({
  name: 'customizationType',
  title: 'Customization Type',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'specs', title: 'Specs' },
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
      description: 'The customization type name (e.g. "Foil Stamping", "Window Patching").',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle()),
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
      name: 'category',
      title: 'Category',
      type: 'reference',
      group: 'content',
      description: 'The customization category this type belongs to (its parent) — required.',
      to: [{ type: 'customizationCategory' }],
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'content',
      rows: 3,
      description: 'One sentence on what this customization type is, for the content team.',
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'content',
      description: 'Lower numbers appear first within the category.',
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      group: 'content',
      description: 'Illustrative images for this customization type.',
      of: [taggedImageType([MEDIA_TAG.customization], { hotspot: true })],
    }),

    // ─── SPECS ────────────────────────────────────────────────────────────────
    // The Type declares which properties and spec tables apply to the options
    // beneath it. It holds no values of its own — the option states its own rows.

    defineField({
      name: 'properties',
      title: 'Properties',
      type: 'array',
      group: 'specs',
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
            to: [{ type: 'property' }],
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
      name: 'optionGroups',
      title: 'Spec tables',
      type: 'array',
      group: 'specs',
      description:
        'Which spec tables the options under this type fill in, and whether each option picks one row or several. The type declares the columns; it holds no rows of its own.',
      of: [{
        type: 'object',
        name: 'declaredOptionGroup',
        fields: [
          defineField({
            name: 'group',
            title: 'Table',
            type: 'reference',
            to: [{ type: 'optionGroup' }],
            options: { disableNew: true },
            description: 'The table definition — its columns come from there.',
            validation: (Rule) => Rule.required(),
          }),
          defineField({
            name: 'cardinality',
            title: 'How many rows an option states',
            type: 'string',
            description:
              'Pick one — the options of this type are mutually exclusive on this table. Pick many — an option can state several rows.',
            options: {
              layout: 'radio',
              list: [
                { title: 'Pick one', value: 'one' },
                { title: 'Pick many', value: 'many' },
              ],
            },
            initialValue: 'one',
            validation: (Rule) => Rule.required(),
          }),
        ],
        preview: {
          select: { title: 'group.title', subtitle: 'cardinality' },
        },
      }],
    }),
    // `sharedSpecsNote` (help text stored as content, the last of the six
    // inheritance fields) was removed in PROD-2250 — the sentence now lives as a
    // schema description on each table. migrate:customization-cleanup clears the
    // 9 orphaned values from the dataset.

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

    // ─── SOCIAL ───────────────────────────────────────────────────────────────

    defineField(taggedImageField({
      name: 'ogImage',
      title: 'OG image',
      type: 'image',
      group: 'social',
      mediaTags: ogMediaTags(MEDIA_TAG.customization),
      options: { hotspot: true },
      description: 'Open Graph / social-share image.',
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' }),
      ],
    })),
  ],
  preview: {
    select: { title: 'title', category: 'category.title' },
    prepare({ title, category }) {
      return { title, subtitle: category ? `Type in ${category}` : 'Customization Type' }
    },
  },
})
