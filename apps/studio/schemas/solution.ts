import { defineField, defineType } from 'sanity'
import { BulbOutlineIcon } from '@sanity/icons'

export const solution = defineType({
  name: 'solution',
  title: 'Solution',
  type: 'document',
  icon: BulbOutlineIcon,
  groups: [
    { name: 'basic', title: 'Basic', default: true },
    { name: 'landing', title: 'Landing' },
    { name: 'content', title: 'Content' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    // ─── BASIC ────────────────────────────────────────────────────────────────

    defineField({
      name: 'internalTitle',
      title: 'Internal title',
      type: 'string',
      group: 'basic',
      description: 'Used in the Studio nav only. Not shown on the website.',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'solutionType',
      title: 'Solution type',
      type: 'string',
      group: 'basic',
      options: {
        list: [
          { title: 'Industry', value: 'industry' },
          { title: 'Use Case', value: 'use-case' },
        ],
        layout: 'radio',
      },
      initialValue: 'industry',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'basic',
      options: { source: 'internalTitle' },
      validation: (Rule) => Rule.required(),
    }),

    // ─── LANDING ──────────────────────────────────────────────────────────────

    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      group: 'landing',
      description: 'Page H1 — the main heading visitors see.',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'subheadline',
      title: 'Subheadline',
      type: 'text',
      rows: 2,
      group: 'landing',
      description: 'Supporting line below the headline.',
    }),

    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      group: 'landing',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
      ],
    }),

    defineField({
      name: 'intro',
      title: 'Intro / Problem framing',
      type: 'array',
      group: 'landing',
      description: 'Short framing paragraph — the packaging problem this solution addresses.',
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

    // ─── CONTENT ──────────────────────────────────────────────────────────────

    defineField({
      name: 'packagingFormats',
      title: 'Packaging formats',
      type: 'array',
      group: 'content',
      description: 'Product categories that serve this solution (e.g. Rigid, Mailer Bags).',
      of: [
        {
          type: 'reference',
          to: [{ type: 'productCategory' }],
        },
      ],
    }),

    defineField({
      name: 'relevantCapabilities',
      title: 'Relevant capabilities',
      type: 'array',
      group: 'content',
      description: 'Capability categories most relevant to this solution (e.g. Finishing, Printing).',
      of: [
        {
          type: 'reference',
          to: [{ type: 'capabilityCategory' }],
        },
      ],
    }),

    defineField({
      name: 'relatedProducts',
      title: 'Related products',
      type: 'array',
      group: 'content',
      description: 'Inspiration / featured products shown on this solution page.',
      of: [
        {
          type: 'reference',
          to: [{ type: 'product' }],
        },
      ],
    }),

    // relatedCaseStudies — add once caseStudy schema is built
    // defineField({
    //   name: 'relatedCaseStudies',
    //   title: 'Related case studies',
    //   type: 'array',
    //   group: 'content',
    //   of: [{ type: 'reference', to: [{ type: 'caseStudy' }] }],
    // }),

    // ─── SEO ──────────────────────────────────────────────────────────────────

    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: 'seo',
      description: 'Defaults to Headline if left blank. Target 50–60 chars.',
      validation: (Rule) => Rule.max(60),
    }),

    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 2,
      group: 'seo',
      description: 'Target 140–160 chars.',
      validation: (Rule) => Rule.max(160),
    }),

    defineField({
      name: 'ogImage',
      title: 'OG image',
      type: 'image',
      group: 'seo',
      description: 'Social share image. Recommended: 1200×630px.',
      options: { hotspot: true },
    }),
  ],

  preview: {
    select: {
      title: 'internalTitle',
      solutionType: 'solutionType',
      media: 'heroImage',
    },
    prepare({ title, solutionType, media }) {
      const label = solutionType === 'industry' ? 'Industry' : 'Use Case'
      return {
        title: title ?? 'Untitled solution',
        subtitle: label,
        media,
      }
    },
  },
})
