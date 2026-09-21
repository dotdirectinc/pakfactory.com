import { defineArrayMember, defineField, defineType } from 'sanity'
import { PackageIcon } from '@sanity/icons'
import { MEDIA_TAG, taggedImageField, taggedImageType } from '../lib/media-tags'
import { uniqueSlugAcross } from '../lib/slug-rules'
import { seoFields, socialFields } from '../lib/seo-fields'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { pageSectionsField, SECTION_ALLOW } from './sections'
import { faqsField } from '../lib/faq-field'

/**
 * Bundle — a set of inspiration products sold together (a launch kit, a gift set).
 * Its own type: a bundle has no line or style, and its parts are required.
 * Entities/Bundle.md. Public page at /bundles/{slug}.
 *
 * Deliberately omitted for launch (Entities/Bundle.md): no properties, no MOQ /
 * lead-time on the page (a customer opens each included product). `sections` is
 * wired to SECTION_ALLOW.productPage. (This block used to say the field was
 * deferred "until the shared *Sections type lands" — it landed, and the field is
 * live in the deployed schema.)
 *
 * No `canonicalUrl`, deliberately (Eric, 2026-09-15). A manual canonical earns its
 * place where two URLs can structurally show the same content — Line, Style and
 * Product have that, and solutionStyle has it because two collections can overlap.
 * A bundle is one set at one flat URL whose slug is unique across bundles: there is
 * no second path to the same page. One line to add if a duplicate ever appears.
 *
 * PROD-2521 (2026-09-15) — the type predates two naming decisions and was never
 * swept, so it caught up while it still held ZERO documents and everything was
 * free:
 *   +h1, +shortName          — D52. `title` was doubling as the page heading.
 *   +shortDescription        — D50. `description` was plain text doing the card
 *     `description` → rich text   copy's job AND the page copy's job.
 *   +featuredImage           — and `media` stops claiming its first image is the
 *     hero. That positional rule came off Product in PROD-2516 for the reason it
 *     comes off here: reordering a gallery is presentation, and it was silently
 *     choosing which image represented the document.
 *   includedProducts         — `note` dropped; the reference now FILTERS to
 *     inspiration products, which the docs have always claimed and nothing
 *     enforced. `quantity` stays: it is the fact that makes a bundle a bundle
 *     rather than a list of references (1 box, 1 sleeve, 2 inserts).
 *   sku                      — no longer required. It is issued by the product
 *     data source, which has not shipped, so requiring it meant a bundle could not
 *     be authored at all without inventing one.
 */
