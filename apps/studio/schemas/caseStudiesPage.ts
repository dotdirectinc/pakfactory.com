import { CogIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

export const caseStudiesPage = defineType({
  name: 'caseStudiesPage',
  title: 'Case Studies Page',
  type: 'document',
  icon: CogIcon,
  // Prevent creating more than one via the Studio "new document" menu
  __experimental_actions: ['update', 'publish'],
  groups: [
    { name: 'hero', title: 'Hero', default: true },
    { name: 'detailCta', title: 'Detail CTA' },
    { name: 'related', title: 'Related' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Internal title',
      type: 'string',
      group: 'hero',
      description: 'Not shown on the site — identifies this singleton in Studio.',
      initialValue: 'Case Studies Page',
      validation: (Rule) => Rule.required(),
    }),

    // ─── Hero ─────────────────────────────────────────────────────────────────

    defineField({
      name: 'heroEyebrow',
      title: 'Hero eyebrow',
      type: 'string',
      group: 'hero',
      description: 'Small text above the H1, e.g. "WORK WE\'RE PROUD OF".',
      initialValue: "WORK WE'RE PROUD OF",
    }),
    defineField({
      name: 'heroHeading',
      title: 'Hero heading',
      type: 'string',
      group: 'hero',
      description: 'H1 for /case-studies.',
    }),
    defineField({
      name: 'heroIntro',
      title: 'Hero intro',
      type: 'text',
      rows: 3,
      group: 'hero',
      description: 'Supporting paragraph below the H1.',
    }),
    defineField({
      name: 'heroBackgroundImage',
      title: 'Hero background image',
      type: 'image',
      group: 'hero',
      options: { hotspot: true },
    }),
    defineField({
      name: 'heroBackgroundImageAlt',
      title: 'Hero background image alt',
      type: 'string',
      group: 'hero',
      hidden: ({ document }) => !(document as Record<string, unknown>)?.heroBackgroundImage,
    }),

    // ─── Detail CTA (shared default) ──────────────────────────────────────────

    defineField({
      name: 'detailCta',
      title: 'Detail page CTA',
      type: 'object',
      group: 'detailCta',
      description: 'Shared CTA shown in the left rail of every detail page. Each study can override it (rare).',
      fields: [
        defineField({
          name: 'heading',
          title: 'Heading',
          type: 'string',
          initialValue: 'Ready to build packaging your customers remember?',
        }),
        defineField({
          name: 'primaryLabel',
          title: 'Primary label',
          type: 'string',
          initialValue: 'Contact Sales',
        }),
        defineField({
          name: 'primaryHref',
          title: 'Primary URL',
          type: 'url',
          description: 'Quote / contact route.',
          validation: (Rule) => Rule.uri({ scheme: ['https', 'http'] }),
        }),
        defineField({
          name: 'secondaryLabel',
          title: 'Secondary label',
          type: 'string',
          initialValue: 'Explore Solutions',
        }),
        defineField({
          name: 'secondaryHref',
          title: 'Secondary URL',
          type: 'url',
          validation: (Rule) => Rule.uri({ scheme: ['https', 'http'] }),
        }),
      ],
    }),

    // ─── Related section ──────────────────────────────────────────────────────

    defineField({
      name: 'relatedSectionHeading',
      title: 'Related section heading',
      type: 'string',
      group: 'related',
      initialValue: "See What's More",
    }),
    defineField({
      name: 'relatedSectionIntro',
      title: 'Related section intro',
      type: 'text',
      rows: 2,
      group: 'related',
      initialValue: 'Stay informed with the latest case studies from our portfolio.',
    }),

    // ─── SEO ──────────────────────────────────────────────────────────────────

    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: 'seo',
      description: 'For the /case-studies listing page. Max 60 characters.',
      validation: (Rule) => Rule.max(60).warning('Over 60 characters may be truncated.'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'For the /case-studies listing page. Aim for 155–165 characters.',
      validation: (Rule) => Rule.max(160).warning('Over 160 characters may be truncated.'),
    }),
    defineField({
      name: 'ogImage',
      title: 'OG image',
      type: 'image',
      group: 'seo',
      options: { hotspot: true },
      description: 'Open Graph image for the listing page.',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Case Studies Page' }
    },
  },
})
