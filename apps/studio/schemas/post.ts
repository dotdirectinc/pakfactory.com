import { defineField, defineType } from 'sanity'

export const post = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  groups: [
    { name: 'overview',  title: 'Overview',  default: true },
    { name: 'body',      title: 'Body'                     },
    { name: 'assets',    title: 'Assets'                   },
    { name: 'taxonomy',  title: 'Taxonomy'                 },
    { name: 'related',   title: 'Related'                  },
    { name: 'seo',       title: 'SEO'                      },
  ],
  fields: [
    // ── Overview ────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'overview',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'overview',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      group: 'overview',
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
      group: 'overview',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      group: 'overview',
    }),
    defineField({
      name: 'featuredOnHome',
      title: 'Feature on blog home',
      type: 'boolean',
      group: 'overview',
      description:
        'Pin this post as the hero feature on /blog. Only one post should be enabled at a time.',
      initialValue: false,
    }),

    // ── Body ────────────────────────────────────────────────────────────────
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: 'body',
      of: [
        { type: 'block' },
        { type: 'bodyImage' },
        { type: 'widgetEmbed' },
      ],
    }),

    // ── Assets ──────────────────────────────────────────────────────────────
    defineField({
      name: 'mainImage',
      title: 'Main image',
      type: 'image',
      group: 'assets',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text override',
          type: 'string',
          description:
            'Optional. Falls back to the alt text set on the image asset in the Media library.',
        }),
        defineField({
          name: 'caption',
          title: 'Caption',
          type: 'string',
          description: 'Optional short caption shown below the image in the frontend.',
        }),
      ],
    }),

    // ── Taxonomy ────────────────────────────────────────────────────────────
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'blogCategory' }],
      group: 'taxonomy',
      description: 'Every post belongs to exactly one category.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      group: 'taxonomy',
      description:
        'Apply 3–5 structured tags from the relevant axes + 0–3 topic tags. See the Tagging Reference Guide.',
      of: [{ type: 'reference', to: [{ type: 'blogTag' }] }],
    }),

    // ── Related ─────────────────────────────────────────────────────────────
    defineField({
      name: 'relatedCapabilities',
      title: 'Related capabilities',
      type: 'array',
      group: 'related',
      description: 'Connects this post to the knowledge graph.',
      of: [{ type: 'reference', to: [{ type: 'capability' }] }],
    }),
    defineField({
      name: 'relatedProducts',
      title: 'Related products',
      type: 'array',
      group: 'related',
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
    }),

    // ── SEO ─────────────────────────────────────────────────────────────────
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
    defineField({
      name: 'ogImage',
      title: 'OG image',
      type: 'image',
      group: 'seo',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text override',
          type: 'string',
          description:
            'Optional. Falls back to the alt text set on the image asset in the Media library.',
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      publishedAt: 'publishedAt',
      authorName: 'author.name',
      categoryTitle: 'category.title',
      media: 'mainImage',
    },
    prepare({ title, publishedAt, authorName, categoryTitle, media }) {
      const date = publishedAt ? new Date(publishedAt).toLocaleDateString() : 'Unpublished'
      const cat = categoryTitle ? `[${categoryTitle}]` : '[No category]'
      return { title, subtitle: `${cat} ${date} · ${authorName || 'No author'}`, media }
    },
  },
  orderings: [
    {
      title: 'Published (newest first)',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
})
