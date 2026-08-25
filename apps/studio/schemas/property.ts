import { defineField, defineType } from 'sanity'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { uniqueSlugAcross } from '../lib/slug-rules'

export const property = defineType({
  name: 'property',
  title: 'Property',
  type: 'document',
  groups: [{ name: 'content', title: 'Content', default: true }],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description: 'The property an editor picks a value under — e.g. "Finish type", "Material", "GSM".',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle()),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      description:
        'URL-safe identifier from the title; used to scope which values a Customization Type may declare. Load-bearing — Studio picker filters resolve against it, so change it deliberately.',
      options: { source: 'title' },
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(['property'])),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      group: 'content',
      description: 'One sentence on what this property captures, for the content team.',
    }),
    defineField({
      name: 'cardinality',
      title: 'Values per document',
      type: 'string',
      group: 'content',
      description:
        'Does a document hold ONE value of this property, or MANY? Shape is one; Structural Features are many. Intrinsic to the property, so it is never restated per line or per type.',
      options: {
        layout: 'radio',
        list: [
          { title: 'One', value: 'one' },
          { title: 'Many', value: 'many' },
        ],
      },
      initialValue: 'one',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'content',
      description: 'Lower numbers sort first where properties are listed.',
      // Retiring (§4.3). Ordering moves to an ordered array on the listing/nav
      // singleton (PROD-2292); kept read-only until that array exists and the
      // values migrate, so no ordering data is lost in the interim.
      deprecated: {
        reason: 'Ordering moves to an ordered array on the listing/nav singleton (PROD-2292).',
      },
    }),
  ],
  preview: {
    select: { title: 'title', cardinality: 'cardinality' },
    prepare({ title, cardinality }) {
      return {
        title,
        subtitle: cardinality === 'many' ? 'Many values per document' : 'One value per document',
      }
    },
  },
  orderings: [
    { title: 'Title (A–Z)', name: 'titleAsc', by: [{ field: 'title', direction: 'asc' }] },
  ],
})
