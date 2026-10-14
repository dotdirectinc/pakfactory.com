import { useState } from 'react'
import { PublishIcon } from '@sanity/icons'
import { useClient, useDocumentOperation } from 'sanity'
import {
  AUTO_REDIRECT_GROUP,
  resolveRedirectGroupRef,
} from '../lib/redirect-groups'
import { ensurePublishedAt } from '../lib/ensure-published-at'
import type {
  DocumentActionComponent,
  DocumentActionDescription,
  SanityClient,
  SanityDocument,
} from 'sanity'

/**
 * publishPressRelease — custom publish action for `pressRelease` (PROD-2909).
 *
 * Two side effects wrap the default publish:
 *  1. Sets `publishedAt` on first publish when empty (PROD-2228 shared helper).
 *  2. When an editor changes a published release's slug and republishes, it
 *     auto-creates (or refreshes) a `redirect` from the old `/newsroom/{slug}`
 *     to the new one.
 *
 * 🔴 The redirect is not optional for this type. A press-release URL gets quoted
 * inside articles other people publish; changing a slug without a redirect
 * breaks a link in someone else's archive, and you will never hear about it.
 *
 * Why not reuse `publishWithRedirect` (the blog's action), which PROD-2909 names:
 * that one is scoped to `/{slug}` at the site root, carries the blog's reserved
 * segments and checks `blogCategory` slug collisions. Pointed at a release it
 * would file the redirect at the wrong path. This is `publishCaseStudy` with a
 * different base — the same shape a path-scoped type already needed.
 *
 * Bookkeeping never blocks publishing: a redirect failure is logged, not thrown.
 */

type PressReleaseDoc = SanityDocument & {
  publishedAt?: string
  slug?: { current?: string }
}

const NEWSROOM_BASE = '/newsroom'

function toNewsroomPath(slug?: string): string | null {
  if (!slug) return null
  const trimmed = slug.replace(/^\/+/, '').trim()
  return trimmed ? `${NEWSROOM_BASE}/${trimmed}` : null
}

async function syncSlugChangeRedirect(
  client: SanityClient,
  oldSlug?: string,
  newSlug?: string,
): Promise<void> {
  if (!oldSlug || !newSlug || oldSlug === newSlug) return
  const fromPath = toNewsroomPath(oldSlug)
  const toPathValue = toNewsroomPath(newSlug)
  if (!fromPath || !toPathValue || fromPath === toPathValue) return

  const existing = await client.fetch<{ _id: string } | null>(
    `*[_type == "redirect" && from == $from][0]{ _id }`,
    { from: fromPath },
  )

  // File the rule under the Newsroom redirect group when it exists; a missing
  // group just means Ungrouped — never block publishing on bookkeeping.
  const groupRef = await resolveRedirectGroupRef(
    client,
    AUTO_REDIRECT_GROUP.newsroom,
  )

  const tx = client.transaction()
  const rule = {
    ...(groupRef ? { group: groupRef } : {}),
    matchType: 'exact',
    behaviour: 'permanent',
    to: toPathValue,
    isActive: true,
  }
  if (existing?._id) {
    // Idempotent: refresh the existing rule rather than duplicating it.
    tx.patch(existing._id, (p) =>
      p.set({ ...rule, notes: 'Auto-updated from slug change' }),
    )
  } else {
    tx.create({
      _type: 'redirect',
      from: fromPath,
      ...rule,
      notes: 'Auto-created from slug change',
    })
  }

  // A release now lives at the new path, so it must never be a redirect
  // *source*. Drop any such rows — this also prevents a self-referential
  // redirect when a slug is reused (renamed away and then back again).
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

export const publishPressRelease: DocumentActionComponent = (props) => {
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
      const doc = (draft ?? published) as PressReleaseDoc | null
      await ensurePublishedAt(client, id, doc?.publishedAt, 'publishPressRelease')

      // Slug-change redirect: compare the published slug (old) to the draft slug
      // being published (new). Never block publishing on redirect bookkeeping.
      const oldSlug = (published as PressReleaseDoc | null)?.slug?.current
      const newSlug = ((draft ?? published) as PressReleaseDoc | null)?.slug?.current
      try {
        await syncSlugChangeRedirect(client, oldSlug, newSlug)
      } catch (err) {
        console.error('[publishPressRelease] failed to sync slug-change redirect:', err)
      }

      publish.execute()
      setIsPublishing(false)
      onComplete()
    },
  } satisfies DocumentActionDescription
}
