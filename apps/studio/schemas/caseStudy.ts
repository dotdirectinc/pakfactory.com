import { CaseIcon, EarthGlobeIcon } from '@sanity/icons'
import { ALL_FIELDS_GROUP, defineField, defineType } from 'sanity'

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
    { ...ALL_FIELDS_GROUP, default: true },
    { name: 'content', title: 'Content' },
    { name: 'categorization', title: 'Categorization' },
    { name: 'publishing', title: 'Publishing' },
    { name: 'seo', title: 'SEO' },
    { name: 'social', title: 'Social' },
  ],
  fields: [

    // ─── Content (default) ────────────────────────────────────────────────────

    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description: 'The H1 heading shown on the case study, and the name used on listing cards.',
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
      description:
        'The client this study is about. Their name, logo and industry all come from that Client document.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heroIntro',
      title: 'Intro',
      type: 'array',
      group: 'content',
      description:
        'The intro paragraph under the heading. Bold and links only, no headings. ' +
        '"Client link" uses the client\'s own website automatically; "Link" uses the address you type.',
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
                icon: EarthGlobeIcon,
                // URL is NOT stored here — it resolves from client→website at render time.
                // Renders bold-only when the client has no website.
                // The hidden field satisfies Sanity's minimum-one-field requirement.
                fields: [
                  defineField({
                    name: '_marker',
                    title: 'Client link',
                    type: 'boolean',
                    hidden: true,
                    initialValue: true,
                  }),
                ],
              },
              {
                // Custom external link — same shape as the body sections' link mark.
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
      ],
    }),
    defineField({
      name: 'heroMedia',
      title: 'Feature Image',
      type: 'object',
      group: 'content',
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
        }),
        defineField({
          name: 'videoUrl',
          title: 'Video URL',
          type: 'url',
          description: 'A YouTube link only. The page shows a thumbnail with a play button and loads the video when clicked.',
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
      title: 'Thumbnail Image',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
      description: 'The image on the listing page card. Cropped square.',
    }),
    defineField({
      name: 'cardImageAlt',
      title: 'Thumbnail image alt',
      type: 'string',
      group: 'content',
      description: 'Describe the card image for accessibility.',
    }),
    defineField({
      name: 'cardSummary',
      title: 'Card summary',
      type: 'text',
      rows: 2,
      group: 'content',
      description:
        'A 1–2 line summary for search engines. Not shown on the page; used when the ' +
        'meta description is blank.',
    }),

    // ─── Story + Metrics (Content tab) ────────────────────────────────────────

    defineField({
      name: 'challenge',
      title: 'Challenge',
      type: 'array',
      group: 'content',
      description: 'The problem the client faced. Text, bullets, images, testimonials and galleries.',
      of: storyPtOf,
    }),
    defineField({
      name: 'solution',
      title: 'Solution',
      type: 'array',
      group: 'content',
      description: 'How PakFactory solved it. Main narrative section.',
      of: storyPtOf,
    }),
    defineField({
      name: 'result',
      title: 'Result',
      type: 'array',
      group: 'content',
      description: 'Measurable outcomes of the work.',
      of: storyPtOf,
    }),
    defineField({
      name: 'highlights',
      title: 'Metrics',
      type: 'array',
      group: 'content',
      description: 'Key stats shown in the sidebar beside the story. Keep to 2–4.',
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
              description: 'The stat itself, kept short. For example, 70k+ Boxes Manufactured.',
            }),
            defineField({
              name: 'description',
              title: 'Supporting line',
              type: 'text',
              rows: 2,
              description: 'Context under the stat. For example, "Across 5+ years of a continuous partnership."',
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
    // Solution chip + listing filter come from client→industry (not a field here).

    defineField({
      name: 'products',
      title: 'Products',
      type: 'array',
      group: 'categorization',
      of: [{ type: 'reference', to: [{ type: 'productLine' }] }],
      description: 'The product lines this study covers. Filters the listing, shown as chips here.',
    }),
    defineField({
      name: 'expertiseAreas',
      title: 'Expertise',
      type: 'array',
      group: 'categorization',
      of: [{ type: 'reference', to: [{ type: 'expertiseStage' }] }],
      description: 'The expertise stages this study covers. Filters the listing, shown as chips here.',
    }),
    defineField({
      name: 'capabilities',
      title: 'Customizations',
      type: 'array',
      group: 'categorization',
      of: [{ type: 'reference', to: [{ type: 'customizationOption' }] }],
      description: 'Any customization options used on this project. Shown as chips here, not a filter.',
    }),
    defineField({
      name: 'relatedStudies',
      title: 'Related studies',
      type: 'array',
      group: 'categorization',
      of: [{ type: 'reference', to: [{ type: 'caseStudy' }] }],
      description: 'Up to six studies for the related section. Leave empty and the newest six appear.',
      validation: (Rule) => Rule.max(6),
    }),

    // ─── Publishing ───────────────────────────────────────────────────────────

    defineField({
      name: 'publishedAt',
      title: 'Publish date',
      type: 'datetime',
      group: 'publishing',
      description:
        "The publish date shown on the case study and used for Article datePublished + listing sort. Auto-set when the document goes live (Publish, or when a scheduled publish fires); edit only to back-date migrated content or set a future date for a soft launch/embargo. Editing this does NOT publish the study — use Publish (or Schedule when your Sanity plan includes it).",
    }),
    defineField({
      name: 'lastModified',
      title: 'Last updated (editorial)',
      type: 'datetime',
      group: 'publishing',
      description:
        "The 'Updated' date shown on the case study and used for Google's Article dateModified + sitemap lastmod. Set it only for substantive content updates — not typos or metadata. Editor-controlled; separate from Sanity's automatic last-edited timestamp. Leave blank to default to Publish date.",
    }),

    // ─── SEO ──────────────────────────────────────────────────────────────────

    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: 'seo',
      description: 'Shown in search results and the browser tab. Falls back to the title when blank.',
      validation: (Rule) =>
        Rule.max(60).warning('Titles over 60 characters may be truncated.'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'The SERP snippet. Falls back to the card summary, then the intro, when blank.',
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
    },
    prepare({
      title,
      clientName,
      media,
    }: {
      title?: string
      clientName?: string
      media?: unknown
    }) {
      return {
        title: title ?? 'Untitled case study',
        subtitle: clientName,
        media,
      }
    },
  },
})
