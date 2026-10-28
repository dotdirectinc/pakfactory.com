import { defineField, defineType } from 'sanity'
import { BookIcon } from '@sanity/icons'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { seoFields, socialFields } from '../lib/seo-fields'
import { MEDIA_TAG } from '../lib/media-tags'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { uniqueSlugAcross } from '../lib/slug-rules'

/**
 * Glossary Term — one term, one definition, one page (Entities/Glossary Term.md).
 * The glossary owns every definition on the site: everything else links to it or
 * pulls from it, and nothing redefines a term. `/glossary/<term>` at root, not
 * under the blog.
 *
 * ⚠️ The rule nothing enforces: a customization page must PULL this definition,
 * not write its own — the model's named weakest point. One `definition` field,
 * links allowed; plain text is derived for the tooltip / index row / structured
 * data, so nothing is stored twice.
 */
export const glossaryTerm = defineType({
  name: 'glossaryTerm',
  title: 'Glossary Term',
  type: 'document',
  icon: BookIcon,
  groups: groupsFor(['content', 'categorization', 'seo', 'social']),
  fields: [
    defineField({
      name: 'term',
      title: 'Term',
      type: 'string',
      group: GROUPS.content,
      description: 'As the industry says it — "Soft-Touch Lamination".',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle('term')),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      description: 'The /glossary/<slug> segment.',
      options: { source: 'term' },
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(['glossaryTerm'])),
    }),
    defineField({
      name: 'alsoKnownAs',
      title: 'Also known as',
      type: 'array',
      group: GROUPS.content,
      description:
        'Synonyms and abbreviations a reader would actually type. People search "STE box" more ' +
        'than "straight tuck end", and site search needs both. The concept\'s synonyms, not a ' +
        'variant\'s — those live on the Customization Option.',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'definition',
      title: 'Definition',
      type: 'array',
      group: GROUPS.content,
      description:
        'Two sentences. What the word means to anyone in the industry — true whether or not we ' +
        'offer it. This is the gloss shown on the glossary index and in tooltips, so it has to ' +
        'stand alone. Never write "we" here.',
      of: [
        {
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                    validation: (Rule) =>
                      Rule.uri({ allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel'] }),
                  },
                ],
              },
            ],
          },
        },
      ],
    }),
    /**
     * PROD-3206: was a hardcoded list of five values, set on 0 of 243 terms.
     * Now a reference, so the team can add and rename a section without a
     * deploy — see `glossaryGroup`. Nothing to migrate: the old field was
     * never filled.
     */
    defineField({
      name: 'group',
      title: 'Group',
      type: 'reference',
      to: [{ type: 'glossaryGroup' }],
      group: GROUPS.content,
      description:
        'Which section of the glossary index this term appears under. Pick an existing group; ' +
        'create a new one only when several terms would sit in it.',
    }),
    /**
     * PROD-3206. `definition` is the two-sentence gloss; this is the concept in
     * depth. Length follows fan-out rather than a word target: a term many
     * options point at is the shared parent and carries the explanation that
     * would otherwise be written once per option, while a term with one option
     * beneath it is a doorway and stays short.
     *
     * Replaces `visual`, which was deleted here — 0 of 243 used it, no query
     * read it, no component rendered it. In-page figures belong inline in the
     * flow, directly under the heading they illustrate, which `bodyImage` does
     * and a single top-of-page image never could.
     */
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: GROUPS.content,
      description:
        'The concept in depth: how it works, the trade-offs, where it is the wrong choice. ' +
        'Still vendor-neutral — it should read as true on a competitor\'s site. Do not list what ' +
        'we offer; that section is derived from the options that point here.',
      of: [{ type: 'block' }, { type: 'bodyImage' }],
    }),

    // ── Categorization (ordered "related" references) ─────────────────────────
    defineField({
      name: 'relatedProducts',
      title: 'Related products',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'Three to five products or lines that best show this term in use — pick, don\'t list. ' +
        'Hundreds of products share a material, so a complete list is a catalogue, not an answer.',
      of: [
        {
          type: 'reference',
          to: [{ type: 'productLine' }, { type: 'productStyle' }, { type: 'product' }],
        },
      ],
    }),
    /**
     * `relatedCustomizations` was deleted here (PROD-3206). It put a second
     * block of customization cards on a page that already derives one from
     * `customizationOption.glossaryTerm`, and the difference between "is an
     * instance of this" and "is worth comparing to this" is not a distinction
     * a content team should have to hold while working. 0 of 243 filled, no
     * query read it. The see-also moves up a level to `relatedTerms` — a
     * concept page links to concepts. If the thing you want to link to has no
     * term, author the term; do not re-add this field.
     */
    defineField({
      name: 'relatedSolutions',
      title: 'Related solutions',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Solutions this term relates to.',
      of: [{ type: 'reference', to: [{ type: 'solution' }] }],
    }),
    defineField({
      name: 'relatedExpertise',
      title: 'Related expertise',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Expertise stages this term relates to.',
      of: [{ type: 'reference', to: [{ type: 'expertiseStage' }] }],
    }),
    defineField({
      name: 'relatedTerms',
      title: 'Related terms',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'Terms a reader of this one would want next — Bleed and Trim, Flute and Liner. Tag from ' +
        'either side; both pages show the pair. For genuine neighbours, not everything in the ' +
        'same group.',
      of: [{ type: 'reference', to: [{ type: 'glossaryTerm' }] }],
    }),

    ...seoFields({ group: GROUPS.seo, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.website }),
  ],
  preview: {
    select: { title: 'term', group: 'group.title' },
    prepare({ title, group }) {
      return { title: title || 'Untitled term', subtitle: group }
    },
  },
})
