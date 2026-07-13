import { useState } from 'react'
import { PublishIcon } from '@sanity/icons'
import { useClient, useDocumentOperation } from 'sanity'
import type {
  DocumentActionComponent,
  DocumentActionDescription,
  SanityDocument,
} from 'sanity'

/**
 * publishCaseStudy — custom publish action for `caseStudy`.
 *
 * Sets `publishedAt` on first publish when empty, then runs the default publish.
 * Visibility on www is controlled by Sanity publish state + `archived != true`.
 */

type CaseStudyDoc = SanityDocument & { publishedAt?: string }

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

      publish.execute()
      setIsPublishing(false)
      onComplete()
    },
  } satisfies DocumentActionDescription
}
