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
      description: 'The /glossary/<slug> segment — flat, at root (not under the blog).',
      options: { source: 'term' },
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(['glossaryTerm'])),
    }),
    defineField({
      name: 'alsoKnownAs',
      title: 'Also known as',
      type: 'array',
      group: GROUPS.content,
      description:
        'Synonyms and abbreviations. People search "STE box" more than "straight tuck end", and site search needs them.',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'definition',
      title: 'Definition',
      type: 'array',
      group: GROUPS.content,
      description:
        'Two sentences, neutral. Links allowed (they point at depth); no other formatting. Depth lives on the guide / customization page, not here.',
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
    defineField({
      name: 'group',
      title: 'Group',
      type: 'string',
      group: GROUPS.content,
      description: 'Filters the glossary index.',
      options: {
        list: [
          { title: 'Materials', value: 'materials' },
          { title: 'Finishes', value: 'finishes' },
          { title: 'Structure', value: 'structure' },
          { title: 'Operations', value: 'operations' },
          { title: 'Standards', value: 'standards' },
        ],
      },
    }),
    defineField({
      name: 'visual',
      title: 'Visual',
      type: 'image',
      group: GROUPS.content,
      description: 'Optional — only where a term needs a drawing (a dieline, bleed, flute types).',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describes the image for screen readers and SEO.',
        }),
      ],
    }),

    // ── Categorization (ordered "related" references) ─────────────────────────
    defineField({
      name: 'relatedProducts',
      title: 'Related products',
      type: 'array',
      group: GROUPS.categorization,
      description: 'One field, all three levels — line, style or product.',
      of: [
        {
          type: 'reference',
          to: [{ type: 'productLine' }, { type: 'productStyle' }, { type: 'product' }],
        },
      ],
    }),
    defineField({
      name: 'relatedCustomizations',
      title: 'Related customizations',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Customization options or categories this term relates to.',
      of: [
        {
          type: 'reference',
          to: [{ type: 'customizationOption' }, { type: 'customizationCategory' }],
        },
      ],
    }),
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
      description: 'See-also — other glossary terms.',
      of: [{ type: 'reference', to: [{ type: 'glossaryTerm' }] }],
    }),

    ...seoFields({ group: GROUPS.seo, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.website }),
  ],
  preview: {
    select: { title: 'term', group: 'group', media: 'visual' },
    prepare({ title, group, media }) {
      return { title: title || 'Untitled term', subtitle: group, media }
    },
  },
})
