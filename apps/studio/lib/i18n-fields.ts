import type { SlugValue, ValidationContext } from 'sanity'

/**
 * Slug must be unique per document type + language (not globally).
 * Allows the same slug on EN and FR translation pairs.
 */
export function uniqueSlugPerLanguage(documentType: string) {
  return async (slug: SlugValue | undefined, context: ValidationContext) => {
    const current = slug?.current?.trim()
    if (!current) return true

    const client = context.getClient({ apiVersion: '2024-01-01' })
    const language = (context.document?.language as string | undefined) ?? 'en'
    const rawId = context.document?._id?.replace(/^drafts\./, '') ?? ''
    const publishedId = rawId || ''

    const count = await client.fetch<number>(
      `count(*[
        _type == $documentType &&
        slug.current == $slug &&
        language == $language &&
        _id != $publishedId &&
        _id != $draftId
      ])`,
      {
        documentType,
        slug: current,
        language,
        publishedId,
        draftId: publishedId ? `drafts.${publishedId}` : '',
      },
    )

    return count === 0 || `Slug "${current}" is already used for ${language}`
  }
}

export const languageField = {
  name: 'language',
  title: 'Language',
  type: 'string',
  readOnly: true,
  hidden: true,
  initialValue: 'en',
} as const
