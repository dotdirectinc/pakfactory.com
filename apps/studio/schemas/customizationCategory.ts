import { defineField, defineType } from 'sanity'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { entityFields } from '../lib/entity-id-field'

export const customizationCategory = defineType({
  name: 'customizationCategory',
  title: 'Customization Category',
  type: 'document',
  groups: [{ name: 'content', title: 'Content' }],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description: 'The customization category name.',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle()),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      description: 'URL-safe identifier, generated from the title. Nothing links to it, so changing it is safe.',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'One sentence on what this category groups.',
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
    //
    // ⚠️ `order` was this category's OWN position among the four. `typeOrder`
    // below is a different question — the order of the TYPES inside it — and
    // restores nothing that was removed here. Category position is still
    // unsolved, and is currently hard-coded in the front end
    // (`apps/www/src/lib/catalog/customization-category-order.ts`).
    defineField({
      name: 'typeOrder',
      title: 'Type order',
      type: 'array',
      group: 'content',
      description:
        'Drag to set the order types appear in within this category. Listing a few is fine — ' +
        'anything not listed follows alphabetically. Never a gate: every type still appears.',
      of: [
        {
          type: 'reference',
          // 🔴 WEAK ON PURPOSE — see the twin on `productLine.styleOrder`.
          //
          // A strong reference held purely for presentation makes every listed
          // document undeletable, with nothing in the Studio connecting the two.
          // That is what removed `productLine.styles` (PROD-2509). Weak lets the
          // delete succeed and leaves a dangling entry, which the ordering helper
          // drops before it reaches a consumer. Do not "tidy" this to a strong one.
          weak: true,
          to: [{ type: 'customizationType' }],
          options: {
            disableNew: true,
            // Scoped to this category, and excluding types already listed. The
            // second half is not cosmetic: without it the picker keeps offering
            // what you just added, and the duplicate only announces itself as a
            // validation error that blocks publish — found in PROD-2739 review.
            filter: ({
              document,
            }: {
              document: { _id: string; typeOrder?: { _ref?: string }[] }
            }) => {
              const chosen = (document.typeOrder ?? [])
                .map((item) => item?._ref)
                .filter((ref): ref is string => typeof ref === 'string')
              return {
                filter: 'category._ref == $category && !(_id in $chosen)',
                params: { category: document._id.replace(/^drafts\./, ''), chosen },
              }
            },
          },
        },
      ],
      validation: (Rule) => Rule.unique(),
    }),
    ...entityFields({ prefix: 'cat', codeKinds: ['CAT'], group: 'content' }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'slug.current' },
  },
})
