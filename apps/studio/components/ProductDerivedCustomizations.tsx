import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { getPublishedId, useClient, useDocumentStore } from 'sanity'
import { IntentLink } from 'sanity/router'
import { buildDependencyGraph } from '@pakfactory/sanity/customization-rules/dependencies'
import { resolveForProduct, type ExceptionOutcome } from '@pakfactory/sanity/customization-rules/resolve'

/**
 * The derived half of a product's availability (PROD-2595, ADR-022 decision 6).
 *
 * `availableCustomizations` stores what a product offers DIRECTLY — the options of types the
 * product decides. Everything another customization decides (most of Finishing, all of
 * Printing) follows from those through `compatibleCustomizations` and `dependsOn`, and is
 * COMPUTED here by the shared rules package, never stored: a stored copy would be a second
 * writer for one question and would go stale the moment a rule changed.
 *
 * Read-only. Each option says why it is derived — the option it pairs with in each type it
 * depends on — and `customizationExceptions` shows through as Added / Removed, with its reason.
 *
 * The catalog is read PUBLISHED (the rules as they stand); the product is read as its draft
 * when there is one, since this tab exists to show what is about to be published. A preset
 * shows its base product's answer: it offers what its base offers.
 */

type CatalogResult = {
  categories: { _id: string; title: string | null }[]
  types: {
    _id: string
    title: string | null
    availabilityDecidedBy: 'product' | 'customization' | null
    categoryId: string | null
    dependsOn: string[] | null
  }[]
  options: { _id: string; title: string | null; typeId: string | null; compatibleCustomizations: string[] | null }[]
}

type ProductResult = {
  _id: string
  kind: string | null
  baseTitle: string | null
  availableCustomizations: string[] | null
  customizationExceptions: { optionId: string | null; mode: 'add' | 'remove' | null; reason: string | null }[] | null
}

const CATALOG = `{
  "categories": *[_type == "customizationCategory" && !(_id in path("drafts.**"))]{ _id, title },
  "types": *[_type == "customizationType" && !(_id in path("drafts.**"))]{
    _id, title, availabilityDecidedBy, "categoryId": category._ref, "dependsOn": dependsOn[]._ref
  },
  "options": *[_type == "customizationOption" && !(_id in path("drafts.**"))]{
    _id, title, "typeId": type._ref, "compatibleCustomizations": compatibleCustomizations[]._ref
  }
}`

const BASE = `coalesce(*[_id == "drafts." + ^.basedOn._ref][0], *[_id == ^.basedOn._ref][0])`

// For a preset, the answer is its base's: the base's list and the base's exceptions.
const PRODUCT = `*[_id in [$draftId, $publishedId]]{
  _id,
  kind,
  "baseTitle": ${BASE}.title,
  "availableCustomizations": select(
    kind == "inspiration" => ${BASE}.availableCustomizations[].customization._ref,
    availableCustomizations[].customization._ref
  ),
  "customizationExceptions": select(
    kind == "inspiration" => ${BASE}.customizationExceptions[]{ "optionId": customization._ref, mode, reason },
    customizationExceptions[]{ "optionId": customization._ref, mode, reason }
  )
}`

const LABEL_STYLE: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  opacity: 0.45,
}

const BADGE_STYLE: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '2px 6px',
  borderRadius: 3,
  flexShrink: 0,
}

const clean = (id: string) => getPublishedId(id)

