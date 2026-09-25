import { defineField, defineType } from 'sanity'
import { PackageIcon } from '@sanity/icons'
import { MEDIA_TAG, taggedImageField, taggedImageType } from '../lib/media-tags'
import { PRODUCT_URL_TYPES, uniqueSlugAcross } from '../lib/slug-rules'
import { seoFields, socialFields } from '../lib/seo-fields'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { pageSectionsField, SECTION_ALLOW } from './sections'
import { faqsField } from '../lib/faq-field'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'

/**
 * Product Line — the top level of the product tree (Rigid, Folding Carton,
 * Corrugated), a landing page built to rank and convert for one packaging format
 * (Entities/Product Line.md). The full type is deployed.
 *
 * Declaring is not inheriting: the Line declares WHICH properties its products
 * state (`properties`), never their values — each product still states its own.
 *
 * Layout template: customer-facing lines select `productLinePage` via `template`
 * (Main Website → Product Pages → Product Line Page) — twin of solutionIndustryPage.
 *
 * The styles grid is DERIVED, not listed. Every Style carries a required
 * `productLine` reference (97/97 in production), so membership is a query and the
 * Line never gates it.
 *
 * ⚠️ Ordering that grid is an OPEN REQUIREMENT with no mechanism (PROD-2509).
 * `styles` — an ordered reference array that set the display order — was removed
 * unpopulated (0/15) because a strong reference held purely for presentation made
 * every listed Style undeletable, and the "unlisted styles append alphabetically"
 * fallback it promised was never built. Until a replacement lands, the grid sorts
 * alphabetically, which is NOT the intent: a landing-page grid is a merchandising
 * surface and should lead with the styles that convert. Do not read the current
 * sort as a decision.
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
  groups: groupsFor([
    'content',
    'template',
    'categorization',
    'sections',
    'seo',
    'social',
  ]),
  fields: [
    // ─── CONTENT ──────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'The canonical name (e.g. "Rigid Boxes"). Must be unique across product lines.',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle('title')),
    }),
    // One naming convention across Line / Style / Solution / Product: Title is
    // the canonical name, H1 is the page heading, Short name is the card and nav
    // label. Both overrides fall back to Title when empty, so an editor who
    // leaves them alone gets the right string everywhere. Whichever string the
    // card or nav renders is the one that must go in the breadcrumb markup.
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
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      options: { source: 'title' },
      description: 'The /products/<slug> segment. Must be unique across product lines and products — both sit one segment under /products/.',
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(PRODUCT_URL_TYPES)),
    }),
    // Renamed from `intro` (PROD-2454): one concept, one name across
    // Line / Style / Solution / Product. Portable text, so the link
    // annotations the original values carried survived the move.
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      group: GROUPS.content,
      description:
        'What this line covers and who it is for. Keep it evergreen — no countable facts, those belong on the products.',
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
    // One representative image, one gallery — the same pair on all three product-tree
    // types. `featuredImage` names a ROLE (the image that stands for this document),
    // where `cardImage` and `heroMedia` named render slots, which D33 forbids. It is
    // also the name the shared `ogImage` description has always referred to.
    defineField(taggedImageField({
      name: 'featuredImage',
      title: 'Featured image',
      type: 'image',
      group: GROUPS.content,
      mediaTags: [MEDIA_TAG.product],
      options: { hotspot: true },
      description:
        'The one image that represents this line — large landing hero, catalog cards, nav, and the social fallback. Leave empty to use the hero placeholder.',
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' })],
    })),
    // Icon above the H1 on the product-line landing (dieline / mark). Distinct from
    // Featured image, which is the large hero photo and card art.
    defineField(taggedImageField({
      name: 'kitMark',
      title: 'Kit mark',
      type: 'image',
      group: GROUPS.content,
      mediaTags: [MEDIA_TAG.product],
      options: { hotspot: true },
      description:
        'Icon above the H1 on the product-line landing (dieline / mark). Leave empty to use the placeholder.',
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the mark for screen readers and SEO.' })],
    })),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      group: GROUPS.content,
      description: 'Additional images for this page. Order is presentation only — the card and social images come from Featured image.',
      of: [taggedImageType([MEDIA_TAG.product], { hotspot: true })],
    }),
    // Renamed from `cardSummary` (PROD-2454), matching Style, Solution,
    // Product and the existing `blogCategory` pair.
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      rows: 2,
      group: GROUPS.content,
      description: 'One-line summary for the catalog card and nav.',
    }),
    // The only one of Line / Style / Product that had no Status. Same shape and
    // vocabulary as the other two (D49) — one ladder, read the same way at every
    // level of the product tree.
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
    defineField({
      name: 'customerFacing',
      title: 'Customer facing',
      type: 'boolean',
      group: GROUPS.content,
      description:
        'Off = no page, no route, no listing; the document exists only to be referenced. Not the same as Status — this one decides whether a page exists at all.',
      initialValue: true,
    }),

    // ─── TEMPLATE (layout singleton) ──────────────────────────────────────────
    defineField({
      name: 'template',
      title: 'Template',
      type: 'reference',
      group: GROUPS.template,
      to: [{type: 'productLinePage'}],
      options: {disableNew: true},
      description:
        'Page layout — section order and default headings. Rearrange sections on ' +
        'the template document (Main Website → Product Pages → Product Line Page), ' +
        'not on this product line. Band content stays on the Sections tab, matched by key.',
      hidden: ({document}) => document?.customerFacing !== true,
      validation: (Rule) =>
        Rule.custom((value, ctx) => {
          const doc = ctx.document as {customerFacing?: boolean} | undefined
          if (doc?.customerFacing !== true) return true
          return value
            ? true
            : 'Customer-facing product lines must select Product Line Page'
        }),
    }),

    // ─── CATEGORIZATION (declarations + references out) ───────────────────────
    defineField({
      name: 'properties',
      title: 'Properties declared',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'A list of property + Required pairs. Declares which properties products in this line can state — never their values; each product states its own. This list is exactly what a product\'s Properties picker offers, so a product cannot state anything left out of it. Required on means every product in the line must state that property; Required off means they may state it but don\'t have to.',
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
              description:
                'On — every product in this line must state a value for this property, and any that doesn\'t shows a warning. Off — a product may state it or leave it out, and nothing is flagged. It\'s a warning rather than a block because these products arrive from the product data source, so an editor often can\'t fix what the sync sent.',
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
      name: 'expertise',
      title: 'Expertise',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Up to 3 — the expertise stages commonly bought alongside this line.',
      of: [{ type: 'reference', to: [{ type: 'expertiseStage' }], options: { disableNew: true } }],
      validation: (Rule) => Rule.max(3).unique(),
    }),
    defineField({
      name: 'solutions',
      title: 'Solutions',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Which solutions this line serves — industry, channel, focus or use case.',
      of: [{ type: 'reference', to: [{ type: 'solution' }], options: { disableNew: true } }],
    }),
    defineField({
      name: 'featuredStudies',
      title: 'Featured case studies',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Curated override. Empty falls back to the newest studies referencing this line.',
      of: [{ type: 'reference', to: [{ type: 'caseStudy' }] }],
    }),
    defineField({
      name: 'relatedLines',
      title: 'Related lines',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Sibling lines to suggest as alternatives.',
      of: [{ type: 'reference', to: [{ type: 'productLine' }] }],
    }),
    faqsField({ group: GROUPS.categorization, mode: 'reference', max: 6, min: 3 }),

    // ─── SEO / SOCIAL ─────────────────────────────────────────────────────────
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
      rows: 3,
      group: GROUPS.seo,
      description: 'The snippet shown under the title in search results. Best kept under 160 characters.',
      validation: (Rule) => Rule.max(160).warning('Best kept under 160 characters.'),
    }),
    pageSectionsField(SECTION_ALLOW.productPage),
    ...seoFields({ group: GROUPS.seo, meta: false, canonical: true, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.product }),
  ],
  preview: {
    select: { title: 'title', display: 'shortName', media: 'featuredImage' },
    prepare({ title, display, media }) {
      return { title: display || title || 'Untitled line', subtitle: 'Product Line', media }
    },
  },
})
