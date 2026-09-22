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
 *     all 30 docs, so removal was deletion of nothing. The successor is itself
 *     gone as of PROD-2519 below; the rename is kept on the record because
 *     renaming first and removing second is the order that stays legible.
 *
 * `sections` is wired to SECTION_ALLOW.marketPage. (This block used to say the
 * field was deferred "until the shared section inventory exists" — it exists,
 * and 19 section types are live on this type in the deployed schema.)
 *
 * PROD-2519 (2026-09-15) — four curated catalogue fields removed and one
 * renamed, all empty on every document in both datasets, so §4.3 had nothing to
 * protect and there was no migration:
 *   heroImage → featuredImage — a field is named for its role, never its render
 *     slot (D33), and it is now the same name on Line, Style and Product.
 *   packagingFormats · relevantCustomizations · relatedProducts ·
 *     relatedSolutions — removed.
 *
 * 🔴 Two of those promised a fallback that could not run. Their descriptions
 * said the real lines and products "derive from the products tagged to it", but
 * `product.solutions` is populated on the 58 inspiration presets and 0 of the
 * 252 standard products — nothing else references Solution at all. So the
 * derivation would have seen a fifth of the catalogue. They were removed knowing
 * that. Pointing a Solution at its products is solutionStyle's job (PROD-2520);
 * tagging standard products to solutions is the open prerequisite for showing
 * them at all.
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
        'The canonical name (e.g. "Coffee"). Must be unique across solutions.',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle('title')),
    }),
    // One naming convention across Line / Style / Solution / Product: Title is
    // the canonical name, H1 is the page heading, Short name is the card and nav
    // label. Both overrides fall back to Title when empty, so an editor who
    // leaves them alone gets the right string everywhere.
    defineField({
      name: 'h1',
      title: 'H1',
      type: 'string',
      group: GROUPS.content,
      description: 'The heading on this page. Leave empty to use the Title.',
    }),
    defineField({
      name: 'shortName',
      title: 'Short name',
      type: 'string',
      group: GROUPS.content,
      description:
        'A shorter label for cards, listings and nav. Leave empty to use the Title.',
    }),
    defineField({
      name: 'solutionType',
      title: 'Solution type',
      type: 'string',
      group: GROUPS.content,
      description:
        'Which kind of solution this is. Pick one only — a term on two kinds appears twice in the nav and competes with itself in search. Not part of the URL, so re-categorising never needs a redirect.',
      options: { list: [...SOLUTION_TYPES], layout: 'radio' },
      initialValue: 'industry',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      description: 'The /solutions/<slug> segment — flat, with no solution type in the path. Must be unique across solutions.',
      options: { source: 'title' },
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(['solution'])),
    }),
    defineField({
      name: 'hasPage',
      title: 'Has a landing page',
      type: 'boolean',
      group: GROUPS.content,
      description:
        'An editorial judgement — business focus, profitability, demand, search value. A solution can exist for tagging without earning a page.',
      initialValue: false,
    }),
    // Renamed from `subheadline` (PROD-2454), matching Line, Style, Product
    // and the existing `blogCategory` pair. (`page.subheadline` is a different
    // field on a different type and was left alone.)
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      rows: 2,
      group: GROUPS.content,
      description: 'One-line summary for the solution card, listings and nav.',
    }),
    taggedImageField({
      name: 'featuredImage',
      title: 'Featured image',
      type: 'image',
      group: GROUPS.content,
      mediaTags: [MEDIA_TAG.solution],
      options: { hotspot: true },
      description:
        'The one image that represents this solution — the page hero, cards, listings, nav and the social fallback.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describes the image for screen readers and SEO.',
        }),
      ],
    }),
    // Renamed from `intro` (PROD-2454). Portable text, so the link
    // annotations the original values carried survived the move.
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      group: GROUPS.content,
      description:
        'The packaging problem this solution addresses, and how we solve it.',
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
    // The two curated lists that survive. The four that went — packagingFormats,
    // relevantCustomizations, relatedProducts, relatedSolutions — could all be
    // derived or were never wanted; these two cannot be, so an editor has to say.
    defineField({
      name: 'relatedCaseStudies',
      title: 'Related case studies',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Curated override — empty falls back to the most recent 3.',
      // disableNew so curating a solution can't create a blank Case Study from
      // inside this form. The reference fields that had it were removed; this one
      // had been the odd one out.
      of: [{ type: 'reference', to: [{ type: 'caseStudy' }], options: { disableNew: true } }],
      validation: (Rule) => Rule.max(6),
    }),
    faqsField({ group: GROUPS.categorization, mode: 'reference', max: 6, min: 3 }),

    // ─── SEO ──────────────────────────────────────────────────────────────────
    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: GROUPS.seo,
      description: 'Overrides the browser and search title. Best kept under 60 characters.',
      validation: (Rule) => Rule.max(60).warning('Best kept under 60 characters.'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 2,
      group: GROUPS.seo,
      description: 'The snippet shown under the title in search results. Best kept under 160 characters.',
      validation: (Rule) => Rule.max(160).warning('Best kept under 160 characters.'),
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
      media: 'featuredImage',
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
