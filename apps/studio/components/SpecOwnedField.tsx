import type { CSSProperties } from 'react'
import { useFormValue, type FieldProps } from 'sanity'
import { specRecordUrl, type SpecLevel } from '../lib/spec-owned'

/**
 * A rule field the Spec System owns (PROD-2988): the field as usual, read-only, with a note saying
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

export function specOwnedField(level: SpecLevel) {
  return function SpecOwnedField(props: FieldProps) {
    const id = useFormValue(['_id']) as string | undefined
    const readOnly = Boolean((props as { inputProps?: { readOnly?: boolean } }).inputProps?.readOnly)
    if (!readOnly) return props.renderDefault(props)
    const href = specRecordUrl(level, id)
    return (
      <div>
        {props.renderDefault(props)}
        <div style={NOTE_STYLE}>
          <strong>Edited in Spec System.</strong> Customization rules are changed and approved in the admin office, then
          written here.{' '}
          {href ? (
            <a href={href} target="_blank" rel="noreferrer">
              Open this record in Spec System
            </a>
          ) : (
            <span>Admin office → Spec System → Catalog → this record → Edit rules.</span>
          )}
        </div>
      </div>
    )
  }
}
