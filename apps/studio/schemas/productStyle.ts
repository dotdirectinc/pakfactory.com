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
    defineField({
      name: 'displayTitle',
      title: 'Display title',
      type: 'string',
      group: GROUPS.content,
      description: 'Optional front-end override. Empty is the normal case.',
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
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      group: GROUPS.content,
      rows: 3,
      description: 'Card and listing copy.',
    }),
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: GROUPS.content,
      description: 'Landing-page hero: badge, headline (the H1 — not a name), supporting copy and image.',
      options: { collapsible: true, collapsed: false },
      fields: [
        // Renamed from `hero.title` (D33). The field was *labelled* "Badge label" but
        // *named* `title`, so it collided with the document's own title in every
        // projection. 0 populated at the rename.
        defineField({ name: 'label', title: 'Badge label', type: 'string', description: 'Small label above the headline (e.g. "Folding Cartons").' }),
        defineField({ name: 'headline', title: 'Headline', type: 'string', description: 'The page H1 (e.g. "Magnetic Closure Rigid Boxes"). Leave blank to use the site default.' }),
        defineField({ name: 'description', title: 'Description', type: 'text', rows: 4, description: 'Supporting copy below the headline.' }),
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
          { title: 'Future', value: 'future' },
          { title: 'Deprecated', value: 'deprecated' },
        ],
        layout: 'radio',
      },
      initialValue: 'active',
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
    select: { title: 'title', display: 'displayTitle', line: 'productLine.title', heroImage: 'hero.image', cardImage: 'cardImage' },
    prepare({ title, display, line, heroImage, cardImage }) {
      return {
        title: display || title || 'Untitled style',
        subtitle: line ? `Style of ${line}` : 'Product Style',
        media: cardImage ?? heroImage,
      }
    },
  },
})
