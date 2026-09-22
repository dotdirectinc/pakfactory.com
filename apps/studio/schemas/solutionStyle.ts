import { defineField, defineType } from 'sanity'
import { ThLargeIcon } from '@sanity/icons'
import { MEDIA_TAG, taggedImageField } from '../lib/media-tags'
import { seoFields, socialFields } from '../lib/seo-fields'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { uniqueSlugWithinParent } from '../lib/slug-rules'

/**
 * Solution Style — the second level under a Solution (Entities/Solution Style.md).
 * A curated collection of inspiration products with its own page, H1 and SEO:
 * "Snacks & Packaged Food" holds "Snack & Packaged Food Boxes" and "Retail Snack
 * Displays", each at /solutions/<solution>/<solution-style>.
 *
 * 🔴 PRODUCTS ARE NEVER TAGGED TO A SOLUTION STYLE. This type is a STORED FILTER
 * and membership is computed. The name is deliberately consistent with Product
 * Style — it is internal terminology, never shown to customers — and that
 * consistency is exactly what makes the mistake available: sooner or later
 * somebody will reach for a `product.solutionStyle` field. There must never be
 * one. Two sources for one membership is the failure this type is shaped to
 * avoid. Keep this paragraph if the file is ever reorganised.
 *
 * Why a filter and not a tag: the whole point is to group products DIFFERENTLY
 * from the taxonomy — how a line or style is grouped may not match the offering
 * we want to present — and a filter admits a newly uploaded product with no
 * per-product work, which matters while the catalogue is still being loaded. The
 * price of auto-admitting is paid by `excludedProducts`.
 *
 * What "matches" means lives in @pakfactory/sanity/solution-style-filter, not
 * here, because the Studio's match count and the eventual collection page have to
 * agree exactly. Same reasoning as `dimension-inputs`.
 *
 * Two things are deliberately NOT fields: the parent Solution (the `solution`
 * reference already carries it) and `kind == "inspiration"` (only inspiration
 * products carry `product.solutions` — 58 of 58, against 0 of 252 standard — so a
 * solution-scoped query is inspiration-scoped by construction). Storing either
 * would be one rule copied onto every document.
 *
 * No `sections`: a collection page is a catalogue, not an argument, and its body
 * is the product grid. No `pinned` list either — ordering is `_createdAt` desc,
 * and per-collection pinning is the answer WHEN merchandising order starts to
 * matter, deferred on purpose until then.
 *
 * ⚠️ Schema ahead of surface: there is no /solutions route yet. This type and its
 * Studio experience are real; the card grid and the collection page are front-end
 * work that does not exist.
 */

