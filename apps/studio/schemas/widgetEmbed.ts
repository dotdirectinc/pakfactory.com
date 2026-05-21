import { defineField, defineType } from 'sanity'

/**
 * widgetEmbed — Portable Text block that references a saved contentWidget document.
 *
 * This is the "wrapper" object that lives inside a post's body array.
 * The actual content (CTA fields, product reference, etc.) lives in the
 * contentWidget document — edit it once and every post embedding it updates too.
 *
 * Usage in post body:
 *   of: [{ type: 'block' }, { type: 'bodyImage' }, { type: 'widgetEmbed' }]
 */
export const widgetEmbed = defineType({
  name: 'widgetEmbed',
  title: 'Widget',
  type: 'object',
  fields: [
    defineField({
      name: 'widget',
      title: 'Widget',
      type: 'reference',
      to: [{ type: 'contentWidget' }],
      description: "Pick a saved widget. Edit the widget document to update it everywhere it's used.",
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'widget.internalTitle',
      widgetType: 'widget.widgetType',
      headline: 'widget.headline',
      productTitle: 'widget.product.title',
    },
    prepare({ title, widgetType, headline, productTitle }) {
      const typeLabel =
        widgetType === 'cta'
          ? '📣 CTA Block'
          : widgetType === 'product-card'
            ? '📦 Product Card'
            : '🧩 Widget'
      const detail = widgetType === 'cta' ? headline : productTitle
      return {
        title: title || 'Untitled widget',
        subtitle: detail ? `${typeLabel} — ${detail}` : typeLabel,
      }
    },
  },
})
