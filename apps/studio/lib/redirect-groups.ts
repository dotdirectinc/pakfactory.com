import type { SanityClient } from 'sanity'

/**
 * Well-known `redirectGroup` slugs used by the auto-created slug-change
 * redirects. The groups themselves are ordinary editor-managed documents —
 * these slugs are only the lookup keys the publish actions use to file a new
 * rule in a sensible folder.
 *
 * Created by `pnpm --filter @pakfactory/studio migrate:redirect-groups`.
 * If an editor renames or deletes one, auto-created redirects simply land in
 * Ungrouped — filing a redirect must never block publishing content.
 */
export const AUTO_REDIRECT_GROUP = {
  blogPosts: 'blog',
  caseStudies: 'case-studies',
} as const

export type RedirectGroupRef = { _type: 'reference'; _ref: string }

/**
 * Resolve a `redirectGroup` reference by slug, or `null` when no such group
 * exists. Callers spread the result so a missing group yields no `group` field
 * at all (Ungrouped) rather than a dangling reference.
 */
export async function resolveRedirectGroupRef(
  client: SanityClient,
  slug: string,
): Promise<RedirectGroupRef | null> {
  try {
    const id = await client.fetch<string | null>(
      `*[_type == "redirectGroup" && slug.current == $slug][0]._id`,
      { slug },
    )
    return id ? { _type: 'reference', _ref: id.replace(/^drafts\./, '') } : null
  } catch {
    return null
  }
}
