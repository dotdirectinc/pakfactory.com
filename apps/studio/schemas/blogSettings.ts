import { defineField, defineType } from 'sanity'
import { CogIcon } from '@sanity/icons'

/**
 * Blog Settings (singleton) — per-document-type SEO/indexing DEFAULTS and general
 * blog options. Overrides the Global Settings defaults where set; any individual
 * document overrides these on its own SEO tab.
 *
 * NOTE: the meta-title/description FORMATS use a token set. Resolving the tokens
 * (and the fallback chains that apply these defaults) is query-layer work — these
 * fields only declare the editable defaults. The richer token input (live
 * preview, admin-only) is a deferred enhancement.
 */

const TOKEN_HELP =
  'Tokens: %title%, %name%, %job_title%, %excerpt%, %description%, %shortBio%, %sitename%. One change affects every page of this type, so keep it generic.'

const CHANGEFREQ = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']

type TypeDefaults = {
  metaTitleFormat: string
  metaDescriptionFormat: string
  indexDefault: boolean
  sitemap?: { priority: number; changefreq: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra?: any[]
}

/** Inner fields for one per-type defaults object (no group — the object carries it). */
function typeDefaultFields({
  metaTitleFormat,
  metaDescriptionFormat,
  indexDefault,
  sitemap,
  extra = [],
}: TypeDefaults) {
  return [
    defineField({
      name: 'metaTitleFormat',
      title: 'Meta title format',
      type: 'string',
      initialValue: metaTitleFormat,
      description: TOKEN_HELP,
      validation: (Rule) => Rule.max(90).warning('Rendered titles read best under ~60 characters.'),
    }),
    defineField({
      name: 'metaDescriptionFormat',
      title: 'Meta description format',
      type: 'string',
      initialValue: metaDescriptionFormat,
      description: TOKEN_HELP,
      validation: (Rule) =>
        Rule.max(220).warning('Rendered descriptions read best under ~160 characters.'),
    }),
    defineField({
      name: 'allowIndex',
      title: 'Index by default',
      type: 'boolean',
      initialValue: indexDefault,
      description: 'Default for new documents of this type; each document can override.',
    }),
    defineField({
      name: 'allowFollow',
      title: 'Follow links by default',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'noImageIndex',
      title: 'No image index by default',
      type: 'boolean',
      initialValue: false,
    }),
    ...(sitemap
      ? [
          defineField({
            name: 'sitemapPriority',
            title: 'Sitemap priority',
            type: 'number',
            initialValue: sitemap.priority,
            validation: (Rule) => Rule.min(0).max(1),
          }),
          defineField({
            name: 'sitemapChangefreq',
            title: 'Sitemap change frequency',
            type: 'string',
            initialValue: sitemap.changefreq,
            options: { list: CHANGEFREQ },
          }),
        ]
      : []),
    ...extra,
  ]
}

export const blogSettings = defineType({
  name: 'blogSettings',
  title: 'Blog Settings',
  type: 'document',
  icon: CogIcon,
  groups: [
    { name: 'post', title: 'Post defaults', default: true },
    { name: 'category', title: 'Category defaults' },
    { name: 'tag', title: 'Tag defaults' },
    { name: 'author', title: 'Author defaults' },
    { name: 'general', title: 'General' },
  ],
  fields: [
    // ── Per-type SEO defaults ─────────────────────────────────────────────────
    defineField({
      name: 'postDefaults',
      title: 'Post defaults',
      type: 'object',
      group: 'post',
      options: { collapsible: false },
      fields: typeDefaultFields({
        metaTitleFormat: '%title% | PakFactory Blog',
        metaDescriptionFormat: '%excerpt%',
        indexDefault: true,
        sitemap: { priority: 0.7, changefreq: 'weekly' },
      }),
    }),
    defineField({
      name: 'categoryDefaults',
      title: 'Category defaults',
      type: 'object',
      group: 'category',
      options: { collapsible: false },
      fields: typeDefaultFields({
        metaTitleFormat: '%name% — Custom Packaging Insights | PakFactory Blog',
        metaDescriptionFormat: '%description%',
        indexDefault: true,
        sitemap: { priority: 0.8, changefreq: 'weekly' },
      }),
    }),
    defineField({
      name: 'tagDefaults',
      title: 'Tag defaults',
      type: 'object',
      group: 'tag',
      options: { collapsible: false },
      fields: typeDefaultFields({
        metaTitleFormat: 'Posts about %name% | PakFactory Blog',
        metaDescriptionFormat: '%description%',
        indexDefault: false,
        // tags are noindex by default → no sitemap entry
        extra: [
          defineField({
            name: 'autoNoindexThreshold',
            title: 'Auto-noindex below N posts',
            type: 'number',
            initialValue: 5,
            description:
              'Tag pages with fewer than this many posts are forced noindex, even if an editor enables indexing.',
            validation: (Rule) => Rule.min(0).integer(),
          }),
        ],
      }),
    }),
    defineField({
      name: 'authorDefaults',
      title: 'Author defaults',
      type: 'object',
      group: 'author',
      options: { collapsible: false },
      fields: typeDefaultFields({
        metaTitleFormat: '%name%, %job_title% | PakFactory Blog',
        metaDescriptionFormat: '%shortBio%',
        indexDefault: true,
        sitemap: { priority: 0.3, changefreq: 'monthly' },
      }),
    }),

    // ── General ───────────────────────────────────────────────────────────────
    defineField({
      name: 'postsPerPage',
      title: 'Posts per page',
      type: 'number',
      group: 'general',
      initialValue: 12,
      validation: (Rule) => Rule.min(1).max(50).integer(),
    }),
    defineField({
      name: 'defaultAuthor',
      title: 'Default author',
      type: 'reference',
      to: [{ type: 'author' }],
      group: 'general',
      description: 'Fallback author when a post has none assigned.',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Blog Settings' }
    },
  },
})
