import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField, taggedImageType } from '../lib/media-tags'
import { seoFields } from '../lib/seo-fields'
import { deprecateField } from '../lib/schema-guards'

export const customizationOption = defineType({
  name: 'customizationOption',
  title: 'Customization Option',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'categorization', title: 'Categorization' },
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
      description: 'The customization option name shown to customers (e.g. "Matte Lamination").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      description: 'URL-safe identifier, generated from the title. Unique across all customizations.',
      options: { source: 'title' },
      validation: (Rule) =>
        Rule.required().custom(async (slug, context) => {
          if (!slug?.current) return 'Slug is required'
          const client = context.getClient({ apiVersion: '2024-01-01' })
          const doc = context.document as { _id?: string }
          const id = doc?._id?.replace('drafts.', '')
          const draftId = `drafts.${id}`
          const existing = await client.fetch(
            `*[_type == "customizationOption" && slug.current == $slug && !(_id in [$id, $draftId])][0]._id`,
            { slug: slug.current, id, draftId }
          )
          return existing ? 'Slug must be unique across all customizations' : true
        }),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      group: 'content',
      description: 'The customization category this option belongs to — required. Scopes the Type picker below.',
      to: [{ type: 'customizationCategory' }],
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'reference',
      group: 'content',
      to: [{ type: 'customizationType' }],
      description: 'Filtered by the selected category. Select a category first.',
      options: {
        disableNew: true,
        filter: ({ document }: { document: { category?: { _ref?: string } } }) => {
          const categoryRef = document?.category?._ref
          if (!categoryRef) return { filter: 'false' }
          return {
            filter: 'category._ref == $categoryRef',
            params: { categoryRef },
          }
        },
      },
      hidden: ({ document }) => !document?.category,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'content',
      description: 'Lifecycle: Active (offered now), Future (coming soon), or Deprecated (retired).',
      options: {
        layout: 'radio',
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Future', value: 'future' },
          { title: 'Deprecated', value: 'deprecated' },
        ],
      },
      initialValue: 'active',
      validation: (Rule) => Rule.required(),
    }),
    // D47 / ADR-017: `role` sits on the OPTION, not the Type. A Type is a taxonomy
    // of what things are and can be mixed — Lamination holds a technical Matte
    // Lamination and a customer-facing Leather Lamination. Holding the flag on the
    // parent would make an Option inherit its own properties (inheritance-with-
    // overrides, retired by D12/D30). Whether a Type is a configurator panel is a
    // rollup: true if any of its Options is `configurable`.
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      group: 'content',
      description:
        'Does a customer pick this in the configurator? Configurable: Matte, High-Barrier, SBS. ' +
        'Reference: VMPET Film, Matte Lamination — real materials and processes a customer never picks ' +
        'directly, reached through the simplified option they achieve. This also decides whether the ' +
        'document has a URL: reference options have library pages, configurable options do not.',
      options: {
        layout: 'radio',
        list: [
          { title: 'Configurable — a customer picks this in the configurator', value: 'configurable' },
          { title: 'Reference — technical; it has a library page but never reaches the configurator', value: 'reference' },
        ],
      },
      // Fails loud: a forgotten `reference` Option produces a warning nobody needed,
      // which is visible. A forgotten `configurable` Option would go silent and hide
      // a customer-facing choice.
      initialValue: 'configurable',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      group: 'content',
      description: 'Add images in render order — first image = hero.',
      of: [taggedImageType([MEDIA_TAG.customization], { hotspot: true })],
    }),

    // ─── CATEGORIZATION (applicability + related lists) ───────────────────────

    // ─── AVAILABILITY (PROD-2250 / D47 / ADR-017) ─────────────────────────────
    // One `appliesTo` array used to answer two unrelated questions — which products
    // offer this as a choice, and which materials it can be applied to — and which
    // grid a given row belonged to was knowable only by inspecting each reference's
    // `_type`. D42 patched that with a rule that rejected a wrong-axis pick; a field
    // that needs a rule to stop it crossing its own axis is the wrong field.
    //
    // The deciding argument is the DEFAULT. One array can carry only one meaning for
    // "empty", and the two grids need opposite ones: an unauthored product list must
    // fail closed (offered nowhere), while an unauthored material list must fail open
    // (no restriction). Hence one field per axis, each with the default its own
    // question demands. D42's wrong-axis validation is retired rather than
    // reimplemented — each picker now offers one axis, so a wrong-axis pick is
    // unpickable rather than rejected.
    //
    // Boundary rule, repeated in both descriptions so it cannot be lost:
    //   Material constraints are always POSITIVE, in `worksOnCustomizations`.
    //   `incompatibleWithCustomizations` is only for two things a customer might
    //   otherwise pick together.
    // Without it, "Soft Touch doesn't work on blister plastic" has two homes and the
    // allow-list/deny-list duplication comes straight back.

    defineField({
      name: 'availableOnProducts',
      title: 'Available on products',
      type: 'array',
      group: 'categorization',
      description:
        'Which products offer this as a choice — scope it to Product Lines, Product Styles, or individual Products. EMPTY MEANS OFFERED NOWHERE: this list is the whole answer, so a configurable option needs at least one entry. What this can be applied on top of goes in "Works on", not here.',
      of: [
        {
          type: 'reference',
          to: [
            { type: 'productLine' },
            { type: 'productStyle' },
            { type: 'product' },
          ],
        },
      ],
      // Reads `role` (D47 §2). Before `role` existed this warning fired on 25 of 33
      // options while admitting it could not tell which case it was in — the kind of
      // warning editors learn to ignore before the real one arrives. Now each branch
      // says something true and actionable.
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const list = Array.isArray(value) ? value : []
          const role = (context.document as { role?: string } | undefined)?.role
          if (role === 'configurable' && list.length === 0) {
            return 'Empty means offered nowhere, so this option never reaches the configurator. Scope it to at least one Product Line, Style, or Product — or set Role to Reference if it is technical and never picked directly.'
          }
          if (role === 'reference' && list.length > 0) {
            return 'A reference option is never picked in the configurator, so product availability has no effect. Clear it, or set Role to Configurable.'
          }
          return true
        }).warning(),
    }),
    defineField({
      name: 'exceptProducts',
      title: 'Except on',
      type: 'array',
      group: 'categorization',
      description:
        'Carve-outs from "Available on products" — the specific Styles or Products this is NOT available on. Empty means no carve-out. Should be narrower than what Available on products opened up.',
      // Narrower than the field it replaces, which also accepted a Product Line: a
      // carve-out at line grain is the same statement as not listing the line above.
      // D42's plan to add a `customizationOption` target is withdrawn (D47 §1) —
      // material constraints are positive, in `worksOnCustomizations`.
      of: [
        {
          type: 'reference',
          to: [
            { type: 'productStyle' },
            { type: 'product' },
          ],
        },
      ],
      validation: (Rule) =>
        Rule.custom((except, context) => {
          const list = Array.isArray(except) ? except : []
          if (list.length === 0) return true
          const available = (context.document as { availableOnProducts?: unknown[] } | undefined)
            ?.availableOnProducts
          if (!available || available.length === 0) {
            return 'Except on is set while Available on products is empty (= offered nowhere). A carve-out from nothing has no effect — scope Available on products instead.'
          }
          return true
        }).warning(),
    }),
    defineField({
      name: 'worksOnCustomizations',
      title: 'Works on',
      type: 'array',
      group: 'categorization',
      description:
        'Which materials or other customizations this can be applied ON TOP OF — Soft Touch Lamination works on paperboard, not on blister plastic. EMPTY MEANS NO MATERIAL RESTRICTION: this only narrows what Available on products already opened up, it never widens it. Point at a whole Customization Type to mean "any option under it".',
      // The finish × material constraint, which had nowhere to live under the single
      // `appliesTo` array — this is the field whose absence forced the Surface Finish
      // split by material family (ADR-017 §4). Empty fails OPEN, the opposite of
      // `availableOnProducts`, which is the whole reason it is its own field.
      of: [
        {
          type: 'reference',
          to: [
            { type: 'customizationType' },
            { type: 'customizationOption' },
          ],
        },
      ],
    }),
    defineField({
      name: 'incompatibleWithCustomizations',
      title: "Can't combine with",
      type: 'array',
      group: 'categorization',
      description:
        'Two things a customer might otherwise pick together but cannot — real manufacturing clashes only, a short deny-list. Empty means no known clash, which fails open deliberately: an unauthored clash must not invent one. A material constraint is NOT a clash — that belongs in "Works on". Keep it symmetric: if A lists B, B should list A.',
      of: [
        {
          type: 'reference',
          to: [
            { type: 'customizationType' },
            { type: 'customizationOption' },
          ],
        },
      ],
      // Self-reference is an error; asymmetry is a warning. Symmetry is only asked of
      // option→option pairs: a Type has no reciprocal field to answer with, so naming
      // a whole Type is one-directional by construction. That Type target is what
      // makes `customizationType.cardinality` a prerequisite (D43) — "can't combine
      // with Embossing & Debossing" only reads unambiguously once you know whether a
      // customer takes one option from that type or several.
      validation: (Rule) =>
        Rule.custom(async (value, context) => {
          const selfId = (context.document?._id ?? '').replace(/^drafts\./, '')
          const refs = (value as { _ref?: string }[] | undefined) ?? []
          const ids = refs.map((r) => r._ref?.replace(/^drafts\./, '')).filter(Boolean) as string[]
          if (ids.includes(selfId)) {
            return 'An option cannot be incompatible with itself.'
          }
          if (ids.length === 0) return true
          try {
            const client = context.getClient({ apiVersion: '2024-01-01' })
            const targets = await client.fetch<{ _id: string; _type: string; back: string[] }[]>(
              `*[_id in $ids]{ _id, _type, "back": incompatibleWithCustomizations[]._ref }`,
              { ids },
            )
            const options = targets.filter((t) => t._type === 'customizationOption')
            const listsSelf = (t: { back: string[] }) =>
              (t.back ?? []).some((r) => r?.replace(/^drafts\./, '') === selfId)
            const asymmetric = options.filter((t) => !listsSelf(t))
            if (asymmetric.length > 0) {
              return `Not symmetric — ${asymmetric.length} listed option(s) don't list this one back. Add this option to their "Can't combine with" too.`
            }
          } catch {
            return true // never block on a lookup failure
          }
          return true
        }).warning(),
    }),
    // D47 §1 — `achieves` names CANDIDATES, not a recipe. It points from a technical
    // option at the simplified, customer-facing option it can deliver: VMPET Film
    // achieves High-Barrier. The reverse list shown on the simplified option is
    // derived from whatever points at it, so nothing is typed there.
    //
    // The non-sufficiency caveat lives in this description because that is the
    // editor-facing surface. The derived reverse list is customer-facing, and
    // "High-Barrier — achievable by: PET, VMPET, LDPE" still reads as "any of these
    // gives you high barrier": whatever renders it needs its own framing copy. That
    // is a rendering concern and no schema change fixes it.
    defineField({
      name: 'achieves',
      title: 'Achieves',
      type: 'array',
      group: 'categorization',
      description:
        'On a technical (Reference) option only: which simplified, customer-facing option this one can deliver — VMPET Film achieves High-Barrier. Listing an option here does NOT claim this one is sufficient on its own; which combination is actually used is decided at quoting.',
      of: [{ type: 'reference', to: [{ type: 'customizationOption' }] }],
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const list = Array.isArray(value) ? value : []
          if (list.length === 0) return true
          const role = (context.document as { role?: string } | undefined)?.role
          if (role === 'configurable') {
            return 'Achieves is for technical options — it names the simplified option this one delivers. A configurable option is already the simplified end of that relationship, so it should be the target, not the source.'
          }
          return true
        }).warning(),
    }),

    // `applicableProductCategories` / `applicableProductStyleCategories` were
    // removed here in PROD-2306 once the backfill into `appliesTo` was verified on
    // production (8/8 options). Run migrate:unset-legacy-applies to drop the now
    // orphaned field data from the dataset.
    // Legacy industry / use-case reference arrays (applicableIndustryCategories,
    // useCases, industries) were removed in PROD-2284 — unpopulated on every
    // option and pointing at the now-retired industry/industryCategory/useCase
    // types. Option applicability is expressed via `properties[]` below.
    // ─── PROPERTIES ───────────────────────────────────────────────────────────
    // One field replacing eight. Each of the eight hardcoded its own property
    // group in a picker filter, so a group with no matching field was
    // unreachable — which is why none of the 33 options can state a Finish Type.
    // Scope now comes from the Type's declaration instead of from the field name.

    defineField({
      name: 'properties',
      title: 'Properties',
      type: 'array',
      group: 'specs',
      description:
        'What this option is, in property values. The choices come from the properties its Customization type declares — if this list is empty, add the property to the type first.',
      of: [{
        type: 'reference',
        to: [{ type: 'propertyValue' }],
        options: {
          disableNew: true,
          filter: ({ document }) => {
            const typeRef = (document as { type?: { _ref?: string } } | undefined)?.type?._ref
            // No type chosen yet, so there is no declaration to scope by.
            if (!typeRef) return { filter: 'false' }
            return {
              filter:
                'property._ref in *[_id == $typeRef][0].properties[].property._ref',
              params: { typeRef },
            }
          },
        },
      }],
    }),

    // ─── RETIRING ─────────────────────────────────────────────────────────────
    // Superseded by `properties` above. Still populated, so they are marked
    // deprecated rather than dropped (Conventions §4.3): Sanity renders them
    // read-only with a visible message. They come out once the values are
    // carried across. Counts are published documents on 2026-08-14.

    defineField({
      name: 'materialSource',
      title: 'Material source',
      type: 'reference',
      group: 'specs',
      to: [{ type: 'propertyValue' }],
      readOnly: true,
      deprecated: { reason: 'Replaced by Properties — do not write to this field. 4 options still hold a value.' },
      options: {
        filter: 'property->slug.current == "source"',
      },
    }),
    defineField({
      name: 'physicalProperties',
      title: 'Physical properties',
      type: 'array',
      group: 'specs',
      readOnly: true,
      deprecated: { reason: 'Replaced by Properties — do not write to this field. 8 options still hold values.' },
      of: [{ type: 'reference', to: [{ type: 'propertyValue' }] }],
      options: {
        filter: 'property->slug.current == "physical-properties"',
      } as never,
    }),
    defineField({
      name: 'aesthetic',
      title: 'Aesthetic',
      type: 'array',
      group: 'specs',
      readOnly: true,
      deprecated: { reason: 'Replaced by Properties — do not write to this field. 8 options still hold values.' },
      of: [{ type: 'reference', to: [{ type: 'propertyValue' }] }],
      options: {
        filter: 'property->slug.current == "aesthetic"',
      } as never,
    }),
    defineField({
      name: 'colors',
      title: 'Colors',
      type: 'array',
      group: 'specs',
      readOnly: true,
      deprecated: { reason: 'Replaced by Properties — do not write to this field. 4 options still hold values.' },
      of: [{ type: 'reference', to: [{ type: 'propertyValue' }] }],
      options: {
        filter: 'property->slug.current == "color"',
      } as never,
    }),
    defineField({
      name: 'sustainability',
      title: 'Sustainability',
      type: 'array',
      group: 'specs',
      readOnly: true,
      deprecated: { reason: 'Replaced by Properties — do not write to this field. 5 options still hold values.' },
      of: [{ type: 'reference', to: [{ type: 'propertyValue' }] }],
      options: {
        filter: 'property->slug.current == "sustainability"',
      } as never,
    }),

    // ─── CONTENT (landing-page prose) ─────────────────────────────────────────

    defineField({
      name: 'whatIsBlock',
      title: 'What is it?',
      type: 'object',
      group: 'content',
      description: 'Landing-page explainer of what this customization is.',
      fields: [
        { name: 'title', type: 'string', title: 'Heading' },
        { name: 'body', type: 'array', title: 'Body', of: [{ type: 'block' }] },
      ],
    }),
    defineField({
      name: 'whyChooseBlock',
      title: 'Why choose it?',
      type: 'object',
      group: 'content',
      description: 'Landing-page copy on why a customer would pick this customization.',
      fields: [
        { name: 'title', type: 'string', title: 'Heading' },
        { name: 'body', type: 'array', title: 'Body', of: [{ type: 'block' }] },
      ],
    }),

    // `specTables` was removed in PROD-2250 — Decisions D41 deleted Option Group.
    // A spec-table row was always a choice, so it becomes a Property Value
    // (offered through `properties` above); the numbers beside it become `facts`
    // on that Property Value. Never populated, so nothing to migrate. If a number
    // ever differs per Option it returns as a small value→fact list here.

    // Related items.
    // `applicableCustomizations` (an Option→Option allow-list) was removed in
    // PROD-2250 — it was the same relationship the "products only" decision routed
    // exclusively through `incompatibleWith`, expressed in the opposite direction,
    // and it was never in the entity spec. 0/33 options populated it.
    // D47 §5 / ADR-017 — retired, matching the treatment its Product twin already
    // shipped (`product.comparedAgainst`). Comparison is content: a guide, written
    // once, linked from both. Kept rather than dropped because 8 of 33 options are
    // populated; `deprecateField` renders it read-only with a visible reason so the
    // data stays legible while nothing new is written. The minimum-3 rule goes with
    // it — a read-only field cannot be brought up to a minimum.
    defineField({
      name: 'comparedAgainst',
      title: 'Compared against (old)',
      type: 'array',
      group: 'categorization',
      of: [{ type: 'reference', to: [{ type: 'customizationOption' }] }],
      ...deprecateField('Retired — comparison is content: a guide, written once, linked from both.'),
    }),
    // `relatedCustomizations` ("See also — cross-category links") was hard-removed
    // here in PROD-2250 / D47 §5. Unlike `comparedAgainst` it was populated on 0 of
    // 33 options, so there was no data to keep legible and nothing to deprecate
    // toward. The migration unsets the key on any straggler.
    // Note: `glossaryTerm.relatedCustomizations` is a different field on a different
    // type and is untouched.
    defineField({
      name: 'faqs',
      title: 'FAQs',
      type: 'array',
      group: 'categorization',
      description: 'Question-and-answer pairs shown on the customization landing page.',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'question', type: 'string', title: 'Question' },
            {
              name: 'answer',
              type: 'array',
              title: 'Answer',
              of: [{ type: 'block' }],
            },
          ],
          preview: { select: { title: 'question' } },
        },
      ],
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
    // Robots toggles from the one shared definition every other page type uses.
    // This type had meta tags and no way to keep the page out of the index.
    ...seoFields({ group: 'seo', meta: false }),

    // ─── SOCIAL ───────────────────────────────────────────────────────────────

    defineField(taggedImageField({
      name: 'ogImage',
      title: 'OG image',
      type: 'image',
      group: 'social',
      mediaTags: ogMediaTags(MEDIA_TAG.customization),
      options: { hotspot: true },
      description: 'Open Graph / social-share image. Falls back to the first media image when empty.',
      fields: [
        defineField({ name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers and SEO.' }),
      ],
    })),
  ],

  preview: {
    select: {
      title: 'title',
      status: 'status',
      category: 'category.title',
      type: 'type.title',
      media: 'media.0',
      appliesTo: 'appliesTo',
      except: 'except',
    },
    prepare({ title, status, category, type, media, appliesTo, except }) {
      // Answer "what does this apply to?" in the list without opening every ref.
      const n = Array.isArray(appliesTo) ? appliesTo.length : 0
      const exceptN = Array.isArray(except) ? except.length : 0
      const scope = n === 0 ? 'all' : `${n} target${n === 1 ? '' : 's'}`
      const applies = `applies to ${scope}${exceptN ? ` · except ${exceptN}` : ''}`
      const base = [category, type].filter(Boolean).join(' → ')
      const subtitle = base ? `${base} — ${applies}` : applies
      return {
        title,
        subtitle: status === 'active' ? subtitle : `[${status?.toUpperCase()}] ${subtitle}`,
        media,
      }
    },
  },
})
