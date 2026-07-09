import { CaseIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

const caseStudyPortableTextOf = [
  {
    type: 'block',
    styles: [
      { title: 'Normal', value: 'normal' },
      { title: 'Heading 2', value: 'h2' },
      { title: 'Heading 3', value: 'h3' },
    ],
    lists: [
      { title: 'Bullet', value: 'bullet' },
      { title: 'Numbered', value: 'number' },
    ],
    marks: {
      decorators: [
        { title: 'Bold', value: 'strong' },
        { title: 'Italic', value: 'em' },
      ],
      annotations: [
        {
          name: 'link',
          type: 'object',
          title: 'Link',
          fields: [
            defineField({ name: 'href', type: 'url', title: 'URL' }),
          ],
        },
      ],
    },
  },
  { type: 'caseStudyImageGallery' },
  { type: 'caseStudyQuote' },
]

export const caseStudy = defineType({
  name: 'caseStudy',
  title: 'Case Study',
  type: 'document',
  icon: CaseIcon,
  groups: [
    { name: 'overview', title: 'Overview', default: true },
    { name: 'client', title: 'Client' },
    { name: 'hero', title: 'Hero' },
    { name: 'taxonomy', title: 'Taxonomy' },
    { name: 'content', title: 'Content' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    // ─── Overview ─────────────────────────────────────────────────────────────

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
      title: 'Published At',
      type: 'datetime',
      group: 'overview',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      group: 'overview',
      description: 'Short summary — shown on cards and as the hero subtitle.',
    }),

    // ─── Client ───────────────────────────────────────────────────────────────

    defineField({
      name: 'clientName',
      title: 'Client Name',
      type: 'string',
      group: 'client',
    }),
    defineField({
      name: 'clientLogo',
      title: 'Client Logo',
      type: 'image',
      group: 'client',
      options: { hotspot: true },
    }),

    // ─── Hero ─────────────────────────────────────────────────────────────────

    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      group: 'hero',
      options: { hotspot: true },
    }),
    defineField({
      name: 'featuredVideo',
      title: 'Featured Video URL',
      type: 'url',
      group: 'hero',
      description: 'YouTube or Vimeo URL. Displayed in the hero when present.',
    }),

    // ─── Taxonomy ─────────────────────────────────────────────────────────────

    defineField({
      name: 'solutions',
      title: 'Solutions',
      type: 'array',
      group: 'taxonomy',
      of: [{ type: 'reference', to: [{ type: 'solution' }] }],
      description: 'Filter: Solutions (e.g. Apparel, Cosmetic & Skincare).',
    }),
    defineField({
      name: 'packagingTypes',
      title: 'Packaging Types',
      type: 'array',
      group: 'taxonomy',
      of: [{ type: 'reference', to: [{ type: 'productCategory' }] }],
      description: 'Filter: Packaging Type (e.g. Rigid, Custom Pouches).',
    }),
    defineField({
      name: 'expertise',
      title: 'Expertise',
      type: 'array',
      group: 'taxonomy',
      of: [{ type: 'reference', to: [{ type: 'expertiseStage' }] }],
      description: 'Filter: Expertise (e.g. Packaging Design, Logistics Management).',
    }),

    // ─── Metrics ──────────────────────────────────────────────────────────────

    defineField({
      name: 'metrics',
      title: 'Metrics',
      type: 'array',
      group: 'content',
      description: 'Key results shown as stat cards. Max 3.',
      of: [
        {
          type: 'object',
          name: 'metric',
          title: 'Metric',
          fields: [
            defineField({
              name: 'title',
              title: 'Metric',
              type: 'string',
              description: 'The stat or headline figure (e.g. "40% Return Rate Reduction").',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'description',
              title: 'Description',
              type: 'string',
              description: 'Supporting context (e.g. "Attributed to better product protection").',
            }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'description' },
          },
        },
      ],
      validation: (Rule) => Rule.max(3).warning('Keep metrics to 3 or fewer for best display.'),
    }),

    // ─── Challenges ───────────────────────────────────────────────────────────

    defineField({
      name: 'challenges',
      title: 'Challenges',
      type: 'object',
      group: 'content',
      fields: [
        defineField({
          name: 'intro',
          title: 'Intro',
          type: 'text',
          rows: 3,
          description: 'Opening paragraph for the challenges section.',
        }),
        defineField({
          name: 'items',
          title: 'Challenge Items',
          type: 'array',
          of: [{ type: 'string' }],
          description: 'Bullet-point challenges the client faced.',
        }),
      ],
    }),

    // ─── Solutions Body ───────────────────────────────────────────────────────

    defineField({
      name: 'solutionsBody',
      title: 'Solutions Body',
      type: 'array',
      group: 'content',
      description: 'Rich content for the Solutions section. Supports galleries and pull-quotes.',
      of: caseStudyPortableTextOf,
    }),

    // ─── Result Section ───────────────────────────────────────────────────────

    defineField({
      name: 'resultBody',
      title: 'Result Body',
      type: 'array',
      group: 'content',
      description: 'Rich content for the Result section. Supports galleries and pull-quotes.',
      of: caseStudyPortableTextOf,
    }),
    defineField({
      name: 'resultImages',
      title: 'Result Images',
      type: 'array',
      group: 'content',
      description: 'Supporting imagery for the result section (before/after, outcome photos).',
      of: [
        {
          type: 'object',
          name: 'resultImage',
          title: 'Image',
          fields: [
            defineField({
              name: 'image',
              title: 'Image',
              type: 'image',
              options: { hotspot: true },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              description: 'Describe the image for accessibility.',
            }),
            defineField({
              name: 'caption',
              title: 'Caption',
              type: 'string',
            }),
          ],
          preview: {
            select: { media: 'image', title: 'caption', alt: 'alt' },
            prepare({ media, title, alt }: { media?: unknown; title?: string; alt?: string }) {
              return { media, title: title ?? alt ?? 'Image' }
            },
          },
        },
      ],
    }),

    // ─── SEO ──────────────────────────────────────────────────────────────────

    defineField({
      name: 'metaTitle',
      title: 'Meta Title',
      type: 'string',
      group: 'seo',
      description: 'Base title — "| PakFactory" is appended automatically. Max 60 characters.',
      validation: (Rule) =>
        Rule.max(60).warning('Titles over 60 characters may be truncated in search results.'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'Aim for 155–165 characters.',
      validation: (Rule) =>
        Rule.max(165).warning('Descriptions over 165 characters are typically truncated.'),
    }),
    defineField({
      name: 'ogImage',
      title: 'OG Image',
      type: 'image',
      group: 'seo',
      description: 'Open Graph image for social sharing (1200×630 recommended).',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      clientName: 'clientName',
      heroImage: 'heroImage',
    },
    prepare({ title, clientName, heroImage }: { title?: string; clientName?: string; heroImage?: unknown }) {
      return {
        title: title ?? 'Untitled case study',
        subtitle: clientName ?? '',
        media: heroImage,
      }
    },
  },
})