export function ProductDerivedCustomizations({ documentId }: { documentId: string }) {
  const client = useClient({ apiVersion: '2024-01-01' })
  const documentStore = useDocumentStore()
  const publishedId = useMemo(() => getPublishedId(documentId), [documentId])
  const draftId = useMemo(() => `drafts.${publishedId}`, [publishedId])

  const [catalog, setCatalog] = useState<CatalogResult | null>(null)
  const [docs, setDocs] = useState<ProductResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    client
      .fetch<CatalogResult>(CATALOG, {}, { tag: 'product-derived-catalog' })
      .then((res) => live && setCatalog(res))
      .catch((err: unknown) => live && setError(err instanceof Error ? err.message : String(err)))
    return () => {
      live = false
    }
  }, [client])

  useEffect(() => {
    const sub = documentStore
      .listenQuery(PRODUCT, { publishedId, draftId }, {
        tag: 'product-derived-product',
        throttleTime: 300,
        transitions: ['update', 'appear', 'disappear'],
      })
      .subscribe({
        next: (res: unknown) => setDocs(Array.isArray(res) ? (res as ProductResult[]) : []),
        error: (err: unknown) => setError(err instanceof Error ? err.message : String(err)),
      })
    return () => sub.unsubscribe()
  }, [documentStore, publishedId, draftId])

  const view = useMemo(() => {
    if (!catalog || !docs) return null
    const doc = docs.find((d) => d._id.startsWith('drafts.')) ?? docs[0] ?? null
    if (!doc) return null

    const types = catalog.types
      .filter((t) => t.availabilityDecidedBy === 'product' || t.availabilityDecidedBy === 'customization')
      .map((t) => ({
        _id: t._id,
        title: t.title ?? undefined,
        availabilityDecidedBy: t.availabilityDecidedBy as 'product' | 'customization',
        categoryId: t.categoryId ?? undefined,
        dependsOn: t.dependsOn ?? [],
      }))
    const options = catalog.options
      .filter((o) => o.typeId)
      .map((o) => ({
        _id: o._id,
        title: o.title ?? undefined,
        typeId: o.typeId as string,
        compatibleCustomizations: (o.compatibleCustomizations ?? []).map(clean),
      }))
    const rulesCatalog = { types, options }
    // `groups` is what makes a category dependency ("decided by Materials") mean ANY material.
    const { dependsOn, groups } = buildDependencyGraph(rulesCatalog)
    const resolution = resolveForProduct(
      rulesCatalog,
      {
        _id: clean(doc._id),
        availableCustomizations: (doc.availableCustomizations ?? []).map((id) => ({ optionId: clean(id) })),
        customizationExceptions: (doc.customizationExceptions ?? [])
          .filter((e) => e.optionId && (e.mode === 'add' || e.mode === 'remove'))
          .map((e) => ({ optionId: clean(e.optionId as string), mode: e.mode as 'add' | 'remove', reason: e.reason ?? undefined })),
      },
      { dependsOn, groups },
    )
    return { doc, resolution }
  }, [catalog, docs])

  if (error) return <div style={{ padding: '1rem 0', color: 'crimson', fontSize: 12 }}>{error}</div>
  if (!view || !catalog) return <div style={{ padding: '1rem 0', opacity: 0.6, fontSize: 12 }}>Working out derived customizations…</div>

  const { doc, resolution } = view
  const optionTitle = new Map(catalog.options.map((o) => [o._id, o.title || 'Untitled']))
  const typeById = new Map(catalog.types.map((t) => [t._id, t]))
  const categoryTitle = new Map(catalog.categories.map((c) => [c._id, c.title || 'Untitled']))
  const exceptionOf = new Map<string, ExceptionOutcome>(resolution.exceptions.map((e) => [e.optionId, e]))
  const unconstrained = new Set(resolution.unconstrainedTypes)

  // Customization-decided types only; product-decided ones are the list above.
  const rows = [...resolution.availableByType]
    .filter(([typeId]) => typeById.get(typeId)?.availabilityDecidedBy === 'customization')
    .map(([typeId, optionIds]) => ({ typeId, optionIds }))
  const byCategory = new Map<string, typeof rows>()
  for (const row of rows) {
    const cat = typeById.get(row.typeId)?.categoryId ?? '__none__'
    byCategory.set(cat, [...(byCategory.get(cat) ?? []), row])
  }
  const categories = [...byCategory]
    .map(([id, list]) => ({
      id,
      title: categoryTitle.get(id) ?? 'Uncategorised',
      types: list.sort((a, b) => (typeById.get(a.typeId)?.title ?? '').localeCompare(typeById.get(b.typeId)?.title ?? '')),
    }))
    .sort((a, b) => a.title.localeCompare(b.title))

  const removedByException = resolution.exceptions.filter((e) => e.effect === 'removed')
  const ignored = resolution.exceptions.filter((e) => e.effect !== 'added' && e.effect !== 'removed')
  const total = rows.reduce((n, r) => n + r.optionIds.length, 0)
  const isPreset = doc.kind === 'inspiration'

  const why = (optionId: string, typeId: string) => {
    const ex = exceptionOf.get(optionId)
    if (ex?.effect === 'added') return null
    if (unconstrained.has(typeId)) return 'Nothing narrows this type yet, so every option stays available.'
    const reasons = resolution.derivedBecause.get(optionId) ?? []
    return reasons
      .map((r) => {
        const names = r.partners.map((p) => optionTitle.get(p) ?? p)
        const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3} more` : '')
        return `${typeById.get(r.typeId)?.title ?? 'Unknown type'}: ${shown}`
      })
      .join(' · ')
  }

  return (
    <div style={{ marginTop: '2.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(125,125,125,0.25)' }}>
      <div style={{ ...LABEL_STYLE, marginBottom: '0.4rem' }}>Derived — read only</div>
      <div style={{ fontSize: 12, opacity: 0.65, marginBottom: '1.25rem', maxWidth: 640 }}>
        {total} {total === 1 ? 'option follows' : 'options follow'} from what{' '}
        {isPreset ? <strong>{doc.baseTitle || 'the base product'}</strong> : 'this product'} offers, worked out by the
        customization rules. They are not stored: change a rule, or add a{' '}
        <strong>Customization exception</strong> on the Specs tab{isPreset ? ' of the base product' : ''}, to change them.
        Each line shows what keeps the option available.
      </div>

      {total === 0 && removedByException.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.6 }}>Nothing is derived yet. The rules derive options from what the product offers directly.</div>
      ) : null}

      {categories.map((category) => (
        <div key={category.id} style={{ marginBottom: '1.5rem' }}>
          <div style={{ ...LABEL_STYLE, marginBottom: '0.5rem' }}>{category.title}</div>
          {category.types.map(({ typeId, optionIds }) => (
            <div key={typeId} style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 600, fontSize: 13, padding: '0.35rem 0', borderBottom: '1px solid rgba(125,125,125,0.15)' }}>
                {typeById.get(typeId)?.title ?? 'Unknown type'}{' '}
                <span style={{ fontWeight: 400, fontSize: 11, opacity: 0.55 }}>{optionIds.length}</span>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: '0 0 0 18px' }}>
                {optionIds.map((optionId) => {
                  const ex = exceptionOf.get(optionId)
                  const line = why(optionId, typeId)
                  return (
                    <li key={optionId} style={{ borderBottom: '1px solid rgba(125,125,125,0.1)', padding: '0.45rem 0', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <IntentLink intent="edit" params={{ id: optionId, type: 'customizationOption' }} style={{ color: 'inherit', textDecoration: 'none', fontSize: 13 }}>
                          {optionTitle.get(optionId) ?? optionId}
                        </IntentLink>
                        {line ? <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{line}</div> : null}
                        {ex?.effect === 'added' ? (
                          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>Exception: {ex.reason || 'no reason given'}</div>
                        ) : null}
                      </div>
                      {ex?.effect === 'added' ? (
                        <span style={{ ...BADGE_STYLE, background: 'var(--card-badge-caution-bg-color, rgba(255,186,0,0.18))' }}>Added by exception</span>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      ))}

      {removedByException.length > 0 ? (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ ...LABEL_STYLE, marginBottom: '0.5rem' }}>Removed by exception</div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {removedByException.map((e) => (
              <li key={e.optionId} style={{ fontSize: 13, padding: '0.35rem 0', borderBottom: '1px solid rgba(125,125,125,0.1)' }}>
                <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{optionTitle.get(e.optionId) ?? e.optionId}</span>{' '}
                <span style={{ fontSize: 11, opacity: 0.6 }}>({typeById.get(e.typeId)?.title ?? 'Unknown type'}) — {e.reason || 'no reason given'}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {ignored.length > 0 ? (
        <div style={{ fontSize: 12, padding: '0.6rem 0.75rem', borderRadius: 4, background: 'var(--card-badge-caution-bg-color, rgba(255,186,0,0.12))' }}>
          {ignored.length} {ignored.length === 1 ? 'exception has' : 'exceptions have'} no effect:{' '}
          {ignored
            .map((e) => {
              const name = optionTitle.get(e.optionId) ?? e.optionId
              if (e.effect === 'redundant') return `${name} (the rules already ${e.mode === 'add' ? 'include' : 'leave out'} it)`
              if (e.effect === 'conflict') return `${name} (both added and removed)`
              if (e.effect === 'product-decided') return `${name} (list it under Available customizations instead)`
              return `${name} (not a customization option)`
            })
            .join('; ')}
          .
        </div>
      ) : null}
    </div>
  )
}
