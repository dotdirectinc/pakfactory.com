import { defineArrayMember, defineField, defineType } from 'sanity'
import { PackageIcon } from '@sanity/icons'
import { MEDIA_TAG, taggedImageType } from '../lib/media-tags'
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
 * lead-time on the page (a customer opens each included product). The `sections`
 * (page-builder) field is deferred until the shared *Sections type lands (C5,
 * PROD-2321) — added then rather than coupling a bundle to the blog block types.
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
      description: 'The bundle name — the page H1 (e.g. "Candle Launch Kit").',
      validation: (Rule) => Rule.required(),
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
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'content',
      rows: 3,
      description: 'Short intro shown on the bundle page and in cards.',
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      group: 'content',
      description: 'Bundle images, in render order — first image = hero.',
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
              options: { disableNew: true },
              description: 'An inspiration product included in the bundle.',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'quantity',
              title: 'Quantity',
              type: 'number',
              description: 'How many of this product the kit contains (e.g. 1 box, 2 inserts).',
              validation: (Rule) => Rule.required().integer().min(1),
            }),
            defineField({
              name: 'note',
              title: 'Note',
              type: 'string',
              description: 'Optional line about this part (e.g. "printed sleeve").',
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
      description: 'Issued by the product data source, like any product.',
      // Source-owned: stays editable until the Registry ships, then flips to
      // readOnly (decision b, PROD-2295). No MOQ / lead time on a bundle page —
      // a customer opens each included product (Entities/Bundle.md).
      validation: (Rule) => Rule.required(),
    }),

    // ─── SEO ──────────────────────────────────────────────────────────────────

    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: 'seo',
      description: 'Overrides the browser/search title. Aim for ≤60 characters.',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'The search-result snippet. Aim for ≤160 characters.',
      validation: (Rule) => Rule.max(160),
    }),
    pageSectionsField(SECTION_ALLOW.productPage),
    ...seoFields({ group: 'seo', meta: false }),

    // ─── SOCIAL ───────────────────────────────────────────────────────────────

    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.product }),
  ],
  preview: {
    select: { title: 'title', status: 'status', count: 'includedProducts.length', media: 'media.0' },
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
