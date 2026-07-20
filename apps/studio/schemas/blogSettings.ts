import { defineField, defineType } from 'sanity'
import { CogIcon } from '@sanity/icons'

/**
 * Blog Settings (singleton) — general blog options only.
 *
 * The per-type SEO/indexing DEFAULTS moved to co-located `*Settings` singletons
 * next to each list (PROD-2116): postSettings, categorySettings, topicSettings,
 * authorSettings, pageSettings. The blog reads those directly (no fallback to this
 * doc anymore), so the old per-type `*Defaults` tabs are removed here. Any legacy
 * `*Defaults` values still stored on this document are now inert (not in the schema,
 * not read by the query) — see the seed/cleanup notes in `apps/blog/memory.md`.
 */
export const blogSettings = defineType({
  name: 'blogSettings',
  title: 'Blog Settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({
      name: 'postsPerPage',
      title: 'Posts per page',
      type: 'number',
      initialValue: 12,
      validation: (Rule) => Rule.min(1).max(50).integer(),
    }),
    defineField({
      name: 'defaultAuthor',
      title: 'Default author',
      type: 'reference',
      to: [{ type: 'author' }],
      description: 'Fallback author when a post has none assigned.',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Blog Settings' }
    },
  },
})
