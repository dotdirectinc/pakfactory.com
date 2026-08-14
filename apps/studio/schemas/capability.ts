import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField, taggedImageType } from '../lib/media-tags'
import { seoFields } from '../lib/seo-fields'

export const capability = defineType({
  name: 'capability',
  title: 'Customization',
  type: 'document',
  groups: [
    { name: 'basic', title: 'Basic', default: true },
    { name: 'attributes', title: 'Attributes' },
    { name: 'page', title: 'Page' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    // ─── BASIC TAB ────────────────────────────────────────────────────────────

    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'basic',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'basic',
      options: { source: 'title' },
      validation: (Rule) =>
        Rule.required().custom(async (slug, context) => {
          if (!slug?.current) return 'Slug is required'
          const client = context.getClient({ apiVersion: '2024-01-01' })
          const doc = context.document as { _id?: string }
          const id = doc?._id?.replace('drafts.', '')
          const draftId = `drafts.${id}`
          const existing = await client.fetch(
            `*[_type == "capability" && slug.current == $slug && !(_id in [$id, $draftId])][0]._id`,
            { slug: slug.current, id, draftId }
          )
          return existing ? 'Slug must be unique across all customizations' : true
        }),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      group: 'basic',
      to: [{ type: 'capabilityCategory' }],
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'reference',
      group: 'basic',
      to: [{ type: 'capabilityType' }],
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
      group: 'basic',
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
      group: 'basic',
      description: 'Add images in render order — first image = hero.',
      of: [taggedImageType([MEDIA_TAG.capability], { hotspot: true })],
    }),

    // ─── ATTRIBUTES TAB ───────────────────────────────────────────────────────

    defineField({
      name: 'applicableProductCategories',
      title: 'Applicable product categories',
      type: 'array',
      group: 'attributes',
      description: 'Which product groupings use this customization?',
      of: [{ type: 'reference', to: [{ type: 'productCategory' }] }],
    }),
    defineField({
      name: 'applicableProductStyleCategories',
      title: 'Applicable product style categories',
      type: 'array',
      group: 'attributes',
      description: 'Which structural styles specifically?',
      of: [{ type: 'reference', to: [{ type: 'productStyleCategory' }] }],
    }),
    defineField({
      name: 'applicableIndustryCategories',
      title: 'Applicable industry categories',
      type: 'array',
      group: 'attributes',
      description: 'Any industry-specific intersections?',
      of: [{ type: 'reference', to: [{ type: 'industryCategory' }] }],
    }),
    defineField({
      name: 'useCases',
      title: 'Use cases',
      type: 'array',
      group: 'attributes',
      of: [{ type: 'reference', to: [{ type: 'useCase' }] }],
    }),
    defineField({
      name: 'industries',
      title: 'Industries',
      type: 'array',
      group: 'attributes',
      of: [{ type: 'reference', to: [{ type: 'industry' }] }],
    }),
    // ─── PROPERTIES ───────────────────────────────────────────────────────────
    // One field replacing eight. Each of the eight hardcoded its own property
    // group in a picker filter, so a group with no matching field was
    // unreachable — which is why none of the 33 options can state a Finish Type.
    // Scope now comes from the Type's declaration instead of from the field name.

    defineField({
      name: 'properties',
      title: 'Properties',
      type: 'array',
      group: 'attributes',
      description:
        'What this option is, in property values. The choices come from the properties its Customization type declares — if this list is empty, add the property to the type first.',
      of: [{
        type: 'reference',
        to: [{ type: 'attribute' }],
        options: {
          disableNew: true,
          filter: ({ document }) => {
            const typeRef = (document as { type?: { _ref?: string } } | undefined)?.type?._ref
            // No type chosen yet, so there is no declaration to scope by.
            if (!typeRef) return { filter: 'false' }
            return {
              filter:
                'attributeGroup._ref in *[_id == $typeRef][0].properties[].property._ref',
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
      group: 'attributes',
      to: [{ type: 'attribute' }],
      readOnly: true,
      deprecated: { reason: 'Replaced by Properties — do not write to this field. 4 options still hold a value.' },
      options: {
        filter: 'attributeGroup->slug.current == "source"',
      },
    }),
    defineField({
      name: 'physicalProperties',
      title: 'Physical properties',
      type: 'array',
      group: 'attributes',
      readOnly: true,
      deprecated: { reason: 'Replaced by Properties — do not write to this field. 8 options still hold values.' },
      of: [{ type: 'reference', to: [{ type: 'attribute' }] }],
      options: {
        filter: 'attributeGroup->slug.current == "physical-properties"',
      } as never,
    }),
    defineField({
      name: 'aesthetic',
      title: 'Aesthetic',
      type: 'array',
      group: 'attributes',
      readOnly: true,
      deprecated: { reason: 'Replaced by Properties — do not write to this field. 8 options still hold values.' },
      of: [{ type: 'reference', to: [{ type: 'attribute' }] }],
      options: {
        filter: 'attributeGroup->slug.current == "aesthetic"',
      } as never,
    }),
    defineField({
      name: 'colors',
      title: 'Colors',
      type: 'array',
      group: 'attributes',
      readOnly: true,
      deprecated: { reason: 'Replaced by Properties — do not write to this field. 4 options still hold values.' },
      of: [{ type: 'reference', to: [{ type: 'attribute' }] }],
      options: {
        filter: 'attributeGroup->slug.current == "color"',
      } as never,
    }),
    defineField({
      name: 'sustainability',
      title: 'Sustainability',
      type: 'array',
      group: 'attributes',
      readOnly: true,
      deprecated: { reason: 'Replaced by Properties — do not write to this field. 5 options still hold values.' },
      of: [{ type: 'reference', to: [{ type: 'attribute' }] }],
      options: {
        filter: 'attributeGroup->slug.current == "sustainability"',
      } as never,
    }),

    // ─── PAGE TAB ─────────────────────────────────────────────────────────────

    defineField({
      name: 'whatIsBlock',
      title: 'What is it?',
      type: 'object',
      group: 'page',
      fields: [
        { name: 'title', type: 'string', title: 'Heading' },
        { name: 'body', type: 'array', title: 'Body', of: [{ type: 'block' }] },
      ],
    }),
    defineField({
      name: 'whyChooseBlock',
      title: 'Why choose it?',
      type: 'object',
      group: 'page',
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
      group: 'page',
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
      group: 'page',
      description: 'What can be applied TO or used WITH this?',
      of: [{ type: 'reference', to: [{ type: 'capability' }] }],
    }),
    defineField({
      name: 'comparedAgainst',
      title: 'Compared against',
      type: 'array',
      group: 'page',
      description: 'Sibling comparison — minimum 3 required.',
      of: [{ type: 'reference', to: [{ type: 'capability' }] }],
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
      group: 'page',
      description: 'See also — cross-category links.',
      of: [{ type: 'reference', to: [{ type: 'capability' }] }],
    }),
    defineField({
      name: 'faqs',
      title: 'FAQs',
      type: 'array',
      group: 'page',
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

    // ─── SEO TAB ──────────────────────────────────────────────────────────────

    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: 'seo',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: 'seo',
      validation: (Rule) => Rule.max(160),
    }),
    defineField(taggedImageField({
      name: 'ogImage',
      title: 'OG image',
      type: 'image',
      group: 'seo',
      mediaTags: ogMediaTags(MEDIA_TAG.capability),
      options: { hotspot: true },
    })),

    // Robots toggles from the one shared definition every other page type uses.
    // This type had meta tags and no way to keep the page out of the index.
    ...seoFields({ group: 'seo', meta: false }),
  ],

  preview: {
    select: {
      title: 'title',
      status: 'status',
      category: 'category.title',
      type: 'type.title',
      media: 'media.0',
    },
    prepare({ title, status, category, type, media }) {
      const subtitle = [category, type].filter(Boolean).join(' → ')
      return {
        title,
        subtitle: status === 'active' ? subtitle : `[${status?.toUpperCase()}] ${subtitle}`,
        media,
      }
    },
  },
})
