'use client'

import {useCallback, useMemo, useRef} from 'react'
import {set, unset, type StringInputProps} from 'sanity'
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Menu,
  MenuButton,
  MenuItem,
  Stack,
  Text,
  TextArea,
  TextInput,
} from '@sanity/ui'
import {AddIcon, CloseIcon} from '@sanity/icons'

import {
  labelForToken,
  SECTION_PAGE_FIELD_TOKENS,
  SECTION_TOKEN_PATTERN,
  tokenByStored,
} from '../lib/section-page-field-tokens'

type Segment =
  | {kind: 'text'; value: string}
  | {kind: 'token'; token: string}

function parseSegments(value: string): Segment[] {
  if (!value) return [{kind: 'text', value: ''}]
  const segments: Segment[] = []
  let last = 0
  const re = new RegExp(SECTION_TOKEN_PATTERN.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(value)) !== null) {
    if (match.index > last) {
      segments.push({kind: 'text', value: value.slice(last, match.index)})
    }
    segments.push({kind: 'token', token: match[0]})
    last = match.index + match[0].length
  }
  if (last < value.length) {
    segments.push({kind: 'text', value: value.slice(last)})
  }
  if (segments.length === 0) segments.push({kind: 'text', value: ''})
  return segments
}

function serializeSegments(segments: Segment[]): string {
  return segments.map((s) => (s.kind === 'token' ? s.token : s.value)).join('')
}

type SchemaWithRows = {
  name?: string
  type?: string
  rows?: number
  options?: {rows?: number}
}

/**
 * String / text input with Insert page field chips.
 * Stores `%h1%` / `%title%` / … ; lists recognized tokens as removable badges.
 */
export function SectionTokenStringInput(props: StringInputProps) {
  const {value, onChange, elementProps, schemaType} = props
  const current = typeof value === 'string' ? value : ''
  const schema = schemaType as SchemaWithRows
  const rows = schema.rows ?? schema.options?.rows
  const useTextArea =
    schema.type === 'text' || rows !== undefined || schema.name === 'text'

  const segments = useMemo(() => parseSegments(current), [current])
  const textRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)

  const commit = useCallback(
    (next: string) => {
      onChange(next ? set(next) : unset())
    },
    [onChange],
  )

  const insertToken = useCallback(
    (token: string) => {
      const el = textRef.current
      if (el && typeof el.selectionStart === 'number') {
        const start = el.selectionStart
        const end = el.selectionEnd ?? start
        const next = current.slice(0, start) + token + current.slice(end)
        commit(next)
        requestAnimationFrame(() => {
          const pos = start + token.length
          el.focus()
          el.setSelectionRange(pos, pos)
        })
        return
      }
      commit(current + token)
    },
    [commit, current],
  )

  const removeTokenAt = useCallback(
    (index: number) => {
      const next = segments.filter((_, i) => i !== index)
      commit(serializeSegments(next))
    },
    [commit, segments],
  )

  const bindRef = (node: HTMLTextAreaElement | HTMLInputElement | null) => {
    textRef.current = node
    const r = elementProps.ref
    if (typeof r === 'function') r(node)
    else if (r && typeof r === 'object' && 'current' in r) {
      ;(r as {current: typeof node}).current = node
    }
  }

  return (
    <Stack space={3}>
      <Flex gap={2} align="center" wrap="wrap">
        <MenuButton
          id={`section-token-insert-${schemaType.name}`}
          button={
            <Button
              text="Insert page field"
              icon={AddIcon}
              mode="ghost"
              fontSize={1}
              padding={2}
            />
          }
          menu={
            <Menu>
              {SECTION_PAGE_FIELD_TOKENS.map((t) => (
                <MenuItem
                  key={t.token}
                  text={t.label}
                  onClick={() => insertToken(t.token)}
                />
              ))}
            </Menu>
          }
          popover={{portal: true, placement: 'bottom-start'}}
        />
        <Text muted size={1}>
          Live value from this page.
        </Text>
      </Flex>

      {useTextArea ? (
        <TextArea
          {...elementProps}
          ref={bindRef}
          value={current}
          rows={rows ?? 3}
          onChange={(event) => {
            commit(event.currentTarget.value)
          }}
        />
      ) : (
        <TextInput
          {...elementProps}
          ref={bindRef}
          value={current}
          onChange={(event) => {
            commit(event.currentTarget.value)
          }}
        />
      )}

      {segments.some((s) => s.kind === 'token') ? (
        <Card padding={2} radius={2} tone="transparent" border>
          <Stack space={2}>
            <Text size={1} weight="medium">
              Page fields in this value
            </Text>
            <Flex gap={2} wrap="wrap" align="center">
              {segments.map((seg, i) =>
                seg.kind === 'token' ? (
                  <Badge
                    key={`${seg.token}-${i}`}
                    mode="outline"
                    tone={tokenByStored(seg.token) ? 'primary' : 'caution'}
                    padding={2}
                    fontSize={1}
                  >
                    <Flex align="center" gap={2}>
                      <Box>{labelForToken(seg.token)}</Box>
                      <Button
                        icon={CloseIcon}
                        mode="bleed"
                        padding={1}
                        fontSize={0}
                        aria-label={`Remove ${labelForToken(seg.token)}`}
                        onClick={() => removeTokenAt(i)}
                      />
                    </Flex>
                  </Badge>
                ) : null,
              )}
            </Flex>
          </Stack>
        </Card>
      ) : null}
    </Stack>
  )
}
