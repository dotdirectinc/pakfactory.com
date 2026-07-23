import { defineField } from 'sanity'

/**
 * Shared factory for a document type's SEO settings singleton.
 *
 * ⚠️ The fields here have TWO different semantics, which is why they sit in two
 * fieldsets rather than one flat list:
 *
 * - **Metadata formats** (`metaTitleFormat`, `metaDescriptionFormat`) resolve at
 *   REQUEST time. Any document that leaves its own Meta title / description
 *   blank picks up the format live, so editing one changes existing pages
 *   immediately.
 * - **Defaults for new documents** (`allowIndex`, `allowFollow`, `noImageIndex`)
 *   are copied ONCE, when a document is created (`newDocDefault` in
 *   `seo-fields.ts`). Editing one never touches an existing document; each
 *   document's own toggle is authoritative from creation onward.
 *
 * Conflating the two is the main way this screen gets misread, so the fieldset
 * titles and descriptions carry the distinction explicitly.
 *
 * `sitemapPriority` / `sitemapChangefreq` were removed in PROD-2194: Google's
 * docs state "Google ignores <priority> and <changefreq> values", and every blog
 * post had been emitting the same constant pair, so they conveyed nothing to any
 * crawler. The sitemaps stopped emitting them first; this drops the editor
 * fields that fed them.
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

/**
 * Fieldsets for the per-type settings singletons. Spread into each `defineType`
 * so both groups of fields carry their semantics in the UI, not just in code.
 */
export const TYPE_SETTINGS_FIELDSETS = [
  {
    name: 'metadataFormats',
    title: 'Metadata formats',
    description:
      'Applied live to every document of this type that leaves its own Meta title or description blank. Editing these changes existing pages straight away.',
  },
  {
    name: 'newDocumentDefaults',
    title: 'Defaults for new documents',
    description:
      'The starting values a newly created document of this type gets for its three robots toggles. Nothing else. Changing them never affects documents that already exist — each one keeps whatever is set on its own SEO tab, and that always wins.',
  },
] as const

export type TypeDefaults = {
  metaTitleFormat: string
  metaDescriptionFormat: string
  indexDefault: boolean
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
      fieldset: 'metadataFormats',
      validation: (Rule) => Rule.max(90).warning('Rendered titles read best under ~60 characters.'),
      ...g,
    }),
    defineField({
      name: 'metaDescriptionFormat',
      title: 'Meta description format',
      type: 'string',
      initialValue: metaDescriptionFormat,
      description: tokenHelp,
      fieldset: 'metadataFormats',
      validation: (Rule) =>
        Rule.max(220).warning('Rendered descriptions read best under ~160 characters.'),
      ...g,
    }),
    defineField({
      name: 'allowIndex',
      title: 'Allow indexing',
      type: 'boolean',
      initialValue: indexDefault,
      description:
        'Off also drops the page from on-site Related / Featured / listings, not just from search engines.',
      fieldset: 'newDocumentDefaults',
      ...g,
    }),
    defineField({
      name: 'allowFollow',
      title: 'Allow following links',
      type: 'boolean',
      initialValue: true,
      description:
        'Advanced — leave ON. Off means page-level nofollow: engines ignore every link on the page, including internal ones.',
      fieldset: 'newDocumentDefaults',
      ...g,
    }),
    defineField({
      name: 'noImageIndex',
      title: 'No image index',
      type: 'boolean',
      initialValue: false,
      description: 'Keeps images on the page out of Google Images.',
      fieldset: 'newDocumentDefaults',
      ...g,
    }),
    ...extra.map((field) => (group ? { ...field, group } : field)),
  ]
}
