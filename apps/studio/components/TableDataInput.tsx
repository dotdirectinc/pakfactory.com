import {useCallback, useRef, useState} from 'react'
import {set, type ObjectInputProps} from 'sanity'
import {Button, Card, Flex, Stack, Text, TextArea} from '@sanity/ui'
import * as XLSX from 'xlsx'

/**
 * Object input for bodyTable: paste CSV/TSV (Excel copy) or upload .xlsx/.csv,
 * then map into columns[] + rows[].cells. No column/row maximum. Manual field
 * editors remain via renderDefault.
 */

type TableRow = {
  _key?: string
  _type?: string
  cells?: string[]
}

type BodyTableValue = {
  columns?: string[]
  rows?: TableRow[]
  variant?: string
  caption?: string
}

let keySeq = 0
function newKey(): string {
  keySeq += 1
  return `tb${Date.now().toString(36)}${keySeq.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

function cellString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return String(value).trim()
}

/** Split a CSV/TSV line on tabs (preferred) or commas; naive (no quoted commas). */
function splitLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim())
  return line.split(',').map((c) => c.trim())
}

/**
 * Convert a 2D grid into headers + body rows.
 * First row = headers; remaining non-empty rows = data.
 */
export function gridToTable(grid: unknown[][]): {
  columns: string[]
  rows: TableRow[]
  error?: string
} {
  const cleaned = grid
    .map((row) => (Array.isArray(row) ? row.map(cellString) : []))
    .filter((row) => row.some((c) => c.length > 0))

  if (!cleaned.length) {
    return {columns: [], rows: [], error: 'Nothing to import — empty sheet or paste.'}
  }

  const headerRow = cleaned[0]
  const colCount = Math.max(1, ...cleaned.map((r) => r.length))
  const columns = Array.from({length: colCount}, (_, i) => headerRow[i] ?? '')

  const body = cleaned.slice(1)
  if (!body.length) {
    return {
      columns,
      rows: [],
      error: 'Need at least one data row under the header row.',
    }
  }

  const rows: TableRow[] = body.map((row) => ({
    _key: newKey(),
    _type: 'tableRow',
    cells: Array.from({length: colCount}, (_, i) => row[i] ?? ''),
  }))

  return {columns, rows}
}

function parsePasteText(text: string): ReturnType<typeof gridToTable> {
  const trimmed = text.trim()
  if (!trimmed) return {columns: [], rows: [], error: 'Nothing to paste.'}

  const lines = trimmed.split(/\r?\n/)
  const grid = lines.map(splitLine)
  return gridToTable(grid)
}

function parseWorkbook(data: ArrayBuffer): ReturnType<typeof gridToTable> {
  const wb = XLSX.read(data, {type: 'array'})
  const name = wb.SheetNames[0]
  if (!name) return {columns: [], rows: [], error: 'Workbook has no sheets.'}
  const sheet = wb.Sheets[name]
  const aoa = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][]
  return gridToTable(aoa)
}

export function TableDataInput(props: ObjectInputProps) {
  const {onChange, value, renderDefault} = props
  const current = (value ?? {}) as BodyTableValue
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const applyGrid = useCallback(
    (parsed: ReturnType<typeof gridToTable>) => {
      if (parsed.error) {
        setError(parsed.error)
        setInfo(null)
        return
      }
      setError(null)
      setInfo(
        `Imported ${parsed.columns.length} column(s) × ${parsed.rows.length} row(s).`,
      )
      onChange([
        set(parsed.columns, ['columns']),
        set(parsed.rows, ['rows']),
      ])
      setText('')
    },
    [onChange],
  )

  const applyPaste = () => {
    applyGrid(parsePasteText(text))
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const lower = file.name.toLowerCase()
      if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) {
        const decoded = new TextDecoder().decode(buf)
        applyGrid(parsePasteText(decoded))
        return
      }
      applyGrid(parseWorkbook(buf))
    } catch {
      setError('Could not read that file. Try .xlsx, .xls, or .csv.')
      setInfo(null)
    }
  }

  return (
    <Stack space={4}>
      <Card padding={3} radius={2} border tone="transparent">
        <Stack space={3}>
          <Text size={1} weight="semibold">
            Import from Excel or CSV
          </Text>
          <Text size={1} muted>
            Paste a selection from Excel (tab-separated) or upload{' '}
            <code>.xlsx</code> / <code>.csv</code>. First row becomes column
            headers; rows below become table data. Replaces current headers and
            rows.
          </Text>
          <TextArea
            value={text}
            rows={5}
            placeholder={'Header A\tHeader B\tHeader C\nValue 1\tValue 2\tValue 3'}
            onChange={(e) => setText(e.currentTarget.value)}
          />
          <Flex gap={2} wrap="wrap">
            <Button
              text="Replace from paste"
              tone="primary"
              mode="ghost"
              disabled={!text.trim()}
              onClick={applyPaste}
            />
            <Button
              text="Upload file…"
              mode="ghost"
              onClick={() => fileRef.current?.click()}
            />
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/tab-separated-values"
              style={{display: 'none'}}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0]
                void onFile(file)
                e.currentTarget.value = ''
              }}
            />
          </Flex>
          {error ? (
            <Text
              size={1}
              style={{color: 'var(--card-badge-critical-fg-color, #b91c1c)'}}
            >
              {error}
            </Text>
          ) : null}
          {info && !error ? (
            <Text size={1} muted>
              {info}
              {current.columns?.length
                ? ` Current table: ${current.columns.length}×${current.rows?.length ?? 0}.`
                : ''}
            </Text>
          ) : null}
        </Stack>
      </Card>
      {renderDefault(props)}
    </Stack>
  )
}
