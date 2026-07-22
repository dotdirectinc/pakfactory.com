import { FolderIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

/**
 * redirectGroup — editor-managed grouping for `redirect` documents.
 *
 * Replaces the old hardcoded `channel` dropdown (blog / website / products /
 * solutions / expertise), which was a fixed list nobody could extend and which
 * drifted from the real channel registry in `lib/channels.ts` (it was missing
 * `academy` and offered three values that were never channels at all).
 *
 * Mirrors the `blogTopicGroup` pattern: editors create / rename / delete groups
 * from the desk, and each `redirect` references one. Grouping is **purely
 * organizational** — it does NOT scope which app applies a redirect. A
 * redirect's owning app is its `from` PATH PREFIX (see
 * `packages/redirects/src/index.ts` and `apps/{blog,www}/src/proxy.ts`); the old
 * `channel` field never controlled routing either, despite its description
 * claiming it did.
 */
export const redirectGroup = defineType({
  name: 'redirectGroup',
  title: 'Redirect Group',
  type: 'document',
  icon: FolderIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Name',
      type: 'string',
      description: 'Folder label in the Redirects desk (e.g. Blog, Case Studies, Legacy WordPress).',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      description:
        'Stable key used by migration/parity scripts and by the auto-created slug-change redirects. Kebab-case; avoid changing it once redirects reference this group.',
      validation: (Rule) =>
        Rule.required().custom(async (value, context) => {
          const slug = value?.current
          if (!slug) return 'Slug is required'
          const id = (context.document?._id ?? '').replace(/^drafts\./, '')
          const client = context.getClient({ apiVersion: '2024-01-01' })
          const taken = await client.fetch<boolean>(
            `defined(*[_type == "redirectGroup" && slug.current == $slug && !(_id in [$draft, $published])][0]._id)`,
            { slug, draft: `drafts.${id}`, published: id },
          )
          return taken ? 'Another redirect group already uses this slug' : true
        }),
    }),

    defineField({
      name: 'order',
      title: 'Sort order',
      type: 'number',
      description: 'Folder order in the Redirects desk. Lower sorts first.',
      initialValue: 0,
      validation: (Rule) => Rule.integer().min(0),
    }),

    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'Optional — what belongs in this group (audit / onboarding aid).',
    }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current', order: 'order' },
    prepare({ title, slug, order }) {
      return {
        title,
        subtitle: [order != null ? `order ${order}` : null, slug ? `/${slug}` : 'No slug']
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
  orderings: [
    {
      title: 'Sort order',
      name: 'orderAsc',
      by: [
        { field: 'order', direction: 'asc' },
        { field: 'title', direction: 'asc' },
      ],
    },
    {
      title: 'Name A–Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
})
