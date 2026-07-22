import { defineField, defineType } from 'sanity'

/**
 * The site canonicalizes to NO trailing slash (proxy.ts 308-redirects `/x/` → `/x`),
 * so the `to` destination should be stored slashless. Returns true when `value`
 * carries a strippable trailing slash: any non-root path, or an absolute URL with a
 * non-root pathname. A bare origin (`https://host` / `https://host/`) is fine.
 */
function hasTrailingSlash(value: string): boolean {
  if (!value.endsWith('/')) return false
  if (value.startsWith('/')) return value.length > 1
  try {
    return new URL(value).pathname !== '/'
  } catch {
    return false
  }
}

const TRAILING_SLASH_MESSAGE =
  'Remove the trailing slash — the site canonicalizes to no trailing slash ' +
  '(e.g. /old-post, not /old-post/), so a slash here adds an extra redirect hop.'

/**
 * redirect — CMS-managed URL redirect entry (PROD-2157 redirect engine).
 *
 * Match types (self-serve): `exact` (one URL), `prefix` (starts-with, optionally
 * keeping the tail), `phrase` (contains a substring). Regex is intentionally NOT
 * offered here — the few capture-group rules (e.g. /category/X/Y → /Y) stay
 * dev-owned in next.config. Behaviour maps to a status the engine emits: permanent
 * 301 / temporary 302 / gone 410.
 *
 * STATE: the pattern engine is LIVE. The shared resolver (`@pakfactory/redirects`)
 * honours `matchType` (exact/prefix/phrase) and `behaviour` (permanent 301 /
 * temporary 302 / gone 410), and runs in BOTH edge proxies: the blog
 * (`apps/blog/src/proxy.ts`, `/blog` surface) and www (`apps/www/src/proxy.ts`,
 * `/case-studies` surface). A redirect's owning app is its `from` PATH PREFIX — never
 * its `group` (nor the deprecated `channel` that group replaced), which is purely
 * organizational: a blog→case-studies redirect has a `/blog/...` from and fires on the
 * blog no matter which folder an editor files it under. The legacy
 * `type` (301/302) field was retired once every doc carried `behaviour` (PROD-2157);
 * `behaviour` defaults to permanent 301.
 */
