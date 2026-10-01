import { defineField, defineType } from 'sanity'
import { PackageIcon } from '@sanity/icons'
import { MEDIA_TAG, taggedImageField, taggedImageType } from '../lib/media-tags'
import { PRODUCT_URL_TYPES, uniqueSlugAcross } from '../lib/slug-rules'
import { seoFields, socialFields } from '../lib/seo-fields'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { pageSectionsField, SECTION_ALLOW } from './sections'
import { faqsField } from '../lib/faq-field'
import { featuredVideoField } from '../lib/featured-video-field'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { entityFields } from '../lib/entity-id-field'
import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list'

/**
 * Product Line — the top level of the product tree (Rigid, Folding Carton,
 * Corrugated), a landing page built to rank and convert for one packaging format
 * (Entities/Product Line.md). The full type is deployed.
 *
 * Declaring is not inheriting: the Line declares WHICH properties its products
 * state (`properties`), never their values — each product still states its own.
 *
 * Layout template: customer-facing lines select a `productLinePage` layout version
 * via `template` (Main Website → Product Pages → Product Line Pages). Hero shell
 * and body section order live on that layout doc — not on this line.
 *
 * The styles grid is DERIVED, not listed. Every Style carries a required
 * `productLine` reference (97/97 in production), so membership is a query and the
 * Line never gates it.
 *
 * Ordering that grid is `styleOrder` (PROD-2739) — the replacement for `styles`,
 * which was removed unpopulated (0/15) in PROD-2509. Two things changed, and both
 * are the reasons that one failed:
 *
 *   - the references are WEAK, so pinning a style no longer makes it undeletable;
 *   - the "unlisted styles append alphabetically" fallback is actually BUILT, in
 *     `LINE_STYLES` in `packages/sanity/src/queries/catalog.ts`, with the empty
 *     and dangling-reference cases covered in `line-style-order.test.ts`.
 *
 * It stays ORDER ONLY and never a gate: membership remains the query above, so an
 * unlisted style still renders — it lands in the alphabetical tail. A partial list
 * is the normal state, which is what lets the field be useful while empty on most
 * lines.
 *
 * Deferred: `sections` (page-builder) until the shared section inventory exists
 * (PROD-2292); `featuredTestimonials` until the Testimonial type is extracted
 * (PROD-2293).
 *
 * `orderRank` (PROD-2744) is the Studio LIST order only — it decides the sequence
 * editors see in the Product Lines pane and nothing else. The site is unaffected:
 * `CATALOG_PRODUCT_LINES_QUERY` and the case-study filter chips are still
 * `order(title asc)`. The main site's menu is hand-authored on the Website
 * Navigation singleton and never reads this type, so it is unaffected too.
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
    // Desktop scroll-scrub hero. Shared featuredVideo object (upload | URL | YouTube)
    // — same field on Product / Expertise Stage. Mobile / reduced-motion keep the image.
    featuredVideoField({
      group: GROUPS.content,
      description:
        'Optional desktop scroll-scrub video. Upload or a direct S3/CDN MP4/MOV; YouTube is stored but the landing keeps Featured image. Mobile and reduced-motion keep Featured image.',
    }),
    // Featured icon on the product-line landing. Stack: above the H1.
    // Bottom bar: brand-signal slot bottom-left. Distinct from Featured image.
    // Schema field name stays `kitMark` (no content migration). Hero shell
    // (stack vs bottomBar) lives on the selected Product Line Page layout.
    defineField(taggedImageField({
      name: 'kitMark',
      title: 'Featured icon',
      type: 'image',
      group: GROUPS.content,
      mediaTags: [MEDIA_TAG.product],
      options: { hotspot: true },
      description:
        'Icon on the landing hero. Stack layout: above the H1. Bottom bar layout: bottom-left brand signal. Leave empty to use the placeholder. Which shell applies comes from the Template tab.',
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the icon for screen readers and SEO.' })],
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
        'Off = no page, no route, no listing, no nav link; the document exists only to be referenced. On by default. Not the same as Status — this one decides whether a page exists at all.',
      initialValue: true,
    }),

    // ─── TEMPLATE (layout version) ────────────────────────────────────────────
    defineField({
      name: 'template',
      title: 'Template',
      type: 'reference',
      group: GROUPS.template,
      to: [{type: 'productLinePage'}],
      options: {disableNew: true},
      description:
        'Pick a Product Line Page layout version — hero shell plus section order and ' +
        'default headings. Manage layouts under Main Website → Product Pages → ' +
        'Product Line Pages. Band content stays on the Sections tab, matched by key.',
      hidden: ({document}) => document?.customerFacing !== true,
      validation: (Rule) =>
        Rule.custom((value, ctx) => {
          const doc = ctx.document as {customerFacing?: boolean} | undefined
          if (doc?.customerFacing !== true) return true
          return value
            ? true
            : 'Customer-facing product lines must select a Product Line Page layout'
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
            // PROD-2610. Stating a value and rendering it were the same thing until
            // now. They are not: a property can be stated, hidden on the product page,
            // and still a filter on the catalog.
            //
            // ❌ DO NOT make `listingPage.filters` read this. Hidden-but-filterable is
            // the case this field exists for, and dropping hidden properties from the
            // filter derivation would break it silently — no error, the filter just
            // never appears.
            //
            // No `hidden` condition, unlike the twin on `customizationType`: everything
            // on the product side is stated. There is no `usage` on this link by design
            // (PROD-2588) — a customer picks a product, not a value on one.
            defineField({
              name: 'showOnDetailPage',
              title: 'Show on the detail page',
              type: 'boolean',
              description:
                "On — the value each product states for this property appears on that product's page. " +
                'E.g. Closure Type shows as a spec row. Off — the product still states the value and it ' +
                "can still be a filter on the catalog, it just doesn't render on the page. E.g. Material " +
                'Family, where the line name already says it. Filtering is decided separately, in the ' +
                "listing page's Filters list, so turning this off never removes a filter.",
              // undefined and true both mean SHOW — only an explicit false hides, so
              // nothing authored before this shipped changes. Test `=== false`.
              initialValue: true,
            }),
          ],
          preview: {
            select: { title: 'property.title', required: 'required', shown: 'showOnDetailPage' },
            prepare({ title, required, shown }) {
              const label = required ? 'Required' : 'Optional'
              return {
                title: title || 'Property',
                subtitle: shown === false ? `${label} · hidden` : label,
              }
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
    defineField({
      name: 'styleOrder',
      title: 'Product style order',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'Drag to set the order styles appear in on this line. Listing a few is fine — anything ' +
        'not listed follows alphabetically. Never a gate: every style still appears.',
      of: [
        {
          type: 'reference',
          // 🔴 WEAK ON PURPOSE, and the only weak reference in this Studio.
          //
          // This field is PROD-2739, the replacement for `styles` — removed in
          // PROD-2509 precisely because it was strong. Sanity blocks deletion of a
          // referenced document, so listing a style here for presentation made that
          // style undeletable, with nothing in the Studio connecting the two. Weak
          // inverts that: the delete succeeds and leaves a dangling entry, which the
          // grid query drops via `defined(_id)` so it never reaches the site.
          //
          // Do not "tidy" this to a strong reference. The whole field goes back to
          // being a content-operations trap if you do.
          weak: true,
          to: [{ type: 'productStyle' }],
          options: {
            disableNew: true,
            // Two narrowings, and both are UX rather than safety — `Rule.unique()`
            // below and the grid query are what actually hold the line.
            //
            // 1. Styles belong to exactly one line, so offering another line's
            //    styles would let an editor pin something the grid never renders.
            // 2. Styles already in this list are dropped. Without this the picker
            //    keeps offering what you just added, and the duplicate only
            //    announces itself as a validation error that blocks publish —
            //    found in review, after exactly that happened.
            filter: ({ document }: { document: { _id: string; styleOrder?: { _ref?: string }[] } }) => {
              const chosen = (document.styleOrder ?? [])
                .map((item) => item?._ref)
                .filter((ref): ref is string => typeof ref === 'string')
              return {
                filter: 'productLine._ref == $line && !(_id in $chosen)',
                params: { line: document._id.replace(/^drafts\./, ''), chosen },
              }
            },
          },
        },
      ],
      validation: (Rule) => Rule.unique(),
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
    ...entityFields({ prefix: 'lin', codeKinds: ['LIN'], group: GROUPS.content }),
    // ─── STUDIO LIST ORDER ────────────────────────────────────────────────────
    /**
     * Drag-to-order position for the Product Lines list (PROD-2744).
     *
     * Written by `@sanity/orderable-document-list` when an editor drags a row.
     * `hidden` and `readOnly` come from the plugin — it never appears on the Edit
     * form, and the drag handle in the list pane is the only way to set it.
     *
     * New lines rank themselves: the plugin's `initialValue` reads the current
     * last rank and places a newly created line after it, so "Reset Order" is a
     * one-time action, not a chore on every create.
     *
     * ⚠️ ORDER ONLY, and Studio only. Nothing on the website reads this field —
     * see the type docblock above. Pointing a query at it is a separate decision.
     */
    orderRankField({ type: 'productLine' }),
  ],
  // Adds an "Ordered" entry to the list's sort menu, matching the drag order.
  orderings: [orderRankOrdering],
  preview: {
    select: { title: 'title', display: 'shortName', media: 'featuredImage' },
    prepare({ title, display, media }) {
      return { title: display || title || 'Untitled line', subtitle: 'Product Line', media }
    },
  },
})
