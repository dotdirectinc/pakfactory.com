import { useEffect, useMemo, useState } from 'react'
import { getPublishedId, useDocumentStore, useClient } from 'sanity'
import type { UserViewComponent } from 'sanity/structure'
import { IntentLink } from 'sanity/router'

const THUMB_SIZE = 44

function sanityThumbUrl(
  ref: string | null | undefined,
  projectId: string,
  dataset: string,
): string | null {
  if (!ref) return null
  const parts = ref.split('-')
  if (parts.length < 4 || parts[0] !== 'image') return null
  const [, assetId, dimensions, ext] = parts
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${assetId}-${dimensions}.${ext}?w=${THUMB_SIZE * 2}&h=${THUMB_SIZE * 2}&fit=crop&auto=format`
}

type PostRow = {
  _id: string
  title: string | null
  publishedAt: string | null
  featuredInCategory: boolean | null
  slug: string | null
  authorName: string | null
  thumbRef: string | null
}

const QUERY = `
  *[_type == "post" && category._ref == $categoryId]
  | order(featuredInCategory desc, publishedAt desc) {
    _id,
    title,
    publishedAt,
    featuredInCategory,
    "slug": slug.current,
    "authorName": author->name,
    "thumbRef": mainImage.asset._ref,
  }
`

export const BlogCategoryPostsView: UserViewComponent = ({ documentId }) => {
  const documentStore = useDocumentStore()
  const client = useClient({ apiVersion: '2024-01-01' })
  const categoryId = useMemo(() => getPublishedId(documentId), [documentId])
  const [rows, setRows] = useState<PostRow[] | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const projectId = client.config().projectId ?? ''
  const dataset = client.config().dataset ?? ''

  useEffect(() => {
    setRows(null)
    setError(null)
    const sub = documentStore
      .listenQuery(QUERY, { categoryId }, {
        tag: 'blog-category-posts',
        throttleTime: 300,
        transitions: ['update', 'appear', 'disappear'],
      })
      .subscribe({
        next: (res: unknown) => {
          setRows(Array.isArray(res) ? (res as PostRow[]) : [])
          setError(null)
        },
        error: (err: unknown) => {
          setError(err instanceof Error ? err : new Error(String(err)))
        },
      })
    return () => sub.unsubscribe()
  }, [documentStore, categoryId])

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

  const featured = rows.filter((r) => r.featuredInCategory)
  const rest = rows.filter((r) => !r.featuredInCategory)

  const renderRow = (row: PostRow, isFeatured = false) => {
    const thumbSrc = sanityThumbUrl(row.thumbRef, projectId, dataset)
    const date = row.publishedAt
      ? new Date(row.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'Unpublished'

    return (
      <li
        key={row._id}
        style={{
          borderBottom: '1px solid rgba(125,125,125,0.15)',
          padding: '0.65rem 0',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: isFeatured ? 'rgba(255,200,0,0.06)' : 'transparent',
          marginLeft: isFeatured ? -16 : 0,
          marginRight: isFeatured ? -16 : 0,
          paddingLeft: isFeatured ? 16 : 0,
          paddingRight: isFeatured ? 16 : 0,
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
              alt=""
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
            params={{ id: row._id, type: 'post' }}
            style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
          >
            {row.title || 'Untitled'}
          </IntentLink>
          <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>
            {date}
            {row.authorName ? ` · ${row.authorName}` : ''}
            {row.slug ? ` · /${row.slug}` : ''}
          </div>
        </div>

        {/* Featured badge */}
        {isFeatured ? (
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#b45309',
              background: 'rgba(255,200,0,0.18)',
              border: '1px solid rgba(255,200,0,0.4)',
              borderRadius: 4,
              padding: '2px 7px',
              flexShrink: 0,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            ★ Featured
          </div>
        ) : null}
      </li>
    )
  }

  return (
    <div style={{ padding: '1rem 1.5rem' }}>
      {rows.length === 0 ? (
        <div style={{ opacity: 0.6, fontSize: 13 }}>No posts in this category yet.</div>
      ) : (
        <>
          {/* Warning if multiple featured */}
          {featured.length > 1 && (
            <div
              style={{
                background: 'rgba(220,50,50,0.08)',
                border: '1px solid rgba(220,50,50,0.3)',
                borderRadius: 6,
                padding: '0.5rem 0.75rem',
                fontSize: 12,
                color: '#c0392b',
                marginBottom: '1rem',
              }}
            >
              ⚠️ {featured.length} posts are marked as featured. Only the first will be shown on the category page. Turn off the toggle on the others.
            </div>
          )}

          {/* Count */}
          <div style={{ fontSize: 12, opacity: 0.5, marginBottom: '0.75rem' }}>
            {rows.length} post{rows.length !== 1 ? 's' : ''}
            {featured.length === 1 ? ' · 1 featured' : ''}
          </div>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {featured.map((row) => renderRow(row, true))}
            {rest.map((row) => renderRow(row, false))}
          </ul>
        </>
      )}
    </div>
  )
}
