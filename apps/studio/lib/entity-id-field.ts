import { defineField, type ValidationContext } from 'sanity'

/**
 * `entityId` — the record's permanent id, shared across every platform (ADR-0017,
 * amendment 2, 2026-09-30): the uuid the Spec registry holds for it. Sanity, Notion,
 * Drive, requests and Zoho all carry the same value, and joins go by it rather than by
 * title, slug or document `_id`.
 *
 * The REGISTRY mints the id, never Studio: the catalog fill writes it from the registry
 * snapshot. So there is no `initialValue` — a document created by hand in Studio stays
 * empty ("not registered yet") until the next regeneration registers it.
 *
 * Read-only for editors. Validation only guards the shape and uniqueness, so a bad
 * fill is visible in Studio instead of silently pointing two documents at one record.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

async function uniqueEntityId(value: string | undefined, context: ValidationContext) {
  if (!value) return true
  if (!UUID.test(value)) return 'Not a registry id (expected a lowercase uuid).'

  const client = context.getClient({ apiVersion: '2024-01-01' })
  const publishedId = (context.document as { _id?: string } | undefined)?._id?.replace(/^drafts\./, '')
  const other = await client.fetch<{ _type: string; title?: string } | null>(
    `*[entityId == $value && !(_id in [$id, $draftId])][0]{_type, title}`,
    { value, id: publishedId ?? '', draftId: `drafts.${publishedId ?? ''}` },
  )
  if (!other) return true
  const named = other.title ? ` ("${other.title}")` : ''
  return `This registry id is already on another ${other._type}${named}. One record, one document.`
}

export function entityIdField({ group }: { group?: string } = {}) {
  return defineField({
    name: 'entityId',
    title: 'Registry ID',
    type: 'string',
    ...(group ? { group } : {}),
    readOnly: true,
    description:
      'Set by the catalog fill from the Spec registry, not by hand. The id this record has on every platform. Empty means not registered yet: it is filled at the next regeneration.',
    validation: (Rule) => Rule.custom(uniqueEntityId),
  })
}
