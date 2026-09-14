import { defineField, defineType } from 'sanity'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'

export const customizationType = defineType({
  name: 'customizationType',
  title: 'Customization Type',
  type: 'document',
  // `seo` and `social` went with the four fields removed on 2026-09-13 (PROD-2481).
  // A Customization Type has never had a page, so both tabs described a surface that
  // does not exist.
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'specs', title: 'Specs' },
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
    // A configurator panel heading cannot carry "Surface Finish (non-paper)", but
    // Title has to stay unambiguous — that parenthetical exists SO AN EDITOR CAN TELL
    // IT FROM THE PAPER ONE. Short name is the customer-facing label; empty falls back
    // to Title, so leaving it alone is always correct.
    //
    // Same field, same argument, as `customizationOption.shortName` one level down and
    // `solution.shortName` beside it. A Type has no page, but it IS customer-visible:
    // the configurator renders it as the heading a customer reads before picking an
    // Option beneath it. That answers the "🟠 Open — the Type names" question the
    // content-model handbook has carried since August.
    //
    // ⚠️ `Surface Finish (non-paper)` needs a separate look. ADR-017 §4 records that
    // splitting Surface Finish by material family was a workaround for a constraint
    // `worksOnCustomizations` now holds properly. A short name hides that split from
    // customers; it does not resolve whether the two Types should be one.
    defineField({
      name: 'shortName',
      title: 'Short name',
      type: 'string',
      group: 'content',
      description:
        'A shorter, customer-facing version of the Title — for the configurator panel heading and anywhere the full name will not fit. Leave empty to use the Title.',
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
    // D47 §4 / ADR-017 — this must ship in the same PR as, or ahead of, any
    // `customizationType` target on `incompatibleWithCustomizations` (D43): naming a
    // whole Type as a clash only reads unambiguously once you know whether a customer
    // takes one Option from it or several.
    //
    // Not inherited from the Category. Materials are one-per-Type by the diagram's
    // blanket "Single Selection (Within Each Type)", but Finishing and Additional
    // Customization are mixed — Embossing & Debossing and Closures allow several while
    // Foiling and Windows do not — so the Category cannot answer it.
    //
    // Renamed from `cardinality` on 2026-09-14 (PROD-2482). It shared that name with
    // `property.cardinality`, which counts something else entirely: this one counts
    // OPTIONS a customer picks from this Type, that one counts VALUES one option or
    // product holds for a property. D45 accepted the collision on condition that
    // everyone said "the Type's cardinality" out loud, forever; renaming both retires
    // that obligation instead of paying it indefinitely. The two are two hops apart
    // and never appear on the same document, so the data was never ambiguous — only
    // the conversation was.
    defineField({
      name: 'customerSelects',
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
      // `one` / `many` unchanged by the rename — D48 fixed that vocabulary for every
      // field of this shape, and the rename is about the field's NAME, not its values.
      //
      // Defaults to `one`, which is what the diagram states for every Material and
      // Printing type and for most of Finishing; `many` is the marked exception, and
      // the live data agrees — 32 of 37 are `one`.
      initialValue: 'one',
      validation: (Rule) => Rule.required(),
    }),
    // DEPRECATED by the rename above. Kept because it is populated on all 37 Types
    // (drafts included), and Conventions §4.3 forbids removing a populated field in
    // the change that stops using it. `migrate:split-customization-role` copies it to
    // `customerSelects`; removal is a later sweep.
    //
    // Contrast `property.cardinality`, renamed outright in the same PR — that one was
    // unset on all 9 documents, so there was nothing to deprecate toward.
    defineField({
      name: 'cardinality',
      title: 'How many can a customer choose? (deprecated)',
      type: 'string',
      group: 'content',
      readOnly: true,
      description:
        'DEPRECATED — renamed to "How many can a customer choose?" (`customerSelects`). Read-only; do not author. Scheduled for removal once the rename is verified.',
      options: {
        layout: 'radio',
        list: [
          { title: 'One', value: 'one' },
          { title: 'Several', value: 'many' },
        ],
      },
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
    // `media` was REMOVED here on 2026-09-13 (PROD-2481). Unpopulated on all 36 Types
    // and read by nothing — `customizationType` appears nowhere in packages/sanity/src,
    // apps/www/src or apps/blog/src. The configurator's visual is the OPTION's swatch,
    // which is also what the split-by-material-family argument turns on: "a document
    // carries one image and one description — a matte board and a matte film pouch do
    // not photograph the same." That puts the image on the Option, where it is already
    // authored.

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

    // ─── SEO / SOCIAL — both REMOVED on 2026-09-13 (PROD-2481) ────────────────
    // `metaTitle`, `metaDescription` and `ogImage` described a page this type has
    // never had. Only Options get pages, and only when `role` is `reference`; the
    // Type has no URL by design, not by omission. All three were unpopulated on all
    // 36 published Types, and nothing read them.
  ],
  preview: {
    select: { title: 'title', category: 'category.title' },
    prepare({ title, category }) {
      return { title, subtitle: category ? `Type in ${category}` : 'Customization Type' }
    },
  },
})
