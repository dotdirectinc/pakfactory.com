import { defineField, defineType } from 'sanity'
import { CogIcon } from '@sanity/icons'
import { PAGE_TOKEN_HELP, typeDefaultFields } from '../lib/type-default-fields'

/**
 * Blog Settings (singleton) — general blog options plus, for now, the per-type
 * SEO/indexing DEFAULTS. The per-type defaults are being co-located into standalone
 * `*Settings` singletons next to each list (PROD-2116); this doc keeps the legacy
 * `*Defaults` objects as the fallback source until that migration is verified in
 * prod. Any individual document overrides these on its own SEO tab.
 *
 * NOTE: the meta-title/description FORMATS use a token set. Resolving the tokens
 * (and the fallback chains that apply these defaults) is query-layer work — these
 * fields only declare the editable defaults. The shared field factory lives in
 * `lib/type-default-fields.ts` so the new singletons reuse it verbatim.
 */

export const blogSettings = defineType({
  name: 'blogSettings',
  title: 'Blog Settings',
  type: 'document',
  icon: CogIcon,
  groups: [
    { name: 'post', title: 'Post defaults', default: true },
    { name: 'category', title: 'Category defaults' },
    { name: 'tag', title: 'Topic defaults' },
    { name: 'author', title: 'Author defaults' },
    { name: 'page', title: 'Page defaults' },
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
        metaTitleFormat: '%title%',
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
        metaTitleFormat: '%name% | PakFactory Blog',
        metaDescriptionFormat: '%description%',
        indexDefault: true,
        sitemap: { priority: 0.8, changefreq: 'weekly' },
      }),
    }),
    defineField({
      name: 'tagDefaults',
      title: 'Topic defaults',
      type: 'object',
      group: 'tag',
      options: { collapsible: false },
      fields: typeDefaultFields({
        metaTitleFormat: '%name% | PakFactory Blog',
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
              'Topic pages with fewer than this many posts are forced noindex, even if an editor enables indexing.',
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
    defineField({
      name: 'pageDefaults',
      title: 'Page defaults',
      type: 'object',
      group: 'page',
      options: { collapsible: false },
      description: PAGE_TOKEN_HELP,
      fields: typeDefaultFields({
        metaTitleFormat: '%title% | PakFactory Blog',
        metaDescriptionFormat: '%description%',
        indexDefault: true,
        sitemap: { priority: 0.5, changefreq: 'weekly' },
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
