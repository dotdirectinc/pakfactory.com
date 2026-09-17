import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  insert,
  set,
  setIfMissing,
  unset,
  useClient,
  useFormValue,
  type ArrayOfObjectsInputProps,
} from 'sanity'

/**
 * The picker for `product.availableCustomizations`.
 *
 * The default array editor is a flat list behind an "Add item" search dialog.
 * At the forty-odd entries a real product carries, nobody can read it, and
 * nobody can answer "does this box offer SBS?" without scrolling the lot. This
 * renders the same field as the taxonomy already shapes it — Category > Type >
 * Option — with every option in scope drawn whether it is selected or not,
 * because you cannot tick a box that is not on screen.
 *
 * Three states per row: off, available, and available + pre-selected. The third
 * only means anything on an Inspiration product (a preset is a product with
 * some choices already made), so on a Standard product the row is a plain
 * toggle and the state is unreachable.
 *
 * 🔴 This component renders TWO of the four customization categories, and the
 * field holds all four. Everything here must therefore patch by `_key` and
 * never write the array wholesale — a `set()` built from what this can see
 * deletes every Finishing and Printing entry silently. What it cannot edit it
 * still SHOWS, at the bottom, so the blindness is visible rather than a hole
 * data falls into. PROD-2529.
 */

/**
 * Which categories a product decides for itself. Finishing and Printing are not
 * the product's to dictate — which of those apply follows from compatibility
 * between customization options, so a product listing them would be asserting
 * something it is not the authority on.
 *
 * ⚠️ This is a fact about a Customization Category and it belongs ON that
 * document, as a field. It is here because adding the field would mean the
 * picker showed nothing until someone hand-set four documents. Slugs rather
 * than titles so a rename does not silently empty the tree, and they are
 * identical in `production` and `development`. Move this to the schema the
 * first time a fifth category appears.
 */
const PRODUCT_DICTATED_CATEGORIES = ['materials', 'additional-customization']

type OptionRow = {
  _id: string
  title: string | null
  typeId: string | null
  typeTitle: string | null
  categoryId: string | null
  categoryTitle: string | null
}

type Entry = {
  _key: string
  customization?: { _ref?: string }
  preselected?: boolean
}

const UNIVERSE_QUERY = `*[
  _type == "customizationOption"
  && !(_id in path("drafts.**"))
  && type->category->slug.current in $categories
]{
  _id,
  title,
  "typeId": type._ref,
  "typeTitle": type->title,
  "categoryId": type->category._ref,
  "categoryTitle": type->category->title
}`

/**
 * Array members need a `_key`. Same generator the other custom inputs use
 * (`ChartDataInput`), prefixed per type so a collision across fields is
 * impossible to produce by accident.
 */
