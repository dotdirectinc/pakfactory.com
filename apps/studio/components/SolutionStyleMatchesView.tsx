import { useEffect, useState } from 'react'
import { getPublishedId, useClient } from 'sanity'
import type { UserViewComponent } from 'sanity/structure'
import { IntentLink } from 'sanity/router'
import {
  SOLUTION_STYLE_ORDER,
  filterParams,
  hasAnyCondition,
  solutionStyleProductFilter,
  solutionStyleQueryParams,
  type SolutionStyleFilter,
} from '@pakfactory/sanity/solution-style-filter'

/**
 * "Matching products" — what this Solution Style's stored filter currently
 * resolves to.
 *
 * 🔴 This tab is the reason the type is safe to author. A stored filter can
 * resolve to ZERO and nothing in Sanity will say so: the form is valid, the
 * document publishes, and an empty landing page goes live. That is most likely
 * early, while the catalogue is still being loaded — precisely when nobody is
 * looking at it.
 *
 * It runs the SHARED filter from @pakfactory/sanity/solution-style-filter, never
 * its own copy, so the count here and the grid on the eventual collection page
 * cannot disagree.
 */

type Row = {
  _id: string
  title: string | null
  sku: string | null
  line: string | null
  style: string | null
}

type State =
  | { kind: 'loading' }
  | { kind: 'no-parent' }
  | { kind: 'no-conditions' }
  | { kind: 'ready'; rows: Row[] }
  | { kind: 'error'; message: string }

const PROJECTION = `{
  _id,
  title,
  sku,
  "line": productLine->title,
  "style": productStyle[0]->title
}`

export const SolutionStyleMatchesView: UserViewComponent = ({ documentId, document }) => {
  const client = useClient({ apiVersion: '2024-01-01' })
  const [state, setState] = useState<State>({ kind: 'loading' })

  // Read the DRAFT if there is one: the point of this tab is to show what the
  // filter you are editing right now would return, not what the last published
  // version returns.
  const draft = (document?.displayed ?? {}) as {
    solution?: { _ref?: string }
    filter?: SolutionStyleFilter
    excludedProducts?: { _ref: string }[]
  }
  const solutionRef = draft.solution?._ref
  // Serialised so the effect re-runs when the editor changes a condition, and
  // not on every keystroke elsewhere in the form.
  const signature = JSON.stringify([solutionRef, draft.filter, draft.excludedProducts])

  useEffect(() => {
    let cancelled = false

    if (!solutionRef) {
      setState({ kind: 'no-parent' })
      return
    }

    const params = filterParams(solutionRef, draft.filter, draft.excludedProducts)
    if (!hasAnyCondition(params)) {
      setState({ kind: 'no-conditions' })
      return
    }

    const filter = solutionStyleProductFilter(params)
    if (!filter) {
      setState({ kind: 'no-conditions' })
      return
    }

    setState({ kind: 'loading' })
    client
      .fetch<Row[]>(
        `*[${filter}] | ${SOLUTION_STYLE_ORDER} ${PROJECTION}`,
        solutionStyleQueryParams(params),
      )
      .then((rows) => {
        if (!cancelled) setState({ kind: 'ready', rows: rows ?? [] })
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, signature, getPublishedId(documentId)])

  if (state.kind === 'loading') return <Note>Counting…</Note>
  if (state.kind === 'error') return <Note tone="critical">Could not run the filter — {state.message}</Note>
  if (state.kind === 'no-parent')
    return <Note>Choose a parent solution first — the filter is scoped to it.</Note>
  if (state.kind === 'no-conditions')
    return (
      <Note tone="caution">
        No conditions set. With none, this page would show everything in the parent solution and
        duplicate the solution page itself.
      </Note>
    )

  const { rows } = state

  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginBottom: 4,
          color: rows.length === 0 ? '#c2410c' : 'inherit',
        }}
      >
        <strong style={{ fontSize: 28, lineHeight: 1 }}>{rows.length}</strong>
        <span>{rows.length === 1 ? 'product matches' : 'products match'}</span>
      </div>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: '#666' }}>
        Inspiration products tagged to this solution, matching any one of the conditions, minus
        anything excluded. Newest first.
      </p>

      {rows.length === 0 ? (
        <Note tone="caution">
          Nothing matches. This page would publish empty — widen a condition, or check that the
          products you expect are tagged to the parent solution.
        </Note>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <Th>Product</Th>
              <Th>SKU</Th>
              <Th>Line</Th>
              <Th>Style</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <Td>
                  <IntentLink intent="edit" params={{ id: r._id, type: 'product' }}>
                    {r.title || '(untitled)'}
                  </IntentLink>
                </Td>
                <Td>{r.sku || '—'}</Td>
                <Td>{r.line || '—'}</Td>
                <Td>{r.style || '—'}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Note({ children, tone }: { children: React.ReactNode; tone?: 'caution' | 'critical' }) {
  const color = tone === 'critical' ? '#b91c1c' : tone === 'caution' ? '#c2410c' : '#666'
  return <div style={{ padding: 20, color }}>{children}</div>
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '8px 10px 8px 0', fontWeight: 600 }}>{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '8px 10px 8px 0' }}>{children}</td>
}
