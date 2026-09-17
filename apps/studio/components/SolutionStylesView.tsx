import { useEffect, useMemo, useState } from 'react'
import { getPublishedId, useClient, useDocumentStore } from 'sanity'
import type { UserViewComponent } from 'sanity/structure'
import { IntentLink } from 'sanity/router'
import {
  filterParams,
  hasAnyCondition,
  solutionStyleProductFilter,
  solutionStyleQueryParams,
  type SolutionStyleFilter,
} from '@pakfactory/sanity/solution-style-filter'

/**
 * "Solution Styles" — the collections that sit under this solution.
 *
 * A reverse-reference view. Sanity references point one way only, so nothing in
 * the Solution form knows what points at it; this tab runs the query that the
 * reference cannot.
 *
 * It exists because Solution Styles is a FLAT list in the Solutions workspace —
 * every collection for every solution in one alphabetical pile — so there is
 * otherwise no way to see what a given solution actually offers.
 *
 * 🔴 The Matches column is the load-bearing part. A Solution Style is a stored
 * filter that can resolve to zero with the form still valid, and an empty
 * collection publishes an empty landing page. The Style's own "Matching
 * products" tab says so one document at a time; this says so for the whole
 * solution at once.
 *
 * Counts run the SHARED filter from @pakfactory/sanity/solution-style-filter —
 * one query per style, deliberately, rather than a single clever aggregate.
 * Reproducing the filter in GROQ here would be a second copy of the matching
 * rules, and a second copy is exactly what the shared module exists to prevent.
 * A solution holds a handful of collections, not hundreds.
 */

const THUMB = 44

type StyleRow = {
  _id: string
  title: string | null
  shortName: string | null
  slug: string | null
  thumbRef: string | null
  filter: SolutionStyleFilter | null
  excludedProducts: { _ref: string }[] | null
}

const QUERY = `
  *[_type == "solutionStyle" && solution._ref == $solutionId]
  | order(title asc) {
    _id,
    title,
    shortName,
    "slug": slug.current,
    "thumbRef": featuredImage.asset._ref,
    filter,
    excludedProducts,
  }
`

/** Build a Sanity CDN thumbnail URL from an image asset _ref.
 *  Ref format: image-{assetId}-{WxH}-{ext} */
