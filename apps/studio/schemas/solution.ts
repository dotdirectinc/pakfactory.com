import { defineField, defineType } from 'sanity'
import { BulbOutlineIcon } from '@sanity/icons'
import { MEDIA_TAG, taggedImageField } from '../lib/media-tags'
import { seoFields, socialFields } from '../lib/seo-fields'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { pageSectionsField, SECTION_ALLOW } from './sections'
import { faqsField } from '../lib/faq-field'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { uniqueSlugAcross } from '../lib/slug-rules'

/**
 * Solution — one document type behind every "Solutions" page: industries,
 * channels, focus areas and use cases (Entities/Solution.md). Same template,
 * same fields; only the grouping label differs. Terms and pages are two lists —
 * a term exists so clients, case studies and products can be tagged; a page is
 * what a term has earned (`hasPage`, authored, never derived).
 *
 * Both renames from §4.3 are COMPLETE (2026-09-01, Eric's removal plan):
 *   internalTitle → title — `migrate:solution-titles` copied all 30 values and
 *     they match `title` exactly; the old field is unset and gone.
 *   relevantCapabilities → relevantCustomizations — the old field was empty on
 *     all 30 docs, so removal was deletion of nothing.
 *
 * `sections` (page-builder) is intentionally deferred until the shared section
 * inventory exists (PROD-2292) — same call as Bundle; no section types to allow
 * yet.
 */

const SOLUTION_TYPES = [
  { title: 'Industry', value: 'industry' },
  { title: 'Channel', value: 'channel' },
  { title: 'Focus', value: 'focus' },
  { title: 'Use case', value: 'use-case' },
] as const

const SOLUTION_TYPE_TITLES: Record<string, string> = Object.fromEntries(
  SOLUTION_TYPES.map(({ value, title }) => [value, title]),
)

export const solution = defineType({
  name: 'solution',
  title: 'Solution',
  type: 'document',
  icon: BulbOutlineIcon,
  groups: groupsFor(['content', 'categorization', 'sections', 'seo', 'social']),
  fields: [
    // ─── CONTENT ──────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description:
        'The canonical name — required and always presentable. Replaces the old Studio-only internalTitle.',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle('title')),
    }),
    defineField({
      name: 'displayTitle',
      title: 'Display title',
      type: 'string',
      group: GROUPS.content,
      description: 'Optional front-end override. Empty is the normal case.',
    }),
    defineField({
      name: 'solutionType',
      title: 'Solution type',
      type: 'string',
      group: GROUPS.content,
      description:
        'Which axis this solution sits on. Pick one only — a term on two axes appears twice in the nav and splits its own search authority. The axis is not part of the URL, so re-categorising never needs a redirect.',
      options: { list: [...SOLUTION_TYPES], layout: 'radio' },
      initialValue: 'industry',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      description: 'The /solutions/<slug> segment — flat, no axis in the path.',
      options: { source: 'title' },
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(['solution'])),
    }),
    defineField({
      name: 'hasPage',
      title: 'Has a landing page',
      type: 'boolean',
      group: GROUPS.content,
      description:
        'Does this term have a landing page? An editorial judgement — business focus, profitability, demand, search value. Authored, never derived. A term can exist for tagging without earning a page.',
      initialValue: false,
    }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      group: GROUPS.content,
      description: 'Page H1 — hero copy, the main heading visitors see (not a name; that is Title).',
    }),
    defineField({
      name: 'subheadline',
      title: 'Subheadline',
      type: 'text',
      rows: 2,
      group: GROUPS.content,
      description: 'Supporting line below the headline.',
    }),
    taggedImageField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      group: GROUPS.content,
      mediaTags: [MEDIA_TAG.solution],
      options: { hotspot: true },
      description: 'The solution page hero.',
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
      name: 'intro',
      title: 'Intro / problem framing',
      type: 'array',
      group: GROUPS.content,
      description: 'Short framing paragraph — the packaging problem this solution addresses.',
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

    // ─── CATEGORIZATION (references out + curated lists) ──────────────────────
    defineField({
      name: 'packagingFormats',
      title: 'Packaging formats',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'Curated featuring, not a fact — the product lines to highlight for this solution. The lines that genuinely serve it derive from the products tagged to it.',
      of: [{ type: 'reference', to: [{ type: 'productLine' }], options: { disableNew: true } }],
    }),
    defineField({
      name: 'relevantCustomizations',
      title: 'Relevant customizations',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Customization categories most relevant to this solution (e.g. Finishing, Printing).',
      of: [
        { type: 'reference', to: [{ type: 'customizationCategory' }], options: { disableNew: true } },
      ],
    }),
    defineField({
      name: 'relatedProducts',
      title: 'Related products',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Curated override — featured products for this page. Empty derives from tagged products.',
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
    }),
    defineField({
      name: 'relatedCaseStudies',
      title: 'Related case studies',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Curated override — empty falls back to the most recent 3.',
      of: [{ type: 'reference', to: [{ type: 'caseStudy' }] }],
      validation: (Rule) => Rule.max(6),
    }),
    defineField({
      name: 'relatedSolutions',
      title: 'Related solutions',
      type: 'array',
      group: GROUPS.categorization,
      description: 'See-also — sibling solutions (Coffee ↔ Tea, Retail ↔ Wholesale).',
      of: [{ type: 'reference', to: [{ type: 'solution' }] }],
    }),
    faqsField({ group: GROUPS.categorization, mode: 'reference', max: 6, min: 3 }),

    // ─── SEO ──────────────────────────────────────────────────────────────────
    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: GROUPS.seo,
      description: 'Defaults to Headline if left blank. Target 50–60 chars.',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 2,
      group: GROUPS.seo,
      description: 'Target 140–160 chars.',
      validation: (Rule) => Rule.max(160),
    }),
    pageSectionsField(SECTION_ALLOW.marketPage),
    ...seoFields({ group: GROUPS.seo, meta: false, indexDefault: true }),

    // ─── SOCIAL ───────────────────────────────────────────────────────────────
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.solution }),
  ],

  preview: {
    select: {
      title: 'title',
      solutionType: 'solutionType',
      hasPage: 'hasPage',
      media: 'heroImage',
    },
    prepare({ title, solutionType, hasPage, media }) {
      const axis = SOLUTION_TYPE_TITLES[solutionType] ?? 'No type set'
      return {
        title: title || 'Untitled solution',
        subtitle: [axis, hasPage ? 'Has page' : 'Term only'].join(' · '),
        media,
      }
    },
  },
})
