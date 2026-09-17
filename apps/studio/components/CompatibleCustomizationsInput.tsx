import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  getPublishedId,
  insert,
  setIfMissing,
  unset,
  useClient,
  useFormValue,
  type ArrayOfObjectsInputProps,
} from 'sanity'
import { useRouter } from 'sanity/router'
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
} from './customizationTree'

/**
 * The picker for `customizationOption.compatibleCustomizations`.
 *
 * Same tree as the Product side, one field down and with a different question:
 * not "what does this product offer?" but "what can a customer order alongside
 * this?". PROD-2534.
 *
 * ─── Symmetry is a READ, never a write ──────────────────────────────────────
 *
 * 🔴 Compatibility is one fact about a PAIR. It is stored once, on whichever
 * document the editor happened to be looking at, and read from both ends. A row
 * ticked on Soft Touch therefore shows on SBS too — muted, because the edge does
 * not live on SBS and clicking there cannot simply undo it.
 *
 * ❌ Do not "improve" this by writing the other half as well. Two stored halves
 * is the same fact twice with nothing deciding which wins when they disagree,
 * which is exactly the problem the product axis was cleared of one level up —
 * and a symmetric read makes asymmetry unrepresentable rather than merely
 * detectable, which is strictly better than the warning it replaces.
 *
 * ❌ And do not make the muted rows untickable-by-patching-the-other-document.
 * No input in this repo writes to a document other than the one being edited;
 * the only cross-document writes are document ACTIONS, on an explicit Publish
 * click. From an input it would mean draft-vs-published targeting, races with
 * whoever else has that document open, and a silent edit nobody asked for.
 *
 * ─── What is offered, and what is greyed ────────────────────────────────────
 *
 * Only `configuratorRole: configurable` Options. A `reference` Option is a
 * library page, never a thing a customer picks, so it cannot combine with
 * anything. That drops the three Lamination and three Surface Coating entries —
 * correctly: a customer picks `Surface Finish › Matte`, while
 * `Lamination › Matte Lamination` is the article explaining the technique.
 *
 * Greyed rather than hidden, so the list answers "why isn't SBS here?":
 *   - this Option itself, always
 *   - every Option in this Option's own Type, when that Type is
 *     `customerSelects: one`
 *
 * The second is the general rule and the first is its degenerate case (a Type of
 * one). If a customer chooses exactly one Paperboard then "SBS combines with
 * FBB" is not false, it is UNREACHABLE — and offering the tick invites the
 * error the schema already guards at error level: recording "only one lamination
 * per box" as a clash instead of setting how many a customer may choose.
 */

type Entry = { _key: string; _ref?: string }

type TypeRow = { _id: string; customerSelects: string | null }
type InboundRow = { _id: string; title: string | null }

type Universe = {
  options: OptionRow[]
  types: TypeRow[]
  inbound: InboundRow[]
}

/**
 * One fetch, three halves, so they cannot disagree with each other.
 *
 * `inbound` is scoped to `compatibleCustomizations` rather than using
 * `references($selfId)` — this document is pointed at by plenty of other fields
 * (`achieves`, the retired axes) and none of those is a compatibility claim.
 *
 * 🔴 `$selfId` is passed as a parameter and is the PUBLISHED id. Never `^._id`
 * here: on a document with unsaved edits that is `drafts.x`, and no reference
 * anywhere points at a draft id, so the inbound list would silently come back
 * empty the moment someone starts typing.
 */
const UNIVERSE_QUERY = `{
  "options": *[
    _type == "customizationOption"
    && !(_id in path("drafts.**"))
    && configuratorRole == "configurable"
  ]{${OPTION_PROJECTION}},
  "types": *[
    _type == "customizationType"
    && !(_id in path("drafts.**"))
  ]{ _id, customerSelects },
  "inbound": *[
    _type == "customizationOption"
    && !(_id in path("drafts.**"))
    && $selfId in compatibleCustomizations[]._ref
  ]{ _id, title }
}`

const newKey = makeKeyGenerator('cc')

/** The button and the link have to line up pixel for pixel, so they share this. */
const ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '0.3rem 0',
  textAlign: 'left',
}

function entryFor(optionId: string): Record<string, unknown> {
  return { _key: newKey(), _type: 'reference', _ref: optionId }
}