function thumbUrl(ref: string | null, projectId: string, dataset: string): string | null {
  if (!ref) return null
  const parts = ref.split('-')
  if (parts.length < 4 || parts[0] !== 'image') return null
  const [, assetId, dimensions, ext] = parts
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${assetId}-${dimensions}.${ext}?w=${THUMB * 2}&h=${THUMB * 2}&fit=crop&auto=format`
}

/**
 * The Studio listens to the dataset raw, so a style with unsaved edits comes
 * back twice — once as `drafts.abc`, once as `abc`. Collapse to one row and keep
 * the draft: this tab is for deciding what to publish, so it should show what
 * you would be publishing. A style that exists only as a draft still appears,
 * which is the point — a solution's newest collection is the one most likely to
 * be empty.
 */
function dedupeDrafts(rows: StyleRow[]): StyleRow[] {
  const byPublishedId = new Map<string, StyleRow>()
  for (const row of rows) {
    const key = getPublishedId(row._id)
    const seen = byPublishedId.get(key)
    if (!seen || row._id.startsWith('drafts.')) byPublishedId.set(key, row)
  }
  return [...byPublishedId.values()].sort((a, b) =>
    (a.title ?? '').localeCompare(b.title ?? ''),
  )
}

/** null = still counting. -1 = the style has no conditions set, so there is
 *  nothing to count and "0 matches" would be the wrong thing to say. */
type Counts = Record<string, number | null>

export const SolutionStylesView: UserViewComponent = ({ documentId }) => {
  const documentStore = useDocumentStore()
  const client = useClient({ apiVersion: '2024-01-01' })
  const solutionId = useMemo(() => getPublishedId(documentId), [documentId])

  const [rows, setRows] = useState<StyleRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState<Counts>({})

  const projectId = client.config().projectId ?? ''
  const dataset = client.config().dataset ?? ''

  useEffect(() => {
    setRows(null)
    setError(null)
    setCounts({})
    const sub = documentStore
      .listenQuery(QUERY, { solutionId }, {
        tag: 'solution-styles',
        throttleTime: 300,
        transitions: ['update', 'appear', 'disappear'],
      })
      .subscribe({
        next: (res: unknown) => {
          setRows(dedupeDrafts(Array.isArray(res) ? (res as StyleRow[]) : []))
          setError(null)
        },
        error: (err: unknown) => {
          setError(err instanceof Error ? err.message : String(err))
        },
      })
    return () => sub.unsubscribe()
  }, [documentStore, solutionId])

  // Counts are a second pass, so the list paints immediately and fills in.
  useEffect(() => {
    if (!rows || rows.length === 0) return
    let cancelled = false

    rows.forEach((row) => {
      const params = filterParams(solutionId, row.filter ?? undefined, row.excludedProducts ?? undefined)
      if (!hasAnyCondition(params)) {
        if (!cancelled) setCounts((c) => ({ ...c, [row._id]: -1 }))
        return
      }
      const filter = solutionStyleProductFilter(params)
      if (!filter) {
        if (!cancelled) setCounts((c) => ({ ...c, [row._id]: -1 }))
        return
      }
      client
        .fetch<number>(`count(*[${filter}])`, solutionStyleQueryParams(params))
        .then((n) => {
          if (!cancelled) setCounts((c) => ({ ...c, [row._id]: n ?? 0 }))
        })
        .catch(() => {
          if (!cancelled) setCounts((c) => ({ ...c, [row._id]: -1 }))
        })
    })

    return () => {
      cancelled = true
    }
  }, [rows, client, solutionId])

  if (error) {
    return <div style={{ padding: '1.5rem', color: 'crimson', fontSize: 13 }}>{error}</div>
  }

  if (rows === null) {
    return <div style={{ padding: '1.5rem', opacity: 0.6, fontSize: 13 }}>Loading…</div>
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: '1.5rem', opacity: 0.6, fontSize: 13 }}>
        No solution styles sit under this solution yet.
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem 1.5rem' }}>
      <div style={{ fontSize: 12, opacity: 0.5, marginBottom: '0.75rem' }}>
        {rows.length} solution style{rows.length !== 1 ? 's' : ''}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((row) => {
          const src = thumbUrl(row.thumbRef, projectId, dataset)
          const count = counts[row._id]
          return (
            <li
              key={row._id}
              style={{
                borderBottom: '1px solid rgba(125,125,125,0.15)',
                padding: '0.65rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: THUMB,
                  height: THUMB,
                  flexShrink: 0,
                  borderRadius: 6,
                  overflow: 'hidden',
                  background: 'var(--card-muted-bg-color, rgba(125,125,125,0.1))',
                }}
              >
                {src ? (
                  <img
                    src={src}
                    alt=""
                    width={THUMB}
                    height={THUMB}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                  />
                ) : null}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <IntentLink
                  intent="edit"
                  params={{ id: row._id, type: 'solutionStyle' }}
                  style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
                >
                  {row.title || 'Untitled'}
                </IntentLink>
                <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
                  {row.slug ? `/${row.slug}` : '— no slug'}
                  {row.shortName ? ` · ${row.shortName}` : ''}
                </div>
              </div>

              <MatchCount count={count} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function MatchCount({ count }: { count: number | null | undefined }) {
  if (count === undefined || count === null) {
    return <span style={{ fontSize: 11, opacity: 0.4, flexShrink: 0 }}>counting…</span>
  }
  if (count === -1) {
    return (
      <span style={{ fontSize: 11, fontWeight: 600, color: '#b91c1c', flexShrink: 0 }}>
        NO CONDITIONS
      </span>
    )
  }
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        flexShrink: 0,
        color: count === 0 ? '#c2410c' : 'inherit',
        opacity: count === 0 ? 1 : 0.75,
      }}
    >
      {count} {count === 1 ? 'match' : 'matches'}
    </span>
  )
}
