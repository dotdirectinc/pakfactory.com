import { useEffect, useMemo, useState } from 'react'
import { getPublishedId, useDocumentStore } from 'sanity'
import type { UserViewComponent } from 'sanity/structure'
import { IntentLink } from 'sanity/router'

type CapabilityRow = {
  _id: string
  title: string | null
  category: string | null
  type: string | null
}

type CapabilityData = {
  inherited: CapabilityRow[]
  overridden: CapabilityRow[]
}

/** Capabilities inherited from the product's style categories via defaultCapabilities */
const INHERITED_QUERY = `
  coalesce(
    *[_id in [$productId, $draftId]][0]
      .productStyleCategories[]->.defaultCapabilities[]->{
        _id,
        title,
        "category": type->category->title,
        "type": type->title,
      },
    []
  )
`

/** Capabilities directly assigned via capabilitiesOverride */
const OVERRIDE_QUERY = `
  coalesce(
    *[_id in [$productId, $draftId]][0]
      .capabilitiesOverride[]->{
        _id,
        title,
        "category": type->category->title,
        "type": type->title,
      },
    []
  )
`

function dedup(rows: CapabilityRow[]): CapabilityRow[] {
  const seen = new Set<string>()
  return rows.filter((r) => {
    if (seen.has(r._id)) return false
    seen.add(r._id)
    return true
  })
}

function CapabilityList({
  rows,
  emptyMessage,
}: {
  rows: CapabilityRow[]
  emptyMessage: string
}) {
  if (rows.length === 0) {
    return <div style={{ opacity: 0.5, fontSize: 13, padding: '0.25rem 0' }}>{emptyMessage}</div>
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {rows.map((row) => (
        <li
          key={row._id}
          style={{
            borderBottom: '1px solid rgba(125,125,125,0.12)',
            padding: '0.55rem 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <IntentLink
            intent="edit"
            params={{ id: row._id, type: 'capability' }}
            style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
          >
            {row.title || 'Untitled'}
          </IntentLink>
          <div style={{ fontSize: 12, opacity: 0.55, flexShrink: 0, textAlign: 'right' }}>
            {[row.category, row.type].filter(Boolean).join(' · ')}
          </div>
        </li>
      ))}
    </ul>
  )
}

export const ProductRelatedCapabilitiesView: UserViewComponent = ({ documentId }) => {
  const documentStore = useDocumentStore()
  const productId = useMemo(() => getPublishedId(documentId), [documentId])
  const draftId = useMemo(() => `drafts.${getPublishedId(documentId)}`, [documentId])
  const [data, setData] = useState<CapabilityData | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setData(null)
    setError(null)

    let inherited: CapabilityRow[] = []
    let overridden: CapabilityRow[] = []
    let inheritedDone = false
    let overrideDone = false

    const flush = () => {
      if (inheritedDone && overrideDone) {
        setData({ inherited: dedup(inherited), overridden: dedup(overridden) })
      }
    }

    const sub1 = documentStore
      .listenQuery(INHERITED_QUERY, { productId, draftId }, { tag: 'product-inherited-caps', throttleTime: 300 })
      .subscribe({
        next: (res: unknown) => {
          inherited = Array.isArray(res) ? (res as (CapabilityRow | null)[]).filter((r): r is CapabilityRow => r !== null) : []
          inheritedDone = true
          flush()
        },
        error: (err: unknown) => setError(err instanceof Error ? err : new Error(String(err))),
      })

    const sub2 = documentStore
      .listenQuery(OVERRIDE_QUERY, { productId, draftId }, { tag: 'product-override-caps', throttleTime: 300 })
      .subscribe({
        next: (res: unknown) => {
          overridden = Array.isArray(res) ? (res as (CapabilityRow | null)[]).filter((r): r is CapabilityRow => r !== null) : []
          overrideDone = true
          flush()
        },
        error: (err: unknown) => setError(err instanceof Error ? err : new Error(String(err))),
      })

    return () => {
      sub1.unsubscribe()
      sub2.unsubscribe()
    }
  }, [documentStore, productId, draftId])

  if (error) {
    return (
      <div style={{ padding: '1.5rem', color: 'crimson', fontSize: 13 }}>{error.message}</div>
    )
  }

  if (data === null) {
    return <div style={{ padding: '1.5rem', opacity: 0.55, fontSize: 13 }}>Loading…</div>
  }

  const total = data.inherited.length + data.overridden.length

  return (
    <div style={{ padding: '1rem 1.5rem' }}>
      <div style={{ fontSize: 12, opacity: 0.45, marginBottom: '1.25rem' }}>
        {total} {total === 1 ? 'customization' : 'customizations'} total
      </div>

      {/* Overridden — direct assignments take priority */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', opacity: 0.45, marginBottom: '0.5rem' }}>
          Overwrite ({data.overridden.length})
        </div>
        <CapabilityList
          rows={data.overridden}
          emptyMessage="No customization overwrite set — inheriting from product style."
        />
      </div>

      {/* Inherited — from productStyleCategories.defaultCapabilities */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', opacity: 0.45, marginBottom: '0.5rem' }}>
          Inherited from style ({data.inherited.length})
        </div>
        <CapabilityList
          rows={data.inherited}
          emptyMessage="No default customizations on the assigned product styles."
        />
      </div>
    </div>
  )
}
