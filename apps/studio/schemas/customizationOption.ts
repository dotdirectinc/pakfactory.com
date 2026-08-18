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
      of: [taggedImageType([MEDIA_TAG.capability], { hotspot: true })],
    }),

    // ─── CATEGORIZATION (applicability + related lists) ───────────────────────

    // ─── APPLICABILITY (PROD-2306) ────────────────────────────────────────────
    // Applicability lives on the Option, not a standalone rule type (D8b, the rule
    // type was withdrawn). `appliesTo` empty = applies to everything; scope it to
    // narrow. `incompatibleWith` is a short manufacturing deny-list, not thousands.
    defineField({
      name: 'appliesTo',
      title: 'Applies to',
      type: 'array',
      group: 'categorization',
      description:
        'What this option is available on. Leave EMPTY to mean it applies to everything. Otherwise scope it to specific Product Lines, Product Styles, Products, or — for a finish constrained by its material — Customization Options.',
      of: [
        {
          type: 'reference',
          to: [
            { type: 'productLine' },
            { type: 'productStyle' },
            { type: 'product' },
            { type: 'customizationOption' },
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
        'Optional carve-outs from Applies to — the specific targets this option is NOT available on. Should be narrower than Applies to.',
      of: [
        {
          type: 'reference',
          to: [
            { type: 'productLine' },
            { type: 'productStyle' },
            { type: 'product' },
            { type: 'customizationOption' },
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
        'Other Customization Options that cannot be combined with this one — real manufacturing clashes only, a short deny-list. Keep it symmetric: if A lists B, B should list A.',
      of: [{ type: 'reference', to: [{ type: 'customizationOption' }] }],
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const selfId = (context.document?._id ?? '').replace(/^drafts\./, '')
          const refs = (value as { _ref?: string }[] | undefined) ?? []
          if (refs.some((r) => r._ref?.replace(/^drafts\./, '') === selfId)) {
            return 'An option cannot be incompatible with itself.'
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
    // capability and pointing at the now-retired industry/industryCategory/useCase
    // types. Capability applicability is expressed via `properties[]` below.
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

    // ─── SPEC TABLES ──────────────────────────────────────────────────────────
    // This option's own complete rows. Nothing is inherited: the type declares
    // which tables apply (`optionGroups`) and this states the values. Replaces
    // the three show/override pairs, which were the last surviving piece of
    // inheritance-with-overrides — and which nobody ever used.
    //
    // Emptiness is the switch. A table with rows renders and one without
    // doesn't, so the retired `show*` booleans could only ever disagree with
    // the data.

    defineField({
      name: 'specTables',
      title: 'Spec tables',
      type: 'array',
      group: 'specs',
      description:
        'The rows this option states, for each table its customization type declares. Leave a table out and it simply does not render.',
      of: [{
        type: 'object',
        name: 'specTable',
        fields: [
          defineField({
            name: 'group',
            title: 'Table',
            type: 'reference',
            to: [{ type: 'optionGroup' }],
            options: {
              disableNew: true,
              // Only the tables this option's type actually declares.
              filter: ({ document }) => {
                const typeRef = (document as { type?: { _ref?: string } } | undefined)?.type?._ref
                if (!typeRef) return { filter: 'false' }
                return {
                  filter: '_id in *[_id == $typeRef][0].optionGroups[].group._ref',
                  params: { typeRef },
                }
              },
            },
            description: 'Pick from the tables declared on this option\'s customization type.',
            validation: (Rule) => Rule.required(),
          }),
          defineField({
            name: 'rows',
            title: 'Rows',
            type: 'array',
            description:
              'One entry per row. Each cell names a column from the table definition and carries its value.',
            of: [{
              type: 'object',
              name: 'specRow',
              fields: [
                defineField({
                  name: 'cells',
                  title: 'Cells',
                  type: 'array',
                  description: 'One per column in the table definition.',
                  of: [{
                    type: 'object',
                    name: 'specCell',
                    fields: [
                      defineField({
                        name: 'column',
                        title: 'Column',
                        type: 'string',
                        description: 'Must match a column name on the table definition.',
                        validation: (Rule) => Rule.required(),
                      }),
                      defineField({
                        name: 'text',
                        title: 'Text',
                        type: 'string',
                        description: 'For text columns.',
                      }),
                      defineField({
                        name: 'number',
                        title: 'Number',
                        type: 'number',
                        description: 'For number columns.',
                      }),
                      defineField({
                        name: 'color',
                        title: 'Colour',
                        type: 'string',
                        description: 'For colour columns — a hex code, e.g. #1D2058.',
                      }),
                      defineField({
                        name: 'image',
                        title: 'Image',
                        type: 'image',
                        description: 'For image columns.',
                        options: { hotspot: true },
                        fields: [
                          defineField({ name: 'alt', title: 'Alt text', type: 'string' }),
                        ],
                      }),
                      defineField({
                        name: 'boolean',
                        title: 'Yes / no',
                        type: 'boolean',
                        description: 'For yes/no columns.',
                      }),
                    ],
                    preview: {
                      select: {
                        title: 'column',
                        text: 'text',
                        number: 'number',
                        color: 'color',
                        boolean: 'boolean',
                      },
                      prepare({ title, text, number, color, boolean }) {
                        const value = [text, number, color, boolean]
                          .find((candidate) => candidate !== undefined && candidate !== null)
                        return {
                          title: title ?? 'No column',
                          subtitle: value === undefined ? '—' : String(value),
                        }
                      },
                    },
                  }],
                }),
              ],
              preview: {
                select: { cells: 'cells' },
                prepare({ cells }) {
                  const list = Array.isArray(cells) ? cells : []
                  const summary = list
                    .map((cell: Record<string, unknown>) => {
                      const value = [cell.text, cell.number, cell.color, cell.boolean]
                        .find((candidate) => candidate !== undefined && candidate !== null)
                      return value === undefined ? null : `${cell.column}: ${value}`
                    })
                    .filter(Boolean)
                  return {
                    title: summary[0] ?? 'Empty row',
                    subtitle: summary.slice(1).join(' · '),
                  }
                },
              },
            }],
          }),
        ],
        preview: {
          select: { title: 'group.title', rows: 'rows' },
          prepare({ title, rows }) {
            const count = Array.isArray(rows) ? rows.length : 0
            return {
              title: title ?? 'No table selected',
              subtitle: count === 1 ? '1 row' : `${count} rows`,
            }
          },
        },
      }],
    }),

    // Related items
    defineField({
      name: 'applicableCapabilities',
      title: 'Applicable customizations',
      type: 'array',
      group: 'categorization',
      description: 'What can be applied TO or used WITH this?',
      of: [{ type: 'reference', to: [{ type: 'customizationOption' }] }],
    }),
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
      name: 'relatedCapabilities',
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
      mediaTags: ogMediaTags(MEDIA_TAG.capability),
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
