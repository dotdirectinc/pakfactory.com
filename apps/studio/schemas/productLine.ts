import { defineField, defineType } from 'sanity'
import { PackageIcon } from '@sanity/icons'
import { MEDIA_TAG } from '../lib/media-tags'
import { PRODUCT_URL_TYPES, uniqueSlugAcross } from '../lib/slug-rules'
import { seoFields, socialFields } from '../lib/seo-fields'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { pageSectionsField, SECTION_ALLOW } from './sections'
import { faqsField } from '../lib/faq-field'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'

/**
 * Product Line — the top level of the product tree (Rigid, Folding Carton,
 * Corrugated), a landing page built to rank and convert for one packaging format
 * (Entities/Product Line.md). Only `title` and `slug` were deployed; every other
 * field is a free build.
 *
 * Declaring is not inheriting: the Line declares WHICH properties its products
 * state (`properties`), never their values — each product still states its own.
 * The styles grid is derived from Styles pointing here; the Line only sets the
 * order (`styleOrder`), never gates membership.
 *
 * Deferred: `sections` (page-builder) until the shared section inventory exists
 * (PROD-2292); `featuredTestimonials` until the Testimonial type is extracted
 * (PROD-2293). `order` lives on the navigation singleton (PROD-2292), not here.
 */
export const productLine = defineType({
  name: 'productLine',
  title: 'Product Line',
  type: 'document',
  icon: PackageIcon,
  groups: groupsFor(['content', 'categorization', 'sections', 'seo', 'social']),
  fields: [
    // ─── CONTENT ──────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'The canonical name — "Rigid Boxes". Required, always presentable; renders wherever Display title is empty.',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle('title')),
    }),
    defineField({
      name: 'displayTitle',
      title: 'Display title',
      type: 'string',
      group: GROUPS.content,
      description: 'Optional front-end override for H1 / nav / card / breadcrumb. Empty is the normal case — and whichever string renders is the one that must go in the breadcrumb markup.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      options: { source: 'title' },
      description: 'The /products/<slug> segment. Unique across Product Line AND Product — both sit one segment under /products/.',
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(PRODUCT_URL_TYPES)),
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'array',
      group: GROUPS.content,
      description: 'Short, evergreen framing — no countable facts (they belong on products).',
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
      name: 'heroMedia',
      title: 'Hero image',
      type: 'image',
      group: GROUPS.content,
      description: 'The product-line landing hero.',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' }),
      ],
    }),
    defineField({
      name: 'cardImage',
      title: 'Card image',
      type: 'image',
      group: GROUPS.content,
      description: 'Thumbnail for the catalog grid and the nav.',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' }),
      ],
    }),
    defineField({
      name: 'cardSummary',
      title: 'Card summary',
      type: 'text',
      rows: 2,
      group: GROUPS.content,
      description: 'One-line summary for the catalog card and nav.',
    }),

    // ─── CATEGORIZATION (declarations + references out) ───────────────────────
    defineField({
      name: 'properties',
      title: 'Properties declared',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'Declares which properties products in this line state — never their values. `required` flags the completeness check (a corrugated product with no flute is flagged). Mirrors how a Customization Type declares its own.',
      of: [
        {
          type: 'object',
          name: 'lineProperty',
          fields: [
            defineField({
              name: 'property',
              title: 'Property',
              type: 'reference',
              to: [{ type: 'property' }],
              options: { disableNew: true },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'required',
              title: 'Required',
              type: 'boolean',
              description: 'Products in this line must state a value for this property.',
              initialValue: false,
            }),
          ],
          preview: {
            select: { title: 'property.title', required: 'required' },
            prepare({ title, required }) {
              return { title: title || 'Property', subtitle: required ? 'Required' : 'Optional' }
            },
          },
        },
      ],
    }),
    defineField({
      // Renamed from `styleOrder` (D33): an array is ordered by definition, so
      // `*Order` named the mechanism rather than the thing. 0 populated at the rename.
      name: 'styles',
      title: 'Styles',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Display order for the styles grid. Never a gate — unlisted styles append alphabetically.',
      of: [{ type: 'reference', to: [{ type: 'productStyle' }] }],
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'expertise',
      title: 'Expertise',
      type: 'array',
      group: GROUPS.categorization,
      description: '2–3, curated — the expertise stages commonly bought alongside this line.',
      of: [{ type: 'reference', to: [{ type: 'expertiseStage' }], options: { disableNew: true } }],
      validation: (Rule) => Rule.max(3).unique(),
    }),
    defineField({
      name: 'solutions',
      title: 'Solutions',
      type: 'array',
      group: GROUPS.categorization,
      description: 'The verticals this line serves.',
      of: [{ type: 'reference', to: [{ type: 'solution' }], options: { disableNew: true } }],
    }),
    defineField({
      name: 'featuredStudies',
      title: 'Featured case studies',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Curated override — empty derives the newest studies referencing this line.',
      of: [{ type: 'reference', to: [{ type: 'caseStudy' }] }],
    }),
    defineField({
      name: 'relatedLines',
      title: 'Related lines',
      type: 'array',
      group: GROUPS.categorization,
      description: '"Customers also considered" — sibling lines.',
      of: [{ type: 'reference', to: [{ type: 'productLine' }] }],
    }),
    faqsField({ group: GROUPS.categorization, mode: 'reference', max: 6, min: 3 }),

    // ─── SEO / SOCIAL ─────────────────────────────────────────────────────────
    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: GROUPS.seo,
      description: 'Overrides the browser/search title. Aim for ≤60 characters.',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: GROUPS.seo,
      description: 'The search-result snippet. Aim for ≤160 characters.',
      validation: (Rule) => Rule.max(160),
    }),
    pageSectionsField(SECTION_ALLOW.productPage),
    ...seoFields({ group: GROUPS.seo, meta: false, canonical: true, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.product }),
  ],
  preview: {
    select: { title: 'title', display: 'displayTitle', media: 'heroMedia' },
    prepare({ title, display, media }) {
      return { title: display || title || 'Untitled line', subtitle: 'Product Line', media }
    },
  },
})
