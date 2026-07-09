import { useState } from 'react'
import { set, type ArrayOfObjectsInputProps } from 'sanity'
import { Button, Card, Flex, Stack, Text, TextArea } from '@sanity/ui'

/**
 * Custom input for the bar-chart `data` array. Renders the normal array editor
 * plus a "Paste data" tool so editors can bulk-enter many points from CSV/TSV
 * or JSON instead of adding items one by one. Parsed rows become validated
 * structured items (label + number value) — the data stays structured, not a
 * raw blob. Usage: `components: { input: ChartDataInput }` on the field.
 */

type ParsedPoint = { label: string; value: number }

let keySeq = 0
function newKey(): string {
  keySeq += 1
  return `pd${Date.now().toString(36)}${keySeq.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

function coercePoint(label: unknown, value: unknown): ParsedPoint | null {
  const l = typeof label === 'string' ? label.trim() : String(label ?? '').trim()
  const v = Number(value)
  if (!l || !Number.isFinite(v)) return null
  return { label: l, value: v }
}

function parseData(text: string): { items: ParsedPoint[]; error?: string } {
  const trimmed = text.trim()
  if (!trimmed) return { items: [], error: 'Nothing to parse.' }

  // JSON: array of {label,value} / {name,value} / [label, value] pairs.
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed) as unknown
      const arr = Array.isArray(json)
        ? json
        : ((json as { data?: unknown[] })?.data ?? [])
      const items = (arr as unknown[])
        .map((row) => {
          if (Array.isArray(row)) return coercePoint(row[0], row[1])
          const r = row as Record<string, unknown>
          return coercePoint(r.label ?? r.name ?? r.x, r.value ?? r.y ?? r.count)
        })
        .filter((p): p is ParsedPoint => p !== null)
      if (!items.length) return { items: [], error: 'No valid {label, value} rows in the JSON.' }
      return { items }
    } catch {
      return { items: [], error: 'Invalid JSON.' }
    }
  }

  // CSV / TSV: one "label, value" per line (header rows drop out as NaN).
  const items = trimmed
    .split(/\r?\n/)
    .map((line) => {
      const parts = line.split(/[,\t;]/).map((p) => p.trim())
      if (parts.length < 2) return null
      return coercePoint(parts[0], parts[parts.length - 1])
    })
    .filter((p): p is ParsedPoint => p !== null)
  if (!items.length) return { items: [], error: "No valid 'label, value' rows found." }
  return { items }
}

export function ChartDataInput(props: ArrayOfObjectsInputProps) {
  const { onChange, value } = props
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const apply = (mode: 'replace' | 'append') => {
    const parsed = parseData(text)
    if (parsed.error) {
      setError(parsed.error)
      return
    }
    setError(null)
    const created = parsed.items.map((it) => ({
      _key: newKey(),
      _type: 'dataPoint',
      label: it.label,
      value: it.value,
    }))
    const existing = Array.isArray(value) ? value : []
    onChange(set(mode === 'append' ? [...existing, ...created] : created))
    setText('')
  }

  const disabled = !text.trim()

  return (
    <Stack space={4}>
      <Card padding={3} radius={2} border tone="transparent">
        <Stack space={3}>
          <Text size={1} weight="semibold">
            Paste data (CSV or JSON)
          </Text>
          <Text size={1} muted>
            One row per line — <code>Label, 123</code> — or a JSON array like{' '}
            <code>[{'{'}&quot;label&quot;:&quot;2021&quot;,&quot;value&quot;:70{'}'}]</code>.
            Header rows are ignored.
          </Text>
          <TextArea
            value={text}
            rows={5}
            placeholder={'2021, 70\n2022, 100\n2023, 130'}
            onChange={(e) => setText(e.currentTarget.value)}
          />
          {error ? (
            <Text size={1} style={{ color: 'var(--card-badge-critical-fg-color, #b91c1c)' }}>
              {error}
            </Text>
          ) : null}
          <Flex gap={2}>
            <Button
              text="Replace all"
              tone="primary"
              mode="ghost"
              disabled={disabled}
              onClick={() => apply('replace')}
            />
            <Button
              text="Append"
              mode="ghost"
              disabled={disabled}
              onClick={() => apply('append')}
            />
          </Flex>
        </Stack>
      </Card>
      {props.renderDefault(props)}
    </Stack>
  )
}
