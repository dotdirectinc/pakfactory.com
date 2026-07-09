import { useEffect, useMemo, useState } from 'react'
import { getPublishedId, useDocumentStore, useClient } from 'sanity'
import type { UserViewComponent } from 'sanity/structure'
import { IntentLink } from 'sanity/router'

const THUMB_SIZE = 48

/** Build a Sanity CDN thumbnail URL from an image asset _ref string.
 *  Ref format: image-{assetId}-{WxH}-{ext}  (e.g. image-abc123-800x600-jpg)
 */
function sanityThumbUrl(
  ref: string | null | undefined,
  projectId: string,
  dataset: string,
): string | null {
  if (!ref) return null
  // ref: "image-{id}-{dim}-{ext}"
  const parts = ref.split('-')
  if (parts.length < 4 || parts[0] !== 'image') return null
  // assetId = parts[1], dimensions = parts[2], ext = parts[3]
  const [, assetId, dimensions, ext] = parts
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${assetId}-${dimensions}.${ext}?w=${THUMB_SIZE * 2}&h=${THUMB_SIZE * 2}&fit=crop&auto=format`
}

type ProductRow = {
  _id: string
  title: string | null
  sku: string | null
  status: string | null
  slug: string | null
  thumbRef: string | null
  thumbAlt: string | null
}

const QUERY = `
  *[_type == "product" && $styleId in productStyleCategories[]._ref]
  | order(title asc) {
    _id,
    title,
    sku,
    status,
    "slug": slug.current,
    "thumbRef": media[0].asset._ref,
    "thumbAlt": media[0].alt,
  }
`

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  'coming-soon': 'Coming soon',
  discontinued: 'Discontinued',
}

const STATUS_COLOR: Record<string, string> = {
  active: '#2e7d32',
  'coming-soon': '#e65100',
  discontinued: '#757575',
}

export const ProductStyleCategoryProductsView: UserViewComponent = ({ documentId }) => {
  const documentStore = useDocumentStore()
  const client = useClient({ apiVersion: '2024-01-01' })
  const styleId = useMemo(() => getPublishedId(documentId), [documentId])
  const [rows, setRows] = useState<ProductRow[] | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const projectId = client.config().projectId ?? ''
  const dataset = client.config().dataset ?? ''

  useEffect(() => {
    setRows(null)
    setError(null)
    const sub = documentStore
      .listenQuery(QUERY, { styleId }, {
        tag: 'style-category-products',
        throttleTime: 300,
        transitions: ['update', 'appear', 'disappear'],
      })
      .subscribe({
        next: (res: unknown) => {
          setRows(Array.isArray(res) ? (res as ProductRow[]) : [])
          setError(null)
        },
        error: (err: unknown) => {
          setError(err instanceof Error ? err : new Error(String(err)))
        },
      })
    return () => sub.unsubscribe()
  }, [documentStore, styleId])

  if (error) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <div style={{ color: 'crimson', fontSize: 13 }}>{error.message}</div>
      </div>
    )
  }

  if (rows === null) {
    return (
      <div style={{ padding: '1.5rem', opacity: 0.6, fontSize: 13 }}>Loading…</div>
    )
  }

  return (
    <div style={{ padding: '1rem 1.5rem' }}>
      {rows.length === 0 ? (
        <div style={{ opacity: 0.6, fontSize: 13 }}>
          No products reference this style category yet.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, opacity: 0.5, marginBottom: '0.75rem' }}>
            {rows.length} product{rows.length !== 1 ? 's' : ''}
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {rows.map((row) => {
              const thumbSrc = sanityThumbUrl(row.thumbRef, projectId, dataset)
              const statusLabel = row.status ? STATUS_LABEL[row.status] ?? row.status : null
              const statusColor = row.status ? STATUS_COLOR[row.status] ?? '#999' : '#999'
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
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: THUMB_SIZE,
                      height: THUMB_SIZE,
                      flexShrink: 0,
                      borderRadius: 6,
                      overflow: 'hidden',
                      background: 'var(--card-muted-bg-color, rgba(125,125,125,0.1))',
                    }}
                  >
                    {thumbSrc ? (
                      <img
                        src={thumbSrc}
                        alt={row.thumbAlt || ''}
                        width={THUMB_SIZE}
                        height={THUMB_SIZE}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                      />
                    ) : null}
                  </div>

                  {/* Text */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <IntentLink
                      intent="edit"
                      params={{ id: row._id, type: 'product' }}
                      style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
                    >
                      {row.title || 'Untitled'}
                    </IntentLink>
                    <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
                      {row.sku ?? '—'}
                      {row.slug ? ` · /${row.slug}` : ''}
                    </div>
                  </div>

                  {/* Status badge */}
                  {statusLabel ? (
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: statusColor,
                        flexShrink: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {statusLabel}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
