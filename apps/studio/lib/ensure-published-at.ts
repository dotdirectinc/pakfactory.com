import type { SanityClient } from 'sanity'

/**
 * Auto-stamp `publishedAt` on first publish when the field is empty (PROD-2228).
 *
 * Call from custom Publish document actions before `publish.execute()`. Scheduled /
 * release publishes bypass Studio actions — those are covered by the
 * `stamp-published-at` Sanity Function.
 *
 * Never throws: bookkeeping must not block publishing.
 */
export async function ensurePublishedAt(
  client: SanityClient,
  documentId: string,
  publishedAt: string | null | undefined,
  logLabel: string,
): Promise<void> {
  if (publishedAt?.trim()) return

  const baseId = documentId.replace(/^drafts\./, '')
  const draftId = documentId.startsWith('drafts.')
    ? documentId
    : `drafts.${baseId}`

  try {
    await client
      .patch(draftId)
      .set({ publishedAt: new Date().toISOString() })
      .commit()
  } catch (err) {
    console.error(`[${logLabel}] failed to set publishedAt:`, err)
  }
}
