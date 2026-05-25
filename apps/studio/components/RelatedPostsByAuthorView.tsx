import { useClient, useDocumentStore } from 'sanity'
import { useEffect, useState } from 'react'

interface Post {
  _id: string
  title: string
  slug: { current: string }
  publishedAt: string
  category: { title: string } | null
}

interface Props {
  document: {
    displayed: { _id: string; name?: string }
  }
}

export function RelatedPostsByAuthorView({ document }: Props) {
  const { displayed } = document
  const rawId = displayed._id ?? ''
  const authorId = rawId.replace(/^drafts\./, '')
  const draftId = `drafts.${authorId}`
  const authorName = displayed.name || 'this author'

  const client = useClient({ apiVersion: '2024-01-01' })
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authorId) return
    const query = `*[_type == "post" && (author._ref == $id || author._ref == $draftId)] | order(publishedAt desc) {
      _id,
      title,
      slug,
      publishedAt,
      "category": category->{ title }
    }`
    client
      .fetch<Post[]>(query, { id: authorId, draftId })
      .then((results) => {
        setPosts(results)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [authorId])

  const containerStyle: React.CSSProperties = {
    padding: '24px',
    fontFamily: 'system-ui, sans-serif',
  }
  const headingStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '16px',
  }
  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 600,
    padding: '2px 8px',
    marginLeft: '8px',
  }
  const listStyle: React.CSSProperties = {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  }
  const itemStyle: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '12px 14px',
    backgroundColor: '#fff',
  }
  const titleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
    marginBottom: '4px',
  }
  const metaStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#9ca3af',
  }
  const emptyStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#9ca3af',
    fontStyle: 'italic',
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <p style={metaStyle}>Loading posts…</p>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <p style={headingStyle}>
        Posts by {authorName}
        <span style={badgeStyle}>{posts.length}</span>
      </p>
      {posts.length === 0 ? (
        <p style={emptyStyle}>No posts by this author yet.</p>
      ) : (
        <ul style={listStyle}>
          {posts.map((post) => {
            const date = post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Unpublished'
            return (
              <li key={post._id} style={itemStyle}>
                <p style={titleStyle}>{post.title || 'Untitled'}</p>
                <p style={metaStyle}>
                  {post.category?.title ?? 'No category'} · {date}
                  {post.slug?.current && (
                    <> · <span style={{ color: '#d1d5db' }}>/blog/{post.slug.current}</span></>
                  )}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
