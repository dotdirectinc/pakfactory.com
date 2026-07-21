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
 * publishCaseStudy — custom publish action for `caseStudy`.
 *
 * Two side effects wrap the default publish:
 *  1. Sets `publishedAt` on first publish when empty.
 *  2. When an editor changes a published case study's slug and republishes, it
 *     auto-creates (or refreshes) a `redirect` from the old `/case-studies/{slug}`
 *     to the new one — the same slug-change safety net the blog's post action
 *     provides (see `publishWithRedirect`), resolved at runtime by the www proxy.
 *
 * Case studies live at `/case-studies/{slug}` on www, so the redirect is scoped
 * to that path with `channel: "website"`. Bookkeeping never blocks publishing —
 * a redirect failure is logged, not thrown. Visibility on www stays controlled by
 * Sanity publish state.
 */

type CaseStudyDoc = SanityDocument & {
  publishedAt?: string
  slug?: { current?: string }
}

const CASE_STUDY_BASE = '/case-studies'

function toCaseStudyPath(slug?: string): string | null {
  if (!slug) return null
  const trimmed = slug.replace(/^\/+/, '').trim()
  return trimmed ? `${CASE_STUDY_BASE}/${trimmed}` : null
}

async function syncSlugChangeRedirect(
  client: SanityClient,
  oldSlug?: string,
  newSlug?: string,
): Promise<void> {
  if (!oldSlug || !newSlug || oldSlug === newSlug) return
  const fromPath = toCaseStudyPath(oldSlug)
  const toPathValue = toCaseStudyPath(newSlug)
  if (!fromPath || !toPathValue || fromPath === toPathValue) return

  const existing = await client.fetch<{ _id: string } | null>(
    `*[_type == "redirect" && from == $from][0]{ _id }`,
    { from: fromPath },
  )

  const tx = client.transaction()
  const rule = {
    channel: 'website',
    matchType: 'exact',
    behaviour: 'permanent',
    type: '301', // legacy anchor — the resolver reads `behaviour` first, this second
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

  // A case study now lives at the new path, so it must never be a redirect
  // *source*. Drop any such rows — this also prevents a self-referential redirect
  // when a slug is reused (renamed away and then back again).
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

export const publishCaseStudy: DocumentActionComponent = (props) => {
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
      const doc = (draft ?? published) as CaseStudyDoc | null
      const publishedAt = doc?.publishedAt?.trim()

      if (!publishedAt) {
        const baseId = id.replace(/^drafts\./, '')
        const draftId = id.startsWith('drafts.') ? id : `drafts.${baseId}`
        try {
          await client
            .patch(draftId)
            .set({ publishedAt: new Date().toISOString() })
            .commit()
        } catch (err) {
          console.error('[publishCaseStudy] failed to set publishedAt:', err)
        }
      }

      // Slug-change redirect: compare the published slug (old) to the draft slug
      // being published (new). Never block publishing on redirect bookkeeping.
      const oldSlug = (published as CaseStudyDoc | null)?.slug?.current
      const newSlug = ((draft ?? published) as CaseStudyDoc | null)?.slug?.current
      try {
        await syncSlugChangeRedirect(client, oldSlug, newSlug)
      } catch (err) {
        console.error('[publishCaseStudy] failed to sync slug-change redirect:', err)
      }

      publish.execute()
      setIsPublishing(false)
      onComplete()
    },
  } satisfies DocumentActionDescription
}