export const redirect = defineType({
  name: 'redirect',
  title: 'Redirect',
  type: 'document',
  fields: [
    defineField({
      name: 'group',
      title: 'Group',
      type: 'reference',
      to: [{ type: 'redirectGroup' }],
      description:
        'Editor-managed folder for organizing redirects. Purely organizational — it does NOT decide which app applies this redirect (that is the From path prefix). Leave empty for Ungrouped.',
    }),

    /**
     * DEPRECATED — superseded by `group`. Kept (hidden + read-only) only so the
     * ~150 pre-migration documents don't render as an unknown field. Removed in a
     * follow-up once `migrate:redirect-groups` has run on prod and been verified,
     * matching the PROD-2116 / legacy-`type` retirement sequence.
     */
    defineField({
      name: 'channel',
      title: 'Channel (deprecated)',
      type: 'string',
      readOnly: true,
      hidden: ({ value }) => !value,
      description:
        'Replaced by Group. This value is migrated to a Redirect Group and then removed — do not rely on it.',
    }),

    defineField({
      name: 'matchType',
      title: 'Match type',
      type: 'string',
      description: 'How the From value is matched against incoming requests.',
      options: {
        list: [
          { value: 'exact', title: 'Exact — this one URL' },
          { value: 'prefix', title: 'Starts with — this path and everything under it' },
          { value: 'phrase', title: 'Contains — any URL containing this phrase' },
        ],
        layout: 'radio',
      },
      initialValue: 'exact',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'behaviour',
      title: 'What should happen?',
      type: 'string',
      description:
        'Pick the plain word — the status code is set for you. 301 permanent (passes SEO value) · 302 temporary · 410 gone (deleted, no replacement).',
      options: {
        list: [
          { value: 'permanent', title: 'Permanent (301)' },
          { value: 'temporary', title: 'Temporary (302)' },
          { value: 'gone', title: 'Gone (410)' },
        ],
        layout: 'radio',
      },
      initialValue: 'permanent',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'from',
      title: 'From URL',
      type: 'string',
      description:
        'What to match — see Match type. Exact/Starts-with must begin with "/". Contains is a substring (e.g. /feed/).',
      validation: (Rule) => [
        Rule.required().custom((value, context) => {
          const matchType = (context.document?.matchType as string) ?? 'exact'
          const v = (value ?? '').trim()
          if (!v) return 'From is required'
          if (matchType === 'phrase') {
            // Contains — need not start with "/"; guard against over-broad phrases.
            if (v.length < 3 || v === '/')
              return 'Phrase is too broad — it would match almost every URL. Use something specific (e.g. /feed/).'
            return true
          }
          // exact / prefix
          if (!v.startsWith('/')) return 'Must start with "/"'
          if (v === '/') return 'Cannot match the site root'
          return true
        }),
        // Uniqueness — EXACT only (patterns can legitimately overlap; precedence
        // handles ordering). Treat docs without matchType (pre-backfill) as exact.
        Rule.custom(async (value, context) => {
          const matchType = (context.document?.matchType as string) ?? 'exact'
          if (matchType !== 'exact' || !value) return true
          const id = (context.document?._id ?? '').replace(/^drafts\./, '')
          const client = context.getClient({ apiVersion: '2024-01-01' })
          const isTaken = await client.fetch(
            `defined(*[_type == "redirect" && (matchType == "exact" || !defined(matchType)) && from == $from && !(_id in [$draft, $published])][0]._id)`,
            { from: value, draft: `drafts.${id}`, published: id },
          )
          return isTaken ? 'Another exact redirect already uses this "From" path' : true
        }),
      ],
    }),

    defineField({
      name: 'to',
      title: 'To URL',
      type: 'string',
      description: 'Destination — a relative path (/…) or a full https:// URL. Hidden for "Gone".',
      hidden: ({ document }) => document?.behaviour === 'gone',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const behaviour = (context.document?.behaviour as string) ?? 'permanent'
          if (behaviour === 'gone') return true // 410 has no destination
          if (!value) return 'To URL is required'
          const isPath = value.startsWith('/')
          const isAbsolute = /^https?:\/\//.test(value)
          if (!isPath && !isAbsolute) return 'Use a "/path" or a full https:// URL'
          const matchType = (context.document?.matchType as string) ?? 'exact'
          const from = context.document?.from as string | undefined
          if (matchType === 'exact' && from) {
            // Compare after trailing-slash normalization: the resolver canonicalizes
            // trailing slashes, so `/x/` → `/x` (or an identical pair) is a no-op it
            // silently drops as self-referential. Catch it here so editors don't
            // author a redirect that never fires. Trailing-slash canonicalization
            // (e.g. `/blog/` → `/blog`) belongs in the routing layer (next.config),
            // not a CMS redirect — see PROD-2168.
            const stripSlash = (s: string) => (s.length > 1 ? s.replace(/\/+$/, '') : s)
            if (stripSlash(value) === stripSlash(from))
              return (
                'From and To resolve to the same URL (identical, or differing only by ' +
                'a trailing slash), so this redirect is a no-op the engine skips. ' +
                'Trailing-slash canonicalization belongs in the routing layer, not a ' +
                'CMS redirect.'
              )
          }
          if (hasTrailingSlash(value)) return TRAILING_SLASH_MESSAGE
          return true
        }),
    }),

    defineField({
      name: 'appendMatchedTail',
      title: 'Keep the rest of the path',
      type: 'boolean',
      description:
        'For "Starts with": sub-pages keep their slug (e.g. /blog/tag/coffee → /blog/topics/coffee). Off = everything lands on one page.',
      hidden: ({ document }) => document?.matchType !== 'prefix',
      initialValue: false,
    }),

    defineField({
      name: 'priority',
      title: 'Priority',
      type: 'number',
      description: 'Lower runs first when multiple pattern rules could match. Pattern rules only.',
      hidden: ({ document }) => !document?.matchType || document?.matchType === 'exact',
      initialValue: 10,
      validation: (Rule) => Rule.min(0).integer(),
    }),

    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 2,
      description: 'Why this redirect exists (audit / rationale).',
    }),

    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      description: 'Inactive redirects are kept for reference but ignored by the engine.',
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      from: 'from',
      to: 'to',
      matchType: 'matchType',
      behaviour: 'behaviour',
      isActive: 'isActive',
      groupTitle: 'group.title',
    },
    prepare({ from, to, matchType, behaviour, isActive, groupTitle }) {
      const state = isActive === false ? ' · inactive' : ''
      const ch = groupTitle ? ` [${groupTitle}]` : ''
      const mt = matchType && matchType !== 'exact' ? `${matchType} · ` : ''
      const status =
        behaviour === 'gone'
          ? '410'
          : behaviour === 'temporary'
            ? '302'
            : behaviour === 'permanent'
              ? '301'
              : '301'
      const dest = behaviour === 'gone' ? 'gone (410)' : `→ ${to || '—'}`
      return {
        title: `${from || '—'} ${dest}`,
        subtitle: `${mt}${status}${ch}${state}`,
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
