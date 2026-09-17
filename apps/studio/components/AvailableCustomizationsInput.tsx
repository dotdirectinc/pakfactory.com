import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  insert,
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
 * A row is a toggle, and what it toggles depends on the kind of product. On a
 * Standard one it is availability: the product is stating what it offers. On an
 * Inspiration preset availability is not this document's to state — it is
 * whatever the product in `basedOn` offers — so the toggle is pre-selection,
 * and the preset stores only the options it comes already configured with.
 *
 * That asymmetry is deliberate and it is the reason there is no tri-state. The
 * alternative was to have an editor mark forty options "available" before
 * flagging three, which is hand-copying the base product's list into a second
 * document: the same fact twice, drifting the moment the base changes.
 * PROD-2530.
 *
 * 🔴 This component renders a SUBSET of the customization categories, and the
 * field holds all of them. Everything here must therefore patch by `_key` and
 * never write the array wholesale — a `set()` built from what this can see
 * deletes every out-of-scope entry silently. What it cannot edit it still
 * SHOWS, at the bottom, so the blindness is visible rather than a hole data
 * falls into. PROD-2529.
 */

type OptionRow = {
  _id: string
  title: string | null
  typeId: string | null
  typeTitle: string | null
  categoryId: string | null
  categoryTitle: string | null
}

/**
 * One Customization Type, as the scope notes need it. `decidedBy` is null on a
 * Type nobody has classified — see UNIVERSE_QUERY.
 */
type TypeRow = {
  _id: string
  categoryId: string | null
  categoryTitle: string | null
  decidedBy: string | null
  optionCount: number
}

type Universe = { options: OptionRow[]; types: TypeRow[] }

type Entry = {
  _key: string
  customization?: { _ref?: string }
  preselected?: boolean
}

/**
 * The picker's scope is a fact stored on each Customization Type, not a list in
 * this file. It used to be `['materials', 'additional-customization']` matched
 * against `type->category->slug.current`, which had two faults: renaming or
 * deleting a Category silently emptied a whole group, and PART of a category
 * could not be included — Finishing needs `Food-Safe Treatment` and none of its
 * seven siblings. PROD-2532.
 *
 * ❌ Do not reintroduce a category-level list, here or as a field on
 * Customization Category. It is the obvious simplification and it cannot
 * express a mixed category, which is the case that exists today.
 *
 * `types` is fetched alongside because two things have to be said on screen and
 * neither is derivable from the options alone: which categories are only
 * PARTLY in scope, and which Types nobody has classified. A Type with no answer
 * is excluded from `options` by the filter, so without this second list its
 * absence would be invisible — the exact failure this ticket removes. Both run
 * in one fetch so they cannot disagree with each other.
 */
const UNIVERSE_QUERY = `{
  "options": *[
    _type == "customizationOption"
    && !(_id in path("drafts.**"))
    && type->availabilityDecidedBy == "product"
  ]{
    _id,
    title,
    "typeId": type._ref,
    "typeTitle": type->title,
    "categoryId": type->category._ref,
    "categoryTitle": type->category->title
  },
  "types": *[
    _type == "customizationType"
    && !(_id in path("drafts.**"))
  ]{
    _id,
    "categoryId": category._ref,
    "categoryTitle": category->title,
    "decidedBy": availabilityDecidedBy,
    "optionCount": count(*[
      _type == "customizationOption"
      && !(_id in path("drafts.**"))
      && type._ref == ^._id
    ])
  }
}`

/**
 * What the product this preset is based on actually offers.
 *
 * An Inspiration product is a Standard one with some choices already made, and
 * the record is explicit that **both kinds have the same available set** — the
 * preset adds pre-selection, not availability. So the picker on a preset must
 * offer only what its base offers. Showing all 77 would let someone pre-select
 * a material the underlying box cannot be made from, and nothing downstream
 * would catch it.
 *
 * Draft preferred, as everywhere else here: a base whose list is being edited
 * should be read as it is about to be, not as it was.
 */
