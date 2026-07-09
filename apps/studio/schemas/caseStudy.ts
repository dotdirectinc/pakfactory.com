import { CaseIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

// Shared PT config for the three story sections.
// Uses bodyImage (blog's deployed inline image), testimonialBlock, and caseStudyGalleryBlock.
const storyPtOf = [
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
  { type: 'bodyImage' },
  { type: 'testimonialBlock' },
  { type: 'caseStudyGalleryBlock' },
]

export const caseStudy = defineType({
  name: 'caseStudy',
  title: 'Case Study',
  type: 'document',
  icon: CaseIcon,
  groups: [
    { name: 'content', title: '📝 Content', default: true },
    { name: 'story', title: '📖 Story' },
    { name: 'metrics', title: '📊 Metrics' },
    { name: 'categorization', title: '🏷️ Categorization' },
    { name: 'publishing', title: '👤 Publishing' },
    { name: 'seo', title: '🔍 SEO' },
    { name: 'social', title: '📣 Social' },
  ],
  fields: [

    // ─── Content (default) ────────────────────────────────────────────────────

    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description: 'Detail page H1.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'client',
      title: 'Client',
      type: 'reference',
      to: [{ type: 'client' }],
      group: 'content',
      description: 'The brand entity. Card and hero read client→name; sidebar logo reads client→logo.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heroIntro',
      title: 'Hero intro',
      type: 'array',
      group: 'content',
      description: 'Intro paragraph. Bold and "Client link" annotation only — no headings. The Client link mark resolves to the client\'s website URL at render time.',
      of: [
        {
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [{ title: 'Bold', value: 'strong' }],
            annotations: [
              {
                name: 'clientLink',
                type: 'object',
                title: 'Client link',
                // No fields — URL resolves from client→website at render time.
                // Renders bold-only when the client has no website.
                fields: [],
              },
            ],
          },
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heroMedia',
      title: 'Hero media',
      type: 'object',
      group: 'content',
      validation: (Rule) => Rule.required(),
      fields: [
        defineField({
          name: 'mediaType',
          title: 'Media type',
          type: 'string',
          options: {
            list: [
              { title: 'Image', value: 'image' },
              { title: 'Video (YouTube)', value: 'video' },
            ],
            layout: 'radio',
          },
          initialValue: 'image',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'image',
          title: 'Hero image',
          type: 'image',
          options: { hotspot: true },
          hidden: ({ parent }) => (parent as { mediaType?: string })?.mediaType !== 'image',
        }),
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describe the hero image for screen readers.',
          hidden: ({ parent }) => (parent as { mediaType?: string })?.mediaType !== 'image',
          validation: (Rule) =>
            Rule.custom((val, ctx) => {
              const parent = ctx.parent as { mediaType?: string } | undefined
              if (parent?.mediaType === 'image' && !val) return 'Alt text is required for images.'
              return true
            }),
        }),
        defineField({
          name: 'videoUrl',
          title: 'Video URL',
          type: 'url',
          description: 'YouTube or Vimeo URL. Renders as a facade (thumbnail + play button); the iframe loads only on click.',
          hidden: ({ parent }) => (parent as { mediaType?: string })?.mediaType !== 'video',
        }),
        defineField({
          name: 'videoThumbnail',
          title: 'Video thumbnail override',
          type: 'image',
          options: { hotspot: true },
          description: "Optional. Leave blank to use YouTube's auto-generated thumbnail. Fill for a branded still.",
          hidden: ({ parent }) => (parent as { mediaType?: string })?.mediaType !== 'video',
        }),
      ],
    }),
    defineField({
      name: 'cardImage',
      title: 'Card image',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
      description: 'Grid visual shown on the listing page card.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'cardImageAlt',
      title: 'Card image alt',
      type: 'string',
      group: 'content',
      description: 'Describe the card image for accessibility.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'cardSummary',
      title: 'Card summary',
      type: 'text',
      rows: 2,
      group: 'content',
      description: '1–2 line summary shown on the listing card under the client name.',
      validation: (Rule) => Rule.required(),
    }),

    // ─── Story ────────────────────────────────────────────────────────────────

    defineField({
      name: 'challenge',
      title: 'Challenge',
      type: 'array',
      group: 'story',
      description: 'The problem the client faced. Paragraphs, bullets, inline images, and blocks.',
      of: storyPtOf,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'solution',
      title: 'Solution',
      type: 'array',
      group: 'story',
      description: 'How PakFactory solved it. Main narrative section.',
      of: storyPtOf,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'result',
      title: 'Result',
      type: 'array',
      group: 'story',
      description: 'Measurable outcomes. Supports inline images and gallery blocks.',
      of: storyPtOf,
      validation: (Rule) => Rule.required(),
    }),

    // ─── Metrics ──────────────────────────────────────────────────────────────

    defineField({
      name: 'highlights',
      title: 'Highlights',
      type: 'array',
      group: 'metrics',
      description: 'Key stats shown in the left rail. Recommend 2–4.',
      of: [
        {
          type: 'object',
          name: 'highlightStat',
          title: 'Stat',
          fields: [
            defineField({
              name: 'title',
              title: 'Stat',
              type: 'string',
              description: 'Bold headline, e.g. "70k+ Boxes Manufactured".',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'description',
              title: 'Supporting line',
              type: 'text',
              rows: 2,
              description: 'Context, e.g. "Across 5+ years of a continuous partnership."',
            }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'description' },
          },
        },
      ],
      validation: (Rule) => Rule.max(4).warning('Keep highlights to 4 or fewer for best display.'),
    }),

    // ─── Categorization ───────────────────────────────────────────────────────

    defineField({
      name: 'solutions',
      title: 'Solutions',
      type: 'array',
      group: 'categorization',
      of: [{ type: 'reference', to: [{ type: 'industry' }] }],
      description: 'Solution filter + chips. Solutions = the deployed Industry taxonomy.',
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'products',
      title: 'Products',
      type: 'array',
      group: 'categorization',
      of: [{ type: 'reference', to: [{ type: 'productCategory' }] }],
      description: 'Product filter + chips. Reuses the deployed Product Lines taxonomy.',
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'expertiseAreas',
      title: 'Expertise',
      type: 'array',
      group: 'categorization',
      of: [{ type: 'reference', to: [{ type: 'expertiseStage' }] }],
      description: 'Expertise filter + chips (the 6 lifecycle stages).',
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'capabilities',
      title: 'Capabilities',
      type: 'array',
      group: 'categorization',
      of: [{ type: 'reference', to: [{ type: 'capability' }] }],
      description: 'Detail chip group only (no launch filter). Materials, finishes, certifications.',
    }),
    defineField({
      name: 'relatedStudies',
      title: 'Related studies',
      type: 'array',
      group: 'categorization',
      of: [{ type: 'reference', to: [{ type: 'caseStudy' }] }],
      description: 'Manual override for the "See What\'s More" section. Empty → auto-fallback to newest 3.',
      validation: (Rule) => Rule.max(3),
    }),

    // ─── Publishing ───────────────────────────────────────────────────────────

    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'publishing',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Scheduled', value: 'scheduled' },
          { title: 'Published', value: 'published' },
          { title: 'Archived', value: 'archived' },
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      group: 'publishing',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'lastModified',
      title: 'Last modified',
      type: 'datetime',
      group: 'publishing',
      description: 'Editorial date. Bump only on substantive revision. Feeds sitemap lastmod and JSON-LD dateModified. Leave blank to default to Published at.',
    }),

    // ─── SEO ──────────────────────────────────────────────────────────────────

    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: 'seo',
      description: '"| PakFactory" appended automatically. Max 60 characters.',
      validation: (Rule) =>
        Rule.max(60).warning('Titles over 60 characters may be truncated.'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'Fallback: cardSummary → heroIntro. Aim for 155–165 characters.',
      validation: (Rule) =>
        Rule.max(160).warning('Descriptions over 160 characters are typically truncated.'),
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
      group: 'seo',
      description: 'Rare cross-domain override only.',
    }),
    defineField({
      name: 'allowIndex',
      title: 'Allow indexing',
      type: 'boolean',
      group: 'seo',
      description: 'Uncheck to set noindex. Also drops this study from the on-site grid and related.',
      initialValue: true,
    }),
    defineField({
      name: 'allowFollow',
      title: 'Allow follow',
      type: 'boolean',
      group: 'seo',
      description: 'Uncheck to set nofollow.',
      initialValue: true,
    }),
    defineField({
      name: 'noImageIndex',
      title: 'No image index',
      type: 'boolean',
      group: 'seo',
      description: 'Set noimageindex to prevent Google from indexing images on this page.',
      initialValue: false,
    }),

    // ─── Social ───────────────────────────────────────────────────────────────

    defineField({
      name: 'ogImage',
      title: 'OG image',
      type: 'image',
      group: 'social',
      options: { hotspot: true },
      description: 'Open Graph image for social sharing. Fallback: cardImage → heroMedia image → global default.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      clientName: 'client.name',
      media: 'cardImage',
      status: 'status',
    },
    prepare({
      title,
      clientName,
      media,
      status,
    }: {
      title?: string
      clientName?: string
      media?: unknown
      status?: string
    }) {
      return {
        title: title ?? 'Untitled case study',
        subtitle: [clientName, status ? `[${status}]` : null].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
