import { defineField, defineType } from 'sanity'
import { BookIcon } from '@sanity/icons'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { seoFields, socialFields } from '../lib/seo-fields'
import { MEDIA_TAG } from '../lib/media-tags'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { featuredNotAlreadyDerived } from '../lib/concept-rules'
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
      validation: (Rule) =>
        Rule.max(4).warning(
          'More than four reads as a keyword list rather than a set of names. Keep the ones a ' +
            'customer would actually type; a term that only appears in trade documents belongs ' +
            'in the meta title instead.',
        ),
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

    // ── Categorization (ordered, curated "featured" references) ───────────────
    //
    // Renamed from `related*` in PROD-3218. "Related products" reads as a
    // statement of fact, and the field is an editorial pick of three to five —
    // which matters more now that a COMPLETE list arrives automatically beside it
    // from the documents naming this term. "Featured" says picked, not complete.
    //
    // The rename reached the field names, not just the labels: all three were
    // empty on all 9 terms and nothing outside this file read them. The
    // `relatedProducts` in the catalog queries is `product.relatedProducts`, a
    // different field that happens to share the old name — untouched.
    //
    // 🔴 All three gate on status, which nothing did before: an editor could put a
    // retired product in a curated list and nothing objected.
    //
    // ⚠️ The three gates are NOT the same string, and copying one to the others
    // breaks it. Keep aligned with `packages/sanity/src/queries/status-gates.ts`:
    //   packaging   LINE_STYLE_ACTIVE — unset reads as ACTIVE, and 13 production
    //               lines still carry no status. `status == "active"` hides them.
    //   solutions   SOLUTION_ACTIVE — no unset arm, deliberately: `status` replaced
    //               `hasPage`, which defaulted to false, so an un-migrated solution
    //               must read as having no page.
    //   expertise   matches `expertise.ts`, which gates on != discontinued rather
    //               than a whitelist, so a coming-soon stage stays featurable.
    defineField({
      name: 'featuredPackaging',
      title: 'Featured packaging',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'Three to five lines, styles or products that best show this term in use — pick, don\'t ' +
        'list. Packaging that names this term as its concept already appears automatically, so ' +
        'feature what adds to that.',
      of: [
        {
          type: 'reference',
          to: [{ type: 'productLine' }, { type: 'productStyle' }, { type: 'product' }],
          options: { filter: '(!defined(status) || status == "active")' },
        },
      ],
      validation: (Rule) => Rule.custom(featuredNotAlreadyDerived()).warning(),
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
    // Gained `solutionStyle` in PROD-3218. The packaging field reaches all three
    // levels of the product hierarchy while this one reached only the top of its
    // two, and a Solution Style has its own page — there was no reason an editor
    // could feature a Product Style but not a Solution Style.
    //
    // ⚠️ A Solution Style is a STORED FILTER: membership is computed and nothing
    // is ever tagged into one. Safe to reference, never to tag.
    defineField({
      name: 'featuredSolutions',
      title: 'Featured solutions',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'Three to five solutions or solution styles that best show this term in use — pick, ' +
        'don\'t list. A complete list is a catalogue, not an answer.',
      of: [
        {
          type: 'reference',
          to: [{ type: 'solution' }, { type: 'solutionStyle' }],
          options: { filter: 'status == "active"' },
        },
      ],
    }),
    defineField({
      name: 'featuredExpertise',
      title: 'Featured expertise',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'Three to five expertise stages that best show this term in use — pick, don\'t list. A ' +
        'complete list is a catalogue, not an answer.',
      of: [
        {
          type: 'reference',
          to: [{ type: 'expertiseStage' }],
          options: { filter: 'status != "discontinued"' },
        },
      ],
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
