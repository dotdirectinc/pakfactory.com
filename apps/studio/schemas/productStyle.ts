import { defineField, defineType } from 'sanity'
import { ThLargeIcon } from '@sanity/icons'
import { MEDIA_TAG, taggedImageField, taggedImageType } from '../lib/media-tags'
import { seoFields, socialFields } from '../lib/seo-fields'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { pageSectionsField, SECTION_ALLOW } from './sections'
import { faqsField } from '../lib/faq-field'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { uniqueSlugAcross } from '../lib/slug-rules'
import { entityFields } from '../lib/entity-id-field'
import { FULL_STATUS_LIST, STATUS_DESCRIPTION_TAIL } from '../lib/catalog-status'
import { restrictingChildrenWarning } from '../lib/status-cascade-warning'

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
 * Deferred: `sections` → PROD-2292.
 *
 * `productOrder` (PROD-2747) IS built, and D31 is why it takes the shape it does.
 * D31 named this field by name and rejected it — but as "every product in a style
 * in drag order", an array that is order AND gate, unusable at 200. It then
 * prescribed the alternative it is built as here: DERIVE THE SET, CURATE THE
 * HIGHLIGHTS. Membership stays a query (products referencing this style); the array
 * carries a short sequence for the top and `Rule.max(12)` keeps it that way, so the
 * ceiling D31 worried about is enforced rather than requested.
 *
 * 🔴 Do not "complete" this list. Adding every product is the design D31 rejected.
 *
 * Ordering the styles GRID is set on the LINE, not here — `productLine.styleOrder`
 * (PROD-2739), which replaced the `styles` array removed in PROD-2509. Nothing on
 * this type records its own position: a style the Line does not list simply follows
 * the listed ones alphabetically. There is no per-style sort key, deliberately.
 */
export const productStyle = defineType({
  name: 'productStyle',
  title: 'Product Style',
  type: 'document',
  icon: ThLargeIcon,
  groups: groupsFor(['content', 'categorization', 'sections', 'template', 'seo', 'social']),
  fields: [
    // ─── CONTENT ──────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'The canonical name (e.g. "Magnetic Closure Rigid Boxes"). Must be unique across styles.',
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
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      options: { source: 'title' },
      description: 'The /products/<line>/<style> segment. Must be unique across all styles, even under different lines.',
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(['productStyle'])),
    }),
    defineField({
      name: 'productLine',
      title: 'Parent product line',
      type: 'reference',
      group: GROUPS.content,
      description: 'The line this style belongs to. One line per style.',
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
        'What this style is, how it is constructed and what it suits.',
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
      description:
        'Is this style offered, and how? Coming soon shows a badged card on the parent ' +
        'line with no page of its own. Discontinued keeps the page for search and drops ' +
        'the listing. ' + STATUS_DESCRIPTION_TAIL,
      options: { list: FULL_STATUS_LIST, layout: 'radio' },
      initialValue: 'active',
      // A style does NOT take its products down with it — a product names several
      // styles but exactly one line, and the line is what keeps it reachable (R2).
      // So this warns about the one thing restricting a style really does break:
      // the products whose PRIMARY style this is. `productStyle[0]` supplies the
      // style on their cards, their breadcrumb, and the FAQs they inherit.
      validation: (Rule) =>
        Rule.custom(
          restrictingChildrenWarning({
            query: `*[
              _type == "product" &&
              productStyle[0]._ref == $id &&
              (!defined(status) || status in ["active", "coming-soon", "active-internal"])
            ]{ title }`,
            describe: (names) =>
              `This is the primary style of ${names}. Those products stay visible, but the ` +
              `style shown on their cards and breadcrumbs, and the FAQs they inherit, all come ` +
              `from here. Reorder their styles first if another should lead.`,
          }),
        ).warning(),
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
      description: 'Curated override. Empty falls back to the line’s studies.',
      of: [{ type: 'reference', to: [{ type: 'caseStudy' }] }],
    }),
    faqsField({
      group: GROUPS.categorization,
      mode: 'reference',
      max: 6,
      min: 3,
      description:
        'Curated FAQs for this style — reference shared FAQ documents. Shown on the style page and on standard products whose first style this is and that have none of their own. Leave empty to use the line’s. Anything here replaces the line’s list entirely.',
    }),
    defineField({
      name: 'productOrder',
      title: 'Product order',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'Drag to pin a few products to the top of this style. Anything not listed follows ' +
        'alphabetically. Never a gate: every product still appears.',
      of: [
        {
          type: 'reference',
          // WEAK, for the same reason as `productLine.styleOrder` (PROD-2739):
          // pinning a product for presentation must never make it undeletable.
          // A deleted product leaves a dangling entry, which the helper drops.
          weak: true,
          to: [{ type: 'product' }],
          options: {
            disableNew: true,
            // Primary style only. `product.productStyle` is an array where `[0]` is
            // the primary (settled 2026-08-27), and the style page renders only
            // products whose primary style is this one. Offering the others would
            // let an editor drag something that cannot move — a silent no-op, which
            // is how `productLine.styles` rotted (PROD-2509).
            //
            // 🔴 192 products reference a style in position 1 or 2 and so never
            // appear on that style's page at all. Whether that is a bug is Richard's
            // call (PROD-2747); if the page widens, widen this filter with it.
            filter: ({ document }: { document: { _id: string; productOrder?: { _ref?: string }[] } }) => {
              const chosen = (document.productOrder ?? [])
                .map((item) => item?._ref)
                .filter((ref): ref is string => typeof ref === 'string')
              return {
                filter: 'productStyle[0]._ref == $style && !(_id in $chosen)',
                params: { style: document._id.replace(/^drafts\./, ''), chosen },
              }
            },
          },
        },
      ],
      // max is load-bearing, not taste — see the docblock. This is a highlights
      // list; the tail is the query's job.
      validation: (Rule) => Rule.unique().max(12),
    }),

    // ─── TEMPLATE (layout version) ────────────────────────────────────────────
    defineField({
      name: 'template',
      title: 'Template',
      type: 'reference',
      group: GROUPS.template,
      to: [{type: 'productStylePage'}],
      options: {disableNew: true},
      description:
        'Pick a Product Style Page layout version — shared bands below the style catalog grid. ' +
        'Manage layouts under Main Website → Product Pages → Product Style Pages. ' +
        'Empty → seeded Default layout (`productStylePage`).',
    }),

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
    ...entityFields({ prefix: 'sty', codeKinds: ['STY'], group: GROUPS.content }),
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
