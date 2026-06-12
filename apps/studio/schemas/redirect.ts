import { defineField, defineType } from 'sanity'

/**
 * redirect — CMS-managed URL redirect entry.
 *
 * Mostly auto-managed: a Studio publish action creates one of these when a post
 * slug changes (old path → new path). Editors/admins can also add them by hand.
 * The blog applies active redirects at request time on would-be-404s.
 *
 * Field names `from` / `to` are consumed directly by GROQ (BLOG_REDIRECTS_QUERY).
 * Status `type` is stored as 301/302 for editor familiarity; the blog maps
 * 301→308 and 302→307 at apply time (a Server Component can only emit 307/308).
 */
export const redirect = defineType({
  name: 'redirect',
  title: 'Redirect',
  type: 'document',
  fields: [
    defineField({
      name: 'from',
      title: 'From URL',
      type: 'string',
      description:
        'Source path to redirect away from. Must start with "/" (e.g. /old-post-slug). Must be unique.',
      validation: (Rule) => [
        Rule.required()
          .custom((value) => {
            if (!value) return 'From URL is required'
            if (!value.startsWith('/')) return 'Must start with "/"'
            if (value === '/') return 'Cannot redirect the site root'
            return true
          }),
        // Uniqueness — no other redirect may share this "from" path.
        Rule.custom(async (value, context) => {
          if (!value) return true
          const id = (context.document?._id ?? '').replace(/^drafts\./, '')
          const client = context.getClient({ apiVersion: '2024-01-01' })
          const isTaken = await client.fetch(
            `defined(*[_type == "redirect" && from == $from && !(_id in [$draft, $published])][0]._id)`,
            { from: value, draft: `drafts.${id}`, published: id },
          )
          return isTaken ? 'Another redirect already uses this "From" path' : true
        }),
      ],
    }),
    defineField({
      name: 'to',
      title: 'To URL',
      type: 'string',
      description:
        'Destination — a relative path (e.g. /new-post-slug) or an absolute URL (https://…).',
      validation: (Rule) =>
        Rule.required().custom((value, context) => {
          if (!value) return 'To URL is required'
          const isPath = value.startsWith('/')
          const isAbsolute = /^https?:\/\//.test(value)
          if (!isPath && !isAbsolute) return 'Use a "/path" or a full https:// URL'
          if (value === (context.document?.from as string | undefined))
            return 'From and To must be different'
          return true
        }),
    }),
    defineField({
      name: 'type',
      title: 'Redirect type',
      type: 'string',
      description:
        'Permanent (301) for moved content; Temporary (302) for short-lived redirects.',
      options: {
        list: [
          { value: '301', title: '301 — Permanent' },
          { value: '302', title: '302 — Temporary' },
        ],
        layout: 'radio',
      },
      initialValue: '301',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 2,
      description: 'Why this redirect exists (e.g. "Auto-created from slug change").',
    }),
    defineField({
      name: 'channel',
      title: 'Channel',
      type: 'string',
      description: 'Which content channel this redirect belongs to. Used to filter redirects per workspace.',
      options: {
        list: [
          { title: 'Blog', value: 'blog' },
          { title: 'Website', value: 'website' },
          { title: 'Products', value: 'products' },
          { title: 'Solutions', value: 'solutions' },
          { title: 'Expertise', value: 'expertise' },
        ],
        layout: 'dropdown',
      },
      initialValue: 'blog',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      description: 'Inactive redirects are kept for reference but ignored by the site.',
      initialValue: true,
    }),
  ],
  preview: {
    select: { from: 'from', to: 'to', type: 'type', isActive: 'isActive', channel: 'channel' },
    prepare({ from, to, type, isActive, channel }) {
      const state = isActive === false ? ' · inactive' : ''
      const ch = channel ? ` [${channel}]` : ''
      return {
        title: `${from || '—'} → ${to || '—'}`,
        subtitle: `${type || '301'}${ch}${state}`,
      }
    },
  },
  orderings: [
    {
      title: 'Active first, newest',
      name: 'activeNewest',
      by: [
        { field: 'isActive', direction: 'desc' },
        { field: '_updatedAt', direction: 'desc' },
      ],
    },
    {
      title: 'From (A–Z)',
      name: 'fromAsc',
      by: [{ field: 'from', direction: 'asc' }],
    },
  ],
})
