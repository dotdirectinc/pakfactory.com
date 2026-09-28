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
    // `valuesPerItem` was REMOVED here on 2026-09-23 (PROD-2585). It was renamed
    // from `cardinality` nine days earlier (PROD-2482) and enforced four days after
    // that (PROD-2542), so this is not a stale field being tidied — it is one nobody
    // had asked what consumes.
    //
    // The answer was nothing. Two Studio validation rules read it and a list
    // subtitle displayed it. No query in `apps/www` or `apps/blog` touches
    // `property`, `propertyValue` or an option's `properties` at all, because the
    // configurator that would consume them is not built. Production held 9
    // Properties with the field unset on every one, so the rule it powered had
    // never fired.
    //
    // What is lost is the only way to record that Color holds one value while
    // Sustainability holds several. The one consumer that would have justified
    // keeping it is faceted filtering — single-select Color beside multi-select
    // Sustainability — which is not on the roadmap. If it arrives, add the field
    // back then, when its shape can be decided against a real requirement.
    //
    // Conventions §4.3's "never remove a populated field" does not apply: 0 of 9 in
    // production. The 10 of 12 set in `development` are cleared by the migration
    // registered for this ticket.
    // `order` was REMOVED here on 2026-09-01. Its successor is real and already
    // deployed: `listingPage.filters` is an ordered array of Property references, one
    // per listing page, whose own description says an empty array falls back to every
    // property in use, alphabetically. So the fallback is defined behaviour, not a
    // break. What is missing is the listing-page DOCUMENTS — 1 of 19 exists today
    // (`caseStudiesPage`) — so the 9 values are recorded in ADR-017 for whoever
    // populates `catalogPage.filters` and the rest.
  ],
  preview: {
    select: { title: 'title' },
  },
  orderings: [
    { title: 'Title (A–Z)', name: 'titleAsc', by: [{ field: 'title', direction: 'asc' }] },
  ],
})
