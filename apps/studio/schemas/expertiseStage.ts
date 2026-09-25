import { defineField, defineType } from 'sanity'
import { StarIcon } from '@sanity/icons'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { seoFields, socialFields } from '../lib/seo-fields'
import { MEDIA_TAG } from '../lib/media-tags'
import { faqsField } from '../lib/faq-field'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { uniqueSlugAcross } from '../lib/slug-rules'

/**
 * Expertise Stage — one of the six stages of PakFactory's service model
 * (Entities/Expertise Stage.md). Now a page at /expertise/<slug>, not just a tag
 * on case studies, with an Expertise landing page above and service pages beneath.
 * The stage owns hero, SEO and the lists sections inherit (services, FAQs, case
 * studies); the page body is the Expertise Stage Page selected in `template`.
 *
 * 🔴 The display sequence is Eric's end-to-end order (Design → Prototyping →
 * Managed Manufacturing → Strategy → Logistics → Fulfillment) and it lives on the
 * Expertise landing page as an ordered array (PROD-2292), NOT here. A deployed
 * `order` field once carried a DIFFERENT, wrong sequence; it was removed from
 * the schema and swept from the data, and its numbers were never migrated
 * anywhere. Do not reintroduce them into the landing-page array from an old
 * export.
 */
export const expertiseStage = defineType({
  name: 'expertiseStage',
  title: 'Expertise Stage',
  type: 'document',
  icon: StarIcon,
  groups: groupsFor(['content', 'categorization', 'template', 'seo', 'social']),
  fields: [
    // ─── CONTENT ──────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'The canonical name (e.g. "Packaging Design"). Must be unique across stages.',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle('title')),
    }),
    // Title / H1, the same convention as Line / Style / Solution / Product. No
    // Short name here — the stage names are already short enough for a card.
    defineField({
      name: 'h1',
      title: 'H1',
      type: 'string',
      group: GROUPS.content,
      description: 'The heading on this page. Leave empty to use the Title.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      description: 'The /expertise/<slug> segment. Must be unique across stages.',
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
        'Short card summary — for the landing page and anywhere a stage is listed.',
    }),
    defineField({
      name: 'heroCtaLabel',
      title: 'Hero button label',
      type: 'string',
      group: GROUPS.content,
      description:
        'The primary button in the hero, e.g. "Book a strategy consultation". It opens the quote request. Leave empty for "Get a quote".',
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'array',
      group: GROUPS.content,
      description: 'The opening copy on the stage page.',
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
      description: 'Lifecycle — Active, Coming soon or Discontinued.',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Coming soon', value: 'coming-soon' },
          { title: 'Discontinued', value: 'discontinued' },
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
      description: 'The named services inside this stage, in display order.',
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

    // ─── TEMPLATE ─────────────────────────────────────────────────────────────
    // The page body lives on an Expertise Stage Page template (Main Website →
    // Expertise Pages → Expertise Stage Pages), not on the stage (PROD-2577 follow-up). Lists the
    // template leaves empty fill from this stage (ADR-020 §8).
    defineField({
      name: 'template',
      title: 'Template',
      type: 'reference',
      group: GROUPS.template,
      to: [{ type: 'expertiseStagePage' }],
      options: { disableNew: true },
      description:
        'The page body — sections, headings and band content. Edit it on the template ' +
        '(Main Website → Expertise Pages → Expertise Stage Pages), not here. Empty lists on the template ' +
        '(Services, FAQs, case studies, stages) fill from this stage.',
      validation: (Rule) =>
        Rule.custom((value, ctx) => {
          const status = (ctx.document as { status?: string } | undefined)?.status
          if (status !== 'active' || value) return true
          return 'Active stages need a template — without one the page shows the hero only.'
        }).warning(),
    }),

    // ─── SEO / SOCIAL ─────────────────────────────────────────────────────────
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