let keySeq = 0
function newKey(): string {
  keySeq += 1
  return `ac${Date.now().toString(36)}${keySeq.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

function entryFor(optionId: string): Record<string, unknown> {
  return {
    _key: newKey(),
    _type: 'availableCustomization',
    customization: { _type: 'reference', _ref: optionId },
    preselected: false,
  }
}

type TypeGroup = { id: string; title: string; options: OptionRow[] }
type CategoryGroup = { id: string; title: string; types: TypeGroup[] }

function group(rows: OptionRow[]): CategoryGroup[] {
  const categories = new Map<string, Map<string, OptionRow[]>>()
  for (const row of rows) {
    const categoryKey = row.categoryId ?? '__none__'
    const typeKey = row.typeId ?? '__none__'
    let types = categories.get(categoryKey)
    if (!types) {
      types = new Map<string, OptionRow[]>()
      categories.set(categoryKey, types)
    }
    const bucket = types.get(typeKey)
    if (bucket) bucket.push(row)
    else types.set(typeKey, [row])
  }

  const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title)
  const out: CategoryGroup[] = []
  for (const [categoryId, types] of categories) {
    const typeGroups: TypeGroup[] = []
    for (const [typeId, options] of types) {
      options.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
      typeGroups.push({
        id: typeId,
        title: options[0]?.typeTitle ?? 'Untitled type',
        options,
      })
    }
    typeGroups.sort(byTitle)
    out.push({
      id: categoryId,
      title: typeGroups[0]?.options[0]?.categoryTitle ?? 'Untitled category',
      types: typeGroups,
    })
  }
  out.sort(byTitle)
  return out
}

const LABEL: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  opacity: 0.45,
}

const RESET_BUTTON: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
}

/** off → available → pre-selected (Inspiration only) → off */
type RowState = 'off' | 'available' | 'preselected'

function stateOf(entry: Entry | undefined): RowState {
  if (!entry) return 'off'
  return entry.preselected === true ? 'preselected' : 'available'
}

export function AvailableCustomizationsInput(props: ArrayOfObjectsInputProps) {
  const { onChange, readOnly } = props
  const client = useClient({ apiVersion: '2024-01-01' })
  const kind = useFormValue(['kind'])
  const isInspiration = kind === 'inspiration'

  const value = useMemo(
    () => (Array.isArray(props.value) ? (props.value as unknown as Entry[]) : []),
    [props.value],
  )

  const [universe, setUniverse] = useState<OptionRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')

  // One-shot, not a live subscription: the option list is taxonomy and changes
  // rarely, where this form opens constantly. A `listenQuery` per open document
  // would re-fetch 77 documents to tell us nothing almost every time.
  useEffect(() => {
    let cancelled = false
    client
      .fetch<OptionRow[]>(UNIVERSE_QUERY, { categories: PRODUCT_DICTATED_CATEGORIES })
      .then((rows) => {
        if (cancelled) return
        setUniverse(Array.isArray(rows) ? rows : [])
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [client])

  /** Entry by the option id it points at. Two entries for one option is invalid
   *  (validation reports it); the first wins so the UI stays deterministic. */
  const byOption = useMemo(() => {
    const map = new Map<string, Entry>()
    for (const entry of value) {
      const ref = entry?.customization?._ref
      if (ref && !map.has(ref)) map.set(ref, entry)
    }
    return map
  }, [value])

  const cycle = useCallback(
    (optionId: string) => {
      if (readOnly) return
      const entry = byOption.get(optionId)
      const state = stateOf(entry)

      if (state === 'off') {
        onChange([setIfMissing([]), insert([entryFor(optionId)], 'after', [-1])])
        return
      }
      if (state === 'available') {
        // A Standard product skips the pre-selected state entirely — it has no
        // effect there, and offering it would invite data that means nothing.
        if (isInspiration && entry) {
          onChange(set(true, [{ _key: entry._key }, 'preselected']))
        } else if (entry) {
          onChange(unset([{ _key: entry._key }]))
        }
        return
      }
      if (entry) onChange(unset([{ _key: entry._key }]))
    },
    [byOption, isInspiration, onChange, readOnly],
  )

  const selectAll = useCallback(
    (options: OptionRow[]) => {
      if (readOnly) return
      const missing = options.filter((o) => !byOption.has(o._id))
      if (missing.length === 0) return
      onChange([setIfMissing([]), insert(missing.map((o) => entryFor(o._id)), 'after', [-1])])
    },
    [byOption, onChange, readOnly],
  )

  const clearAll = useCallback(
    (options: OptionRow[]) => {
      if (readOnly) return
      const present = options.map((o) => byOption.get(o._id)).filter(Boolean) as Entry[]
      if (present.length === 0) return
      onChange(present.map((e) => unset([{ _key: e._key }])))
    },
    [byOption, onChange, readOnly],
  )

  if (error) {
    return <div style={{ padding: '0.75rem 0', color: 'crimson', fontSize: 13 }}>{error}</div>
  }
  if (universe === null) {
    return <div style={{ padding: '0.75rem 0', opacity: 0.6, fontSize: 13 }}>Loading options…</div>
  }

  const term = search.trim().toLowerCase()
  const visible = term ? universe.filter((o) => (o.title ?? '').toLowerCase().includes(term)) : universe
  const groups = group(visible)

  const inScope = new Set(universe.map((o) => o._id))
  const selectedCount = value.filter((e) => e.customization?._ref && inScope.has(e.customization._ref)).length
  const preselectedCount = value.filter((e) => e.preselected === true).length

  // Entries this picker cannot reach: Finishing, Printing, or an option that no
  // longer exists. Shown rather than hidden — an editor who cannot see them
  // cannot notice when they are wrong, and they are the rows a careless
  // whole-array write would destroy.
  const outOfScope = value.filter((e) => {
    const ref = e.customization?._ref
    return !ref || !inScope.has(ref)
  })

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder={`Search ${universe.length} options…`}
          style={{
            flex: 1,
            minWidth: 160,
            font: 'inherit',
            fontSize: 13,
            padding: '0.4rem 0.6rem',
            borderRadius: 4,
            border: '1px solid var(--card-border-color, rgba(125,125,125,0.3))',
            background: 'transparent',
            color: 'inherit',
          }}
        />
        <div style={{ fontSize: 12, opacity: 0.6, flexShrink: 0 }}>
          {selectedCount} selected
          {isInspiration && preselectedCount > 0 ? ` · ${preselectedCount} pre-selected` : ''}
        </div>
      </div>

      {groups.length === 0 ? (
        <div style={{ padding: '0.75rem 0', opacity: 0.6, fontSize: 13 }}>
          {term ? `No option matches "${search}".` : 'No customization options are available to choose from.'}
        </div>
      ) : null}

      {groups.map((category) => (
        <div key={category.id} style={{ marginBottom: '1.25rem' }}>
          <div style={{ ...LABEL, marginBottom: '0.4rem' }}>{category.title}</div>

          {category.types.map((type) => {
            const key = `${category.id}:${type.id}`
            // Searching implies you want to see what matched.
            const isCollapsed = term ? false : collapsed[key] !== false
            const chosen = type.options.filter((o) => byOption.has(o._id)).length
            return (
              <div key={key} style={{ marginBottom: '0.4rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderBottom: '1px solid rgba(125,125,125,0.15)',
                    padding: '0.35rem 0',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCollapsed((p) => ({ ...p, [key]: !(p[key] !== false) }))}
                    style={{ ...RESET_BUTTON, display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 10, opacity: 0.5, width: 10, flexShrink: 0 }}>
                      {isCollapsed ? '▶' : '▼'}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{type.title}</span>
                    <span style={{ fontSize: 11, opacity: 0.55 }}>
                      {chosen} / {type.options.length}
                    </span>
                  </button>

                  {/* An ACTION, never a checkbox. A checked box on the Type would
                      promise a standing rule — "this product offers Paperboard" —
                      that the data does not keep: the selection expands to
                      individual options now, so an option added to this Type next
                      month is not included. The moment someone "fixes" that by
                      storing the Type, coarse enumeration is back and `except`
                      carve-outs come with it. */}
                  {readOnly ? null : (
                    <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => selectAll(type.options)}
                        disabled={chosen === type.options.length}
                        style={{
                          ...RESET_BUTTON,
                          fontSize: 11,
                          opacity: chosen === type.options.length ? 0.3 : 0.75,
                          textDecoration: 'underline',
                          cursor: chosen === type.options.length ? 'default' : 'pointer',
                        }}
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => clearAll(type.options)}
                        disabled={chosen === 0}
                        style={{
                          ...RESET_BUTTON,
                          fontSize: 11,
                          opacity: chosen === 0 ? 0.3 : 0.75,
                          textDecoration: 'underline',
                          cursor: chosen === 0 ? 'default' : 'pointer',
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {isCollapsed ? null : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: '0.2rem 0 0 18px' }}>
                    {type.options.map((option) => {
                      const state = stateOf(byOption.get(option._id))
                      return (
                        <li key={option._id}>
                          <button
                            type="button"
                            onClick={() => cycle(option._id)}
                            disabled={readOnly}
                            title={
                              readOnly
                                ? undefined
                                : isInspiration
                                  ? 'Click to cycle: not available → available → pre-selected'
                                  : 'Click to toggle availability'
                            }
                            style={{
                              ...RESET_BUTTON,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              width: '100%',
                              padding: '0.3rem 0',
                              cursor: readOnly ? 'default' : 'pointer',
                              opacity: readOnly ? 0.75 : 1,
                              textAlign: 'left',
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                width: 15,
                                height: 15,
                                flexShrink: 0,
                                borderRadius: 3,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                lineHeight: 1,
                                color: state === 'off' ? 'transparent' : '#fff',
                                border:
                                  state === 'off'
                                    ? '1px solid var(--card-border-color, rgba(125,125,125,0.45))'
                                    : '1px solid transparent',
                                background:
                                  state === 'preselected'
                                    ? 'var(--card-badge-primary-dot-color, #2276fc)'
                                    : state === 'available'
                                      ? 'var(--card-badge-positive-dot-color, #3ab667)'
                                      : 'transparent',
                              }}
                            >
                              {state === 'preselected' ? '★' : state === 'available' ? '✓' : ''}
                            </span>
                            <span style={{ fontSize: 13, flex: 1, minWidth: 0 }}>
                              {option.title || 'Untitled'}
                            </span>
                            {state === 'preselected' ? (
                              <span style={{ fontSize: 10, opacity: 0.6, flexShrink: 0 }}>PRE-SELECTED</span>
                            ) : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {outOfScope.length > 0 ? (
        <div
          style={{
            marginTop: '1.25rem',
            padding: '0.7rem 0.8rem',
            borderRadius: 4,
            fontSize: 12,
            background: 'var(--card-muted-bg-color, rgba(125,125,125,0.08))',
          }}
        >
          <strong>
            {outOfScope.length} {outOfScope.length === 1 ? 'entry is' : 'entries are'} not editable here.
          </strong>{' '}
          Finishing and Printing follow from compatibility between customization options, not from the
          product, so this picker does not offer them. They are kept, not lost — nothing above will
          remove them. An entry pointing at a deleted option also lands here.
        </div>
      ) : null}
    </div>
  )
}
