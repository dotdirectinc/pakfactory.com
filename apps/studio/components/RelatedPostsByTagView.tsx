import { useEffect, useState } from 'react'
import { useClient } from 'sanity'

interface Post {
  _id: string
  title: string
  slug: { current: string }
  publishedAt: string | null
  authorName: string | null
}

interface Props {
  document: {
    displayed: {
      _id?: string
      title?: string
    }
  }
}

export function RelatedPostsByTagView({ document: { displayed } }: Props) {
  const client = useClient({ apiVersion: '2024-01-01' })
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!displayed._id) return

    const id = displayed._id.replace(/^drafts\./, '')

    client
      .fetch<Post[]>(
        `*[_type == "post" && ($id in tags[]._ref || $draftId in tags[]._ref)] | order(publishedAt desc) {
          _id,
          title,
          slug,
          publishedAt,
          "authorName": author->name
        }`,
        { id, draftId: `drafts.${id}` }
      )
      .then((results) => {
        setPosts(results)
        setLoading(false)
      })
  }, [displayed._id])

  const styles = {
    container: { padding: '24px', fontFamily: 'inherit' } as React.CSSProperties,
    heading: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#6b7280',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    empty: { fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' },
    list: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '1px',
    },
    item: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: '#f9fafb',
      borderRadius: '6px',
    },
    title: { fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0 },
    meta: { fontSize: '12px', color: '#6b7280', marginTop: '2px' },
    count: {
      fontSize: '12px',
      color: '#6b7280',
      background: '#e5e7eb',
      borderRadius: '999px',
      padding: '2px 8px',
      marginLeft: '8px',
      flexShrink: 0,
    },
  }

  if (loading) {
    return <div style={styles.container}><p style={styles.empty}>Loading posts…</p></div>
  }

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ ...styles.heading, margin: 0 }}>
          Posts in "{displayed.title || 'this topic'}"
        </p>
        <span style={styles.count}>{posts.length}</span>
      </div>

      {posts.length === 0 ? (
        <p style={styles.empty}>No posts using this topic yet.</p>
      ) : (
        <ul style={styles.list}>
          {posts.map((post) => (
            <li key={post._id} style={styles.item}>
              <div>
                <p style={styles.title}>{post.title}</p>
                <p style={styles.meta}>
                  {post.authorName ?? 'No author'} ·{' '}
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString('en-CA')
                    : 'Unpublished'}
                </p>
              </div>
              <span style={styles.meta}>/blog/{post.slug?.current}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
