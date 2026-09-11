import { defineField, defineType } from 'sanity'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'

export const customizationCategory = defineType({
  name: 'customizationCategory',
  title: 'Customization Category',
  type: 'document',
  groups: [{ name: 'content', title: 'Content', default: true }],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description: 'The customization category name — the top grouping in the sidebar (e.g. "Print", "Finish").',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle()),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      description: 'URL-safe identifier, generated from the title.',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'One sentence on what this category groups, for the content team.',
    }),
    // `order` was REMOVED here on 2026-09-11, completing the sweep that took the
    // other five on 2026-09-01 (ADR-017). It was left behind then only because
    // Eric's removal plan never listed it, not because it was blocked: nothing
    // read it — no GROQ query in `packages/sanity`, `apps/www` or `apps/blog`, no
    // desk pane sorted by it, and the registry exporter's `order` comes from
    // Postgres `sort_order`. Its only consumers were this file's own `orderings`
    // block and the preview subtitle, both of which go with it.
    //
    // The visible consequence, stated so nobody reports it as a regression: the
    // Categories list now sorts alphabetically, so *Additional Customization*
    // heads the list instead of *Materials*. The four values are recorded in
    // ADR-017 before deletion.
  ],
  preview: {
    select: { title: 'title', subtitle: 'slug.current' },
  },
})
