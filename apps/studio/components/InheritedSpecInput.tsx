import { useEffect, useState } from 'react'
import { useFormValue, useClient } from 'sanity'
import type { NumberInputProps } from 'sanity'

interface InheritedSpecInputOptions {
  /** Field name on productStyleCategory to fetch */
  field: 'defaultMoq' | 'defaultLeadTimeDays'
  /** Unit label shown after the value, e.g. " units" or " days" */
  unit: string
}

/**
 * Wraps a number input field and shows the inherited default value
 * from the first linked productStyleCategory above the override field.
 *
 * Usage in product.ts:
 *   components: { input: createInheritedSpecInput('defaultMoq', ' units') }
 */
export function createInheritedSpecInput(field: InheritedSpecInputOptions['field'], unit: string) {
  return function InheritedSpecInput(props: NumberInputProps) {
    const client = useClient({ apiVersion: '2024-01-01' })
    const styleRefs = useFormValue(['productStyleCategories']) as Array<{ _ref?: string }> | undefined
    const [inheritedValue, setInheritedValue] = useState<number | null>(null)
    const [styleTitle, setStyleTitle] = useState<string | null>(null)

    const firstRef = styleRefs?.[0]?._ref

    useEffect(() => {
      if (!firstRef) {
        setInheritedValue(null)
        setStyleTitle(null)
        return
      }

      let cancelled = false

      client
        .fetch<{ value: number | null; title: string | null }>(
          `*[_id == $id][0]{ "value": ${field}, title }`,
          { id: firstRef }
        )
        .then((res) => {
          if (cancelled) return
          setInheritedValue(res?.value ?? null)
          setStyleTitle(res?.title ?? null)
        })
        .catch(() => {
          if (!cancelled) {
            setInheritedValue(null)
            setStyleTitle(null)
          }
        })

      return () => { cancelled = true }
    }, [firstRef, client, field])

    return (
      <div>
        {inheritedValue != null && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--card-muted-fg-color, #888)',
              background: 'var(--card-code-bg-color, rgba(0,0,0,0.04))',
              borderRadius: 4,
              padding: '3px 8px',
              marginBottom: 8,
            }}
          >
            <span>Inherited from style{styleTitle ? ` "${styleTitle}"` : ''}:</span>
            <strong style={{ color: 'var(--card-fg-color, #333)' }}>
              {inheritedValue}{unit}
            </strong>
            <span style={{ opacity: 0.55 }}>— leave blank to use this value</span>
          </div>
        )}
        {props.renderDefault(props)}
      </div>
    )
  }
}
