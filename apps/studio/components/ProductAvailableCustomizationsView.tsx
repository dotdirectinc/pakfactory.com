import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { getPublishedId, useDocumentStore } from 'sanity'
import type { UserViewComponent } from 'sanity/structure'
import { IntentLink } from 'sanity/router'
import { ProductDerivedCustomizations } from './ProductDerivedCustomizations'

/**
 * The Product "Customization" tab.
 *
 * Replaces `ProductRelatedCapabilitiesView`, which queried
 * `productStyle[]->.defaultCapabilities[]->` and `capabilitiesOverride[]->`.
 * Neither field exists on any type in this repo — both were retired with
 * downward inheritance — so that tab returned nothing for every product and had
 * done since. It read as "this product has no customizations" rather than as a
 * broken query, which is why it survived.
 *
 * What a product actually offers lives in `availableCustomizations`, a flat
 * array of `{customization, preselected}`. Flat is unreadable past a dozen
 * entries, so this groups it the way the taxonomy already does —
 * Category > Type > Option — which is the shape someone vetting the list is
 * holding in their head anyway.
 *
 * On an Inspiration preset that field holds only the pre-selections: what the
 * preset OFFERS is its base product's list, inherited rather than restated
 * (PROD-2530). So the rows here come from the base and the preset's own entries
 * only decide which are flagged. A tab that read the preset's own array would
 * report it offering three options when it offers forty.
 *
 * Read-only on purpose. The field is source-owned and flips to `readOnly` when
 * the Registry ships; a view that never writes survives that unchanged.
 */

type Option = {
  _id: string
  title: string | null
  typeId: string | null
  typeTitle: string | null
  categoryId: string | null
  categoryTitle: string | null
}

type Entry = {
  _key: string
  preselected: boolean
  refId: string | null
  option: Option | null
}

type ProductDoc = {
  _id: string
  kind: string | null
  baseTitle: string | null
  /** Refs this document flags pre-selected — the only thing a preset states. */
  preselectedRefs: string[] | null
  /** This document's own entries. On a preset, only its pre-selections. */
  own: Entry[] | null
  /** What `basedOn` offers. Empty on a standard product. */
  inherited: Entry[] | null
}

/** Resolved the same way in both halves, so a row reads identically either way. */
const OPTION = `{
  _id,
  title,
  "typeId": type._ref,
  "typeTitle": type->title,
  "categoryId": type->category._ref,
  "categoryTitle": type->category->title
}`

const DEREF = `coalesce(
  *[_id == "drafts." + ^.customization._ref][0],
  *[_id == ^.customization._ref][0]
)`

const BASE = `coalesce(*[_id == "drafts." + ^.basedOn._ref][0], *[_id == ^.basedOn._ref][0])`

/**
 * Both ids are fetched and the draft is preferred in JS rather than by
 * `order(_id)`. Sorting is a trap here: `drafts.abc` sorts above `abc` but
 * `drafts.zebra` sorts below `zebra`, so an id-ordered pick is right for some
 * documents and silently wrong for others.
 *
 * Each option is resolved through its own `coalesce` for the same reason one
 * level down: a plain `customization->` misses an option that exists only as a
 * draft, and the row would render as a dangling reference. PROD-2526.
 *
 * `own` and `inherited` are both fetched rather than branching in GROQ, because
 * which one to show is a question about `kind` and reads more plainly in JS.
 */
const QUERY = `*[_id in [$draftId, $publishedId]]{
  _id,
  kind,
  "baseTitle": ${BASE}.title,
  "preselectedRefs": coalesce(availableCustomizations[preselected == true].customization._ref, []),
  "own": coalesce(
    availableCustomizations[]{
      _key,
      "preselected": preselected == true,
      "refId": customization._ref,
      "option": ${DEREF}${OPTION}
    },
    []
  ),
  "inherited": coalesce(
    ${BASE}.availableCustomizations[]{
      _key,
      "preselected": false,
      "refId": customization._ref,
      "option": ${DEREF}${OPTION}
    },
    []
  )
}`

const UNGROUPED = '__ungrouped__'

type TypeGroup = { id: string; title: string; entries: Entry[] }
type CategoryGroup = { id: string; title: string; types: TypeGroup[]; count: number }

