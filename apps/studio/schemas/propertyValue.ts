import { defineField, defineType } from 'sanity'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { uniqueSlugAcross } from '../lib/slug-rules'

export const propertyValue = defineType({
  name: 'propertyValue',
  title: 'Property Value',
  type: 'document',
  // §2.4: Property Value is a Content-only type — its single parent reference
  // stays with the content rather than earning a Categorization tab.
  groups: [{ name: 'content', title: 'Content', default: true }],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description: 'The value an editor picks — e.g. "Matte", "300 GSM", "Kraft".',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle()),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      description:
        'URL-safe identifier, generated from the title. A stable key — rename the title freely, but change the slug deliberately (a slug in a URL needs a redirect).',
      options: { source: 'title' },
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(['propertyValue'])),
    }),
    defineField({
      name: 'property',
      title: 'Property',
      type: 'reference',
      group: 'content',
      description: 'The Property this is a value of (its parent) — required.',
      to: [{ type: 'property' }],
      // §4.2 governance: pick an existing Property, never mint one inline from
      // this picker — that is how a taxonomy drifts into two spellings.
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      group: 'content',
      description: 'One sentence on what this value means, for the content team.',
    }),
    defineField({
      name: 'value',
      title: 'Value / label',
      type: 'string',
      group: 'content',
      description: 'Optional machine-readable value (e.g. hex code for colours).',
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'content',
      description: 'Lower numbers sort first within the parent property.',
      // Retiring (§4.3), same as on Property: ordering moves to an ordered array
      // on the listing/nav singleton (PROD-2292). Kept read-only until then.
      deprecated: {
        reason: 'Ordering moves to an ordered array on the listing/nav singleton (PROD-2292).',
      },
    }),
  ],
  preview: {
    select: { title: 'title', group: 'property.title' },
    prepare({ title, group }) {
      return { title, subtitle: group }
    },
  },
  orderings: [
    {
      title: 'Property → title',
      name: 'groupTitle',
      by: [
        { field: 'property.title', direction: 'asc' },
        { field: 'title', direction: 'asc' },
      ],
    },
  ],
})
