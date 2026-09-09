import { defineField, defineType } from 'sanity'
import { StarIcon } from '@sanity/icons'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { pageSectionsField, SECTION_ALLOW } from './sections'
import { seoFields, socialFields } from '../lib/seo-fields'
import { MEDIA_TAG } from '../lib/media-tags'
import { faqsField } from '../lib/faq-field'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { uniqueSlugAcross } from '../lib/slug-rules'

/**
 * Expertise Stage — one of the six stages of PakFactory's service model
 * (Entities/Expertise Stage.md). Now a page at /expertise/<slug>, not just a tag
 * on case studies, with an Expertise landing page above and service pages beneath.
 *
 * 🔴 The display sequence is Eric's end-to-end order (Design → Prototyping →
 * Managed Manufacturing → Strategy → Logistics → Fulfillment) and it lives on the
 * Expertise landing page as an ordered array (PROD-2292), NOT here. The deployed
 * `order` field carries a DIFFERENT, wrong sequence — it is deprecated, never
 * migrated. Do not copy its numbers into the landing-page array.
 */
export const expertiseStage = defineType({
  name: 'expertiseStage',
  title: 'Expertise Stage',
  type: 'document',
  icon: StarIcon,
  groups: groupsFor(['content', 'categorization', 'sections', 'seo', 'social']),
  fields: [
    // ─── CONTENT ──────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'Canonical name — e.g. "Packaging Design".',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle('title')),
    }),
    defineField({
      name: 'displayTitle',
      title: 'Display title',
      type: 'string',
      group: GROUPS.content,
      description: 'Optional front-end override.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      description: 'The /expertise/<slug> segment. All six already match — nothing to rename or redirect.',
      options: { source: 'title' },
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(['expertiseStage'])),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      group: GROUPS.content,
      description: 'The one-line positioning above the page title.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      group: GROUPS.content,
      description:
        'Short card summary — for the landing page and anywhere a stage is listed. (Currently empty on all six; this is the field to fill.)',
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'array',
      group: GROUPS.content,
      description: 'The page opener.',
      of: [
        {
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
            ],
          },
        },
      ],
    }),
    defineField({
      name: 'diagram',
      title: 'Diagram',
      type: 'image',
      group: GROUPS.content,
      description: 'Optional supporting visual for the stage page.',
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
      name: 'status',
      title: 'Status',
      type: 'string',
      group: GROUPS.content,
      description: 'All six stages are active. Packaging Fulfillment is active, not future — 0 case studies is a content gap, not a retired service.',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Future', value: 'future' },
          { title: 'Deprecated', value: 'deprecated' },
        ],
        layout: 'radio',
      },
      initialValue: 'active',
    }),
    // `order` was REMOVED here on 2026-09-01. Nothing read it: the one query that did
    // (`CASE_STUDY_FILTER_OPTIONS_QUERY`, `order(order asc)`) is repointed to `title`
    // and was never executed anyway. The stored numbers were the OLD, WRONG sequence —
    // Strategy first — so removing them loses nothing that should be kept. Eric's real
    // end-to-end order is in this file's header and belongs on the Expertise landing
    // page (`expertisePage.featured`, a listingPage — the type is deployed, the
    // document is not yet created). The 6 old values are recorded in ADR-017.

    // ─── CATEGORIZATION ───────────────────────────────────────────────────────
    defineField({
      name: 'services',
      title: 'Services',
      type: 'array',
      group: GROUPS.categorization,
      description: 'The named services inside this stage, in display order. Count varies and is not fixed.',
      of: [{ type: 'reference', to: [{ type: 'expertiseService' }] }],
    }),
    defineField({
      name: 'featuredStudies',
      title: 'Featured case studies',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Curated override — empty derives from the case studies tagging this stage.',
      of: [{ type: 'reference', to: [{ type: 'caseStudy' }] }],
    }),
    faqsField({ group: GROUPS.categorization, mode: 'reference', max: 6, min: 3 }),

    // ─── SEO / SOCIAL ─────────────────────────────────────────────────────────
    pageSectionsField(SECTION_ALLOW.marketPage),
    ...seoFields({ group: GROUPS.seo, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.website }),
  ],
  orderings: [
    { title: 'Title (A–Z)', name: 'titleAsc', by: [{ field: 'title', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title', status: 'status', media: 'diagram' },
    prepare({ title, status, media }) {
      return {
        title: title ?? 'Untitled stage',
        subtitle: status ? status[0].toUpperCase() + status.slice(1) : '',
        media,
      }
    },
  },
})
