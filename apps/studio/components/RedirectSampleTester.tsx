import { useState } from 'react'
import { Badge, Card, Flex, Stack, Text, TextInput } from '@sanity/ui'
import { useFormValue, type StringInputProps } from 'sanity'

/**
 * "Test a sample URL" input for the redirect editor (PROD-2157). Reads the doc's
 * `from` / `matchType` / `to` / `appendMatchedTail` / `behaviour`, takes a sample
 * URL in local state, and shows whether it matches + where it lands — before
 * publishing. Client-side only; the sample is not persisted.
 *
 * The match logic mirrors the runtime resolver's SINGLE-rule semantics
 * (`apps/blog/src/lib/blog-redirects-core.ts`): exact / longest-prefix (+ tail) /
 * phrase (contains, against the raw path). Editors author public URLs (with /blog),
 * so we compare public-vs-public — the relative match is identical to the resolver's
 * base-path-stripped comparison. Precedence across rules isn't tested here (single doc).
 */

function normalizePath(p: string): string {
  const withLead = p.startsWith('/') ? p : `/${p}`
  const trimmed = withLead.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

type Rule = {
  from: string
  matchType: string
  to?: string
  appendTail: boolean
  gone: boolean
}

function testRule(
  sampleRaw: string,
  { from, matchType, to, appendTail, gone }: Rule,
): { matched: boolean; destination: string | null } {
  const sample = sampleRaw.trim()
  const needle = from.trim()
  if (!sample || !needle) return { matched: false, destination: null }

  if (matchType === 'phrase') {
    // contains — raw path (keeps its trailing slash, so /feed/ ≠ /feedback)
    if (!sample.includes(needle)) return { matched: false, destination: null }
    return { matched: true, destination: gone ? null : (to ?? null) }
  }

  const key = normalizePath(sample)
  const fromKey = normalizePath(needle)

  if (matchType === 'prefix') {
    if (key !== fromKey && !key.startsWith(`${fromKey}/`))
      return { matched: false, destination: null }
    if (gone) return { matched: true, destination: null }
    const tail = key.slice(fromKey.length)
    const dest = appendTail && to ? normalizePath(`${to}${tail}`) : (to ?? null)
    return { matched: true, destination: dest }
  }

  // exact
  if (key !== fromKey) return { matched: false, destination: null }
  return { matched: true, destination: gone ? null : (to ?? null) }
}

export function RedirectSampleTester(_props: StringInputProps) {
  const from = (useFormValue(['from']) as string) ?? ''
  const matchType = (useFormValue(['matchType']) as string) ?? 'exact'
  const to = useFormValue(['to']) as string | undefined
  const appendTail = useFormValue(['appendMatchedTail']) === true
  const behaviour = (useFormValue(['behaviour']) as string) ?? 'permanent'
  const gone = behaviour === 'gone'

  const [sample, setSample] = useState('')
  const result = sample.trim()
    ? testRule(sample, { from, matchType, to, appendTail, gone })
    : null

  return (
    <Card padding={3} radius={2} border tone="transparent">
      <Stack space={3}>
        <TextInput
          value={sample}
          placeholder="/blog/…"
          onChange={(e) => setSample(e.currentTarget.value)}
        />
        {result &&
          (result.matched ? (
            <Flex align="center" gap={2}>
              <Badge tone="positive" mode="outline">
                Matches
              </Badge>
              <Text size={1} muted>
                {gone
                  ? 'returns 410 Gone'
                  : `redirects to ${result.destination ?? '—'}`}
              </Text>
            </Flex>
          ) : (
            <Flex align="center" gap={2}>
              <Badge tone="caution" mode="outline">
                No match
              </Badge>
              <Text size={1} muted>
                this URL would not be redirected
              </Text>
            </Flex>
          ))}
      </Stack>
    </Card>
  )
}