export function CompatibleCustomizationsInput(props: ArrayOfObjectsInputProps) {
  const { onChange, readOnly } = props
  const client = useClient({ apiVersion: '2024-01-01' })
  // `navigateIntent` rather than `<IntentLink>`: same navigation, but a hook adds
  // nothing to the TS2786 pile that `@types/react@18` produces for every
  // `@sanity/*` JSX component, and this row wants button semantics anyway.
  const router = useRouter()

  const rawId = useFormValue(['_id'])
  const selfId = typeof rawId === 'string' ? getPublishedId(rawId) : null
  // Read live from the form, not from the fetched document: repointing this
  // Option at a different Type should re-grey the list immediately, not at the
  // next reload.
  const ownTypeId = (useFormValue(['type']) as { _ref?: string } | undefined)?._ref ?? null

  const value = useMemo(
    () => (Array.isArray(props.value) ? (props.value as unknown as Entry[]) : []),
    [props.value],
  )

  const [fetched, setFetched] = useState<Universe | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')

  // One-shot, like the Product picker: the option list is taxonomy and changes
  // rarely, where this form opens constantly. Refetched when `selfId` changes,
  // which in practice is only when the form swaps documents.
  useEffect(() => {
    if (!selfId) return
    let cancelled = false
    client
      .fetch<Universe | null>(UNIVERSE_QUERY, { selfId })
      .then((rows) => {
        if (cancelled) return
        setFetched({
          options: Array.isArray(rows?.options) ? rows.options : [],
          types: Array.isArray(rows?.types) ? rows.types : [],
          inbound: Array.isArray(rows?.inbound) ? rows.inbound : [],
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
  }, [client, selfId])

  /** Stored on THIS document, by the option it points at. First wins; a repeat
   *  is invalid and validation reports it, but the UI stays deterministic. */
  const outbound = useMemo(() => {
    const map = new Map<string, Entry>()
    for (const entry of value) {
      if (entry?._ref && !map.has(entry._ref)) map.set(entry._ref, entry)
    }
    return map
  }, [value])

  const toggle = useCallback(
    (optionId: string) => {
      if (readOnly) return
      const entry = outbound.get(optionId)
      if (entry) {
        onChange(unset([{ _key: entry._key }]))
        return
      }
      onChange([setIfMissing([]), insert([entryFor(optionId)], 'after', [-1])])
    },
    [outbound, onChange, readOnly],
  )

  const selectAll = useCallback(
    (options: OptionRow[]) => {
      if (readOnly) return
      const missing = options.filter((o) => !outbound.has(o._id))
      if (missing.length === 0) return
      onChange([setIfMissing([]), insert(missing.map((o) => entryFor(o._id)), 'after', [-1])])
    },
    [outbound, onChange, readOnly],
  )

  const clearAll = useCallback(
    (options: OptionRow[]) => {
      if (readOnly) return
      const present = options.map((o) => outbound.get(o._id)).filter(Boolean) as Entry[]
      if (present.length === 0) return
      onChange(present.map((e) => unset([{ _key: e._key }])))
    },
    [outbound, onChange, readOnly],
  )

  if (error) {
    return <div style={{ padding: '0.75rem 0', color: 'crimson', fontSize: 13 }}>{error}</div>
  }
  if (fetched === null) {
    return <div style={{ padding: '0.75rem 0', opacity: 0.6, fontSize: 13 }}>Loading options…</div>
  }

  /** Who names this Option in THEIR list, by option id. */
  const inboundFrom = new Map<string, string>()
  for (const row of fetched.inbound) inboundFrom.set(row._id, row.title || 'another option')

  const ownTypeSelects = ownTypeId
    ? (fetched.types.find((t) => t._id === ownTypeId)?.customerSelects ?? null)
    : null
  const ownTypeIsExclusive = ownTypeSelects === 'one'

  /** Unreachable pairs: this Option, and its siblings when only one is chosen. */
  const isGreyed = (option: OptionRow) =>
    option._id === selfId || (ownTypeIsExclusive && !!ownTypeId && option.typeId === ownTypeId)

  const term = search.trim().toLowerCase()
  const universe = fetched.options
  const visible = term ? universe.filter((o) => (o.title ?? '').toLowerCase().includes(term)) : universe
  const groups = group(visible)

  const selectable = universe.filter((o) => !isGreyed(o))
  const inScope = new Set(universe.map((o) => o._id))
  // Counted as one number, not two. "How many of these work with this one" is a
  // question about the pairs, and which of the two documents happens to hold the
  // reference is not part of it — a split fraction asked the reader to do
  // arithmetic to answer it, above rows they could already see.
  const compatibleCount = selectable.filter(
    (o) => outbound.has(o._id) || inboundFrom.has(o._id),
  ).length

  // An entry pointing at something this picker does not offer: a `reference`
  // Option (validation warns), or one that has been deleted. Shown, not hidden —
  // an editor who cannot see a row cannot notice it is wrong.
  const outOfScope = value.filter((e) => !e._ref || !inScope.has(e._ref))

  return (
    <div>
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder={`Search ${selectable.length} options…`}
        summary={`${compatibleCount} of ${selectable.length} compatible`}
      />

      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: '0.75rem' }}>
        Compatibility reads both ways, so it only has to be recorded once. A muted tick is an option
        that already names <em>this</em> one in its own list — it counts the same, and its name is a
        link if you want to go and remove it.
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
            const pickable = type.options.filter((o) => !isGreyed(o))
            // Everything ticked, from either side. Select all skips what is
            // already true, so it still lands on `n / n`; Clear removes only what
            // this document owns, which leaves the inbound ticks drawn AND
            // counted. The fraction matches the rows in both cases.
            const chosen = pickable.filter((o) => outbound.has(o._id) || inboundFrom.has(o._id)).length
            const clearable = pickable.filter((o) => outbound.has(o._id)).length
            const isOwnExclusiveType = ownTypeIsExclusive && type.id === ownTypeId
            return (
              <div key={key} style={{ marginBottom: '0.4rem' }}>
                <TypeHeader
                  title={type.title}
                  chosen={chosen}
                  total={pickable.length}
                  collapsed={isCollapsed}
                  onToggleCollapsed={() => setCollapsed((p) => ({ ...p, [key]: !(p[key] !== false) }))}
                  actions={
                    readOnly || pickable.length === 0 ? null : (
                      <>
                        <HeaderAction
                          label="Select all"
                          onClick={() => selectAll(pickable.filter((o) => !inboundFrom.has(o._id)))}
                          disabled={chosen === pickable.length}
                        />
                        <HeaderAction
                          label="Clear"
                          onClick={() => clearAll(pickable)}
                          disabled={clearable === 0}
                        />
                      </>
                    )
                  }
                />

                {isOwnExclusiveType && !isCollapsed ? (
                  <div style={{ fontSize: 11, opacity: 0.5, padding: '0.3rem 0 0 18px' }}>
                    This option&apos;s own type. A customer chooses one of these, so no two of them
                    can be ordered together.
                  </div>
                ) : null}

                {isCollapsed ? null : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: '0.2rem 0 0 18px' }}>
                    {type.options.map((option) => {
                      const greyed = isGreyed(option)
                      const stored = outbound.has(option._id)
                      // Stored here wins over inbound: a pair recorded on both
                      // documents is redundant rather than wrong, and drawing it
                      // as editable lets an editor remove the half they own.
                      const inbound = !greyed && !stored && inboundFrom.has(option._id)

                      // ── The edge lives on the other option ──────────────
                      // It cannot be unticked from here, so the row is not a
                      // control that refuses to work — it is a LINK to the one
                      // place it can be changed. One click to get there, one to
                      // untick.
                      //
                      // ⚠️ Its own control, not a label inside the disabled
                      // button — anything nested in a disabled button is
                      // unclickable, which would have made this the dead control
                      // it exists to avoid.
                      //
                      // The tick stays muted rather than solid green, and that
                      // is deliberate. Drawn identically it would have to behave
                      // identically, which means unticking would write to the
                      // OTHER document — landing in that document's draft, so it
                      // silently gains an unpublished change, and discarding this
                      // draft afterwards leaves the two permanently disagreeing
                      // with nothing to say which was meant.
                      if (inbound) {
                        return (
                          <li key={option._id}>
                            {/* Not a button. The row states a fact it cannot change;
                                only the name is actionable, so only the name is a
                                control. A whole row that looks clickable and mostly
                                is not is the ambiguity this is avoiding. */}
                            <div style={{ ...ROW, cursor: 'default' }}>
                              <Tick state="muted" />
                              <span style={{ fontSize: 13, flex: 1, minWidth: 0 }}>
                                {option.title || 'Untitled'}
                              </span>
                              <span
                                style={{
                                  fontSize: 10,
                                  opacity: 0.5,
                                  flexShrink: 0,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                }}
                              >
                                From{' '}
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.navigateIntent('edit', {
                                      id: option._id,
                                      type: 'customizationOption',
                                    })
                                  }
                                  title={`Recorded on ${option.title || 'that option'}. Open it to remove.`}
                                  style={{
                                    ...RESET_BUTTON,
                                    textDecoration: 'underline',
                                    letterSpacing: 'inherit',
                                    textTransform: 'inherit',
                                  }}
                                >
                                  {option.title || 'Untitled'}
                                </button>
                              </span>
                            </div>
                          </li>
                        )
                      }

                      return (
                        <li key={option._id}>
                          <button
                            type="button"
                            onClick={() => toggle(option._id)}
                            disabled={readOnly || greyed}
                            title={
                              greyed
                                ? option._id === selfId
                                  ? 'An option is not compatible with itself.'
                                  : 'A customer picks one option from this type, so these two can never be ordered together.'
                                : readOnly
                                  ? undefined
                                  : 'Click to record that these two can be ordered together'
                            }
                            style={{
                              ...RESET_BUTTON,
                              ...ROW,
                              cursor: readOnly || greyed ? 'default' : 'pointer',
                              opacity: greyed ? 0.35 : readOnly ? 0.75 : 1,
                            }}
                          >
                            <Tick state={greyed ? 'off' : stored ? 'on' : 'off'} />
                            <span style={{ fontSize: 13, flex: 1, minWidth: 0 }}>
                              {option.title || 'Untitled'}
                            </span>
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
        <Notice style={{ marginTop: '1.25rem', fontSize: 12 }}>
          <strong>
            {outOfScope.length} {outOfScope.length === 1 ? 'entry is' : 'entries are'} not shown above.
          </strong>{' '}
          They point at something this picker does not offer — an option that only has a library page
          rather than appearing in the configurator, or one that has been deleted. They are kept, not
          lost; nothing above will remove them.
        </Notice>
      ) : null}
    </div>
  )
}
