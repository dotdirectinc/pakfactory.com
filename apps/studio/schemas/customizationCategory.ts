import { defineField, defineType } from 'sanity'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { entityFields } from '../lib/entity-id-field'
import { ON_OFF_STATUS_LIST } from '../lib/catalog-status'
import { restrictingChildrenWarning } from '../lib/status-cascade-warning'
import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list'

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
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'content',
      description:
        'Is this category offered? Not active removes it from the customization library ' +
        'filters and takes its Types and their Options with it. Use it instead of deleting ' +
        'the document, so the references that name them keep resolving.',
      options: { list: ON_OFF_STATUS_LIST, layout: 'radio' },
      // Starts ON, unlike Solution: a category is pure structure with no page to earn,
      // and an empty one renders no filter anyway. There is no Coming soon or
      // Discontinued — a category is offered, or it is internal (PROD-2733's argument,
      // applied one level up).
      initialValue: 'active',
      // Before PROD-2845 this type had NO off switch at all. Deleting was the only way
      // to remove one, and strong references from the options beneath refuse that.
      validation: (Rule) =>
        Rule.custom(
          restrictingChildrenWarning({
            query: `*[
              _type == "customizationType" &&
              category._ref == $id &&
              (!defined(status) || status == "active")
            ]{ title }`,
            describe: (names) =>
              `This also removes every Type beneath it, including ${names}, and their options ` +
              `from the configurator.`,
          }),
        ).warning(),
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
    // restores nothing that was removed here.
    //
    // Category position is answered again by `orderRank` at the bottom of this
    // file (PROD-2749), set by dragging the Categories list rather than by an
    // integer nobody maintained. ⚠️ The FRONT END still runs its own hard-coded
    // list (`apps/www/src/lib/catalog/customization-category-order.ts`) and is
    // not wired to `orderRank` yet — and that list opens with `dimensions`,
    // which is not a Category at all but the builder's own first step, so it
    // cannot simply be swapped for a query.
    defineField({
      name: 'typeOrder',
      title: 'Customization type order',
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
    // ─── STUDIO LIST ORDER ────────────────────────────────────────────────────
    /**
     * Drag-to-order position for the Categories list (PROD-2749).
     *
     * Restores the intent of the `order` field removed on 2026-09-11 — see the
     * comment above — without the integer. Written by
     * `@sanity/orderable-document-list` when an editor drags a row; `hidden` and
     * `readOnly` come from the plugin, so the drag handle is the only way to set it.
     *
     * 🔴 It is a LEXORANK STRING, not a position number. `order(orderRank asc)`
     * sorts it correctly; nothing can read it as "third".
     *
     * ⚠️ Studio only for now. The front end still runs its own hard-coded order.
     */
    orderRankField({ type: 'customizationCategory' }),
  ],
  // Title is restated deliberately: declaring `orderings` REPLACES the sort Sanity
  // generates rather than adding to it, which shipped wrong on productLine
  // (PROD-2744) and had to be fixed in PROD-2745.
  orderings: [
    orderRankOrdering,
    { title: 'Title', name: 'title', by: [{ field: 'title', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title', subtitle: 'slug.current' },
  },
})
