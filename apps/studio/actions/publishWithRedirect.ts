import { useState } from 'react'
import { PublishIcon } from '@sanity/icons'
import { useClient, useDocumentOperation } from 'sanity'
import type {
  DocumentActionComponent,
  DocumentActionDescription,
  SanityClient,
  SanityDocument,
} from 'sanity'

/**
 * publishWithRedirect — custom publish action for `post`.
 *
 * Wraps the default publish: when an editor changes a published post's slug and
 * republishes, it auto-creates (or refreshes) a `redirect` from the old path to
 * the new one — the WordPress "Redirection plugin" behavior, no deploy needed.
 *
 * Posts live at `/{slug}` (PROD-1597), so the redirect path is `/{slug}`.
 * Bookkeeping never blocks publishing — a redirect failure is logged, not thrown.
 */

type SluggedDoc = SanityDocument & { slug?: { current?: string } }

// Root-level segments a post slug must never collide with (PROD-1597).
const RESERVED_SEGMENTS = new Set([
  'all',
  'tag',
  'rss.xml',
  'sitemap.xml',
  'api',
  'author',
  'search',
  'contribute',
])

function toPath(slug?: string): string | null {
  if (!slug) return null
  const trimmed = slug.replace(/^\/+/, '').trim()
  return trimmed ? `/${trimmed}` : null
}

async function syncSlugChangeRedirect(
  client: SanityClient,
  oldSlug?: string,
  newSlug?: string,
): Promise<void> {
  if (!oldSlug || !newSlug || oldSlug === newSlug) return
  const fromPath = toPath(oldSlug)
  const toPathValue = toPath(newSlug)
  if (!fromPath || !toPathValue || fromPath === toPathValue) return

  // Guardrail: never shadow a reserved segment or an existing category archive.
  const seg = fromPath.split('/')[1]
  if (RESERVED_SEGMENTS.has(seg)) return
  const collidesCategory = await client.fetch<boolean>(
    `count(*[_type == "blogCategory" && slug.current == $seg]) > 0`,
    { seg },
  )
  if (collidesCategory) return

  const existing = await client.fetch<{ _id: string } | null>(
    `*[_type == "redirect" && from == $from][0]{ _id }`,
    { from: fromPath },
  )

  const tx = client.transaction()
  if (existing?._id) {
    // Idempotent: refresh the existing rule rather than duplicating it.
    tx.patch(existing._id, (p) =>
      p.set({
        to: toPathValue,
        matchType: 'exact',
        behaviour: 'permanent',
        channel: 'blog',
        isActive: true,
        notes: 'Auto-updated from slug change',
      }),
    )
  } else {
    tx.create({
      _type: 'redirect',
      from: fromPath,
      to: toPathValue,
      matchType: 'exact',
      behaviour: 'permanent',
      channel: 'blog',
      isActive: true,
      notes: 'Auto-created from slug change',
    })
  }

  // A page now lives at the new path, so it must never be a redirect *source*.
  // Drop any such rows — this also prevents a self-referential redirect when a
  // slug is reused (e.g. renamed away and then back again).
  const liveCollisions = await client.fetch<{ _id: string }[]>(
    `*[_type == "redirect" && from == $newPath]{ _id }`,
    { newPath: toPathValue },
  )
  for (const r of liveCollisions) {
    tx.delete(r._id)
  }

  // Chain collapse: anything that pointed at the old path now points at the new
  // one — but never rewrite a row whose source is the new live path (it would
  // become self-referential; those rows are deleted above).
  const inbound = await client.fetch<{ _id: string }[]>(
    `*[_type == "redirect" && to == $oldPath && from != $newPath && _id != $selfId]{ _id }`,
    { oldPath: fromPath, newPath: toPathValue, selfId: existing?._id ?? '' },
  )
  for (const r of inbound) {
    tx.patch(r._id, (p) => p.set({ to: toPathValue }))
  }

  await tx.commit()
}

export const publishWithRedirect: DocumentActionComponent = (props) => {
  const { id, type, draft, published, onComplete } = props
  const { publish } = useDocumentOperation(id, type)
  const client = useClient({ apiVersion: '2024-01-01' })
  const [isPublishing, setIsPublishing] = useState(false)

  return {
    disabled: Boolean(publish.disabled),
    icon: PublishIcon,
    label: isPublishing ? 'Publishing…' : 'Publish',
    shortcut: 'Ctrl+Alt+P',
    onHandle: async () => {
      setIsPublishing(true)
      const oldSlug = (published as SluggedDoc | null)?.slug?.current
      const newSlug = ((draft ?? published) as SluggedDoc | null)?.slug?.current
      try {
        await syncSlugChangeRedirect(client, oldSlug, newSlug)
      } catch (err) {
        // Never block publishing on redirect bookkeeping.
        console.error('[publishWithRedirect] failed to sync slug-change redirect:', err)
      }
      publish.execute()
      onComplete()
    },
  } satisfies DocumentActionDescription
}
