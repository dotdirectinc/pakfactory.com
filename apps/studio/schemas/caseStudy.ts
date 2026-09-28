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
      name: 'previewVideo',
      title: 'Preview video',
      type: 'file',
      group: 'content',
      options: { accept: 'video/*' },
      description:
        'Optional muted MP4 for hover/b-roll on video case study cards. Leave blank to show the thumbnail image only (YouTube is not used for card hover).',
      hidden: ({ document }) =>
        (document as { heroMedia?: { mediaType?: string } })?.heroMedia
          ?.mediaType !== 'video',
    }),
    defineField({
      name: 'cardSummary',
      title: 'Card summary',
      type: 'text',
      rows: 2,
      group: 'content',
      description: '1–2 line summary shown on the listing card under the client name.',
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
              description: 'The stat itself, kept short (e.g. 70k+ Boxes Manufactured).',
            }),
            defineField({
              name: 'description',
              title: 'Supporting line',
              type: 'text',
              rows: 2,
              description: 'Context under the stat (e.g. "Across 5+ years of a continuous partnership").',
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
        "Set automatically when the study goes live, and used for listing order and structured data. A future date keeps the study off the site until then; back-date it only for migrated content. Editing this does not publish the study — use Publish.",
    }),
    defineField({
      name: 'lastModified',
      title: 'Last updated (editorial)',
      type: 'datetime',
      group: 'publishing',
      description:
        "Tells search engines when the study last changed, in the sitemap and structured data. Set it only for substantive changes, not typos or metadata. Separate from Sanity's own last-edited timestamp. Leave blank to use the Publish date.",
    }),

    // ─── SEO ──────────────────────────────────────────────────────────────────

    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: 'seo',
      description:
        'Shown in search results and the browser tab. Best kept under 60 characters. When blank, ' +
        'the client\'s name plus "Packaging Case Study" is used.',
      validation: (Rule) =>
        Rule.max(60).warning('Titles over 60 characters may be truncated.'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description:
        'The snippet shown under the title in search results. Best kept under 160 characters. ' +
        'When blank, the card summary is used, then the intro.',
      validation: (Rule) =>
        Rule.max(160).warning('Descriptions over 160 characters are typically truncated.'),
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
      group: 'seo',
      description:
        'Leave blank almost always. A full URL only, for a duplicate on another PakFactory domain.',
    }),
    defineField({
      name: 'allowIndex',
      title: 'Allow indexing',
      type: 'boolean',
      group: 'seo',
      description:
        'On: search engines may index this study. Off: they may not. Either way it stays on the site.',
      initialValue: true,
    }),
    defineField({
      name: 'allowFollow',
      title: 'Allow follow',
      type: 'boolean',
      group: 'seo',
      description:
        'Leave on for almost every study. Off tells search engines to ignore every link on the ' +
        'page, including links to your own pages.',
      initialValue: true,
    }),
    defineField({
      name: 'noImageIndex',
      title: 'No image index',
      type: 'boolean',
      group: 'seo',
      description: 'Keeps images on the page out of Google Images.',
      initialValue: false,
    }),

    // ─── Social ───────────────────────────────────────────────────────────────

    defineField({
      name: 'ogImage',
      title: 'OG image',
      type: 'image',
      group: 'social',
      options: { hotspot: true },
      description:
        'Shown when this study is shared. 1200×630. Falls back to the Thumbnail Image, then the ' +
        'Feature Image, then the global default.',
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