/** Category > Type > Option, each level sorted by title. Unresolved rows last. */
function group(entries: Entry[]): CategoryGroup[] {
  const categories = new Map<string, Map<string, Entry[]>>()

  for (const entry of entries) {
    const categoryKey = entry.option?.categoryId ?? UNGROUPED
    const typeKey = entry.option?.typeId ?? UNGROUPED
    let types = categories.get(categoryKey)
    if (!types) {
      types = new Map<string, Entry[]>()
      categories.set(categoryKey, types)
    }
    const bucket = types.get(typeKey)
    if (bucket) bucket.push(entry)
    else types.set(typeKey, [entry])
  }

  const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title)

  const out: CategoryGroup[] = []
  for (const [categoryId, types] of categories) {
    const typeGroups: TypeGroup[] = []
    for (const [typeId, bucket] of types) {
      bucket.sort((a, b) => (a.option?.title ?? '').localeCompare(b.option?.title ?? ''))
      typeGroups.push({
        id: typeId,
        title: bucket[0]?.option?.typeTitle ?? 'Unknown type',
        entries: bucket,
      })
    }
    typeGroups.sort(byTitle)
    out.push({
      id: categoryId,
      title:
        categoryId === UNGROUPED
          ? 'Unresolved'
          : (typeGroups[0]?.entries[0]?.option?.categoryTitle ?? 'Unknown category'),
      types: typeGroups,
      count: typeGroups.reduce((n, t) => n + t.entries.length, 0),
    })
  }

  // Unresolved rows are a data fault, not a category. Always last, never hidden.
  out.sort((a, b) => {
    if (a.id === UNGROUPED) return 1
    if (b.id === UNGROUPED) return -1
    return byTitle(a, b)
  })
  return out
}

const LABEL_STYLE: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  opacity: 0.45,
}

