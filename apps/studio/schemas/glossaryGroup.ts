import { defineField, defineType } from 'sanity'
import { TagIcon } from '@sanity/icons'
import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list'
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
 * Order is `orderRank`, set by dragging the Glossary Groups list (PROD-3285).
 * D77: ordering lives on the parent when membership is derived, and on the
 * document itself when there is no parent. A group has no parent — terms point
 * at groups, groups point at nothing — so it ranks itself, like Product Line,
 * Solution and Customization Category. This replaces an earlier plan for a
 * drag array on a `/glossary` page document (D9): that document does not exist,
 * and an array would leave a new group unordered until someone listed it.
 *
 * Order never decides visibility. The index shows a group when it holds a term
 * (D86); half the twelve hold none today, and an empty group is not a section.
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
    /**
     * Drag-to-order position for the Glossary Groups list (PROD-3285). Written by
     * `@sanity/orderable-document-list` when an editor drags a row; `hidden` and
     * `readOnly` come from the plugin, so the drag handle is the only way to set it.
     *
     * 🔴 It is a LEXORANK STRING, not a position number. `order(orderRank asc)`
     * sorts it correctly; nothing can read it as "third".
     *
     * ⚠️ Nothing reads it yet — the /glossary index is PROD-2965. That page's
     * By topic view sorts with it.
     */
    orderRankField({ type: 'glossaryGroup' }),
  ],
  // Title is restated deliberately: declaring `orderings` REPLACES the sort Sanity
  // generates rather than adding to it, which shipped wrong on productLine
  // (PROD-2744) and had to be fixed in PROD-2745.
  orderings: [
    orderRankOrdering,
    { title: 'Title', name: 'title', by: [{ field: 'title', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title' },
  },
})
