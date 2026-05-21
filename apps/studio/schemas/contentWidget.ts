import { defineField, defineType } from 'sanity'

/**
 * contentWidget — reusable embedded content blocks for use inside Portable Text.
 *
 * Editors create and name widgets here. Posts embed a reference to a widget
 * via the `widgetEmbed` object type. Edit a widget once → updates everywhere it's used.
 *
 * Supported types:
 *   - cta         → CTA Block (headline, subtext, button)
 *   - product-card → Product Card (reference to a product document)
 */
export const contentWidget = defineType({
  name: 'contentWidget',
  title: 'Content Widget',
  type: 'document',
  fields: [
    // ── Shared ──────────────────────────────────────────────────────────────
    defineField({
      name: 'internalTitle',
      title: 'Internal title',
      type: 'string',
      description:
        'Editor-facing label used in search and the embed picker. Not shown on the website. E.g. "Q2 Promo CTA" or "Mailer Box Product Card".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'widgetType',
      title: 'Widget type',
      type: 'string',
      description: 'Select the type of widget. Cannot be changed after creation.',
      options: {
        list: [
          { title: '📣  CTA Block', value: 'cta' },
          { title: '📦  Product Card', value: 'product-card' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),

    // ── CTA Block fields ─────────────────────────────────────────────────────
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      description: 'Main CTA heading shown to the reader.',
      hidden: ({ document }) => document?.widgetType !== 'cta',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (context.document?.widgetType === 'cta' && !value) return 'Headline is required for CTA blocks.'
          return true
        }),
    }),
    defineField({
      name: 'subtext',
      title: 'Subtext',
      type: 'text',
      rows: 2,
      description: 'Optional supporting sentence beneath the headline.',
      hidden: ({ document }) => document?.widgetType !== 'cta',
    }),
    defineField({
      name: 'buttonLabel',
      title: 'Button label',
      type: 'string',
      description: 'Text on the button. Keep under 30 characters.',
      hidden: ({ document }) => document?.widgetType !== 'cta',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (context.document?.widgetType === 'cta' && !value) return 'Button label is required for CTA blocks.'
          return true
        }).max(30),
    }),
    defineField({
      name: 'buttonUrl',
      title: 'Button URL',
      type: 'url',
      description: 'Destination URL. Use a full URL including https://, or a relative path like /quote.',
      hidden: ({ document }) => document?.widgetType !== 'cta',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (context.document?.widgetType === 'cta' && !value) return 'Button URL is required for CTA blocks.'
          return true
        }),
    }),
    defineField({
      name: 'variant',
      title: 'Button variant',
      type: 'string',
      description: 'Visual style of the button.',
      hidden: ({ document }) => document?.widgetType !== 'cta',
      options: {
        list: [
          { title: 'Primary (filled)', value: 'primary' },
          { title: 'Secondary (outlined)', value: 'secondary' },
        ],
        layout: 'radio',
      },
      initialValue: 'primary',
    }),

    // ── Product Card fields ──────────────────────────────────────────────────
    defineField({
      name: 'product',
      title: 'Product',
      type: 'reference',
      to: [{ type: 'product' }],
      description: 'The product to display as a card.',
      hidden: ({ document }) => document?.widgetType !== 'product-card',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (context.document?.widgetType === 'product-card' && !value)
            return 'A product reference is required for Product Card widgets.'
          return true
        }),
    }),
  ],

  preview: {
    select: {
      title: 'internalTitle',
      widgetType: 'widgetType',
      productTitle: 'product.title',
      headline: 'headline',
    },
    prepare({ title, widgetType, productTitle, headline }) {
      const typeLabel = widgetType === 'cta' ? '📣 CTA Block' : widgetType === 'product-card' ? '📦 Product Card' : '—'
      const detail = widgetType === 'cta' ? headline : productTitle
      return {
        title: title || 'Untitled widget',
        subtitle: detail ? `${typeLabel} — ${detail}` : typeLabel,
      }
    },
  },

  orderings: [
    {
      title: 'Type → Title',
      name: 'typeThenTitle',
      by: [
        { field: 'widgetType', direction: 'asc' },
        { field: 'internalTitle', direction: 'asc' },
      ],
    },
  ],
})
