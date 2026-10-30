/**
 * Inspiration Specs — read-only panel of the base product's manufacturing specs
 * (PROD-3200). Own fields stay editable; www coalesces unset fields from basedOn.
 * This panel makes the fallback visible so a blank MOQ does not look like "none".
 */

import {useEffect, useState, type CSSProperties} from 'react'
import {useClient, useFormValue, type StringInputProps} from 'sanity'
import {DIMENSION_INPUTS} from '@pakfactory/sanity/dimension-inputs'

const PANEL: CSSProperties = {
  marginBottom: 16,
  padding: '10px 12px',
  borderRadius: 4,
  fontSize: 13,
  lineHeight: 1.45,
  background: 'var(--card-badge-warning-bg-color, rgba(148, 107, 0, 0.1))',
  color: 'var(--card-fg-color, inherit)',
}

const LIST: CSSProperties = {
  margin: '8px 0 0',
  padding: 0,
  listStyle: 'none',
  display: 'grid',
  gap: 4,
}

type BaseSpecs = {
  _id: string
  title?: string | null
  moq?: number | null
  dimensionInput?: string | null
  leadTimeBusinessDaysMin?: number | null
  leadTimeBusinessDaysMax?: number | null
  dimensionRange?: Record<string, number | null | undefined> | null
}

const BASE_QUERY = `coalesce(
  *[_id == "drafts." + $baseId][0],
  *[_id == $baseId][0]
){
  _id,
  title,
  moq,
  dimensionInput,
  leadTimeBusinessDaysMin,
  leadTimeBusinessDaysMax,
  dimensionRange
}`

function shapeTitle(value: string | null | undefined): string | null {
  const key = value?.trim()
  if (!key) return null
  return DIMENSION_INPUTS.find((row) => row.value === key)?.title ?? key
}

function leadTimeLabel(min?: number | null, max?: number | null): string | null {
  const hasMin = typeof min === 'number'
  const hasMax = typeof max === 'number'
  if (!hasMin && !hasMax) return null
  if (hasMin && hasMax) {
    if (min === max) return `${min} business days`
    return `${Math.min(min, max)}–${Math.max(min, max)} business days`
  }
  return `${hasMin ? min : max} business days`
}

function rangeSummary(
  range: BaseSpecs['dimensionRange'],
): string | null {
  if (!range) return null
  const parts: string[] = []
  for (const [key, val] of Object.entries(range)) {
    if (typeof val === 'number') parts.push(`${key}: ${val}`)
  }
  return parts.length ? `${parts.join(', ')} mm` : null
}

/**
 * Placeholder string input — value is unused. Shown only on inspiration products.
 */
export function ProductSpecsBaseFallback(_props: StringInputProps) {
  const kind = useFormValue(['kind']) as string | undefined
  const basedOn = useFormValue(['basedOn']) as {_ref?: string} | undefined
  const baseId = basedOn?._ref
  const client = useClient({apiVersion: '2024-01-01'})
  const [base, setBase] = useState<BaseSpecs | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (kind !== 'inspiration' || !baseId) {
      setBase(null)
      setError(null)
      return
    }
    let cancelled = false
    setError(null)
    client
      .fetch<BaseSpecs | null>(BASE_QUERY, {baseId})
      .then((doc) => {
        if (!cancelled) setBase(doc)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setBase(null)
          setError(err instanceof Error ? err.message : 'Could not load base product.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [baseId, client, kind])

  if (kind !== 'inspiration') return null

  if (!baseId) {
    return (
      <div style={PANEL}>
        <strong>Falls back to base when empty.</strong> Set <em>Based on</em> first —
        then blank Dimension input, MOQ, and Lead time on this inspiration product use
        the base standard product on the site.
      </div>
    )
  }

  const shape = shapeTitle(base?.dimensionInput)
  const lead = leadTimeLabel(
    base?.leadTimeBusinessDaysMin,
    base?.leadTimeBusinessDaysMax,
  )
  const range = rangeSummary(base?.dimensionRange)

  return (
    <div style={PANEL}>
      <strong>Falls back to base when empty.</strong> Fields left blank below use
      these values from the base product on the website. Filling a field on this
      inspiration product overrides that field only.
      {error ? (
        <p style={{margin: '8px 0 0', color: 'var(--card-badge-critical-fg-color, #b91c1c)'}}>
          {error}
        </p>
      ) : null}
      {base ? (
        <>
          <ul style={LIST}>
            <li>
              <strong>Base:</strong> {base.title?.trim() || base._id} (open via
              Based on)
            </li>
            <li>
              <strong>Dimension input:</strong> {shape ?? '—'}
            </li>
            {range ? (
              <li>
                <strong>Dimension range:</strong> {range}
              </li>
            ) : null}
            <li>
              <strong>MOQ:</strong>{' '}
              {typeof base.moq === 'number' ? base.moq.toLocaleString('en-US') : '—'}
            </li>
            <li>
              <strong>Lead time:</strong> {lead ?? '—'}
            </li>
          </ul>
        </>
      ) : !error ? (
        <p style={{margin: '8px 0 0'}}>Loading base specs…</p>
      ) : null}
    </div>
  )
}
