import { defineField, defineType } from 'sanity'
import { ThLargeIcon } from '@sanity/icons'
import { MEDIA_TAG, taggedImageField } from '../lib/media-tags'
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
 * this style's products — nothing factual is stored here. `definition` references
 * a Glossary Term with optional local context (D33): the page renders
 * coalesce(context, term->definition), so the definition is never retyped and
 * can't compete with the glossary for the same query.
 *
 * Deferred: `sections` → PROD-2292. `productOrder` is NOT built — a style's
 * product count is unbounded, so product display order derives from a query, not
 * a maintained array (⚠️ the entity spec still lists productOrder; flagged for
 * Eric — this follows the ticket + the model's derive-don't-maintain rule).
 * `order` is deprecated: the styles grid order lives on the Line (`styles`).
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
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: GROUPS.content,
      description: 'Landing-page hero: badge, supporting copy and image. The heading is the top-level H1, not a field in here.',
      options: { collapsible: true, collapsed: false },
      fields: [
        // Renamed from `hero.title` (D33). The field was *labelled* "Badge label" but
        // *named* `title`, so it collided with the document's own title in every
        // projection. 0 populated at the rename.
        defineField({ name: 'label', title: 'Badge label', type: 'string', description: 'Small label above the headline (e.g. "Folding Cartons").' }),
        // `hero.headline` removed: it was a third name on a type that already had
        // `title` and `displayTitle`, and it was the H1 all along. Promoted to the
        // top-level `h1` above. 0 populated at the move, so nothing was lost.
        defineField({ name: 'description', title: 'Description', type: 'text', rows: 4, description: 'Supporting copy below the heading.' }),
        defineField(taggedImageField({
          name: 'image',
          title: 'Hero image',
          type: 'image',
          mediaTags: [MEDIA_TAG.product],
          options: { hotspot: true },
          description: 'Primary hero visual. Also used as the card image when Card image is empty.',
          fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' })],
        })),
      ],
    }),
    defineField(taggedImageField({
      // Renamed from `bannerImage` (D33) — a banner is a shape, not a meaning. Matches
      // the name Product Line and Case Study already use. 0 populated at the rename.
      name: 'cardImage',
      title: 'Card image',
      type: 'image',
      group: GROUPS.content,
      mediaTags: [MEDIA_TAG.product],
      options: { hotspot: true },
      description: 'Optional override for line cards and the collection hero. Falls back to the hero image.',
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' })],
    })),
    defineField({
      name: 'definition',
      title: 'Definition',
      type: 'object',
      group: GROUPS.content,
      description:
        'References a Glossary Term with optional local context (D33). The page renders coalesce(context, term→definition) — the definition is never retyped here, so it can’t compete with the glossary.',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'glossaryTerm',
          title: 'Glossary term',
          type: 'reference',
          to: [{ type: 'glossaryTerm' }],
          options: { disableNew: true },
          description: 'The term this construction is. The glossary owns the definition.',
        }),
        defineField({
          name: 'context',
          title: 'Local context',
          type: 'text',
          rows: 3,
          description: 'Optional — when to choose this construction. Blank uses the glossary definition as-is.',
        }),
      ],
    }),
    defineField({
      name: 'benefits',
      title: 'Benefits',
      type: 'object',
      group: GROUPS.content,
      description: 'Why choose this construction (renamed from whyChooseBlock, D33). Argues the choice; it must not restate the glossary definition.',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({ name: 'title', title: 'Title', type: 'string' }),
        defineField({ name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }] }),
      ],
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
    select: { title: 'title', display: 'shortName', line: 'productLine.title', heroImage: 'hero.image', cardImage: 'cardImage' },
    prepare({ title, display, line, heroImage, cardImage }) {
      return {
        title: display || title || 'Untitled style',
        subtitle: line ? `Style of ${line}` : 'Product Style',
        media: cardImage ?? heroImage,
      }
    },
  },
})
