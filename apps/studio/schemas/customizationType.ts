import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField, taggedImageType } from '../lib/media-tags'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'

export const customizationType = defineType({
  name: 'customizationType',
  title: 'Customization Type',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'specs', title: 'Specs' },
    { name: 'seo', title: 'SEO' },
    { name: 'social', title: 'Social' },
  ],
  fields: [
    // ─── CONTENT ──────────────────────────────────────────────────────────────

    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description: 'The customization type name (e.g. "Foil Stamping", "Window Patching").',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle()),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: { source: 'title' },
      description: 'URL-safe identifier, generated from the title.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      group: 'content',
      description: 'The customization category this type belongs to (its parent) — required.',
      to: [{ type: 'customizationCategory' }],
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    // D47 §4 / ADR-017 — `cardinality` must ship in the same PR as, or ahead of, any
    // `customizationType` target on `incompatibleWithCustomizations` (D43): naming a
    // whole Type as a clash only reads unambiguously once you know whether a customer
    // takes one Option from it or several.
    //
    // Not inherited from the Category. Materials are one-per-Type by the diagram's
    // blanket "Single Selection (Within Each Type)", but Finishing and Additional
    // Customization are mixed — Embossing & Debossing and Closures allow several while
    // Foiling and Windows do not — so the Category cannot answer it.
    defineField({
      name: 'cardinality',
      title: 'How many can a customer choose?',
      type: 'string',
      group: 'content',
      description:
        'How many of this type\'s options a customer may pick in the configurator. One — Paperboard: a box is made of a single board. Several — Embossing & Debossing: a design can carry more than one.',
      options: {
        layout: 'radio',
        list: [
          { title: 'One — a single option from this type', value: 'one' },
          { title: 'Several — any number of this type\'s options', value: 'many' },
        ],
      },
      // `one` / `many`, matching `property.cardinality` — the two fields share a name
      // and must share a vocabulary, or a query written from the handbook reads `one`
      // and finds `single` (Eric's schema review, D48). The Studio labels are unchanged.
      //
      // Defaults to `one`, which is what the diagram states for every Material and
      // Printing type and for most of Finishing; `many` is the marked exception.
      initialValue: 'one',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'content',
      rows: 3,
      description: 'One sentence on what this customization type is, for the content team.',
    }),
    // `order` was REMOVED here on 2026-09-01. It sorted Types within their category
    // and nothing read it — no GROQ query, no desk pane, no registry projection (the
    // exporter's `order` comes from Postgres `sort_order`). Its stated successor, "an
    // ordered array on the listing/nav singleton (PROD-2292)", DOES NOT EXIST and is
    // not in that ticket's scope: PROD-2292 builds 19 standing pages and none of them
    // is a customization/capabilities listing. Keeping a read-only field against a
    // successor nobody has specified is how a deprecation becomes permanent. The 14
    // values are recorded in ADR-017 if the ordering is ever wanted back.
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      group: 'content',
      description: 'Illustrative images for this customization type.',
      of: [taggedImageType([MEDIA_TAG.customization], { hotspot: true })],
    }),

    // ─── SPECS ────────────────────────────────────────────────────────────────
    // The Type declares which properties and spec tables apply to the options
    // beneath it. It holds no values of its own — the option states its own rows.

    defineField({
      name: 'properties',
      title: 'Properties',
      type: 'array',
      group: 'specs',
      description:
        'Which properties the options under this type describe themselves with. An option can only pick values from the properties listed here, so an empty list means its Properties field will have nothing to choose from.',
      of: [{
        type: 'object',
        name: 'declaredProperty',
        fields: [
          defineField({
            name: 'property',
            title: 'Property',
            type: 'reference',
            to: [{ type: 'property' }],
            options: { disableNew: true },
            description: 'The named dimension — Sustainability, Color, Finish Type.',
            validation: (Rule) => Rule.required(),
          }),
          defineField({
            name: 'usage',
            title: 'How it is used',
            type: 'string',
            description:
              'Stated — the option asserts this as a fact about itself. Selectable — the customer chooses a value for it when configuring.',
            options: {
              layout: 'radio',
              list: [
                { title: 'Stated', value: 'stated' },
                { title: 'Selectable', value: 'selectable' },
              ],
            },
            initialValue: 'stated',
            validation: (Rule) => Rule.required(),
          }),
        ],
        preview: {
          select: { title: 'property.title', subtitle: 'usage' },
        },
      }],
    }),
    // `optionGroups` (declared spec tables, pick-one/pick-many) was removed in
    // PROD-2250 — Decisions D41 deleted Option Group. What a spec table listed
    // was always a set of choices, so those become Property Value documents and
    // arrive through `properties` above; the numbers beside them become `facts`
    // on the Property Value. Never populated, so nothing to migrate.
    //
    // `sharedSpecsNote` (help text stored as content, the last of the six
    // inheritance fields) was removed in PROD-2250 — the sentence now lives as a
    // schema description on each table. migrate:customization-cleanup clears the
    // 9 orphaned values from the dataset.

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

    // ─── SOCIAL ───────────────────────────────────────────────────────────────

    defineField(taggedImageField({
      name: 'ogImage',
      title: 'OG image',
      type: 'image',
      group: 'social',
      mediaTags: ogMediaTags(MEDIA_TAG.customization),
      options: { hotspot: true },
      description: 'Open Graph / social-share image.',
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' }),
      ],
    })),
  ],
  preview: {
    select: { title: 'title', category: 'category.title' },
    prepare({ title, category }) {
      return { title, subtitle: category ? `Type in ${category}` : 'Customization Type' }
    },
  },
})
