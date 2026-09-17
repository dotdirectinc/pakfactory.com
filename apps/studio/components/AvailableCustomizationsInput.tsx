import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  insert,
  setIfMissing,
  unset,
  useClient,
  useFormValue,
  type ArrayOfObjectsInputProps,
} from 'sanity'
import {
  group,
  makeKeyGenerator,
  HeaderAction,
  LABEL,
  Notice,
  OPTION_PROJECTION,
  RESET_BUTTON,
  SearchBox,
  Tick,
  TypeHeader,
  type OptionRow,
  type TickState,
} from './customizationTree'

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
 *
 * The tree itself — grouping, the tick glyph, the collapsible Type header, the
 * search box — lives in `./customizationTree`, shared with the Customization
 * Option picker. PROD-2533.
 */

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
  ]{${OPTION_PROJECTION}},
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

const newKey = makeKeyGenerator('ac')

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

  // A preset offers what the box it is based on offers — no more. Until that
  // box says what it offers, there is nothing legitimate to choose from here,
  // and an empty picker should say which document to go and fill in rather
  // than looking broken.
  if (isInspiration) {
    if (!baseId) {
      return (
        <Notice>
          This is an Inspiration preset, so what it can offer follows from the product it is based
          on. Set &quot;Based on&quot; (Categorization) first.
        </Notice>
      )
    }
    if (base === null) {
      return <div style={{ padding: '0.75rem 0', opacity: 0.6, fontSize: 13 }}>Loading options…</div>
    }
    if (base.optionIds.length === 0) {
      return (
        <Notice>
          {base.title || 'The product this is based on'} does not offer any customizations yet, so
          there is nothing for this preset to pre-select. Fill in its &quot;Available
          customizations&quot; first — a preset cannot offer what the box it is built from cannot be
          made with.
        </Notice>
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
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder={`Search ${scoped.length} options…`}
        summary={
          isInspiration
            ? `${scoped.length} inherited · ${preselectedCount} pre-selected`
            : `${selectedCount} of ${scoped.length} selected`
        }
      />

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
                <TypeHeader
                  title={type.title}
                  chosen={chosen}
                  total={type.options.length}
                  collapsed={isCollapsed}
                  onToggleCollapsed={() => setCollapsed((p) => ({ ...p, [key]: !(p[key] !== false) }))}
                  actions={
                    readOnly ? null : (
                      <>
                        <HeaderAction
                          label={isInspiration ? 'Pre-select all' : 'Select all'}
                          onClick={() => selectAll(type.options)}
                          disabled={chosen === type.options.length}
                        />
                        <HeaderAction
                          label="Clear"
                          onClick={() => clearAll(type.options)}
                          disabled={chosen === 0}
                        />
                      </>
                    )
                  }
                />

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
                      const tick: TickState =
                        state === 'off'
                          ? 'off'
                          : inherited
                            ? 'muted'
                            : state === 'preselected'
                              ? 'accent'
                              : 'on'
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
                            <Tick state={tick} glyph={state === 'preselected' ? '★' : '✓'} />
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
        <Notice style={{ marginBottom: '1rem' }}>
          <strong>
            {unclassified.length} Customization {unclassified.length === 1 ? 'Type has' : 'Types have'} not
            said who decides their availability
          </strong>
          , so their options are not shown here. Open each one and answer{' '}
          <em>Who decides whether a product offers these options?</em> —{' '}
          {unclassified.map((t) => t.categoryTitle).filter((c, i, a) => c && a.indexOf(c) === i).join(' · ') ||
            'uncategorized'}
          .
        </Notice>
      ) : null}

      {outOfScope.length > 0 ? (
        <Notice style={{ marginTop: '1.25rem', fontSize: 12 }}>
          <strong>
            {outOfScope.length} {outOfScope.length === 1 ? 'entry is' : 'entries are'} not editable here.
          </strong>{' '}
          They belong to a Customization Type whose availability is decided by another customization
          rather than by the product, so this picker does not offer them. They are kept, not lost —
          nothing above will remove them. An entry pointing at a deleted option lands here too — and on
          a preset, so does anything the product it is based on does not itself offer.
        </Notice>
      ) : null}
    </div>
  )
}