export const ProductAvailableCustomizationsView: UserViewComponent = ({ documentId }) => {
  const documentStore = useDocumentStore()
  const publishedId = useMemo(() => getPublishedId(documentId), [documentId])
  const draftId = useMemo(() => `drafts.${getPublishedId(documentId)}`, [documentId])

  const [docs, setDocs] = useState<ProductDoc[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setDocs(null)
    setError(null)
    const sub = documentStore
      .listenQuery(
        QUERY,
        { publishedId, draftId },
        {
          tag: 'product-available-customizations',
          throttleTime: 300,
          transitions: ['update', 'appear', 'disappear'],
        },
      )
      .subscribe({
        next: (res: unknown) => {
          setDocs(Array.isArray(res) ? (res as ProductDoc[]) : [])
          setError(null)
        },
        error: (err: unknown) => {
          setError(err instanceof Error ? err.message : String(err))
        },
      })
    return () => sub.unsubscribe()
  }, [documentStore, publishedId, draftId])

  if (error) {
    return <div style={{ padding: '1.5rem', color: 'crimson', fontSize: 13 }}>{error}</div>
  }
  if (docs === null) {
    return <div style={{ padding: '1.5rem', opacity: 0.6, fontSize: 13 }}>Loading…</div>
  }

  // Prefer the draft — this tab exists to show what you are about to publish.
  const doc = docs.find((d) => d._id.startsWith('drafts.')) ?? docs[0] ?? null
  const isInspiration = doc?.kind === 'inspiration'

  // A preset does not restate what it offers; that is its base's list, and this
  // document holds only the pre-selections (PROD-2530). So the rows come from
  // the base, and this document's entries decide which of them are flagged.
  // Reading `own` alone here would show a preset offering three options when it
  // offers forty — the field means something different per Kind, and a view
  // that ignores that reports the wrong thing rather than nothing.
  const preselected = new Set(doc?.preselectedRefs ?? [])
  const entries: Entry[] = isInspiration
    ? (doc?.inherited ?? []).map((e) => ({
        ...e,
        preselected: e.refId !== null && preselected.has(e.refId),
      }))
    : (doc?.own ?? [])

  if (entries.length === 0) {
    return (
      <div style={{ padding: '1.5rem', opacity: 0.6, fontSize: 13 }}>
        {isInspiration ? (
          <>
            No customizations are available on this preset yet. A preset offers whatever{' '}
            <strong>{doc?.baseTitle || 'the product it is based on'}</strong> offers, so fill in{' '}
            <strong>Available customizations</strong> there first.
          </>
        ) : (
          <>
            No customizations are available on this product yet. They are listed in{' '}
            <strong>Available customizations</strong> on the Specs tab.
          </>
        )}
        <ProductDerivedCustomizations documentId={documentId} />
      </div>
    )
  }

  const groups = group(entries)
  const preselectedCount = entries.filter((e) => e.preselected).length
  const unresolvedCount = entries.filter((e) => !e.option).length
  const allCollapsed = groups.every((c) => c.types.every((t) => collapsed[`${c.id}:${t.id}`]))

  const toggleAll = () => {
    if (allCollapsed) return setCollapsed({})
    const next: Record<string, boolean> = {}
    for (const c of groups) for (const t of c.types) next[`${c.id}:${t.id}`] = true
    setCollapsed(next)
  }

  return (
    <div style={{ padding: '1rem 1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.55 }}>
          {entries.length} {entries.length === 1 ? 'customization' : 'customizations'} across{' '}
          {groups.length} {groups.length === 1 ? 'category' : 'categories'}
          {isInspiration && preselectedCount > 0 ? ` · ${preselectedCount} pre-selected` : ''}
          {isInspiration ? ` · inherited from ${doc?.baseTitle || 'its base product'}` : ''}
        </div>
        <button
          type="button"
          onClick={toggleAll}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            font: 'inherit',
            fontSize: 12,
            opacity: 0.7,
            color: 'inherit',
            textDecoration: 'underline',
            flexShrink: 0,
          }}
        >
          {allCollapsed ? 'Expand all' : 'Collapse all'}
        </button>
      </div>

      {unresolvedCount > 0 ? (
        <div
          style={{
            fontSize: 12,
            padding: '0.6rem 0.75rem',
            marginBottom: '1.25rem',
            borderRadius: 4,
            background: 'var(--card-badge-caution-bg-color, rgba(255,186,0,0.12))',
          }}
        >
          {unresolvedCount} {unresolvedCount === 1 ? 'entry points' : 'entries point'} at a
          customization option that no longer exists. Listed under <strong>Unresolved</strong> below
          — remove them on the Specs tab.
        </div>
      ) : null}

      {groups.map((category) => (
        <div key={category.id} style={{ marginBottom: '1.75rem' }}>
          <div style={{ ...LABEL_STYLE, marginBottom: '0.6rem' }}>
            {category.title} ({category.count})
          </div>

          {category.types.map((type) => {
            const key = `${category.id}:${type.id}`
            const isCollapsed = collapsed[key] === true
            return (
              <div key={key} style={{ marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid rgba(125,125,125,0.15)',
                    padding: '0.4rem 0',
                    cursor: 'pointer',
                    font: 'inherit',
                    color: 'inherit',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 10, opacity: 0.5, width: 10, flexShrink: 0 }}>
                    {isCollapsed ? '▶' : '▼'}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 13, flex: 1, minWidth: 0 }}>
                    {type.title}
                  </span>
                  <span style={{ fontSize: 11, opacity: 0.55, flexShrink: 0 }}>
                    {type.entries.length}
                  </span>
                </button>

                {isCollapsed ? null : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: '0 0 0 18px' }}>
                    {type.entries.map((entry) => (
                      <li
                        key={entry._key}
                        style={{
                          borderBottom: '1px solid rgba(125,125,125,0.1)',
                          padding: '0.45rem 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          {entry.option ? (
                            <IntentLink
                              intent="edit"
                              params={{ id: entry.option._id, type: 'customizationOption' }}
                              style={{
                                color: 'inherit',
                                textDecoration: 'none',
                                fontSize: 13,
                              }}
                            >
                              {entry.option.title || 'Untitled'}
                            </IntentLink>
                          ) : (
                            <span style={{ fontSize: 13, opacity: 0.6 }}>
                              Missing option{' '}
                              <code style={{ fontSize: 11 }}>{entry.refId ?? 'unknown'}</code>
                            </span>
                          )}
                        </div>

                        {entry.preselected ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              padding: '2px 6px',
                              borderRadius: 3,
                              flexShrink: 0,
                              background: 'var(--card-badge-primary-bg-color, rgba(45,128,255,0.15))',
                            }}
                          >
                            Pre-selected
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {preselectedCount > 0 && !isInspiration ? (
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: '1.5rem' }}>
          {preselectedCount}{' '}
          {preselectedCount === 1 ? 'option is marked' : 'options are marked'} pre-selected, but
          this is a Standard product. Pre-selection only has an effect on an Inspiration product.
        </div>
      ) : null}

      <ProductDerivedCustomizations documentId={documentId} />
    </div>
  )
}
