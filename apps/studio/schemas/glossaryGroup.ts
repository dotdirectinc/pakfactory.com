import { defineField, defineType } from 'sanity'
import { TagIcon } from '@sanity/icons'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'

/**
 * Glossary Group — the sections the glossary index is split into (PROD-3206).
 *
 * This was a hardcoded five-value list on `glossaryTerm.group` (materials,
 * finishes, structure, operations, standards) that nothing ever used — set on
 * 0 of 243 terms. The content team then proposed twelve different values, which
 * is the argument for a document type rather than an enum: the list changed
 * once before anyone filled it, and a list in the schema means a deploy every
 * time it changes again. Category → Type → Option is a document taxonomy for
 * the same reason.
 *
 * Not free-text tags. Typed strings would give us "Finishes", "finishes" and
 * "Finishing" as three groups and split the index silently, which is what
 * `uniqueTaxonomyTitle` exists to prevent (Conventions §4.2).
 *
 * No `order` field. Section order on the glossary index is a drag-to-reorder
 * array on the listing page, which doubles as the gate for which groups render
 * at all — D9. Half the twelve have no terms in them at launch, and an empty
 * group is not a section.
 */
export const glossaryGroup = defineType({
  name: 'glossaryGroup',
  title: 'Glossary Group',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Name',
      type: 'string',
      description:
        'A section of the glossary index — "Materials", "Printing & Color". Add one only when ' +
        'several terms would sit in it; a group holding one term is not a section.',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle('title')),
    }),
  ],
  preview: {
    select: { title: 'title' },
  },
})
