import { defineField } from 'sanity'
import { MEDIA_TAG, type MediaTag, ogMediaTags, taggedImageField } from './media-tags'

/**
 * Reusable SEO + Social field sets shared by every content document type
 * (post, blogCategory, blogTag, author, blogPage). Field names are stable and
 * match the existing convention already used on `blogTag` — adopting these on
 * another type renames nothing, so there is no content migration.
 *
 * Fallbacks (blank field → correct output) are resolved in the GROQ query
 * layer, not here; these factories only declare the editor fields + defaults.
 */

type SeoOptions = {
  /** Group/tab id these fields belong to (e.g. 'seo'). */
  group: string
  /** Add a Canonical URL field (Post / Generic Page only — not Category/Tag). */
  canonical?: boolean
  /** Default for the Index toggle. ON everywhere except Tag (BA: tags noindex). */
  indexDefault?: boolean
}

/** Meta title/description + robots toggles (allowIndex / allowFollow / noImageIndex). */
export function seoFields({ group, canonical = false, indexDefault = true }: SeoOptions) {
  return [
    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group,
      validation: (Rule) => Rule.max(60).warning('Best kept under 60 characters.'),
      description:
        'Shown in search results and the browser tab. When blank, Blog Settings type format applies (e.g. Category defaults), then the content title. A filled value always wins over formats.',
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group,
      validation: (Rule) => Rule.max(160).warning('Best kept under 160 characters.'),
      description:
        'The SERP snippet. When blank, Blog Settings type format applies, then excerpt/description. A filled value always wins over formats.',
    }),
    ...(canonical
      ? [
          defineField({
            name: 'canonical',
            title: 'Canonical URL',
            type: 'string',
            group,
            description:
              'Blank in 99% of cases (the page self-canonicals). Enter a relative path (e.g. /custom-box-guide) for a same-domain duplicate; a full URL only for duplication across another PakFactory-owned domain.',
          }),
        ]
      : []),
    defineField({
      name: 'allowIndex',
      title: 'Allow indexing',
      type: 'boolean',
      group,
      initialValue: indexDefault,
      description:
        'On = eligible to index. Off = noindex, and the page is also dropped from on-site Related / Featured / listings — not just from search engines.',
    }),
    defineField({
      name: 'allowFollow',
      title: 'Allow following links',
      type: 'boolean',
      group,
      initialValue: true,
      description:
        'Advanced — leave ON for essentially all pages. Page-level nofollow tells engines to ignore every link on the page, including your own internal links.',
    }),
    defineField({
      name: 'noImageIndex',
      title: 'No image index',
      type: 'boolean',
      group,
      initialValue: false,
      description: 'Prevents images on this page from appearing in Google Images.',
    }),
  ]
}

/** OG title/description + OG image (media-tagged for the social channel). */
export function socialFields({
  group,
  channel = MEDIA_TAG.blog,
}: {
  group: string
  channel?: MediaTag
}) {
  return [
    defineField({
      name: 'ogTitle',
      title: 'Social title (OG)',
      type: 'string',
      group,
      description: 'Punchier share headline. Falls back to the meta title, then the title.',
    }),
    defineField({
      name: 'ogDescription',
      title: 'Social description (OG)',
      type: 'text',
      rows: 2,
      group,
      description: 'Falls back to the meta description.',
    }),
    defineField(
      taggedImageField({
        name: 'ogImage',
        title: 'Social image (OG)',
        type: 'image',
        group,
        mediaTags: ogMediaTags(channel),
        options: { hotspot: true },
        description: '1200×630 (1.91:1). Falls back to the featured image, then the global default.',
        fields: [
          defineField({
            name: 'alt',
            title: 'Alt text override',
            type: 'string',
            description: 'Optional. Falls back to the alt text on the image asset.',
          }),
        ],
      }),
    ),
  ]
}