export const solutionStyle = defineType({
  name: 'solutionStyle',
  title: 'Solution Style',
  type: 'document',
  icon: ThLargeIcon,
  groups: groupsFor(['content', 'categorization', 'seo', 'social']),
  fields: [
    // ─── CONTENT ──────────────────────────────────────────────────────────────
    // The same three names as Line / Style / Solution / Product: Title is the
    // canonical name, H1 is the page heading, Short name is the card and nav
    // label. Both overrides fall back to Title, so leaving them alone is correct.
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description: 'The canonical name for this grouping, not the solution above it.',
      validation: (Rule) => Rule.required(),
    }),
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
      name: 'solution',
      title: 'Parent solution',
      type: 'reference',
      to: [{ type: 'solution' }],
      group: GROUPS.content,
      options: { disableNew: true },
      description:
        'The solution this collection sits under. Drives the URL, and scopes the filter below — only products tagged to this solution can appear.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      description: 'The /solutions/<solution>/<slug> segment. Must be unique within its parent solution, not across all of them.',
      options: { source: 'title' },
      // Scoped to the parent, not global: two solutions may each hold a "Boxes",
      // and they never meet because the parent is in the path.
      validation: (Rule) =>
        Rule.required().custom(
          uniqueSlugWithinParent(
            'solutionStyle',
            'solution',
            'solution',
            'the URL is /solutions/<solution>/<slug>, so two identical slugs under one solution resolve to the same page',
          ),
        ),
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      rows: 2,
      group: GROUPS.content,
      description: 'One-line summary for this collection’s card on the solution page.',
    }),
    taggedImageField({
      name: 'featuredImage',
      title: 'Featured image',
      type: 'image',
      group: GROUPS.content,
      mediaTags: [MEDIA_TAG.solution],
      options: { hotspot: true },
      description: 'The image for this collection — the card on the solution page, the page itself, and the social fallback.',
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
      name: 'description',
      title: 'Description',
      type: 'array',
      group: GROUPS.content,
      description:
        'What this collection is and who it suits. Appears above the product grid.',
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

    // ─── THE FILTER ───────────────────────────────────────────────────────────
    defineField({
      name: 'filter',
      title: 'Which products appear',
      type: 'object',
      group: GROUPS.categorization,
      description:
        'The three conditions below are combined with OR — a product appears if it matches any one of them. Everything is scoped to the parent solution and to inspiration products automatically.',
      options: { columns: 1 },
      fields: [
        defineField({
          name: 'productLines',
          title: 'Product lines',
          type: 'array',
          description: 'Every inspiration product in these lines.',
          of: [{ type: 'reference', to: [{ type: 'productLine' }], options: { disableNew: true } }],
        }),
        defineField({
          name: 'productStyles',
          title: 'Product styles',
          type: 'array',
          description:
            'Every inspiration product in these styles. A style may sit under a line you have not selected — the conditions widen the list, never narrow it.',
          of: [{ type: 'reference', to: [{ type: 'productStyle' }], options: { disableNew: true } }],
        }),
        defineField({
          name: 'keywords',
          title: 'Keywords',
          type: 'array',
          of: [{ type: 'string' }],
          description:
            
              'Matches product names. Type the words plainly. E.g. "pizza box" catches "Boxes", ' +
              'because the last word is treated as a prefix, but not "Pizzeria". All the words ' +
              'in one keyword must appear in the name, in any order; separate keywords widen ' +
              'the collection. If a keyword keeps being necessary, a product line or style is ' +
              'missing — add that instead.',
        }),
      ],
      // A filter with nothing set resolves to the parent solution's ENTIRE list,
      // which makes this page a duplicate of the one above it. Blocked here so it
      // cannot be authored; `hasAnyCondition` blocks it again at query time.
      validation: (Rule) =>
        Rule.custom((value: { productLines?: unknown[]; productStyles?: unknown[]; keywords?: unknown[] } | undefined) => {
          const n =
            (value?.productLines?.length ?? 0) +
            (value?.productStyles?.length ?? 0) +
            (value?.keywords?.length ?? 0)
          return n > 0
            ? true
            : 'Set at least one condition. With none, this page shows everything in the parent solution and duplicates the solution page itself.'
        }),
    }),
    defineField({
      name: 'excludedProducts',
      title: 'Excluded products',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'The escape hatch. The filter admits every product that matches it, including ones uploaded later, so the only way to keep one out is to name it here.',
      of: [{ type: 'reference', to: [{ type: 'product' }], options: { disableNew: true } }],
    }),

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
    // Carried here where Solution deliberately has none: two collections can
    // resolve to overlapping product sets, which is the duplicate a manual
    // canonical exists for. NOT for pagination — paginated pages self-canonicalise,
    // and pointing page 2 at page 1 de-indexes everything past the first screen.
    ...seoFields({ group: GROUPS.seo, meta: false, canonical: true, indexDefault: true }),

    // ─── SOCIAL ───────────────────────────────────────────────────────────────
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.solution }),
  ],

  preview: {
    select: {
      title: 'title',
      solution: 'solution.title',
      media: 'featuredImage',
      lines: 'filter.productLines',
      styles: 'filter.productStyles',
      keywords: 'filter.keywords',
    },
    prepare({ title, solution, media, lines, styles, keywords }) {
      // Say what the filter holds, not what it resolves to — a preview cannot run
      // the query, and a number here would be a number nobody could trust.
      const parts = [
        lines?.length ? `${lines.length} line${lines.length === 1 ? '' : 's'}` : null,
        styles?.length ? `${styles.length} style${styles.length === 1 ? '' : 's'}` : null,
        keywords?.length ? `${keywords.length} keyword${keywords.length === 1 ? '' : 's'}` : null,
      ].filter(Boolean)
      return {
        title: title || 'Untitled collection',
        subtitle: [solution, parts.length ? parts.join(' · ') : 'No conditions set'].filter(Boolean).join(' — '),
        media,
      }
    },
  },
})
