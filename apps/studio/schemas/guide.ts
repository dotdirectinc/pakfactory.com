import { defineField, defineType } from 'sanity'
import { DocumentTextIcon } from '@sanity/icons'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { seoFields, socialFields } from '../lib/seo-fields'
import { faqsField } from '../lib/faq-field'
import { MEDIA_TAG } from '../lib/media-tags'
import { uniqueSlugAcross } from '../lib/slug-rules'
import { inlineBlocks } from './inline'

/**
 * Guide — the standing answer to a subject a buyer needs to understand before
 * they can order; maintained, not superseded (Entities/Guide.md). The evergreen
 * half of the editorial model, opposite Post. Organised only by what it's about
 * (`relatedTo`) — no taxonomy of its own — so a guide about rigid boxes surfaces
 * on the rigid-boxes line page without anyone curating it there.
 *
 * 🔴 Nobody searches for the word "guide" — name the task, not the format
 * ("How to Design Packaging", not "Packaging Guide"). The /resources/guides/
 * segment is navigational, not a ranking target.
 */
export const guide = defineType({
  name: 'guide',
  title: 'Guide',
  type: 'document',
  icon: DocumentTextIcon,
  groups: groupsFor(['content', 'categorization', 'schemaAi', 'seo', 'social']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description:
        'The H1. Name the task, not the format — "How to Design Packaging", never "Packaging Guide" (nobody searches the word "guide").',
      validation: (Rule) => Rule.required(),
    }),
    // No separate H1 field: a guide's Title *is* its heading, as the field
    // above says. The empty `displayTitle` that used to sit here was removed
    // with the rest of them — a second place to write the same sentence.
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      description: 'The /resources/guides/<slug> segment.',
      options: { source: 'title' },
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(['guide'])),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 2,
      group: GROUPS.content,
      description: '1–2 sentences — the listing card and the meta-description fallback.',
    }),
    defineField({
      name: 'mainImage',
      title: 'Main image',
      type: 'image',
      group: GROUPS.content,
      description: 'Hero image for the guide and its listing card.',
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
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: GROUPS.content,
      description: 'The guide itself. Same editing tools as a blog post.',
      of: [
        { type: 'block' },
        { type: 'bodyImage' },
        ...inlineBlocks.map((block) => ({ type: block.name })),
        { type: 'widgetEmbed' },
      ],
    }),

    // ── Categorization ────────────────────────────────────────────────────────
    defineField({
      name: 'relatedTo',
      title: 'Related to',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'What the guide is about. Product and solution pages use this to surface it, and the ' +
        'listing filters come from the values in use.',
      of: [
        {
          type: 'reference',
          to: [
            { type: 'productLine' },
            { type: 'productStyle' },
            { type: 'solution' },
            { type: 'expertiseStage' },
            { type: 'customizationType' },
          ],
        },
      ],
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      group: GROUPS.categorization,
      description: 'Optional byline. A named author is an E-E-A-T signal on educational content.',
      to: [{ type: 'author' }],
    }),
    faqsField({ group: GROUPS.categorization, mode: 'mixed' }),
    defineField({
      name: 'relatedGuides',
      title: 'Related guides',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Optional, three to five. Empty uses guides with the same "Related to" values.',
      of: [{ type: 'reference', to: [{ type: 'guide' }] }],
      validation: (Rule) => Rule.max(5).unique(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: GROUPS.categorization,
      description: 'Editorial state — Draft, Published or Archived.',
      options: {
        layout: 'radio',
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Published', value: 'published' },
          { title: 'Archived', value: 'archived' },
        ],
      },
      initialValue: 'draft',
      validation: (Rule) => Rule.required(),
    }),

    // ── Schema & AI ───────────────────────────────────────────────────────────
    defineField({
      name: 'tldr',
      title: 'TL;DR',
      type: 'array',
      group: GROUPS.schemaAi,
      description:
        'Answer-first summary shown at the top of the guide. Two or three sentences that stand ' +
        'on their own.',
      of: [{ type: 'block' }],
      validation: (Rule) => Rule.required(),
    }),

    ...seoFields({ group: GROUPS.seo, canonical: true, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.website }),
  ],
  preview: {
    select: { title: 'title', status: 'status', media: 'mainImage' },
    prepare({ title, status, media }) {
      return {
        title: title || 'Untitled guide',
        subtitle: status ? status[0].toUpperCase() + status.slice(1) : '',
        media,
      }
    },
  },
})
