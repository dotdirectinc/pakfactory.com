import { defineField, defineType } from 'sanity'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { uniqueSlugAcross } from '../lib/slug-rules'

export const property = defineType({
  name: 'property',
  title: 'Property',
  type: 'document',
  groups: [{ name: 'content', title: 'Content' }],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description:
        'The property an editor picks a value under (e.g. "Finish Type", "Thickness").',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle()),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      description:
        'URL-safe identifier, generated from the title. Unique across properties. Nothing links to it, so ' +
        'changing it is safe.',
      options: { source: 'title' },
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(['property'])),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      group: 'content',
      description: 'One sentence on what this property captures.',
    }),
    // Renamed from `cardinality` on 2026-09-14 (PROD-2482). Two fields shared that
    // name — this one and `customizationType.cardinality` — and D45 accepted the
    // collision on condition everyone said "the Type's cardinality" out loud, in
    // perpetuity. Renaming both retires that tax instead of paying it forever.
    //
    // A STRAIGHT RENAME, not a deprecation: `cardinality` was required but unset on
    // all 9 Properties (drafts included), so there is no value to migrate and
    // Conventions §4.3's "never remove a populated field" does not apply. Verified
    // against production before the rename, not assumed from the schema.
    //
    // `valuesPerItem` over `valuesPerDocument`, the name it carried in the Studio
    // label: "document" is CMS jargon that dodges the actual question — values per
    // WHAT? Both `customizationOption` and `product` declare a `properties` field,
    // so the holder cannot be named concretely; "item" is the plain word that
    // covers both. The "per" is the load-bearing part: it stops the field being
    // misread as "how many values are in this property's list" (Sustainability has
    // 5) when it means "how many can one thing carry at once" (SBS carries 3).
    defineField({
      name: 'valuesPerItem',
      title: 'How many values can one option or product have?',
      type: 'string',
      group: 'content',
      description:
        
          'Can one option or product carry several values of this property at once, or exactly ' +
          'one? E.g. Color is One — a board is white, not white and brown. Sustainability is ' +
          'Many — a board can be recyclable and FSC certified. Intrinsic to the property, so it ' +
          'is never restated per line or per type.',
      options: {
        layout: 'radio',
        list: [
          { title: 'One — exactly one value per option or product', value: 'one' },
          { title: 'Many — several values at once', value: 'many' },
        ],
      },
      // Defaults to `one` because it FAILS LOUD, not because it is the common case —
      // the live data splits roughly evenly. Once the values are enforced, a wrong
      // `one` blocks a legitimate second value and the editor complains; a wrong
      // `many` lets a second Colour onto a board silently. Same reasoning as the
      // `configurable` default on customizationOption.
      //
      // ⚠️ `initialValue` never runs for API writes, so this does not backfill the
      // 9 existing documents. They are unset and need authoring.
      initialValue: 'one',
      validation: (Rule) => Rule.required(),
    }),
    // `order` was REMOVED here on 2026-09-01. Its successor is real and already
    // deployed: `listingPage.filters` is an ordered array of Property references, one
    // per listing page, whose own description says an empty array falls back to every
    // property in use, alphabetically. So the fallback is defined behaviour, not a
    // break. What is missing is the listing-page DOCUMENTS — 1 of 19 exists today
    // (`caseStudiesPage`) — so the 9 values are recorded in ADR-017 for whoever
    // populates `catalogPage.filters` and the rest.
  ],
  preview: {
    select: { title: 'title', valuesPerItem: 'valuesPerItem' },
    prepare({ title, valuesPerItem }) {
      return {
        title,
        subtitle:
          valuesPerItem === 'many'
            ? 'Many values per option or product'
            : 'One value per option or product',
      }
    },
  },
  orderings: [
    { title: 'Title (A–Z)', name: 'titleAsc', by: [{ field: 'title', direction: 'asc' }] },
  ],
})