const BASE_QUERY = `coalesce(
  *[_id == "drafts." + $baseId][0],
  *[_id == $baseId][0]
){
  title,
  "optionIds": coalesce(availableCustomizations[].customization._ref, [])
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

/**
 * On a Standard product an entry means "this is offered". On a preset it means
 * "this one comes already chosen" — availability there is inherited from
 * `basedOn` and is never written here, so a preset entry is only ever
 * `preselected: true`. An entry flagged false on a preset would assert nothing.
 */
function entryFor(optionId: string, preselected: boolean): Record<string, unknown> {
  return {
    _key: newKey(),
    _type: 'availableCustomization',
    customization: { _type: 'reference', _ref: optionId },
    preselected,
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

/**
 * A row is a plain toggle, and what it toggles depends on the kind of product.
 *
 * Standard — off or available. The product is stating what it offers.
 * Preset   — always available, because that is inherited from the product it is
 *            based on and is not this document's to state. The toggle is
 *            pre-selection, so the states are inherited or inherited+chosen.
 *
 * This is why there is no tri-state. Making an editor mark forty options
 * "available" before flagging three would be asking them to hand-copy the base
 * product's list, which is the duplicated fact the whole design avoids.
 */
type RowState = 'off' | 'available' | 'preselected'

function stateOf(entry: Entry | undefined, isInspiration: boolean): RowState {
  if (isInspiration) return entry ? 'preselected' : 'available'
  return entry ? 'available' : 'off'
}

export function AvailableCustomizationsInput(props: ArrayOfObjectsInputProps) {
  const { onChange, readOnly } = props
  const client = useClient({ apiVersion: '2024-01-01' })
  const kind = useFormValue(['kind'])
  const isInspiration = kind === 'inspiration'
  const baseId = (useFormValue(['basedOn']) as { _ref?: string } | undefined)?._ref

  const value = useMemo(
    () => (Array.isArray(props.value) ? (props.value as unknown as Entry[]) : []),
    [props.value],
  )

  const [fetched, setFetched] = useState<Universe | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [base, setBase] = useState<{ title: string | null; optionIds: string[] } | null>(null)

  // One-shot, not a live subscription: the option list is taxonomy and changes
  // rarely, where this form opens constantly. A `listenQuery` per open document
  // would re-fetch the lot to tell us nothing almost every time.
  useEffect(() => {
    let cancelled = false
    client
      .fetch<Universe | null>(UNIVERSE_QUERY)
      .then((rows) => {
        if (cancelled) return
        setFetched({
          options: Array.isArray(rows?.options) ? rows.options : [],
          types: Array.isArray(rows?.types) ? rows.types : [],
        })
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

  // Refetched when `basedOn` changes, so repointing a preset at a different box
  // narrows the picker immediately rather than at the next reload.
  useEffect(() => {
    if (!isInspiration || !baseId) {
      setBase(null)
      return
    }
    let cancelled = false
    client
      .fetch<{ title: string | null; optionIds: string[] } | null>(BASE_QUERY, { baseId })
      .then((row) => {
        if (cancelled) return
        setBase({ title: row?.title ?? null, optionIds: row?.optionIds ?? [] })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [client, isInspiration, baseId])

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

  // One toggle, both kinds. On a Standard product it adds or removes
  // availability; on a preset it adds or removes pre-selection, because the
  // presence of an entry is what "pre-chosen" means there.
  const toggle = useCallback(
    (optionId: string) => {
      if (readOnly) return
      const entry = byOption.get(optionId)
      if (entry) {
        onChange(unset([{ _key: entry._key }]))
        return
      }
      onChange([setIfMissing([]), insert([entryFor(optionId, isInspiration)], 'after', [-1])])
    },
    [byOption, isInspiration, onChange, readOnly],
  )

  const selectAll = useCallback(
    (options: OptionRow[]) => {
      if (readOnly) return
      const missing = options.filter((o) => !byOption.has(o._id))
      if (missing.length === 0) return
      onChange([
        setIfMissing([]),
        insert(missing.map((o) => entryFor(o._id, isInspiration)), 'after', [-1]),
      ])
    },
    [byOption, isInspiration, onChange, readOnly],
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
  if (fetched === null) {
    return <div style={{ padding: '0.75rem 0', opacity: 0.6, fontSize: 13 }}>Loading options…</div>
  }
  const universe = fetched.options

  const notice = (text: string) => (
    <div
      style={{
        padding: '0.7rem 0.8rem',
        borderRadius: 4,
        fontSize: 13,
        background: 'var(--card-muted-bg-color, rgba(125,125,125,0.08))',
      }}
    >
      {text}
    </div>
  )

  // A preset offers what the box it is based on offers — no more. Until that
  // box says what it offers, there is nothing legitimate to choose from here,
  // and an empty picker should say which document to go and fill in rather
  // than looking broken.
  if (isInspiration) {
    if (!baseId) {
      return notice(
        'This is an Inspiration preset, so what it can offer follows from the product it is based on. Set "Based on" (Categorization) first.',
      )
    }
    if (base === null) {
      return <div style={{ padding: '0.75rem 0', opacity: 0.6, fontSize: 13 }}>Loading options…</div>
    }
    if (base.optionIds.length === 0) {
      return notice(
        `${base.title || 'The product this is based on'} does not offer any customizations yet, so there is nothing for this preset to pre-select. Fill in its "Available customizations" first — a preset cannot offer what the box it is built from cannot be made with.`,
      )
    }
  }

  // On a preset the choosable set is the base's list, intersected with what the
  // product decides. Anything already stored that falls outside it drops into
  // "not editable here" below, which is how a preset offering something its
  // base does not becomes visible rather than silent.
  const baseIds = base ? new Set(base.optionIds) : null
  const scoped = baseIds ? universe.filter((o) => baseIds.has(o._id)) : universe

  // Only Types that actually hold a published Option are counted on either side
  // of the fraction. Four Types hold none and never render, so counting raw
  // Types would print "15 of 15" above twelve visible rows — a small lie, in a
  // note whose entire job is to stop the reader assuming they see everything.
  const stocked = fetched.types.filter((t) => t.optionCount > 0)
  const partial = new Map<string, { shown: number; total: number }>()
  for (const t of stocked) {
    const key = t.categoryId ?? '__none__'
    const seen = partial.get(key) ?? { shown: 0, total: 0 }
    seen.total += 1
    if (t.decidedBy === 'product') seen.shown += 1
    partial.set(key, seen)
  }

  // A Type nobody has classified is filtered out of `options` above, so it would
  // otherwise be missing with nothing to say so. The schema requires an answer,
  // but that rule binds the Studio form and not a script or an import, so the
  // guarantee has to be drawn here too.
  const unclassified = stocked.filter((t) => t.decidedBy !== 'product' && t.decidedBy !== 'customization')

  const term = search.trim().toLowerCase()
  const visible = term ? scoped.filter((o) => (o.title ?? '').toLowerCase().includes(term)) : scoped
  const groups = group(visible)

  const inScope = new Set(scoped.map((o) => o._id))
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
          placeholder={`Search ${scoped.length} options…`}
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
          {isInspiration
            ? `${scoped.length} inherited · ${preselectedCount} pre-selected`
            : `${selectedCount} of ${scoped.length} selected`}
        </div>
      </div>

      {isInspiration && base ? (
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: '0.75rem' }}>
          Everything <strong>{base.title || 'the product this is based on'}</strong> offers is
          available here already — a preset does not restate its base's list, it only says which
          options come pre-chosen. Tick the ones this preset arrives with.
        </div>
      ) : null}

      {groups.length === 0 ? (
        <div style={{ padding: '0.75rem 0', opacity: 0.6, fontSize: 13 }}>
          {term ? `No option matches "${search}".` : 'No customization options are available to choose from.'}
        </div>
      ) : null}

      {groups.map((category) => {
        // A category only partly in scope says so, because a lone Type under a
        // familiar heading otherwise reads as the whole category — and the
        // reader has no way to tell the difference. A complete category says
        // nothing: attention belongs only where it is warranted.
        const counts = partial.get(category.id)
        const isPartial = counts ? counts.shown < counts.total : false
        return (
        <div key={category.id} style={{ marginBottom: '1.25rem' }}>
          <div style={{ ...LABEL, marginBottom: '0.4rem' }}>
            {category.title}
            {isPartial && counts ? (
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, opacity: 0.6 }}>
                {' '}· {counts.shown} of {counts.total} types — the rest are decided by another
                customization
              </span>
            ) : null}
          </div>

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
                        {isInspiration ? 'Pre-select all' : 'Select all'}
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
                      const state = stateOf(byOption.get(option._id), isInspiration)
                      // On a preset an unstarred row is available because the
                      // BASE says so, not because anyone ticked it here, and it
                      // cannot be turned off. Drawing it like a ticked checkbox
                      // invites someone to try to untick it. Muted, so the tick
                      // reads as a statement rather than a control.
                      const inherited = isInspiration && state === 'available'
                      return (
                        <li key={option._id}>
                          <button
                            type="button"
                            onClick={() => toggle(option._id)}
                            disabled={readOnly}
                            title={
                              readOnly
                                ? undefined
                                : isInspiration
                                  ? 'Available on every preset built from this base. Click to pre-select it.'
                                  : 'Click to offer this option on this product'
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
                                color:
                                  state === 'off'
                                    ? 'transparent'
                                    : inherited
                                      ? 'var(--card-muted-fg-color, rgba(125,125,125,0.9))'
                                      : '#fff',
                                border:
                                  state === 'off' || inherited
                                    ? '1px solid var(--card-border-color, rgba(125,125,125,0.45))'
                                    : '1px solid transparent',
                                background: inherited
                                  ? 'transparent'
                                  : state === 'preselected'
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
                            ) : inherited ? (
                              <span style={{ fontSize: 10, opacity: 0.4, flexShrink: 0 }}>INHERITED</span>
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
        )
      })}

      {unclassified.length > 0 ? (
        <div
          style={{
            padding: '0.7rem 0.8rem',
            marginBottom: '1rem',
            borderRadius: 4,
            fontSize: 13,
            background: 'var(--card-muted-bg-color, rgba(125,125,125,0.08))',
          }}
        >
          <strong>
            {unclassified.length} Customization {unclassified.length === 1 ? 'Type has' : 'Types have'} not
            said who decides their availability
          </strong>
          , so their options are not shown here. Open each one and answer{' '}
          <em>Who decides whether a product offers these options?</em> —{' '}
          {unclassified.map((t) => t.categoryTitle).filter((c, i, a) => c && a.indexOf(c) === i).join(' · ') ||
            'uncategorized'}
          .
        </div>
      ) : null}

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
          They belong to a Customization Type whose availability is decided by another customization
          rather than by the product, so this picker does not offer them. They are kept, not lost —
          nothing above will remove them. An entry pointing at a deleted option lands here too — and on
          a preset, so does anything the product it is based on does not itself offer.
        </div>
      ) : null}
    </div>
  )
}
