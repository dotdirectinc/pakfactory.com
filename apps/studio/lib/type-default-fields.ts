import { defineField } from 'sanity'

/**
 * Shared factory for a document type's SEO/sitemap DEFAULTS (meta title/description
 * format strings, robots toggles, sitemap priority/frequency).
 *
 * Used by both the legacy `blogSettings` singleton (where the fields nest inside a
 * per-type `object` that supplies the group) and the five per-type settings
 * singletons — `postSettings` / `categorySettings` / `topicSettings` /
 * `authorSettings` / `pageSettings` (PROD-2116), where the fields sit flat under a
 * single `SEO` group. Pass `group` for the flat singleton case; omit it for the
 * nested-object case.
 */

export const TOKEN_HELP =
  'Tokens: %title%, %name%, %job_title%, %excerpt%, %description%, %shortBio%, %sitename%. One change affects every page of this type, so keep it generic.'

export const PAGE_TOKEN_HELP =
  'For blog pages, %title% and %description% map to the page Overview title and description. Other tokens apply the same way across page roles (home, topics, search, contribute, 404, landing, static).'

const CHANGEFREQ = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']

export type TypeDefaults = {
  metaTitleFormat: string
  metaDescriptionFormat: string
  indexDefault: boolean
  sitemap?: { priority: number; changefreq: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra?: any[]
  /** Group id to assign to every field (flat singleton use). Omit for nested-object use. */
  group?: string
  /** Override the token help on the two format fields (e.g. page-specific guidance). */
  tokenHelp?: string
}

export function typeDefaultFields({
  metaTitleFormat,
  metaDescriptionFormat,
  indexDefault,
  sitemap,
  extra = [],
  group,
  tokenHelp = TOKEN_HELP,
}: TypeDefaults) {
  const g = group ? { group } : {}
  return [
    defineField({
      name: 'metaTitleFormat',
      title: 'Meta title format',
      type: 'string',
      initialValue: metaTitleFormat,
      description: tokenHelp,
      validation: (Rule) => Rule.max(90).warning('Rendered titles read best under ~60 characters.'),
      ...g,
    }),
    defineField({
      name: 'metaDescriptionFormat',
      title: 'Meta description format',
      type: 'string',
      initialValue: metaDescriptionFormat,
      description: tokenHelp,
      validation: (Rule) =>
        Rule.max(220).warning('Rendered descriptions read best under ~160 characters.'),
      ...g,
    }),
    defineField({
      name: 'allowIndex',
      title: 'Index by default',
      type: 'boolean',
      initialValue: indexDefault,
      description: 'Default for new documents of this type; each document can override.',
      ...g,
    }),
    defineField({
      name: 'allowFollow',
      title: 'Follow links by default',
      type: 'boolean',
      initialValue: true,
      ...g,
    }),
    defineField({
      name: 'noImageIndex',
      title: 'No image index by default',
      type: 'boolean',
      initialValue: false,
      ...g,
    }),
    ...(sitemap
      ? [
          defineField({
            name: 'sitemapPriority',
            title: 'Sitemap priority',
            type: 'number',
            initialValue: sitemap.priority,
            validation: (Rule) => Rule.min(0).max(1),
            ...g,
          }),
          defineField({
            name: 'sitemapChangefreq',
            title: 'Sitemap change frequency',
            type: 'string',
            initialValue: sitemap.changefreq,
            options: { list: CHANGEFREQ },
            ...g,
          }),
        ]
      : []),
    ...extra.map((field) => (group ? { ...field, group } : field)),
  ]
}