export const bundle = defineType({
  name: 'bundle',
  title: 'Bundle',
  type: 'document',
  icon: PackageIcon,
  // Foundations (PROD-2286): the tab set comes from the one shared definition,
  // not a local literal — same field, same tab, everywhere (§2.4). Output is
  // identical to the previous inline array.
  groups: groupsFor(['content', 'categorization', 'sections', 'specs', 'seo', 'social']),
  fields: [
    // ─── CONTENT ──────────────────────────────────────────────────────────────

    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description: 'The canonical name — "Candle Launch Kit". Required, always presentable.',
      validation: (Rule) => Rule.required(),
    }),
    // One naming convention across the tree: Title is the canonical name, H1 is
    // the page heading, Short name is the card and nav label. Both overrides fall
    // back to Title, so an editor who leaves them alone gets the right string
    // everywhere. Bundle predates this and was the last type without it.
    defineField({
      name: 'h1',
      title: 'H1',
      type: 'string',
      group: 'content',
      description: 'The heading on this page. Leave empty to use the Title.',
    }),
    defineField({
      name: 'shortName',
      title: 'Short name',
      type: 'string',
      group: 'content',
      description:
        'A shorter or more customer-facing version of the Title, for cards, listings and nav. Leave empty to use the Title.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: { source: 'title' },
      description: 'The /bundles/ URL segment. Must be unique across bundles.',
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(['bundle'])),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'content',
      description:
        'Its own lifecycle. A bundle also reads as unavailable when any included product is unavailable — that is derived at read time, not set here.',
      options: {
        layout: 'radio',
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Coming soon', value: 'coming-soon' },
          { title: 'Discontinued', value: 'discontinued' },
        ],
      },
      initialValue: 'active',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      rows: 2,
      group: 'content',
      description: 'One-line summary for the bundle card, listings and the nav.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      group: 'content',
      description:
        'The full description of this bundle — what it is for and who it suits. Renders on the bundle page.',
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
    taggedImageField({
      name: 'featuredImage',
      title: 'Featured image',
      type: 'image',
      group: 'content',
      mediaTags: [MEDIA_TAG.product],
      options: { hotspot: true },
      description:
        'The one image that represents this bundle — the page hero, cards, listings and the social fallback.',
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
      name: 'media',
      title: 'Media',
      type: 'array',
      group: 'content',
      // No positional rule here. `media` used to say "first image = hero", which
      // let reordering a gallery change which image represented the bundle.
      description:
        'Additional images for this page. Order is presentation only — the card and social images come from Featured image.',
      of: [taggedImageType([MEDIA_TAG.product], { hotspot: true })],
    }),

    // ─── CATEGORIZATION (parts + curated lists) ───────────────────────────────

    defineField({
      name: 'includedProducts',
      title: 'Included products',
      type: 'array',
      group: 'categorization',
      description:
        'The parts of this bundle. Inspiration (preset) products only — a bundle of a configurable product cannot be pre-configured. At least one.',
      validation: (Rule) => Rule.required().min(1),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'bundleItem',
          fields: [
            defineField({
              name: 'product',
              title: 'Product',
              type: 'reference',
              to: [{ type: 'product' }],
              // The filter is the point. "Inspiration products only" has been in
              // the handbook and in this schema's own prose since the type was
              // designed, and nothing enforced it — the picker offered all 310.
              // A bundle of a configurable product cannot be pre-configured,
              // which is the whole promise of a bundle.
              options: { disableNew: true, filter: 'kind == "inspiration"' },
              description:
                'An inspiration (preset) product included in the bundle. The picker shows only presets.',
              validation: (Rule) => Rule.required(),
            }),
            // Kept when `note` went (Eric, 2026-09-15): quantity is the fact that
            // makes a bundle a bundle rather than a list of references — a kit is
            // 1 box, 1 sleeve, 2 inserts. Cheap to keep now at 0 documents;
            // adding it back later is a §4.3 migration on populated data.
            defineField({
              name: 'quantity',
              title: 'Quantity',
              type: 'number',
              description: 'How many of this product the kit contains (e.g. 1 box, 2 inserts).',
              validation: (Rule) => Rule.required().integer().min(1),
            }),
          ],
          preview: {
            select: { title: 'product.title', quantity: 'quantity' },
            prepare({ title, quantity }) {
              return { title: title ?? 'No product', subtitle: quantity ? `× ${quantity}` : '' }
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'solutions',
      title: 'Solutions',
      type: 'array',
      group: 'categorization',
      description: 'Every solution this bundle targets — industries, channels, focus areas, use cases.',
      of: [{ type: 'reference', to: [{ type: 'solution' }], options: { disableNew: true } }],
    }),
    faqsField({ group: GROUPS.categorization, mode: 'reference', max: 6, min: 3 }),

    // ─── SPECS ────────────────────────────────────────────────────────────────

    defineField({
      name: 'sku',
      title: 'SKU',
      type: 'string',
      group: 'specs',
      description:
        'Issued by the product data source. Leave blank until the source assigns one.',
      // Source-owned: stays editable until the Registry ships, then flips to
      // readOnly (decision b, PROD-2295). No MOQ / lead time on a bundle page —
      // a customer opens each included product (Entities/Bundle.md).
      //
      // NOT required (PROD-2521). The source that issues SKUs has not shipped, so
      // requiring one meant a bundle could not be authored at all without somebody
      // inventing a value — which is worse than a blank field, because an invented
      // SKU looks issued. Becomes required again when the Registry does.
    }),

    // ─── SEO ──────────────────────────────────────────────────────────────────

    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: 'seo',
      description: 'Overrides the browser and search title. Best kept under 60 characters.',
      validation: (Rule) => Rule.max(60).warning('Best kept under 60 characters.'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'The snippet shown under the title in search results. Best kept under 160 characters.',
      validation: (Rule) => Rule.max(160).warning('Best kept under 160 characters.'),
    }),
    pageSectionsField(SECTION_ALLOW.productPage),
    ...seoFields({ group: 'seo', meta: false }),

    // ─── SOCIAL ───────────────────────────────────────────────────────────────

    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.product }),
  ],
  preview: {
    select: { title: 'title', status: 'status', count: 'includedProducts.length', media: 'featuredImage' },
    prepare({ title, status, count, media }) {
      const parts = count ? `${count} product${count === 1 ? '' : 's'}` : 'No products'
      return {
        title,
        subtitle: status === 'active' ? parts : `[${status?.toUpperCase()}] ${parts}`,
        media,
      }
    },
  },
})
