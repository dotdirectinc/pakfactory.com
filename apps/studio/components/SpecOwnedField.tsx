import type { CSSProperties } from 'react'
import { useFormValue, type FieldProps } from 'sanity'
import { specRecordUrl, type SpecLevel } from '../lib/spec-owned'

/**
 * A field the Spec System owns — a customization rule (PROD-2988) or a registered record's parent (PROD-3008): the field as usual, read-only, with a note saying
 * where it is edited and a link to the record there. The note shows only while the field is
 * read-only, so a field the switch leaves editable (an inspiration product's pre-selections, or every
 * rule while the revert flag is on) looks exactly as before.
 */

const NOTE_STYLE: CSSProperties = {
  marginTop: 8,
  padding: '8px 10px',
  borderRadius: 4,
  fontSize: 13,
  lineHeight: 1.4,
  background: 'var(--card-badge-primary-bg-color, rgba(34, 118, 252, 0.08))',
  color: 'var(--card-fg-color, inherit)',
}

const WORDING = {
  rules: {
    lead: 'Edited in Spec System.',
    body: 'Customization rules are changed and approved in the admin office, then written here.',
    path: 'Admin office → Spec System → Catalog → this record → Edit rules.',
  },
  // PROD-3008: a registered record's parents (ADR-026 option A).
  structure: {
    lead: 'Moved in Spec System.',
    body: 'Once a record is registered, its parents change in the admin office — where its code and children follow — then are written here.',
    path: 'Admin office → Spec System → Catalog → this record → Catalog structure → Move.',
  },
} as const

/** `level` is the record's Spec System Catalog level; a product's depends on its kind. */
export function specOwnedField(level: SpecLevel | 'product-by-kind', what: keyof typeof WORDING = 'rules') {
  return function SpecOwnedField(props: FieldProps) {
    const id = useFormValue(['_id']) as string | undefined
    const kind = useFormValue(['kind']) as string | undefined
    const readOnly = Boolean((props as { inputProps?: { readOnly?: boolean } }).inputProps?.readOnly)
    if (!readOnly) return props.renderDefault(props)
    const href = specRecordUrl(level === 'product-by-kind' ? (kind === 'inspiration' ? 'inspiration' : 'product') : level, id)
    const w = WORDING[what]
    return (
      <div>
        {props.renderDefault(props)}
        <div style={NOTE_STYLE}>
          <strong>{w.lead}</strong> {w.body}{' '}
          {href ? (
            <a href={href} target="_blank" rel="noreferrer">
              Open this record in Spec System
            </a>
          ) : (
            <span>{w.path}</span>
          )}
        </div>
      </div>
    )
  }
}
