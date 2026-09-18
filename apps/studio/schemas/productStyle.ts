import { defineField, defineType } from 'sanity'
import { ThLargeIcon } from '@sanity/icons'
import { MEDIA_TAG, taggedImageField, taggedImageType } from '../lib/media-tags'
import { seoFields, socialFields } from '../lib/seo-fields'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { pageSectionsField, SECTION_ALLOW } from './sections'
import { faqsField } from '../lib/faq-field'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { uniqueSlugAcross } from '../lib/slug-rules'

/**
 * Product Style — a construction within a line (Magnetic Closure, Straight Tuck
 * End); the mid-funnel page (Entities/Product Style.md). One line per style,
 * spec-owned.
 *
 * The specs strip (dimensions, MOQ, lead time, material options) is DERIVED from
 * this style's products — nothing factual is stored here.
 *
 * Trimmed to 22 fields (PROD-2511): `hero`, `definition` and `benefits` removed,
 * and `cardImage` renamed to `image`.
 *
 * ⚠️ `definition` referenced a Glossary Term so the definition could never be
 * retyped here — it rendered coalesce(context, term->definition). It went because
 * it was UNUSABLE, not because the reasoning was wrong: there are 0 glossaryTerm
 * documents and the picker sets disableNew, so it was an empty list nobody could
 * add to. THE RULE SURVIVES THE FIELD and is now only a rule: the glossary owns
 * the definition; this page argues when to choose the construction. If both define
 * it, they compete for the same query.
 *
 * ⚠️ `hero.description` is left on ~83 documents as an undeclared key. Removing a
 * field does not delete data, and that orphan is DELIBERATE — the copy is
 * placeholder, and promoting it into `description` would make those styles read as
 * authored when they are not. Safe for a future unset sweep.
 *
 * Deferred: `sections` → PROD-2292. `productOrder` is NOT built — a style's
 * product count is unbounded, so product display order derives from a query, not a
 * maintained array (D31).
 *
 * Ordering the styles GRID is a separate open question with no mechanism: the
 * Line's `styles` array was removed in PROD-2509 and nothing replaced it, so the
 * grid sorts alphabetically today. That is the behaviour, not the intent.
 */
export const productStyle = defineType({
  name: 'productStyle',
  title: 'Product Style',
  type: 'document',
  icon: ThLargeIcon,
  groups: groupsFor(['content', 'categorization', 'sections', 'seo', 'social']),
  fields: [
    // ─── CONTENT ──────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'The canonical name — "Magnetic Closure Boxes". Required, always presentable.',
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
        'A shorter or more customer-facing version of the Title, for cards, listings and nav. Leave empty to use the Title.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      options: { source: 'title' },
      description: 'The /products/<line>/<style> segment.',
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(['productStyle'])),
    }),
    defineField({
      name: 'productLine',
      title: 'Parent product line',
      type: 'reference',
      group: GROUPS.content,
      description: 'The line this style belongs to (its parent) — one line per style, required.',
      to: [{ type: 'productLine' }],
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    // Renamed from `description` (PROD-2454) — that key held *short* copy
    // here, which is why the same word meant two things across the model.
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      group: GROUPS.content,
      rows: 3,
      description: 'One-line summary for the style card, listings and the nav.',
    }),
    // The `description` key was freed by PROD-2455 and reused for the
    // long-form field, matching Line and Solution. Starts empty everywhere.
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      group: GROUPS.content,
      description:
        'The full description of this style — what it is, how it is constructed and what it suits. Renders on the style landing page.',
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
      description: 'The one image that represents this style — the landing hero, line cards, listings, nav and the social fallback.',
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' })],
    })),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      group: GROUPS.content,
      description: 'Additional images for this page. Order is presentation only — the card and social images come from Featured image.',
      of: [taggedImageType([MEDIA_TAG.product], { hotspot: true })],
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: GROUPS.content,
      description: 'Lifecycle — so a retired style can say so (the deployed type had no way to).',
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
        'Off = this document exists only to be referenced — no page, no route, no nav, no listing. That is how the line/style scaffolding an inspiration product needs as a `basedOn` ancestor stays published and referenceable without ever being reachable by a visitor. Not the same question as Status: this one asks whether a route exists at all.',
      initialValue: true,
    }),
    // `order` was REMOVED here on 2026-09-01. It set the display order of the style
    // cards within a Product Line's styles grid, and nothing has ever read it — no
    // GROQ query, no desk pane, and `/products` is served by Magento, not this app.
    // Its successor `productLine.styles` is deployed and is explicitly "never a gate —
    // unlisted styles append alphabetically", so an empty array is defined behaviour
    // rather than a missing replacement. It was set on 8 mock styles across 3 lines;
    // for two of those three the curated order and the alphabetical fallback are
    // IDENTICAL, so the entire loss is the sequence of three Folding Carton styles.
    // Recorded in ADR-017; re-apply to `productLine.styles` when real styles land.

    // ─── CATEGORIZATION ───────────────────────────────────────────────────────
    defineField({
      name: 'featuredStudies',
      title: 'Featured case studies',
      type: 'array',
      group: GROUPS.categorization,
      description: 'Curated override — empty falls back to the line’s studies.',
      of: [{ type: 'reference', to: [{ type: 'caseStudy' }] }],
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
    select: { title: 'title', display: 'shortName', line: 'productLine.title', image: 'featuredImage' },
    prepare({ title, display, line, image }) {
      return {
        title: display || title || 'Untitled style',
        // Just the Line name. "Style of Rigid Boxes" restated what the list is already
        // called; the fallback now names the gap instead, and `productLine` is required,
        // so an empty one is a fault worth seeing rather than a normal state.
        subtitle: line || 'No product line',
        media: image,
      }
    },
  },
  // Editors group Styles by their Line, so "Sort by Line" belongs in the list's sort
  // menu (PROD-2546). The subtitle above already carries the Line, so grouped rows need
  // no headers. Third list to get this, after `customizationOption` and `customizationType`.
  //
  // ⚠ Title is declared here rather than inherited. A type that declares no `orderings`
  // gets a GENERATED one — `guessOrderingConfig` in @sanity/schema picks the first field
  // named title/name/label/heading/header/caption/description — which is where this list's
  // "Sort by Title" came from. Declaring an `orderings` array suppresses that guess, so
  // omitting Title here would silently delete it from the menu. That happened on
  // PROD-2544 and took a follow-up PR to undo.
  //
  // ⚠ `productLine.title` is a reference path: correct HERE, as a menu entry, where
  // `getExtendedProjection` emits `productLine->{title}` and the dereference happens a
  // stage before the sort — and inert as a `.defaultOrdering()`, where `PaneContainer`
  // builds `{by: defaultOrdering}` with no projection slot and the sort quietly falls
  // through to the next key. Hence Line in the menu, plain `title` as the list default
  // in `structure/index.ts`. `customizationOption.ts` carries the long version.
  orderings: [
    {
      title: 'Line',
      name: 'lineTitle',
      by: [
        { field: 'productLine.title', direction: 'asc' },
        { field: 'title', direction: 'asc' },
      ],
    },
    {
      title: 'Title',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
})
