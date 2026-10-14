import {defineField, defineType} from 'sanity'
import {BellIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {seoFields, socialFields} from '../lib/seo-fields'
import {MEDIA_TAG} from '../lib/media-tags'
import {inlineBlocks} from './inline'

/**
 * Press Release — a PakFactory announcement at `/newsroom/[slug]` (PROD-2909).
 *
 * Lives in the **Newsroom** workspace; its page layouts live in Main Website →
 * Newsroom Pages. ~4–8 documents a year, so category is a closed string list
 * rather than a document type, and there is no `pressReleaseSettings` singleton
 * — site SEO defaults are enough until `/newsroom/*` needs its own meta format.
 *
 * No `author` (a release has a dateline and a media contact, not a byline), no
 * `relatedNews` (the `pressReleasesRow` section derives "More announcements"),
 * and no `sections` — those belong to `newsroomDetailPage`, so one layout
 * applies uniformly instead of each release drifting from the last.
 *
 * 🔴 `publishedAt` may be in the future. Scheduled drafts / Content Releases are
 * off in this Studio (PROD-2228), so the newsroom routes MUST filter
 * `publishedAt <= now()` — a coordinated release hour is a commitment to a
 * partner, not a nicety.
 */
export const pressRelease = defineType({
  name: 'pressRelease',
  title: 'Press Release',
  type: 'document',
  icon: BellIcon,
  groups: groupsFor([
    'content',
    'template',
    'categorization',
    'publishing',
    'seo',
    'social',
  ]),
  fields: [
    // ─── Content ──────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description:
        'The announcement headline. Shown in the newsroom list, as the page heading, and as ' +
        'the default page title in search results.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      options: {source: 'title'},
      description:
        'Generates the URL: /newsroom/[slug]. Changing it after publishing creates a redirect ' +
        'automatically — that redirect is the only thing keeping old links alive, so don’t ' +
        'edit it without reason.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 2,
      group: GROUPS.content,
      description:
        'One sentence, under about 200 characters. Shown in three places: the newsroom list ' +
        'row, the line under the headline on the release itself, and the search-result ' +
        'description when the SEO tab is left blank.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'dateline',
      title: 'Dateline',
      type: 'string',
      group: GROUPS.content,
      initialValue: 'Markham, ON',
      description:
        'Where the release is issued from, shown in bold at the start of the first paragraph ' +
        '— for example "Markham, ON". Change it only when a release is issued from somewhere ' +
        'else, such as a trade show or a new facility.',
      validation: (Rule) => Rule.required(),
    }),
    // Copies `caseStudy.heroMedia` field for field, so editors meet one pattern
    // in both places. One deliberate difference: there is no separate card image
    // — the hotspot crop serves the newsroom list.
    defineField({
      name: 'heroMedia',
      title: 'Feature Image',
      type: 'object',
      group: GROUPS.content,
      fields: [
        defineField({
          name: 'mediaType',
          title: 'Media type',
          type: 'string',
          options: {
            list: [
              {title: 'Image', value: 'image'},
              {title: 'Video (YouTube)', value: 'video'},
            ],
            layout: 'radio',
          },
          description: 'Whether this release leads with an image or a video.',
          initialValue: 'image',
        }),
        defineField({
          name: 'image',
          title: 'Hero image',
          type: 'image',
          options: {hotspot: true},
          description:
            '16:9. Also used — cropped — as the card image in the newsroom list, so set the ' +
            'hotspot on the part that must survive a square crop.',
          hidden: ({parent}) => (parent as {mediaType?: string})?.mediaType !== 'image',
        }),
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describe the image for screen readers.',
          hidden: ({parent}) => (parent as {mediaType?: string})?.mediaType !== 'image',
        }),
        defineField({
          name: 'videoUrl',
          title: 'Video URL',
          type: 'url',
          description:
            'YouTube or Vimeo URL. Renders as a facade (thumbnail + play button); the iframe ' +
            'loads only on click.',
          hidden: ({parent}) => (parent as {mediaType?: string})?.mediaType !== 'video',
        }),
        defineField({
          name: 'videoThumbnail',
          title: 'Video thumbnail override',
          type: 'image',
          options: {hotspot: true},
          description:
            'Optional. Leave blank to use YouTube’s auto-generated thumbnail. Fill for a ' +
            'branded still. Also used as the card image in the newsroom list.',
          hidden: ({parent}) => (parent as {mediaType?: string})?.mediaType !== 'video',
        }),
      ],
    }),
    defineField({
      name: 'imageCaption',
      title: 'Image caption',
      type: 'string',
      group: GROUPS.content,
      description:
        'Caption and photo credit shown under the feature image. Leave blank for no caption.',
    }),
    // `bodyImage` + the full inline set. `widgetEmbed` is excluded on purpose:
    // those are reusable blog marketing modules, and a press release carrying a
    // newsletter signup mid-article undercuts it with journalists.
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: GROUPS.content,
      description:
        'The release itself. Open with the lead paragraph — who, what, when, where and why in ' +
        'two or three sentences — since that is the part most outlets quote.',
      of: [
        {type: 'block'},
        {type: 'bodyImage'},
        ...inlineBlocks.map((block) => ({type: block.name})),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),

    // ─── Template ─────────────────────────────────────────────────────────────
    // Same shape as `customizationOption.template`, with one deliberate
    // difference: no `.warning()`. Every release has a page and almost none will
    // pick a layout, because Default is the right answer — a warning on every
    // release is friction carrying no information. Empty means Default, silently.
    defineField({
      name: 'template',
      title: 'Template',
      type: 'reference',
      group: GROUPS.template,
      to: [{type: 'newsroomDetailPage'}],
      options: {disableNew: true},
      description:
        'Pick a Newsroom Detail Page layout version — the shared bands below the article. ' +
        'Manage layouts under Main Website → Newsroom Pages → Newsroom Detail Pages. ' +
        'Empty → seeded Default layout (`newsroomDetailPage`).',
    }),

    // ─── Categorization ───────────────────────────────────────────────────────
    // No `initialValue`, deliberately. An unconsidered default is how every row
    // ends up labelled the same thing.
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: GROUPS.categorization,
      options: {
        list: [
          {title: 'Partnership', value: 'partnership'},
          {title: 'Product & capability', value: 'product'},
          {title: 'Award & recognition', value: 'award'},
          {title: 'Leadership', value: 'leadership'},
          {title: 'Sustainability', value: 'sustainability'},
          {title: 'Company milestone', value: 'milestone'},
          {title: 'Facility & network', value: 'facility'},
        ],
      },
      description:
        'What kind of announcement this is. Sets the label on the card and drives the category ' +
        'filter. There is no default on purpose — pick the one that fits rather than accepting ' +
        'a catch-all.',
      validation: (Rule) => Rule.required(),
    }),

    // ─── Publishing ───────────────────────────────────────────────────────────
    defineField({
      name: 'publishedAt',
      title: 'Publish date',
      type: 'datetime',
      group: GROUPS.publishing,
      description:
        'The release date and time. Sorts the newsroom list and shows as the date on the ' +
        'release. A future date keeps it off the site until that moment arrives.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'lastModified',
      title: 'Last updated (editorial)',
      type: 'datetime',
      group: GROUPS.publishing,
      description:
        'Set this when correcting a release that is already published. It shows an "Updated" ' +
        'line and tells search engines the article changed.',
    }),

    // ─── SEO ──────────────────────────────────────────────────────────────────
    // `canonical` matters more here than elsewhere: releases get syndicated to
    // wires and reprinted, and canonical is how comms points every copy back at
    // the original.
    ...seoFields({group: GROUPS.seo, canonical: true, indexDefault: true}),

    // ─── Social ───────────────────────────────────────────────────────────────
    ...socialFields({group: GROUPS.social, channel: MEDIA_TAG.website}),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      publishedAt: 'publishedAt',
      media: 'heroMedia.image',
    },
    prepare({title, category, publishedAt, media}) {
      const date = publishedAt
        ? new Date(publishedAt).toLocaleDateString()
        : 'No date'
      const label = category
        ? category.charAt(0).toUpperCase() + category.slice(1)
        : 'No category'
      return {
        title: title || 'Untitled press release',
        subtitle: `${label} · ${date}`,
        media: media || BellIcon,
      }
    },
  },
  orderings: [
    {
      title: 'Published (newest first)',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],
})
