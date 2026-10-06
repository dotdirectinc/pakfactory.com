import { defineField, type ValidationContext } from 'sanity'

/**
 * The record's two registry identifiers (ADR-0017 amendment 3; spec:
 * pakfactory.com-backend/docs/entity-ids.md).
 *
 * - `entityId`: permanent id, a TypeID such as `prd_01m2r2g49rezgace4aqxmp8s8f`
 *   (kind prefix + UUIDv7 in base32). The only join key across platforms. Never
 *   changes.
 * - `entityCode`: readable code such as `PRD-LBL-0214-4` (kind, parent, sequence,
 *   ISO 7064 check character). Reissued when the record moves. Never a join key.
 *
 * The REGISTRY mints both, never Studio: the catalog fill writes them. So there is no
 * `initialValue`. A document created by hand in Studio stays empty ("not registered
 * yet") until the next regeneration registers it.
 *
 * Read-only for editors. Validation guards the shape, the kind and (for the id)
 * uniqueness, so a bad fill shows up in Studio instead of silently pointing two
 * documents at one record.
 */

/** TypeID suffix: 26 Crockford base32 chars (no i l o u); the first is 0–7 (128 bits). */
const TYPEID_SUFFIX = /^[0-7][0-9a-hjkmnp-tv-z]{25}$/
const CODE = /^([A-Z]{3})-([A-Z]{3})(?:-(\d{4,})-([0-9A-Z]))?$/
const CHECK_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** ISO/IEC 7064 hybrid MOD 37,36 check character over the code body, hyphens removed. */
export function entityCodeCheck(body: string): string {
  let p = 36
  for (const c of body.replace(/-/g, '')) {
    let s = (p + CHECK_ALPHABET.indexOf(c)) % 36
    if (s === 0) s = 36
    p = (s * 2) % 37
  }
  return CHECK_ALPHABET[(37 - p) % 36]
}

function validId(prefix: string) {
  return async (value: string | undefined, context: ValidationContext) => {
    if (!value) return true
    const [kind, suffix, ...rest] = value.split('_')
    if (rest.length || !suffix || !TYPEID_SUFFIX.test(suffix)) {
      return `Not a registry id (expected ${prefix}_ followed by 26 characters).`
    }
    if (kind !== prefix) return `This id is of kind "${kind}"; this document type takes "${prefix}" ids.`

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
}

function validCode(kinds: string[]) {
  return (value: string | undefined) => {
    if (!value) return true
    const m = CODE.exec(value)
    if (!m) return 'Not a registry code (expected e.g. PRD-LBL-0214-4).'
    if (!kinds.includes(m[1])) return `This code is of kind ${m[1]}; this document type takes ${kinds.join(' or ')} codes.`
    if (m[3] && entityCodeCheck(value.slice(0, value.lastIndexOf('-'))) !== m[4]) {
      return 'The check character does not match: the code was mistyped or altered.'
    }
    return true
  }
}

type EntityFieldsOptions = {
  /** The TypeID prefix this document type takes, e.g. `prd`. */
  prefix: string
  /** The code kinds it takes, e.g. `['PRD', 'INS']` for products. */
  codeKinds: string[]
  group?: string
}

export function entityFields({ prefix, codeKinds, group }: EntityFieldsOptions) {
  const inGroup = group ? { group } : {}
  return [
    defineField({
      name: 'entityId',
      title: 'Registry ID',
      type: 'string',
      ...inGroup,
      readOnly: true,
      description:
        'Set by the catalog fill from the Spec registry, not by hand. This record\'s permanent id on every platform. Empty means not registered yet: it is filled at the next regeneration.',
      validation: (Rule) => Rule.custom(validId(prefix)),
    }),
    defineField({
      name: 'entityCode',
      title: 'Registry code',
      type: 'string',
      ...inGroup,
      readOnly: true,
      description:
        'Set by the catalog fill from the Spec registry. A readable code for people (phone, Zoho, Drive). It changes if the record moves; the Registry ID never does.',
      validation: (Rule) => Rule.custom(validCode(codeKinds)),
    }),
  ]
}
