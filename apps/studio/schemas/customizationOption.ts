import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField, taggedImageType } from '../lib/media-tags'
import { seoFields } from '../lib/seo-fields'

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
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      group: 'content',
      description: 'Add images in render order — first image = hero.',
      of: [taggedImageType([MEDIA_TAG.customization], { hotspot: true })],
    }),

    // ─── CATEGORIZATION (applicability + related lists) ───────────────────────

    // ─── APPLICABILITY (PROD-2306) ────────────────────────────────────────────
    // Applicability lives on the Option, not a standalone rule type (D8b, the rule
    // type was withdrawn). `appliesTo` empty = applies to everything; scope it to
    // narrow.
    //
    // PROD-2250 (Eric + Richard, 2026-08-21): `appliesTo`/`except` target PRODUCTS
    // ONLY — never another Customization Option. Every Option↔Option relationship
    // goes through `incompatibleWith`, and only through it. This makes the
    // Sanity↔Registry boundary crisp: Sanity enumerates pairwise clashes; the
    // Registry generalises the rule over tags. (Withdraws the spec's "for a finish
    // that's the material" clause; verified 0/33 options ever targeted an Option.)
    defineField({
      name: 'appliesTo',
      title: 'Applies to',
      type: 'array',
      group: 'categorization',
      description:
        'What products this option is available on. Leave EMPTY to mean it applies to everything. Otherwise scope it to specific Product Lines, Product Styles, or Products. (Option-to-option clashes go in Incompatible with, not here.)',
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
    }),
    defineField({
      name: 'except',
      title: 'Except',
      type: 'array',
      group: 'categorization',
      description:
        'Optional carve-outs from Applies to — the specific products this option is NOT available on. Should be narrower than Applies to.',
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
      validation: (Rule) =>
        Rule.custom((except, context) => {
          const list = Array.isArray(except) ? except : []
          if (list.length === 0) return true
          const appliesTo = (context.document as { appliesTo?: unknown[] } | undefined)?.appliesTo
          if (!appliesTo || appliesTo.length === 0) {
            return 'Except is set while Applies to is empty (= everything). A carve-out from "everything" is usually clearer as a scoped Applies to.'
          }
          return true
        }).warning(),
    }),
    defineField({
      name: 'incompatibleWith',
      title: 'Incompatible with',
      type: 'array',
      group: 'categorization',
      description:
        'Other Customization Options that cannot be combined with this one — real manufacturing clashes only, a short deny-list. This is the ONLY channel for option-to-option relationships (PROD-2250). Keep it symmetric: if A lists B, B should list A.',
      of: [{ type: 'reference', to: [{ type: 'customizationOption' }] }],
      // Self-reference is an error; asymmetry is a warning. incompatibleWith now
      // carries the whole Option↔Option relationship (appliesTo no longer targets
      // Options — PROD-2250), so a missing reciprocal is worth surfacing.
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
            const targets = await client.fetch<{ _id: string; back: string[] }[]>(
              `*[_id in $ids]{ _id, "back": incompatibleWith[]._ref }`,
              { ids },
            )
            const listsSelf = (id: string) => {
              const t = targets.find((x) => x._id.replace(/^drafts\./, '') === id)
              return (t?.back ?? []).some((r) => r?.replace(/^drafts\./, '') === selfId)
            }
            const asymmetric = ids.filter((id) => !listsSelf(id))
            if (asymmetric.length > 0) {
              return `Not symmetric — ${asymmetric.length} listed option(s) don't list this one back. Add this option to their "Incompatible with" too.`
            }
          } catch {
            return true // never block on a lookup failure
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

    // A `kindOf` TARGET is never selectable — it renders as a group heading and
    // nothing else (agreed with Eric, 2026-08-21). Champagne and Deep gold are
    // the choices; "Gold" is the heading they sit under, and a customer never
    // clicks it. Offering the target as well would put one document on screen
    // twice — clickable in one place, a label in another — which is the failure
    // D40 set out to prevent.
    //
    // D40 stated it as a rule about the LIST ("either none has kindOf or every
    // one does"). This is the rule about the TARGET, which is narrower and
    // catches more: it holds across two panels, where the list rule doesn't, and
    // it allows a plain value beside a grouped one (Copper next to Champagne
    // under Gold) — legal and unconfusing, because Gold is never clickable
    // anywhere. See PROD-2250; Decisions D40 needs amending to match.
    //
    // Both halves are needed. The filter stops it being picked; the validation
    // catches a value that BECAME a target after it was already stated, which no
    // picker can see.
    defineField({
      name: 'properties',
      title: 'Properties',
      type: 'array',
      group: 'specs',
      description:
        'What this option is, in property values. The choices come from the properties its Customization type declares — if this list is empty, add the property to the type first. Values that other values are a "kind of" do not appear: they render as group headings, never as choices.',
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
                'property._ref in *[_id == $typeRef][0].properties[].property._ref' +
                ' && !(_id in *[_type == "propertyValue" && defined(kindOf)].kindOf._ref)',
              params: { typeRef },
            }
          },
        },
      }],
      validation: (Rule) =>
        Rule.custom(async (properties, context) => {
          const refs = ((properties as { _ref?: string }[] | undefined) ?? [])
            .map((r) => r?._ref)
            .filter(Boolean) as string[]
          if (refs.length === 0) return true

          const client = context.getClient({ apiVersion: '2024-01-01' })
          const { targetIds, stated } = await client.fetch<{
            targetIds: string[] | null
            stated: { _id: string; title: string | null }[]
          }>(
            `{
              "targetIds": array::unique(*[_type == "propertyValue" && defined(kindOf)].kindOf._ref),
              "stated": *[_type == "propertyValue" && _id in $refs]{_id, title}
            }`,
            { refs },
          )

          const targets = new Set(targetIds ?? [])
          const offending = (stated ?? []).filter((v) => targets.has(v._id))
          if (offending.length === 0) return true

          const names = offending.map((v) => `"${v.title ?? v._id}"`).join(', ')
          return (
            `${names} ${offending.length === 1 ? 'is a value that others' : 'are values that others'} ` +
            `are a "kind of", so ${offending.length === 1 ? 'it renders' : 'they render'} as a group ` +
            `heading rather than a choice. Offer the specific values instead — Champagne and Deep gold, ` +
            `not Gold. If you need a plain option in the group, give it a name of its own ` +
            `("Classic gold") with its own "kind of".`
          )
        }),
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
    defineField({
      name: 'comparedAgainst',
      title: 'Compared against',
      type: 'array',
      group: 'categorization',
      description: 'Sibling comparison — minimum 3 required.',
      of: [{ type: 'reference', to: [{ type: 'customizationOption' }] }],
      validation: (Rule) =>
        Rule.custom((val: unknown[] | undefined) => {
          if (!val || val.length === 0) return true
          return val.length >= 3 ? true : 'Comparison requires at least 3 items'
        }),
    }),
    defineField({
      name: 'relatedCustomizations',
      title: 'Related customizations',
      type: 'array',
      group: 'categorization',
      description: 'See also — cross-category links.',
      of: [{ type: 'reference', to: [{ type: 'customizationOption' }] }],
    }),
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
